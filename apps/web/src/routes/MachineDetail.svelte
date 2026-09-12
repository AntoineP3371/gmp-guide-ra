<script lang="ts">
  import { onMount } from "svelte";
  import { link } from "svelte-spa-router";
  import { pb } from "../lib/pb";
  import { canEdit } from "../lib/auth.svelte";
  import { qrSvg } from "../lib/qr";
  import { printMachineLabel } from "../lib/print";
  import ContentItemForm from "../components/ContentItemForm.svelte";
  import ScenarioEditor from "../components/ScenarioEditor.svelte";
  import PlacementEditor from "../components/PlacementEditor.svelte";
  import PreviewPanel from "../components/PreviewPanel.svelte";
  import type { Machine, ContentItem, Placement, Ecc } from "../lib/types";

  let { params } = $props<{ params: { id: string } }>();

  let machine = $state<Machine | null>(null);
  let items = $state<ContentItem[]>([]);
  let placements = $state<Placement[]>([]);
  let qrHtml = $state("");
  let err = $state("");
  let msg = $state("");
  let saving = $state(false);
  let publishing = $state(false);

  const eccOptions: Ecc[] = ["H", "Q", "M", "L"];
  const SECTION_LABEL: Record<string, string> = {
    usage: "Utilisation",
    maintenance: "Entretien",
    capabilities: "Capacités",
    safety: "Sécurité",
  };

  async function refreshQr() {
    if (machine) qrHtml = await qrSvg(machine.qr_payload || machine.qr_code, machine.qr_ecc);
  }

  async function load() {
    err = "";
    try {
      machine = await pb.collection("machines").getOne<Machine>(params.id);
      items = await pb.collection("content_items").getFullList<ContentItem>({
        filter: `machine="${params.id}"`,
        sort: "section,sort",
      });
      placements =
        items.length === 0
          ? []
          : await pb.collection("placements").getFullList<Placement>({
              filter: items.map((i) => `content_item="${i.id}"`).join(" || "),
            });
      await refreshQr();
    } catch (e) {
      err = String(e);
    }
  }
  onMount(load);

  async function save(e: Event) {
    e.preventDefault();
    if (!machine) return;
    saving = true;
    err = "";
    msg = "";
    try {
      machine = await pb.collection("machines").update<Machine>(machine.id, {
        name: machine.name,
        category: machine.category,
        location: machine.location,
        description: machine.description,
        qr_size_m: machine.qr_size_m,
        qr_ecc: machine.qr_ecc,
      });
      await refreshQr();
      msg = "Enregistré.";
    } catch (x) {
      err = String(x);
    } finally {
      saving = false;
    }
  }

  async function publish() {
    if (!machine) return;
    publishing = true;
    err = "";
    msg = "";
    try {
      const res = await pb.send<{ revision: number }>(`/api/publish/${machine.id}`, {
        method: "POST",
      });
      machine = await pb.collection("machines").getOne<Machine>(machine.id);
      msg = `Publié — révision ${res.revision}. Manifest : /api/manifest/${machine.qr_code}`;
    } catch (x) {
      err = String(x);
    } finally {
      publishing = false;
    }
  }

  async function removeItem(item: ContentItem) {
    if (!confirm(`Supprimer « ${item.title?.fr ?? item.type} » ?`)) return;
    try {
      await pb.collection("content_items").delete(item.id);
      items = items.filter((i) => i.id !== item.id);
      placements = placements.filter((p) => p.content_item !== item.id);
    } catch (x) {
      err = String(x);
    }
  }

  const bySection = $derived(
    (["usage", "maintenance", "capabilities", "safety"] as const).map((s) => ({
      section: s,
      list: items.filter((i) => i.section === s),
    }))
  );
</script>

<p><a href="/" use:link>← Machines</a></p>

