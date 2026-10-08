// Compatibility checks for the security overrides used by Mintlify.
// Run: node scripts/check-dependency-overrides.mjs
// Resolves packages from their actual consumers. Axios uses only loopback HTTP;
// no browser, external service, credentials, or extra dependencies are needed.
// This checks integration behavior; bun audit still checks advisory status.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const consumer = (name) =>
  createRequire(new URL(`../node_modules/${name}/package.json`, import.meta.url));
const common = consumer("@mintlify/common");
const cli = consumer("@mintlify/cli");
const models = consumer("@mintlify/models");
const importFrom = (from, name) => import(pathToFileURL(from.resolve(name)).href);

function versionOf(from, name, packageName = name) {
  let directory = dirname(from.resolve(name));
  while (true) {
    const manifest = join(directory, "package.json");
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      if (pkg.name === packageName) return pkg.version;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot find manifest for ${name}`);
    directory = parent;
  }
}

async function checkMath() {
  const { unified } = await importFrom(common, "unified");
  const packages = [
    "remark-parse",
    "remark-math",
    "remark-rehype",
    "rehype-katex",
    "rehype-stringify",
  ];
  let processor = unified();
  for (const name of packages) processor = processor.use((await importFrom(common, name)).default);
  const result = await processor.process(
    "Inline $E=mc^2$ and $\\sqrt{x}$.\n\n$$\n\\frac{1}{2} + \\sum_{i=1}^{n} i\n$$\n",
  );
  const html = String(result);
  assert.equal(result.messages.length, 0, "Math pipeline produced diagnostics");
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /<mfrac>/);
  assert.match(html, /<msqrt>/);
  assert.doesNotMatch(html, /katex-error/);
  const katex = createRequire(common.resolve("rehype-katex"));
  console.log(
    `Math: KaTeX ${versionOf(katex, "katex")} renders two inline expressions and one display`,
    "expression through Mintlify's remark/rehype pipeline.",
  );
}

async function checkCss() {
  const postcss = common("postcss");
  const tailwind = common("tailwindcss-v3");
  const nesting = common("tailwindcss-v3/nesting");
  const result = await postcss([
    nesting(),
    tailwind({
      content: [
        { raw: '<div class="text-green-500 sm:hover:text-blue-500"></div>', extension: "html" },
      ],
      corePlugins: { preflight: false },
    }),
  ]).process(
    "@tailwind utilities; .probe { @apply font-bold px-4; &:hover { @apply text-red-500; } }",
    { from: undefined },
  );
  const rules = [];
  result.root.walkRules((rule) => rules.push(rule));
  const probe = rules.find((rule) => rule.selector === ".probe");
  assert.ok(probe, "@apply rule missing");
  const declarations = Object.fromEntries(
    probe.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]),
  );
  assert.equal(declarations["font-weight"], "700");
  assert.equal(declarations["padding-left"], "1rem");
  assert.equal(declarations["padding-right"], "1rem");
  const hover = rules.find((rule) => rule.selector === ".probe:hover");
  assert.ok(
    hover?.nodes.some((node) => node.prop === "color"),
    "Nested hover color missing",
  );
  const responsive = rules.find((rule) => rule.selector === ".sm\\:hover\\:text-blue-500:hover");
  assert.equal(responsive?.parent.name, "media");
  assert.equal(responsive.parent.params, "(min-width: 640px)");
  assert.ok(responsive.nodes.some((node) => node.prop === "color"));
  assert.equal(result.warnings().length, 0);
  assert.doesNotMatch(result.css, /@apply|&:hover/);
  const tailwindRequire = createRequire(common.resolve("tailwindcss-v3"));
  const nestedRequire = createRequire(tailwindRequire.resolve("postcss-nested"));
  console.log(
    `CSS: Tailwind ${versionOf(common, "tailwindcss-v3", "tailwindcss")} with selector-parser`,
    `${versionOf(tailwindRequire, "postcss-selector-parser")} and postcss-nested's`,
    `selector-parser ${versionOf(nestedRequire, "postcss-selector-parser")}`,
    "compiles @apply, nested hover and responsive hover.",
  );
}

async function checkMcp() {
  const { Client } = cli("@modelcontextprotocol/sdk/client/index.js");
  const { McpServer } = cli("@modelcontextprotocol/sdk/server/mcp.js");
  const { InMemoryTransport } = cli("@modelcontextprotocol/sdk/inMemory.js");
  const server = new McpServer({ name: "override-check", version: "1.0.0" });
  server.registerTool(
    "ping",
    { description: "Compatibility check", inputSchema: {} },
    async () => ({ content: [{ type: "text", text: "pong" }] }),
  );
  const client = new Client({ name: "override-check-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    assert.deepEqual(
      (await client.listTools()).tools.map((tool) => tool.name),
      ["ping"],
    );
    const result = await client.callTool({ name: "ping", arguments: {} });
    assert.equal(result.content[0].text, "pong");
  } finally {
    await client.close();
    await server.close();
  }
  const version = versionOf(
    cli,
    "@modelcontextprotocol/sdk/client/index.js",
    "@modelcontextprotocol/sdk",
  );
  console.log(`MCP: SDK ${version} completes an in-memory handshake, tool listing and invocation.`);
}

async function checkAxios() {
  const axios = models("axios");
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          method: request.method,
          payload: JSON.parse(Buffer.concat(chunks)),
          header: request.headers["x-check"],
        }),
      );
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const response = await axios.post(
      `http://127.0.0.1:${server.address().port}/compatibility`,
      { ok: true },
      { headers: { "X-Check": "passed" }, proxy: false, timeout: 5000 },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { method: "POST", payload: { ok: true }, header: "passed" });
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  console.log(
    `Axios: ${axios.VERSION} preserves JSON bodies, headers and responses over loopback HTTP.`,
  );
}

try {
  await checkMath();
  await checkCss();
  await checkMcp();
  await checkAxios();
} catch (error) {
  console.error(`Dependency override check failed: ${error.message}`);
  process.exitCode = 1;
}
