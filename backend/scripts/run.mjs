// Lance le binaire PocketBase avec les dossiers du dépôt (migrations, hooks, data).
// Usage : node backend/scripts/run.mjs serve            (ou : npm run backend:dev)
//         node backend/scripts/run.mjs superuser upsert admin@local dev12345

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, "..");
const exe = join(backend, "bin", process.platform === "win32" ? "pocketbase.exe" : "pocketbase");

if (!existsSync(exe)) {
  console.error("Binaire absent. Lance d'abord : npm run backend:get");
  process.exit(1);
}

const passthrough = process.argv.slice(2);
const args = passthrough.length ? passthrough : ["serve"];

// Chemins explicites pour que data/migrations/hooks vivent dans backend/
const common = [
  `--dir=${join(backend, "pb_data")}`,
  `--migrationsDir=${join(backend, "pb_migrations")}`,
  `--hooksDir=${join(backend, "pb_hooks")}`,
];

if (args[0] === "serve") {
  args.push("--http=127.0.0.1:8090");
}

const res = spawnSync(exe, [...args, ...common], { stdio: "inherit" });
process.exit(res.status ?? 0);
