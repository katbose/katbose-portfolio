// Exercises Mintlify's actual browser adapter after the Puppeteer security
// override. Uses a local page; no third-party site or credentials are needed.
// With downloads skipped, set PUPPETEER_EXECUTABLE_PATH to an installed Chrome.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { getHtmlWithPuppeteer, startPuppeteer } from "@mintlify/scraping/bin/utils/network.js";

const server = createServer((_request, response) => {
  response.setHeader("Content-Type", "text/html");
  response.end(
    "<!doctype html><html><body><h1>Docs browser check</h1><script>document.body.dataset.hydrated = 'yes';</script></body></html>",
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await startPuppeteer();
  assert.ok(browser, "Mintlify must launch its browser");
  const address = server.address();
  const html = await getHtmlWithPuppeteer(browser, new URL(`http://127.0.0.1:${address.port}`));
  assert.match(html, /Docs browser check/);
  assert.match(html, /data-hydrated="yes"/);
  console.log("Mintlify browser adapter: launch, navigate, run JavaScript, and read HTML passed");
} finally {
  await browser?.close();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
