import { createStage, buildObjects, applyScenarioVisibility, type Manifest } from "@gmp-guide-ra/viewer3d";

const stage = createStage({ container: document.body });
const srcInput = document.getElementById("src") as HTMLInputElement;
const msg = document.getElementById("msg")!;
const errEl = document.getElementById("err")!;
const stepnav = document.getElementById("stepnav")!;
const steplabel = document.getElementById("steplabel")!;
const prevBtn = document.getElementById("prevStep") as HTMLButtonElement;
const nextBtn = document.getElementById("nextStep") as HTMLButtonElement;

// Copie statique de examples/manifest.example.json (Vite ne sert pas hors de son racine de
// projet par défaut ; voir apps/viewer-web/public/README.md pour la synchro).
const DEFAULT_SRC = "/manifest.example.json";

let manifest: Manifest | null = null;
let stepIndex = 0;

function renderStepNav() {
  const steps = manifest?.scenario?.mode === "guided" ? manifest.scenario.steps ?? [] : [];
  if (!manifest || steps.length === 0) {
    stepnav.classList.remove("show");
    return;
  }
  stepnav.classList.add("show");
  const step = steps[stepIndex];
  steplabel.textContent = `Étape ${stepIndex + 1}/${steps.length}${step?.title?.fr ? " — " + step.title.fr : ""}`;
  prevBtn.disabled = stepIndex === 0;
  nextBtn.disabled = stepIndex === steps.length - 1;
  applyScenarioVisibility(manifest, stage.content, stepIndex);
}

prevBtn.addEventListener("click", () => {
  stepIndex = Math.max(0, stepIndex - 1);
  renderStepNav();
});
nextBtn.addEventListener("click", () => {
  const steps = manifest?.scenario?.mode === "guided" ? manifest.scenario.steps ?? [] : [];
  stepIndex = Math.min(steps.length - 1, stepIndex + 1);
  renderStepNav();
});

async function loadFrom(src: string) {
  errEl.textContent = "";
  msg.textContent = "Chargement…";
  try {
    const res = await fetch(src, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    manifest = (await res.json()) as Manifest;
    if (!manifest.objects) throw new Error("manifest sans champ `objects`");
    const warnings = buildObjects(manifest, stage.content, stage.camera);
    stepIndex = 0;
    renderStepNav();
    const mode = manifest.scenario?.mode ?? "freeform";
    msg.textContent = `${manifest.machine?.name ?? "?"} — ${manifest.objects.length} objet(s) — scénario: ${mode}`;
    errEl.innerHTML = warnings.map((w) => `⚠ ${w}`).join("<br>");
  } catch (e) {
    manifest = null;
    stepnav.classList.remove("show");
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
