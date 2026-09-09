// Télécharge le binaire PocketBase dans backend/bin/
// Usage : node backend/scripts/get-pocketbase.mjs   (ou : npm run backend:get)
// Override version : PB_VERSION=0.28.0 node backend/scripts/get-pocketbase.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const binDir = join(here, "..", "bin");
const tmpZip = join(binDir, "_pb.zip");

const osMap = { win32: "windows", darwin: "darwin", linux: "linux" };
const archMap = { x64: "amd64", arm64: "arm64" };
const pbOs = osMap[process.platform];
const pbArch = archMap[process.arch];
if (!pbOs || !pbArch) {
  console.error(`Plateforme non supportée : ${process.platform}/${process.arch}`);
  process.exit(1);
}

async function resolveVersion() {
  if (process.env.PB_VERSION) return process.env.PB_VERSION.replace(/^v/, "");
  const res = await fetch("https://api.github.com/repos/pocketbase/pocketbase/releases/latest", {
    headers: { "User-Agent": "gmp-guide-ra-setup" },
  });
  if (!res.ok) {
    console.error(
      `Impossible de résoudre la dernière version (${res.status}). ` +
        `Relance avec PB_VERSION=x.y.z node backend/scripts/get-pocketbase.mjs`
    );
    process.exit(1);
  }
  const json = await res.json();
  return String(json.tag_name).replace(/^v/, "");
}

const version = await resolveVersion();
const exe = pbOs === "windows" ? "pocketbase.exe" : "pocketbase";
const asset = `pocketbase_${version}_${pbOs}_${pbArch}.zip`;
const url = `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${asset}`;

mkdirSync(binDir, { recursive: true });
if (existsSync(join(binDir, exe))) {
  console.log(`Déjà présent : backend/bin/${exe} — supprime-le pour forcer le retéléchargement.`);
  process.exit(0);
}

console.log(`Téléchargement ${asset} ...`);
const dl = await fetch(url, { headers: { "User-Agent": "gmp-guide-ra-setup" } });
if (!dl.ok) {
  console.error(`Échec téléchargement (${dl.status}) : ${url}`);
  process.exit(1);
}
writeFileSync(tmpZip, Buffer.from(await dl.arrayBuffer()));

console.log("Extraction ...");
try {
  if (process.platform === "win32") {
    execFileSync(
      "powershell",
      ["-NoProfile", "-Command", `Expand-Archive -Force -Path '${tmpZip}' -DestinationPath '${binDir}'`],
      { stdio: "inherit" }
    );
  } else {
    execFileSync("unzip", ["-o", tmpZip, "-d", binDir], { stdio: "inherit" });
    execFileSync("chmod", ["+x", join(binDir, exe)]);
  }
} finally {
  rmSync(tmpZip, { force: true });
}

console.log(`OK → backend/bin/${exe} (v${version})`);
console.log("Lance : npm run backend:dev");
