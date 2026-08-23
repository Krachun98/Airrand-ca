import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const errors = [];
const warnings = [];

async function walk(dir, predicate, files = []) {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const file = path.join(dir, entry);
    const info = await stat(file);
    if (info.isDirectory()) {
      await walk(file, predicate, files);
    } else if (predicate(file)) {
      files.push(file);
    }
  }
  return files;
}

function has(pattern, html) {
  return pattern.test(html);
}

function localTargetToFile(target) {
  const clean = target.split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("mailto:") || clean.startsWith("tel:")) return null;
  if (clean.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(clean)) return null;

  const normalized = clean.startsWith("/") ? clean.slice(1) : clean;
  if (!normalized) return path.join(distDir, "index.html");
  if (path.extname(normalized)) return path.join(distDir, normalized);
  return path.join(distDir, normalized.replace(/\/$/, ""), "index.html");
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const htmlFiles = await walk(distDir, (file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const relative = path.relative(distDir, file).replaceAll("\\", "/");
  const html = await readFile(file, "utf8");

  if (!has(/<title>[^<]{12,}<\/title>/i, html)) errors.push(`${relative}: missing useful title`);
  if (!has(/<meta name="description" content="[^"]{40,}">/i, html)) {
    errors.push(`${relative}: missing useful meta description`);
  }
  if (!has(/<link rel="canonical" href="https:\/\/www\.airrand\.ca/i, html)) {
    errors.push(`${relative}: missing canonical URL`);
  }
  if (!has(/property="og:title"/i, html) || !has(/property="og:description"/i, html)) {
    errors.push(`${relative}: missing Open Graph metadata`);
  }
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) errors.push(`${relative}: expected exactly one H1, found ${h1Count}`);
  if (/lorem ipsum/i.test(html)) errors.push(`${relative}: contains lorem ipsum`);

  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const [tag] of imageTags) {
    if (!/\salt="[^"]+"/i.test(tag)) errors.push(`${relative}: image missing alt text: ${tag.slice(0, 90)}`);
  }

  const scriptTags = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const match of scriptTags) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${relative}: invalid JSON-LD (${error.message})`);
    }
  }

  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
  for (const ref of refs) {
    const target = localTargetToFile(ref);
    if (target && !(await exists(target))) {
      errors.push(`${relative}: broken local reference ${ref}`);
    }
  }

  if (/AggregateRating|aggregateRating|ratingValue|reviewRating/.test(html)) {
    errors.push(`${relative}: contains rating schema or review rating claims`);
  }
}

for (const required of ["sitemap.xml", "robots.txt", "favicon.svg", "site.webmanifest"]) {
  if (!(await exists(path.join(distDir, required)))) {
    errors.push(`missing ${required}`);
  }
}

const servicePages = htmlFiles.filter((file) => file.includes(`${path.sep}services${path.sep}`));
if (servicePages.length < 12) {
  warnings.push(`expected at least 12 service pages, found ${servicePages.length}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (warnings.length) {
  console.warn(warnings.join("\n"));
}

console.log(`Validated ${htmlFiles.length} HTML pages with metadata, links, image alt text and JSON-LD.`);
