<script lang="ts">
  import { pb } from "../lib/pb";
  import { OBJECT_TYPES, SECTIONS, defaultConfig, defaultPlacement } from "../lib/contentTypes";
  import type { ContentItem, ObjectType, Section } from "../lib/types";

  let { machineId, onCreated } = $props<{
    machineId: string;
    onCreated: (item: ContentItem) => void;
  }>();

  let open = $state(false);
  let type = $state<ObjectType>("text");
  let section = $state<Section>("usage");
  let titleFr = $state("");
  let err = $state("");
  let busy = $state(false);

  // champs de config, à plat pour rester simple — reconstruits en `config` typé à l'envoi
  let src = $state("");
  let pagesText = $state(""); // une URL par ligne (pdf)
  let textContent = $state("");
  let calloutLabel = $state("");
  let hotspotExpands = $state("");

  function resetFields() {
    src = "";
    pagesText = "";
    textContent = "";
    calloutLabel = "";
    hotspotExpands = "";
  }

  function buildConfig(): Record<string, unknown> {
    const cfg = defaultConfig(type);
    switch (type) {
      case "video":
      case "image":
      case "model":
        return { ...cfg, src };
      case "pdf":
        return {
          ...cfg,
          src,
          pages: pagesText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      case "text":
        return { ...cfg, content: { fr: textContent } };
      case "callout":
        return { ...cfg, label: { fr: calloutLabel } };
      case "hotspot":
        return { ...cfg, expands: hotspotExpands };
      default:
        return cfg;
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    err = "";
    try {
      const rec = await pb.collection("content_items").create<ContentItem>({
        machine: machineId,
        type,
        section,
        title: titleFr ? { fr: titleFr } : {},
        config: buildConfig(),
        sort: 0,
      });
      await pb.collection("placements").create({
        content_item: rec.id,
        ...defaultPlacement(type),
      });
      onCreated(rec);
      titleFr = "";
      resetFields();
      open = false;
    } catch (x) {
      err = String(x);
    } finally {
      busy = false;
    }
  }
</script>

{#if !open}
  <button onclick={() => (open = true)}>+ Ajouter un contenu</button>
{:else}
  <form class="panel form" onsubmit={submit}>
    <div class="grid-2">
      <div class="field">
        <label for="type">Type</label>
        <select id="type" bind:value={type}>
          {#each OBJECT_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="section">Onglet</label>
        <select id="section" bind:value={section}>
          {#each SECTIONS as s}<option value={s.value}>{s.label}</option>{/each}
        </select>
      </div>
    </div>
    <div class="field">
      <label for="title">Titre</label>
      <input id="title" bind:value={titleFr} placeholder="Ex. Prise en main" />
    </div>

    {#if type === "video" || type === "image" || type === "model"}
      <div class="field">
        <label for="src">URL du média</label>
        <input id="src" bind:value={src} placeholder="https://…" required />
      </div>
    {:else if type === "pdf"}
      <div class="field">
        <label for="src2">URL du PDF (optionnel)</label>
        <input id="src2" bind:value={src} placeholder="https://….pdf" />
      </div>
      <div class="field">
        <label for="pages">Pages (une URL d'image par ligne)</label>
        <textarea id="pages" rows="3" bind:value={pagesText} placeholder="https://…/p1.webp&#10;https://…/p2.webp" required></textarea>
      </div>
    {:else if type === "text"}
      <div class="field">
        <label for="content">Contenu</label>
        <textarea id="content" rows="3" bind:value={textContent} placeholder="Ø max 200 mm…" required></textarea>
      </div>
    {:else if type === "callout"}
      <div class="field">
        <label for="clabel">Étiquette</label>
        <input id="clabel" bind:value={calloutLabel} placeholder="Zone d'écrasement" required />
      </div>
    {:else if type === "hotspot"}
      <div class="field">
        <label for="expands">ID de l'objet déplié</label>
        <input id="expands" bind:value={hotspotExpands} placeholder="id d'un autre content_item" />
      </div>
    {/if}

    {#if err}<p class="error">{err}</p>{/if}
    <div class="row">
      <button class="primary" type="submit" disabled={busy}>{busy ? "Création…" : "Créer"}</button>
      <button type="button" class="ghost" onclick={() => (open = false)}>Annuler</button>
    </div>
  </form>
{/if}

<style>
  .form {
    margin: 0.75rem 0;
  }
</style>
