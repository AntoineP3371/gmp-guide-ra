<script lang="ts">
  import { onMount } from "svelte";
  import { pb } from "../lib/pb";
  import type { ContentItem, Machine, ScenarioStep, ScenarioMode, Transition, AdvanceTrigger } from "../lib/types";

  let { machine, items, canEdit, onMachineChange } = $props<{
    machine: Machine;
    items: ContentItem[];
    canEdit: boolean;
    onMachineChange: (m: Machine) => void;
  }>();

  let steps = $state<ScenarioStep[]>([]);
  let loading = $state(true);
  let err = $state("");
  let modeBusy = $state(false);

  // `bind:value` sur une propriété imbriquée d'un prop (machine.scenario_mode) ne pilote pas
  // fiablement la sélection DOM d'un <select> — miroir local en $state, resynchronisé par effet.
  let modeChoice = $state<ScenarioMode>("freeform");
  $effect(() => {
    modeChoice = machine.scenario_mode;
  });

  const TRANSITIONS: Transition[] = ["none", "fade", "pop", "slide"];
  const TRIGGERS: AdvanceTrigger[] = ["tap", "timer", "media_end"];

  function itemLabel(id: string): string {
    const it = items.find((i: ContentItem) => i.id === id);
    if (!it) return id.slice(0, 6) + "…";
    return `${it.title?.fr ?? it.type} (${it.type})`;
  }

  async function load() {
    loading = true;
    err = "";
    try {
      steps = await pb.collection("scenario_steps").getFullList<ScenarioStep>({
        filter: `machine="${machine.id}"`,
        sort: "sort",
      });
    } catch (x) {
      err = String(x);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function setMode(mode: ScenarioMode) {
    modeBusy = true;
    err = "";
    try {
      const updated = await pb.collection("machines").update<Machine>(machine.id, {
        scenario_mode: mode,
      });
      onMachineChange(updated);
      if (mode === "guided" && steps.length === 0) await addStep();
    } catch (x) {
      err = String(x);
    } finally {
      modeBusy = false;
    }
  }

  async function toggleAlwaysVisible(id: string) {
    const cur = machine.scenario_always_visible ?? [];
    const next = cur.includes(id) ? cur.filter((x: string) => x !== id) : [...cur, id];
    try {
      const updated = await pb.collection("machines").update<Machine>(machine.id, {
        scenario_always_visible: next,
      });
      onMachineChange(updated);
    } catch (x) {
      err = String(x);
    }
  }

  async function addStep() {
    const nextSort = steps.length ? Math.max(...steps.map((s) => s.sort)) + 1 : 0;
    try {
      const rec = await pb.collection("scenario_steps").create<ScenarioStep>({
        machine: machine.id,
        sort: nextSort,
        object_ids: [],
        advance_trigger: "tap",
        enter_transition: "fade",
        enter_duration_ms: 300,
      });
      steps = [...steps, rec];
    } catch (x) {
      err = String(x);
    }
  }

  async function patchStep(step: ScenarioStep, patch: Partial<ScenarioStep>) {
    try {
      const updated = await pb.collection("scenario_steps").update<ScenarioStep>(step.id, patch);
      steps = steps.map((s) => (s.id === step.id ? updated : s));
    } catch (x) {
      err = String(x);
    }
  }

  function toggleStepObject(step: ScenarioStep, id: string) {
    const next = step.object_ids.includes(id)
      ? step.object_ids.filter((x) => x !== id)
      : [...step.object_ids, id];
    patchStep(step, { object_ids: next });
  }

  async function removeStep(step: ScenarioStep) {
    try {
      await pb.collection("scenario_steps").delete(step.id);
      steps = steps.filter((s) => s.id !== step.id);
    } catch (x) {
      err = String(x);
    }
  }

  async function moveStep(step: ScenarioStep, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === step.id);
    const otherIdx = idx + dir;
    if (otherIdx < 0 || otherIdx >= steps.length) return;
    const other = steps[otherIdx];
    const [a, b] = [step.sort, other.sort];
    await Promise.all([
      pb.collection("scenario_steps").update(step.id, { sort: b }),
      pb.collection("scenario_steps").update(other.id, { sort: a }),
    ]);
    await load();
  }
</script>

<section class="panel">
  <div class="head">
    <h3>Scénario</h3>
    <select
      bind:value={modeChoice}
      disabled={!canEdit || modeBusy}
      onchange={() => setMode(modeChoice)}
    >
      <option value="freeform">Freeform (tout visible)</option>
      <option value="guided">Guidé (étapes séquencées)</option>
    </select>
  </div>

  {#if err}<p class="error">{err}</p>{/if}

  {#if machine.scenario_mode === "freeform"}
    <p class="muted small">
      Tous les contenus placés sont affichés en même temps. Passe en « Guidé » pour définir une
      chronologie (étapes, transitions, déclencheurs d'avancement).
    </p>
  {:else if loading}
    <p class="muted">Chargement…</p>
  {:else}
    <div class="always">
      <h4>Toujours visibles</h4>
      {#if items.length === 0}
        <p class="muted small">Aucun contenu à choisir — crée d'abord des objets ci-dessus.</p>
      {:else}
        <div class="chips">
          {#each items as it (it.id)}
            <label class="chip">
              <input
                type="checkbox"
                checked={(machine.scenario_always_visible ?? []).includes(it.id)}
                disabled={!canEdit}
                onchange={() => toggleAlwaysVisible(it.id)}
              />
              {itemLabel(it.id)}
            </label>
          {/each}
        </div>
      {/if}
    </div>

    <h4>Étapes</h4>
    {#each steps as step, i (step.id)}
      <div class="step panel">
        <div class="step-head">
          <strong>Étape {i + 1}</strong>
          <div class="row">
            <button class="ghost" disabled={!canEdit || i === 0} onclick={() => moveStep(step, -1)}>↑</button>
            <button class="ghost" disabled={!canEdit || i === steps.length - 1} onclick={() => moveStep(step, 1)}>↓</button>
            <button class="ghost" disabled={!canEdit} onclick={() => removeStep(step)}>Supprimer</button>
          </div>
        </div>

        <div class="field">
          <label for={`title-${step.id}`}>Titre</label>
          <input
            id={`title-${step.id}`}
            value={step.title?.fr ?? ""}
            disabled={!canEdit}
            onchange={(e) => patchStep(step, { title: { fr: (e.target as HTMLInputElement).value } })}
          />
        </div>

        <div class="field">
          <label for={`objs-${step.id}`}>Objets actifs pendant cette étape</label>
          {#if items.length === 0}
            <p class="muted small">Aucun contenu disponible.</p>
          {:else}
            <div class="chips">
              {#each items as it (it.id)}
                <label class="chip">
                  <input
                    type="checkbox"
                    checked={step.object_ids.includes(it.id)}
                    disabled={!canEdit}
                    onchange={() => toggleStepObject(step, it.id)}
                  />
                  {itemLabel(it.id)}
                </label>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grid-2">
          <div class="field">
            <label for={`trans-${step.id}`}>Transition d'entrée</label>
            <select
              id={`trans-${step.id}`}
              bind:value={step.enter_transition}
              disabled={!canEdit}
              onchange={(e) =>
                patchStep(step, { enter_transition: (e.target as HTMLSelectElement).value as Transition })}
            >
              {#each TRANSITIONS as t}<option value={t}>{t}</option>{/each}
            </select>
          </div>
          <div class="field">
            <label for={`dur-${step.id}`}>Durée (ms)</label>
            <input
              id={`dur-${step.id}`}
              type="number"
              min="0"
              value={step.enter_duration_ms ?? 300}
              disabled={!canEdit}
              onchange={(e) =>
                patchStep(step, { enter_duration_ms: Number((e.target as HTMLInputElement).value) })}
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for={`trig-${step.id}`}>Avancer quand…</label>
            <select
              id={`trig-${step.id}`}
              bind:value={step.advance_trigger}
              disabled={!canEdit}
              onchange={(e) => {
                const trigger = (e.target as HTMLSelectElement).value as AdvanceTrigger;
                const patch: Partial<ScenarioStep> = { advance_trigger: trigger };
                if (trigger === "timer" && !step.advance_after_seconds) patch.advance_after_seconds = 5;
                patchStep(step, patch);
              }}
            >
              <option value="tap">L'opérateur valide (tap)</option>
              <option value="timer">Délai fixe</option>
              <option value="media_end">Fin de lecture média</option>
            </select>
          </div>
          {#if step.advance_trigger === "timer"}
            <div class="field">
              <label for={`after-${step.id}`}>Après (secondes)</label>
              <input
                id={`after-${step.id}`}
                type="number"
                min="1"
                value={step.advance_after_seconds ?? 5}
                disabled={!canEdit}
                onchange={(e) =>
                  patchStep(step, { advance_after_seconds: Number((e.target as HTMLInputElement).value) })}
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if canEdit}
      <button onclick={addStep}>+ Ajouter une étape</button>
    {/if}
  {/if}
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .always {
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
  }
  h4 {
    margin: 0.4rem 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--border);
    background: var(--panel-2);
    border-radius: 999px;
    padding: 0.2rem 0.6rem 0.2rem 0.4rem;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .step {
    margin: 0.6rem 0;
    background: var(--panel-2);
  }
  .step-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .small {
    font-size: 0.85rem;
  }
</style>
