import { build } from "esbuild";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_MATCHES } from "./src/shared/constants.js";

import sharp from "sharp";
const root = path.dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
const target = process.argv[2] || "all";
if (!["chrome", "edge", "firefox", "all"].includes(target)) throw new Error(`unknown build target: ${target}`);
const platforms = target === "all" ? ["chrome", "firefox"] : [target === "edge" ? "chrome" : target];
const iconSource = path.join(root, "assets", "icons", "icon.svg");

for (const platform of platforms) {
  const outdir = path.join(root, "dist", platform);
  await rm(outdir, { recursive: true, force: true });
  await mkdir(path.join(outdir, "icons"), { recursive: true });
  const firefox = platform === "firefox";
  const background = firefox ? { scripts: ["background.js"] } : { service_worker: "background.js" };
  const manifest = {
    ...JSON.parse(await readFile(path.join(root, "manifest.base.json"), "utf8")),
    version,
    permissions: ["storage", "unlimitedStorage"],
    host_permissions: ["https://wowdata.rodmajors.com/*"],
    background,
    content_scripts: [
      { matches: SUPPORTED_MATCHES, js: ["content.js"], run_at: "document_start" },
    ],
    ...(firefox ? { browser_specific_settings: { gecko: { id: "rwes@rodmajors.com", strict_min_version: "142.0", data_collection_permissions: { required: ["none"] } } } } : {}),
  };
  await writeFile(path.join(outdir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await cp(path.join(root, "_locales"), path.join(outdir, "_locales"), { recursive: true });
  await Promise.all([
    build({ entryPoints: [path.join(root, "src/content/main.js")], bundle: true, format: "iife", outfile: path.join(outdir, "content.js"), platform: "browser", target: firefox ? ["firefox128"] : ["chrome111"], define: { "process.env.NODE_ENV": '"production"' } }),
    build({ entryPoints: [path.join(root, "src/background/entry.js")], bundle: true, format: "iife", outfile: path.join(outdir, "background.js"), platform: "browser", target: firefox ? ["firefox128"] : ["chrome111"], define: { "process.env.NODE_ENV": '"production"' } }),
    build({ entryPoints: [path.join(root, "src/popup/popup.js")], bundle: true, format: "iife", outfile: path.join(outdir, "popup.js"), platform: "browser", target: firefox ? ["firefox128"] : ["chrome111"], define: { "process.env.NODE_ENV": '"production"' } }),
  ]);
  await copyFile(path.join(root, "src/popup/popup.html"), path.join(outdir, "popup.html"));
  await copyFile(path.join(root, "src/popup/popup.css"), path.join(outdir, "popup.css"));
  await Promise.all([16, 32, 48, 128].map((size) => sharp(iconSource).resize(size, size).png().toFile(path.join(outdir, "icons", `icon${size}.png`))));
  const archive = path.join(root, "dist", `${platform}.zip`);
  await rm(archive, { force: true });
  const result = await import("node:child_process");
  const powershell = process.platform === "win32";
  if (!powershell) throw new Error("Use the Windows build host to create browser ZIPs.");
  const escapedDir = outdir.replaceAll("'", "''");
  const escapedArchive = archive.replaceAll("'", "''");
  await new Promise((resolve, reject) => {
    const proc = result.spawn("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path '${escapedDir}/*' -DestinationPath '${escapedArchive}' -Force`], { stdio: "inherit" });
    proc.on("error", reject); proc.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Compress-Archive exited ${code}`)));
  });
  console.log(`Built ${platform}: ${path.relative(root, outdir)}`);
}
if (target === "edge") console.log("Edge uses the Chrome MV3 package.");