{#if err}<p class="error">{err}</p>{/if}
{#if msg}<p style="color:var(--ok)">{msg}</p>{/if}

{#if !machine}
  <p class="muted">Chargement…</p>
{:else}
  <div class="cols">
    <section class="panel">
      <h2>{machine.name}</h2>
      <form onsubmit={save}>
        <div class="field">
          <label for="n">Nom</label>
          <input id="n" bind:value={machine.name} disabled={!canEdit()} />
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="c">Catégorie</label>
            <input id="c" bind:value={machine.category} disabled={!canEdit()} />
          </div>
          <div class="field">
            <label for="l">Localisation</label>
            <input id="l" bind:value={machine.location} disabled={!canEdit()} />
          </div>
        </div>
        <div class="field">
          <label for="d">Description</label>
          <textarea id="d" rows="3" bind:value={machine.description} disabled={!canEdit()}></textarea>
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="qs">Taille QR imprimée (m)</label>
            <input
              id="qs"
              type="number"
              step="0.005"
              min="0.04"
              bind:value={machine.qr_size_m}
              disabled={!canEdit()}
            />
          </div>
          <div class="field">
            <label for="qe">Correction d'erreur</label>
            <select id="qe" bind:value={machine.qr_ecc} disabled={!canEdit()}>
              {#each eccOptions as o}<option value={o}>{o}</option>{/each}
            </select>
          </div>
        </div>
        {#if canEdit()}
          <button class="primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        {/if}
      </form>
    </section>

    <section class="panel qrcard">
      <h3>QR code</h3>
      <div class="qrbox">{@html qrHtml}</div>
      <p class="muted">
        <span class="pill">{machine.qr_code}</span><br />
        {machine.qr_payload}
      </p>
      <button onclick={() => machine && printMachineLabel(machine)}>Imprimer l'étiquette</button>
      <p class="muted small">
        Étiquette à l'échelle 1:1 ({Math.round(machine.qr_size_m * 1000)} mm), repères de coupe,
        consigne de plastification.
      </p>
    </section>
  </div>

  <section class="panel">
    <div class="head">
      <h3>Contenus</h3>
      <div class="row">
        <span class="muted">{items.length} objet(s)</span>
        {#if canEdit()}
          <button class="primary" onclick={publish} disabled={publishing}>
            {publishing ? "Publication…" : "Publier le manifest"}
          </button>
        {/if}
      </div>
    </div>

    {#if canEdit()}
      <ContentItemForm
        machineId={machine.id}
        onCreated={(it, pl) => {
          items = [...items, it];
          placements = [...placements, pl];
        }}
      />
    {/if}

    {#each bySection as grp}
      <div class="section">
        <h4>{SECTION_LABEL[grp.section]}</h4>
        {#if grp.list.length === 0}
          <p class="muted small">Aucun contenu.</p>
        {:else}
          <ul>
            {#each grp.list as it (it.id)}
              <li>
                <span class="pill">{it.type}</span>
                {it.title?.fr ?? it.id}
                {#if canEdit()}
                  <button class="ghost" onclick={() => removeItem(it)}>Supprimer</button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}

    <p class="muted small">
      Chaque contenu reçoit un placement par défaut, à affiner ci-dessous sur la photo (puis en
      6DoF au casque). Les médias vidéo/PDF/image se déclarent ici par URL en attendant l'upload
      direct.
    </p>
  </section>

  <PlacementEditor
    {machine}
    {items}
    {placements}
    canEdit={canEdit()}
    onMachineChange={(m) => (machine = m)}
    onPlacementChange={(p) => (placements = placements.map((x) => (x.id === p.id ? p : x)))}
  />

  <ScenarioEditor
    {machine}
    {items}
    canEdit={canEdit()}
    onMachineChange={(m) => (machine = m)}
  />

  <PreviewPanel {machine} />
{/if}

<style>
  .cols {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .qrcard {
    text-align: center;
  }
  .qrbox {
    width: 220px;
    height: 220px;
    margin: 0.5rem auto;
    background: #fff;
    padding: 10px;
    border-radius: 8px;
  }
  .qrbox :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section {
    border-top: 1px solid var(--border);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
  .section h4 {
    margin: 0.2rem 0;
  }
  .small {
    font-size: 0.85rem;
  }
  ul {
    margin: 0.3rem 0;
    list-style: none;
    padding: 0;
  }
  ul li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }
  @media (max-width: 800px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
