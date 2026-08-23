import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const screenshotDir = path.join(rootDir, "audit-screenshots");
const require = createRequire(import.meta.url);

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return require(
      "C:/Users/krach/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    );
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

async function servePath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const requested = path.resolve(distDir, safePath);
  if (!requested.startsWith(distDir)) return null;

  try {
    const info = await stat(requested);
    if (info.isFile()) return requested;
    if (info.isDirectory()) {
      const index = path.join(requested, "index.html");
      if ((await stat(index)).isFile()) return index;
    }
  } catch {
    const index = path.join(requested, "index.html");
    try {
      if ((await stat(index)).isFile()) return index;
    } catch {
      return null;
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  const file = await servePath(requestUrl.pathname);
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": mimeTypes[path.extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const routes = [
  "/",
  "/services/",
  "/services/air-conditioning/",
  "/services/furnaces/",
  "/services/commercial-hvac/",
  "/commercial/",
  "/projects/",
  "/about/",
  "/contact/",
];
const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const errors = [];
await mkdir(screenshotDir, { recursive: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith(baseUrl) && response.status() >= 400) {
      consoleErrors.push(`${response.status()} ${url}`);
    }
  });

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (const image of document.images) {
        image.loading = "eager";
      }
      const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
      for (let y = 0; y <= pageHeight; y += step) {
        window.scrollTo(0, y);
        await delay(120);
      }
      for (const image of document.images) {
        if (image.src.startsWith("data:")) continue;
        image.scrollIntoView({ block: "center", inline: "nearest" });
        await delay(40);
        if (image.decode) {
          await image.decode().catch(() => {});
        }
      }
      window.scrollTo(0, 0);
      await delay(120);
    });

    const title = await page.title();
    if (!title.includes("Airrand")) {
      errors.push(`${viewport.width}px ${route}: title does not include Airrand`);
    }

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      errors.push(`${viewport.width}px ${route}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`);
    }

    const brokenImages = await page.evaluate(() =>
      [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );
    if (brokenImages.length) {
      errors.push(`${viewport.width}px ${route}: broken images ${brokenImages.join(", ")}`);
    }

    const visibleTextOverflow = await page.evaluate(() => {
      const offenders = [];
      const nodes = [...document.querySelectorAll("a, button, h1, h2, h3, p, label, span, small")];
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (node.scrollWidth > Math.ceil(rect.width) + 2 && getComputedStyle(node).whiteSpace !== "normal") {
          offenders.push(node.textContent.trim().slice(0, 60));
        }
      }
      return offenders.slice(0, 5);
    });
    if (visibleTextOverflow.length) {
      errors.push(`${viewport.width}px ${route}: possible text overflow ${visibleTextOverflow.join(" | ")}`);
    }
  }

  if (viewport.width <= 430) {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.locator("[data-nav-toggle]").click();
    const mobileNavVisible = await page.locator("[data-mobile-nav]").isVisible();
    if (!mobileNavVisible) errors.push(`${viewport.width}px: mobile navigation did not open`);
  }

  if (viewport.width === 1024) {
    await page.goto(`${baseUrl}/projects/`, { waitUntil: "networkidle" });
    await page.locator("[data-lightbox-src]").first().click();
    const lightboxVisible = await page.locator("[data-lightbox]").isVisible();
    if (!lightboxVisible) errors.push("1024px /projects/: lightbox did not open");
    await page.locator("[data-lightbox-close]").click();
  }

  if (viewport.width === 390) {
    await page.goto(`${baseUrl}/contact/`, { waitUntil: "networkidle" });
    await page.locator('input[name="name"]').fill("Test Contact");
    await page.locator('input[name="phone"]').fill("6476292208");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('select[name="service"]').selectOption({ label: "Air Conditioning" });
    await page.locator('textarea[name="message"]').fill("Testing the Airrand contact form fields.");
  }

  if ([375, 390, 1024, 1440].includes(viewport.width)) {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotDir, `home-${viewport.width}.png`), fullPage: true });
  }

  if (consoleErrors.length) {
    errors.push(`${viewport.width}px console/errors: ${consoleErrors.join(" | ")}`);
  }

  await context.close();
}

await browser.close();
server.close();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Browser audit passed for ${routes.length} routes at ${viewports.length} viewport widths.`);
console.log(`Screenshots written to ${path.relative(rootDir, screenshotDir)}`);
