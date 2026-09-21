#!/usr/bin/env node
// One-shot sync: read MCP servers from .kiro/settings/mcp.json and rewrite
// every project-level mirror. All four mirrors are tracked in git, so a drift
// is a reviewable diff rather than a silent local-only difference:
//
//   .mcp.json          Claude Code
//   opencode.json      OpenCode
//   .vscode/mcp.json   VS Code Copilot
//   .codex/config.toml Codex CLI / IDE extension (repo-scoped config)
//
// Usage:
//   node scripts/sync-mcp.mjs         # rewrite every mirror
//   node scripts/sync-mcp.mjs --check # exit 1 if any mirror is out of date
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ROOT = process.cwd();
const SOURCE = ".kiro/settings/mcp.json";
// OpenCode and Codex both need a generous startup budget: the stdio servers
// boot through `npx`, which resolves and unpacks the package on a cold cache.
const LOCAL_SERVER_TIMEOUT_MS = 60_000;

const kiro = JSON.parse(readFileSync(`${ROOT}/${SOURCE}`, "utf8"));
const servers = kiro.mcpServers ?? {};

// A ${VAR} placeholder. Kept deliberately narrow so a literal secret pasted
// into the source is never mistaken for an env reference and rewritten.
const ENV_PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const BEARER_ENV_ONLY = /^Bearer \$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

const isRemote = (server) => typeof server.url === "string";
const rewriteValues = (record, rewrite) =>
  record && Object.fromEntries(Object.entries(record).map(([k, v]) => [k, rewrite(v)]));

const claudeShape = (s) => ({
  mcpServers: Object.fromEntries(
    Object.entries(s).map(([n, c]) => [n, { ...c, type: c.type ?? (c.url ? "http" : "stdio") }]),
  ),
});

// OpenCode: top-level `mcp` block, `type: "remote" | "local"`, and its own
// {env:VAR} interpolation syntax — NOT the ${VAR} the other clients use. Emit
// ${VAR} here and OpenCode forwards the literal string, so an authenticated
// server fails with a 401 that points nowhere near the config.
const toOpencodeEnvRef = (value) =>
  typeof value === "string" ? value.replace(ENV_PLACEHOLDER, "{env:$1}") : value;
// OpenCode also stores user-managed settings such as plugins. Only the MCP
// section, schema URL, and MCP timeout belong to this generator.
const opencodePath = `${ROOT}/opencode.json`;
const opencodeConfig = existsSync(opencodePath)
  ? JSON.parse(readFileSync(opencodePath, "utf8"))
  : {};
const opencodeSettings = Object.fromEntries(
  Object.entries(opencodeConfig).filter(
    ([key]) => !["$schema", "mcp", "experimental"].includes(key),
  ),
);
const opencodeShape = (s) => ({
  $schema: "https://opencode.ai/config.json",
  ...opencodeSettings,
  mcp: Object.fromEntries(
    Object.entries(s).map(([n, c]) => [
      n,
      isRemote(c)
        ? {
            type: "remote",
            url: c.url,
            ...(c.headers ? { headers: rewriteValues(c.headers, toOpencodeEnvRef) } : {}),
            enabled: c.disabled !== true,
          }
        : {
            type: "local",
            command: [c.command, ...(c.args ?? [])],
            ...(c.env ? { environment: rewriteValues(c.env, toOpencodeEnvRef) } : {}),
            timeout: LOCAL_SERVER_TIMEOUT_MS,
            enabled: c.disabled !== true,
          },
    ]),
  ),
  experimental: { ...opencodeConfig.experimental, mcp_timeout: LOCAL_SERVER_TIMEOUT_MS },
});

