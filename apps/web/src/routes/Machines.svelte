<script lang="ts">
  import { onMount } from "svelte";
  import { push, link } from "svelte-spa-router";
  import { pb } from "../lib/pb";
  import { canEdit } from "../lib/auth.svelte";
  import type { Machine } from "../lib/types";

  let machines = $state<Machine[]>([]);
  let loading = $state(true);
  let err = $state("");

  let name = $state("");
  let category = $state("");
  let location = $state("");
  let qrSizeMm = $state(120);
  let creating = $state(false);
  let showForm = $state(false);

  async function load() {
    loading = true;
    err = "";
    try {
      machines = await pb.collection("machines").getFullList<Machine>({ sort: "name" });
    } catch (e) {
      err = String(e);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function create(e: Event) {
    e.preventDefault();
    creating = true;
    err = "";
    try {
      const rec = await pb.collection("machines").create<Machine>({
        name,
        category,
        location,
        qr_size_m: qrSizeMm / 1000,
      });
      push(`/machine/${rec.id}`);
    } catch (x) {
      err = String(x);
    } finally {
      creating = false;
    }
  }
</script>

<div class="head">
  <h1>Machines</h1>
  {#if canEdit()}
    <button class="primary" onclick={() => (showForm = !showForm)}>
      {showForm ? "Annuler" : "Nouvelle machine"}
    </button>
  {/if}
</div>

{#if showForm}
  <form class="panel" onsubmit={create}>
    <div class="grid-2">
      <div class="field">
        <label for="n">Nom *</label>
        <input id="n" bind:value={name} required placeholder="Tour CN Haas ST-20" />
      </div>
      <div class="field">
        <label for="c">Catégorie</label>
        <input id="c" bind:value={category} placeholder="Tournage" />
      </div>
      <div class="field">
        <label for="l">Localisation</label>
        <input id="l" bind:value={location} placeholder="Atelier B — îlot 3" />
      </div>
      <div class="field">
        <label for="s">Taille QR imprimée (mm)</label>
        <input id="s" type="number" min="40" max="400" bind:value={qrSizeMm} />
      </div>
    </div>
    {#if err}<p class="error">{err}</p>{/if}
    <button class="primary" type="submit" disabled={creating}>
      {creating ? "Création…" : "Créer + générer le QR"}
    </button>
  </form>
{/if}

{#if loading}
  <p class="muted">Chargement…</p>
{:else if err && !showForm}
  <p class="error">{err}</p>
{:else if machines.length === 0}
  <p class="muted">Aucune machine. Crée la première.</p>
{:else}
  <ul class="list">
    {#each machines as m (m.id)}
      <li class="panel">
        <a href={`/machine/${m.id}`} use:link class="mname">{m.name}</a>
        <div class="meta">
          <span class="pill">{m.qr_code}</span>
          {#if m.category}<span class="muted">{m.category}</span>{/if}
          {#if m.location}<span class="muted">· {m.location}</span>{/if}
          <span class="pill">{m.status}</span>
          <span class="muted">rév. {m.current_revision}</span>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .list {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }
  .mname {
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
  }
  .meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  form {
    margin-bottom: 1rem;
  }
</style>
