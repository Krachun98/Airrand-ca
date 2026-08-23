import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import quoteHandler from "../api/quote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 4173);

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

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = decoded.replace(/^\/+/, "");
  const requested = path.resolve(distDir, safePath);
  if (!requested.startsWith(distDir)) {
    return null;
  }
  return requested;
}

async function findFile(urlPath) {
  const requested = resolveFile(urlPath);
  if (!requested) return null;

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

function apiResponse(response) {
  return {
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(body));
      return this;
    },
  };
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://localhost:${port}`);

  if (requestUrl.pathname === "/api/quote" || requestUrl.pathname === "/api/quote/") {
    await quoteHandler(request, apiResponse(response));
    return;
  }

  const file = await findFile(requestUrl.pathname);

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const ext = path.extname(file);
  response.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, () => {
  console.log(`Airrand redesign running at http://localhost:${port}`);
});
