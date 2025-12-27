import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { minify as minifyJS } from "terser";
import CleanCSS from "clean-css";
import { glob } from "glob";

const CDN_BASE = "https://cdn.minenepal.xyz";

const paths = {
  images: { src: "upload/images", dist: "dist/images" },
  js: { src: "upload/js", dist: "dist/js" },
  css: { src: "upload/css", dist: "dist/css" }
};

const manifest = {};

await fs.remove("dist");
await fs.ensureDir("dist");

/* ---------------- IMAGES ---------------- */
const imageFiles = await glob(`${paths.images.src}/**/*.{png,jpg,jpeg,gif,svg}`);

for (const file of imageFiles) {
  const rel = path.relative(paths.images.src, file);
  const outDir = path.join(paths.images.dist, path.dirname(rel));
  await fs.ensureDir(outDir);

  const filename = path.basename(file);
  const rawUrl = `${CDN_BASE}/upload/images/${rel.replace(/\\/g, "/")}`;

  if (file.endsWith(".svg") || file.endsWith(".gif")) {
    const distPath = path.join(outDir, filename);
    await fs.copy(file, distPath);

    manifest[filename] = {
      raw: rawUrl,
      dist: `${CDN_BASE}/dist/images/${rel.replace(/\\/g, "/")}`
    };
    continue;
  }

  const webpName =
    path.basename(file, path.extname(file)) + ".webp";
  const distPath = path.join(outDir, webpName);

  await sharp(file).webp({ quality: 80 }).toFile(distPath);

  manifest[filename] = {
    raw: rawUrl,
    dist: `${CDN_BASE}/dist/images/${path
      .join(path.dirname(rel), webpName)
      .replace(/\\/g, "/")}`
  };
}

/* ---------------- JS ---------------- */
const jsFiles = await glob(`${paths.js.src}/**/*.js`);

for (const file of jsFiles) {
  const rel = path.relative(paths.js.src, file);
  const outFile = path.join(paths.js.dist, rel);

  await fs.ensureDir(path.dirname(outFile));

  const code = await fs.readFile(file, "utf8");
  const result = await minifyJS(code);

  await fs.writeFile(outFile, result.code);

  const filename = path.basename(file);
  manifest[filename] = {
    raw: `${CDN_BASE}/upload/js/${rel.replace(/\\/g, "/")}`,
    dist: `${CDN_BASE}/dist/js/${rel.replace(/\\/g, "/")}`
  };
}

/* ---------------- CSS ---------------- */
const cssFiles = await glob(`${paths.css.src}/**/*.css`);
const cleaner = new CleanCSS();

for (const file of cssFiles) {
  const rel = path.relative(paths.css.src, file);
  const outFile = path.join(paths.css.dist, rel);

  await fs.ensureDir(path.dirname(outFile));

  const css = await fs.readFile(file, "utf8");
  const result = cleaner.minify(css);

  await fs.writeFile(outFile, result.styles);

  const filename = path.basename(file);
  manifest[filename] = {
    raw: `${CDN_BASE}/upload/css/${rel.replace(/\\/g, "/")}`,
    dist: `${CDN_BASE}/dist/css/${rel.replace(/\\/g, "/")}`
  };
}

/* ---------------- MANIFEST ---------------- */
await fs.writeJson("dist/data.json", manifest, { spaces: 2 });

console.log("✅ CDN build + data.json generated");