// VS Code Copilot uses `servers` (plural), an explicit transport `type`, and
// ${env:VAR} env-var syntax. disabled/autoApprove are Kiro-only fields with no
// equivalent in VS Code's mcp.json schema; leaving them in trips "property not
// allowed" validation errors per server.
const VSCODE_STRIP = new Set(["disabled", "autoApprove"]);
const toVscodeEnvRef = (value) =>
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal replacement pattern for String#replace, not an unwrapped template literal.
  typeof value === "string" ? value.replace(ENV_PLACEHOLDER, "${env:$1}") : value;
const vscodeShape = (s) => ({
  servers: Object.fromEntries(
    Object.entries(s).map(([n, c]) => {
      const vsc = { type: c.type ?? (isRemote(c) ? "http" : "stdio"), ...c };
      for (const key of VSCODE_STRIP) delete vsc[key];
      if (vsc.headers) vsc.headers = rewriteValues(vsc.headers, toVscodeEnvRef);
      if (vsc.env) vsc.env = rewriteValues(vsc.env, toVscodeEnvRef);
      return [n, vsc];
    }),
  ),
});

// Codex reads a repo-scoped .codex/config.toml layered over ~/.codex/config.toml.
// It has no `headers` field: a bearer token is named, not inlined, via
// bearer_token_env_var. Anything else in `headers` cannot be represented.
const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;
const tomlKey = (key) => (TOML_BARE_KEY.test(key) ? key : JSON.stringify(key));
const tomlString = (value) => JSON.stringify(String(value));
const tomlArray = (values) =>
  values.length === 0 ? "[]" : `[\n${values.map((v) => `    ${tomlString(v)},`).join("\n")}\n]`;

function codexShape(s) {
  const blocks = [];
  for (const [name, config] of Object.entries(s)) {
    if (config.disabled === true) continue;
    const header = `[mcp_servers.${tomlKey(name)}]`;
    const lines = [];
    if (isRemote(config)) {
      lines.push(`url = ${tomlString(config.url)}`);
      for (const [key, value] of Object.entries(config.headers ?? {})) {
        const bearer = key.toLowerCase() === "authorization" && BEARER_ENV_ONLY.exec(value);
        if (bearer) {
          lines.push(`bearer_token_env_var = ${tomlString(bearer[1])}`);
        } else {
          console.warn(
            `warn: ${name}: Codex cannot represent header "${key}"; set it in ~/.codex/config.toml`,
          );
        }
      }
    } else {
      lines.push(`command = ${tomlString(config.command)}`);
      if (config.args?.length) lines.push(`args = ${tomlArray(config.args)}`);
    }
    if (config.env && Object.keys(config.env).length > 0) {
      lines.push("");
      lines.push(`[mcp_servers.${tomlKey(name)}.env]`);
      for (const [key, value] of Object.entries(config.env)) {
        lines.push(`${tomlKey(key)} = ${tomlString(value)}`);
      }
    }
    blocks.push(`${header}\n${lines.join("\n")}\n`);
  }
  return `# Generated by scripts/sync-mcp.mjs from ${SOURCE} — do not edit by hand.\n\n${blocks.join("\n")}`;
}

const json = (data) => `${JSON.stringify(data, null, 2)}\n`;

const targets = [
  [".mcp.json", json(claudeShape(servers))],
  ["opencode.json", json(opencodeShape(servers))],
  [".vscode/mcp.json", json(vscodeShape(servers))],
  [".codex/config.toml", codexShape(servers)],
];

if (process.argv.includes("--check")) {
  let drift = false;
  for (const [path, expected] of targets) {
    const full = `${ROOT}/${path}`;
    if (!existsSync(full) || readFileSync(full, "utf8").replace(/\r\n/g, "\n") !== expected) {
      console.error(`drift: ${path} is out of date — run \`bun run mcp:sync\``);
      drift = true;
    }
  }
  process.exit(drift ? 1 : 0);
}

for (const [path, contents] of targets) {
  const full = `${ROOT}/${path}`;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  console.log(`wrote ${full}`);
}
console.log(`synced ${Object.keys(servers).length} server(s) from ${SOURCE}`);
