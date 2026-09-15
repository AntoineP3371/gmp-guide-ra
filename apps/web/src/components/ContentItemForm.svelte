<script lang="ts">
  import { pb } from "../lib/pb";
  import { OBJECT_TYPES, SECTIONS, defaultConfig, defaultPlacement } from "../lib/contentTypes";
  import {
    renderPdfToPages,
    readVideoMeta,
    captureVideoThumbnail,
    formatBytes,
    type PdfPage,
    type VideoMeta,
  } from "../lib/media";
  import type { ContentItem, ObjectType, Placement, Section } from "../lib/types";

  let { machineId, onCreated } = $props<{
    machineId: string;
    onCreated: (item: ContentItem, placement: Placement) => void;
  }>();

  let open = $state(false);
  let type = $state<ObjectType>("text");
  let section = $state<Section>("usage");
  let titleFr = $state("");
  let err = $state("");
  let busy = $state(false);
  let busyLabel = $state("");

  // Média : fichier uploadé (prioritaire) ou URL externe en repli.
  let mediaFile = $state<File | null>(null);
  let srcUrl = $state("");
  let videoMeta = $state<VideoMeta | null>(null);
  let videoThumb = $state<Blob | null>(null);
  let videoLoop = $state(false);
  let videoAutoplay = $state(false);
  let videoMuted = $state(false);
  let pdfPages = $state<PdfPage[] | null>(null);
  let pagesText = $state(""); // repli manuel (une URL par ligne) si pas de fichier PDF
  let mediaWarning = $state("");

  let textContent = $state("");
  let calloutLabel = $state("");
  let hotspotExpands = $state("");

  function resetMediaFields() {
    mediaFile = null;
    srcUrl = "";
    videoMeta = null;
    videoThumb = null;
    videoLoop = false;
    videoAutoplay = false;
    videoMuted = false;
    pdfPages = null;
    pagesText = "";
    mediaWarning = "";
    err = "";
  }

  function resetFields() {
    resetMediaFields();
    textContent = "";
    calloutLabel = "";
    hotspotExpands = "";
  }

  async function onPickMedia(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    mediaFile = file;
    err = "";
    mediaWarning = "";
    videoMeta = null;
    videoThumb = null;
    pdfPages = null;

    if (type === "video") {
      busy = true;
      busyLabel = "Analyse de la vidéo…";
      try {
        videoMeta = await readVideoMeta(file);
        if (videoMeta.bitrateMbps > 6) {
          mediaWarning = `Débit ≈ ${videoMeta.bitrateMbps.toFixed(1)} Mbps — pense à compresser avant l'atelier (cible ≤ 4 Mbps, le Pi n'a pas de quoi transcoder).`;
        }
        videoThumb = await captureVideoThumbnail(file);
      } catch (x) {
        err = String(x);
        mediaFile = null;
      } finally {
        busy = false;
        busyLabel = "";
      }
    } else if (type === "pdf") {
      busy = true;
      busyLabel = "Rendu des pages du PDF…";
      try {
        pdfPages = await renderPdfToPages(file);
      } catch (x) {
        err = String(x);
        mediaFile = null;
        pdfPages = null;
      } finally {
        busy = false;
        busyLabel = "";
      }
    }
  }

  function buildConfig(): Record<string, unknown> {
    const cfg = defaultConfig(type);
    switch (type) {
      case "video":
        return {
          ...cfg,
          loop: videoLoop,
          autoplay: videoAutoplay,
          muted: videoMuted,
          ...(mediaFile ? {} : { src: srcUrl }),
        };
      case "image":
      case "model":
        return mediaFile ? cfg : { ...cfg, src: srcUrl };
      case "pdf":
        // fichier uploadé -> src/pages remplis par le backend depuis media/media_pages
        return mediaFile
          ? cfg
          : {
              ...cfg,
              src: srcUrl,
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

  function hasMedia(): boolean {
    if (type === "video" || type === "image" || type === "model") return !!(mediaFile || srcUrl.trim());
    if (type === "pdf") return !!(mediaFile || srcUrl.trim() || pagesText.trim());
    return true;
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (!hasMedia()) {
      err = "Ajoute un fichier ou une URL avant de créer ce contenu.";
      return;
    }
    busy = true;
    busyLabel = "Envoi…";
    err = "";
    try {
      const fd = new FormData();
      fd.append("machine", machineId);
      fd.append("type", type);
      fd.append("section", section);
      fd.append("title", JSON.stringify(titleFr ? { fr: titleFr } : {}));
      fd.append("config", JSON.stringify(buildConfig()));
      fd.append("sort", "0");
      if (mediaFile) fd.append("media", mediaFile);
      if (type === "video" && videoThumb) fd.append("thumbnail", videoThumb, "thumb.webp");
      if (type === "pdf" && pdfPages) {
        pdfPages.forEach((p, i) =>
          fd.append("media_pages", p.blob, `page-${String(i + 1).padStart(2, "0")}.webp`)
        );
      }

      const rec = await pb.collection("guidera_content_items").create<ContentItem>(fd);
      const placement = await pb.collection("guidera_placements").create<Placement>({
        content_item: rec.id,
        ...defaultPlacement(type),
      });
      onCreated(rec, placement);
      titleFr = "";
      resetFields();
      open = false;
    } catch (x) {
      err = String(x);
    } finally {
      busy = false;
      busyLabel = "";
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
        <select id="type" bind:value={type} onchange={resetMediaFields}>
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

    {#if type === "video"}
      <div class="field">
        <label for="mediafile">Fichier vidéo</label>
        <input id="mediafile" type="file" accept="video/*" onchange={onPickMedia} disabled={busy} />
      </div>
      {#if mediaFile && videoMeta}
        <p class="muted small">
          {mediaFile.name} — {videoMeta.width}×{videoMeta.height}, {videoMeta.duration.toFixed(1)}
          s, {formatBytes(mediaFile.size)}
          {#if videoThumb}· vignette générée{/if}
        </p>
        {#if mediaWarning}<p class="warn small">{mediaWarning}</p>{/if}
      {/if}
      {#if !mediaFile}
        <div class="field">
          <label for="src">…ou URL externe</label>
          <input id="src" bind:value={srcUrl} placeholder="https://…" />
        </div>
      {/if}
      <div class="row checks">
        <label><input type="checkbox" bind:checked={videoAutoplay} /> lecture auto</label>
        <label><input type="checkbox" bind:checked={videoLoop} /> boucle</label>
        <label><input type="checkbox" bind:checked={videoMuted} /> muet</label>
      </div>
    {:else if type === "image" || type === "model"}
      <div class="field">
        <label for="mediafile">Fichier {type === "image" ? "image" : "3D (.glb/.gltf)"}</label>
        <input
          id="mediafile"
          type="file"
          accept={type === "image" ? "image/*" : ".glb,.gltf"}
          onchange={onPickMedia}
          disabled={busy}
        />
      </div>
      {#if mediaFile}<p class="muted small">{mediaFile.name} — {formatBytes(mediaFile.size)}</p>{/if}
      {#if !mediaFile}
        <div class="field">
          <label for="src">…ou URL externe</label>
          <input id="src" bind:value={srcUrl} placeholder="https://…" />
        </div>
      {/if}
    {:else if type === "pdf"}
      <div class="field">
        <label for="mediafile">Fichier PDF</label>
        <input
          id="mediafile"
          type="file"
          accept="application/pdf,.pdf"
          onchange={onPickMedia}
          disabled={busy}
        />
      </div>
      {#if mediaFile && pdfPages}
        <p class="muted small">
          {mediaFile.name} — {pdfPages.length} page(s) rendue(s) en WebP dans le navigateur.
        </p>
      {/if}
      {#if !mediaFile}
        <div class="field">
          <label for="src2">URL du PDF (optionnel)</label>
          <input id="src2" bind:value={srcUrl} placeholder="https://….pdf" />
        </div>
        <div class="field">
          <label for="pages">Pages (une URL d'image par ligne)</label>
          <textarea
            id="pages"
            rows="3"
            bind:value={pagesText}
            placeholder="https://…/p1.webp&#10;https://…/p2.webp"
          ></textarea>
        </div>
      {/if}
    {:else if type === "text"}
      <div class="field">
        <label for="content">Contenu</label>
        <textarea id="content" rows="3" bind:value={textContent} placeholder="Ø max 200 mm…" required
        ></textarea>
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
      <button class="primary" type="submit" disabled={busy}>
        {busy ? busyLabel || "…" : "Créer"}
      </button>
      <button type="button" class="ghost" onclick={() => (open = false)} disabled={busy}>Annuler</button>
    </div>
  </form>
{/if}

<style>
  .form {
    margin: 0.75rem 0;
  }
  .checks {
    gap: 1rem;
    margin: 0.5rem 0 0.75rem;
    font-size: 0.85rem;
  }
  .checks label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--text);
  }
  .warn {
    color: #e0a93a;
  }
</style>
