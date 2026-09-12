<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { assembleDraftManifest } from "../lib/manifestPreview";
  import type { Machine } from "../lib/types";
  import type * as Viewer3d from "@gmp-guide-ra/viewer3d";

  let { machine } = $props<{ machine: Machine }>();

  let open = $state(false);
  let containerEl = $state<HTMLDivElement | null>(null);
  let stage: Viewer3d.Stage | null = null;
  let manifest = $state<Viewer3d.Manifest | null>(null);
  let stepIndex = $state(0);
  let warnings = $state<string[]>([]);
  let loading = $state(false);
  let err = $state("");

  // three.js est lourd (~180 Ko gzip) : chargé à la demande, seulement à l'ouverture du panneau.
  let viewer3d: typeof Viewer3d | null = null;

  const steps = $derived(manifest?.scenario?.mode === "guided" ? (manifest.scenario.steps ?? []) : []);

  async function refresh() {
    if (!containerEl) return;
    loading = true;
    err = "";
    try {
      if (!viewer3d) viewer3d = await import("@gmp-guide-ra/viewer3d");
      manifest = await assembleDraftManifest(machine);
      if (!stage) stage = viewer3d.createStage({ container: containerEl });
      stepIndex = 0;
      warnings = viewer3d.buildObjects(manifest, stage.content, stage.camera);
      viewer3d.applyScenarioVisibility(manifest, stage.content, stepIndex);
    } catch (x) {
      err = String(x);
    } finally {
      loading = false;
    }
  }

  function nav(dir: -1 | 1) {
    if (!manifest || steps.length === 0 || !stage || !viewer3d) return;
    stepIndex = Math.max(0, Math.min(steps.length - 1, stepIndex + dir));
    viewer3d.applyScenarioVisibility(manifest, stage.content, stepIndex);
  }

  async function toggle() {
    open = !open;
    if (open) {
      await tick(); // laisse le <div bind:this> apparaître dans le DOM avant de monter la scène
      await refresh();
    }
  }

  onDestroy(() => stage?.dispose());
</script>

<section class="panel">
  <div class="head">
    <h3>Aperçu 3D</h3>
    <div class="row">
      {#if open}
        <button class="ghost" onclick={refresh} disabled={loading}>
          {loading ? "…" : "Rafraîchir"}
        </button>
      {/if}
      <button class="primary" onclick={toggle}>{open ? "Fermer" : "Ouvrir l'aperçu"}</button>
    </div>
  </div>

  {#if err}<p class="error">{err}</p>{/if}

  {#if open}
    <div class="viewport" bind:this={containerEl}></div>

    {#if steps.length > 0}
      <div class="stepnav">
        <button onclick={() => nav(-1)} disabled={stepIndex === 0}>← Étape</button>
        <span>
          Étape {stepIndex + 1}/{steps.length}
          {#if steps[stepIndex]?.title?.fr}— {steps[stepIndex]?.title?.fr}{/if}
        </span>
        <button onclick={() => nav(1)} disabled={stepIndex === steps.length - 1}>Étape →</button>
      </div>
    {/if}

    {#if warnings.length}
      <p class="muted small">⚠ {warnings.join(" · ")}</p>
    {/if}
    <p class="muted small">
      Clic-glisser pour orbiter, molette pour zoomer. Repère blanc = QR. Les modèles 3D affichent
      une boîte générique ici — le vrai rendu se fait au casque.
    </p>
  {/if}
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .viewport {
    width: 100%;
    height: 420px;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-top: 0.75rem;
    overflow: hidden;
  }
  .stepnav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.6rem;
    font-size: 0.9rem;
  }
  .stepnav span {
    flex: 1;
  }
  .small {
    font-size: 0.85rem;
  }
</style>
