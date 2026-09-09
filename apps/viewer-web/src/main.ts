import { createStage } from "./scene";
import { buildObjects, type Manifest } from "./build";

const stage = createStage();
const srcInput = document.getElementById("src") as HTMLInputElement;
const msg = document.getElementById("msg")!;
const errEl = document.getElementById("err")!;

const DEFAULT_SRC = "../../examples/manifest.example.json";

async function loadFrom(src: string) {
  errEl.textContent = "";
  msg.textContent = "Chargement…";
  try {
    const res = await fetch(src, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const manifest = (await res.json()) as Manifest;
    if (!manifest.objects) throw new Error("manifest sans champ `objects`");
    const warnings = buildObjects(manifest, stage.content, stage.camera);
    msg.textContent = `${manifest.machine?.name ?? "?"} — ${manifest.objects.length} objet(s)`;
    errEl.innerHTML = warnings.map((w) => `⚠ ${w}`).join("<br>");
  } catch (e) {
    msg.textContent = "";
    errEl.textContent = `Échec : ${(e as Error).message}`;
  }
}

const params = new URLSearchParams(location.search);
const initial =
  params.get("url") ||
  (params.get("code") ? `/api/manifest/${params.get("code")}` : "") ||
  DEFAULT_SRC;
srcInput.value = initial;
loadFrom(initial);

srcInput.addEventListener("change", () => loadFrom(srcInput.value.trim()));
