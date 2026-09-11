<script lang="ts">
  import { pb } from "../lib/pb";
  import type { ContentItem, Machine, Placement } from "../lib/types";

  let { machine, items, placements, canEdit, onMachineChange, onPlacementChange } = $props<{
    machine: Machine;
    items: ContentItem[];
    placements: Placement[];
    canEdit: boolean;
    onMachineChange: (m: Machine) => void;
    onPlacementChange: (p: Placement) => void;
  }>();

  let imgEl = $state<HTMLImageElement | null>(null);
  let naturalW = $state(0);
  let naturalH = $state(0);
  let uploading = $state(false);
  let err = $state("");

  // "origin" = prochain clic pose le centre du QR ; "width" = prochain clic pose son bord droit
  let calibrating = $state<"origin" | "width" | null>(null);
  let originDraft: [number, number] | null = null;

  let selectedItemId = $state<string | null>(null);
  let dragging = $state<string | null>(null);
  let liveFrac = $state<Record<string, { fx: number; fy: number }>>({});

  const photoFilename = $derived(machine.photos?.[0] ?? null);
  const photoUrl = $derived(
    photoFilename ? pb.files.getURL(machine, photoFilename, { thumb: "1200x0" }) : null
  );
  const calibrated = $derived(!!machine.photo_qr_origin && !!machine.photo_qr_width_frac);

  function placementFor(itemId: string): Placement | undefined {
    return placements.find((p: Placement) => p.content_item === itemId);
  }

  function fracFromEvent(e: { clientX: number; clientY: number }): { fx: number; fy: number } {
    const r = imgEl!.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { fx, fy };
  }

  /** mètres par pixel "naturel" de la photo (supposés carrés : même échelle en X et Y). */
  function metersPerNaturalPixel(): number {
    return machine.qr_size_m / (machine.photo_qr_width_frac! * naturalW);
  }

  function fracToMeters(fx: number, fy: number): [number, number] {
    const [ox, oy] = machine.photo_qr_origin!;
    const mpp = metersPerNaturalPixel();
    const dxNat = (fx - ox) * naturalW;
    const dyNat = (fy - oy) * naturalH;
    return [dxNat * mpp, -dyNat * mpp];
  }

  function metersToFrac(x: number, y: number): { fx: number; fy: number } {
    const [ox, oy] = machine.photo_qr_origin!;
    const mpp = metersPerNaturalPixel();
    const dxNat = x / mpp;
    const dyNat = -y / mpp;
    return { fx: ox + dxNat / naturalW, fy: oy + dyNat / naturalH };
  }

  function markerFrac(item: ContentItem): { fx: number; fy: number } | null {
    if (dragging === item.id && liveFrac[item.id]) return liveFrac[item.id];
    if (!calibrated) return null;
    const p = placementFor(item.id);
    if (!p) return null;
    return metersToFrac(p.position[0], p.position[1]);
  }

  async function onPhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    err = "";
    try {
      const fd = new FormData();
      fd.append("photos+", file);
      const updated = await pb.collection("machines").update<Machine>(machine.id, fd);
      onMachineChange(updated);
    } catch (x) {
      err = String(x);
    } finally {
      uploading = false;
    }
  }

  function onImgLoad() {
    if (imgEl) {
      naturalW = imgEl.naturalWidth;
      naturalH = imgEl.naturalHeight;
    }
  }

  async function saveCalibration(origin: [number, number], widthFrac: number) {
    try {
      const updated = await pb.collection("machines").update<Machine>(machine.id, {
        photo_qr_origin: origin,
        photo_qr_width_frac: widthFrac,
      });
      onMachineChange(updated);
    } catch (x) {
      err = String(x);
    }
  }

  async function commitPlacement(itemId: string, fx: number, fy: number) {
    const p = placementFor(itemId);
    if (!p) return;
    const [x, y] = fracToMeters(fx, fy);
    try {
      const updated = await pb.collection("placements").update<Placement>(p.id, {
        position: [x, y, p.position[2]],
        source: "photo2d",
      });
      onPlacementChange(updated);
    } catch (x) {
      err = String(x);
    }
  }

  function onWrapClick(e: MouseEvent) {
    if (!canEdit || !imgEl) return;
    const { fx, fy } = fracFromEvent(e);

    if (calibrating === "origin") {
      originDraft = [fx, fy];
      calibrating = "width";
      return;
    }
    if (calibrating === "width" && originDraft) {
      // origin = CENTRE du QR -> l'écart au bord est un DEMI-côté, d'où le ×2.
      const widthFrac = Math.abs(fx - originDraft[0]) * 2;
      calibrating = null;
      if (widthFrac > 0.005) saveCalibration(originDraft, widthFrac);
      else err = "Écart trop faible, recommence.";
      return;
    }
    if (selectedItemId && calibrated) {
      commitPlacement(selectedItemId, fx, fy);
    }
  }

  function startCalibration() {
    calibrating = "origin";
    selectedItemId = null;
  }

  function startDrag(item: ContentItem, e: PointerEvent) {
    if (!canEdit || !calibrated) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = item.id;
    liveFrac[item.id] = fracFromEvent(e);
  }
  function onWrapPointerMove(e: PointerEvent) {
    if (!dragging || !imgEl) return;
    liveFrac[dragging] = fracFromEvent(e);
  }
  async function onWrapPointerUp() {
    if (!dragging) return;
    const id = dragging;
    dragging = null;
    const f = liveFrac[id];
    if (f) await commitPlacement(id, f.fx, f.fy);
  }
</script>

<section class="panel">
  <div class="head">
    <h3>Placement sur photo</h3>
    {#if canEdit && photoUrl}
      <button class="ghost" onclick={startCalibration} disabled={!!calibrating}>
        {calibrated ? "Recalibrer le QR" : "Calibrer le QR"}
      </button>
    {/if}
  </div>

  {#if err}<p class="error">{err}</p>{/if}

  {#if !photoUrl}
    {#if canEdit}
      <p class="muted small">Ajoute une photo de la machine pour pouvoir y placer les contenus.</p>
      <input type="file" accept="image/*" onchange={onPhotoChange} disabled={uploading} />
      {#if uploading}<p class="muted small">Envoi…</p>{/if}
    {:else}
      <p class="muted small">Aucune photo.</p>
    {/if}
  {:else}
    {#if calibrating}
      <p class="hint">
        {calibrating === "origin"
          ? "Étape 1/2 — clique au centre du QR sur la photo."
          : "Étape 2/2 — clique sur le bord droit du QR."}
      </p>
    {:else if !calibrated}
      <p class="muted small">
        Calibre d'abord la position du QR sur la photo (bouton ci-dessus) avant de placer des
        contenus.
      </p>
    {/if}

    <div class="cols2">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="photo-wrap"
        class:crosshair={calibrating !== null || (!!selectedItemId && calibrated)}
        onclick={onWrapClick}
        onpointermove={onWrapPointerMove}
        onpointerup={onWrapPointerUp}
        role="application"
        aria-label="Photo de la machine — clique pour placer un objet ou calibrer le QR"
        tabindex="0"
      >
        <img bind:this={imgEl} src={photoUrl} alt="Machine" onload={onImgLoad} draggable="false" />

        {#if calibrated && !calibrating}
          <div
            class="marker origin-marker"
            style={`left:${machine.photo_qr_origin![0] * 100}%; top:${machine.photo_qr_origin![1] * 100}%`}
            title="QR"
          >
            ⊕
          </div>
        {/if}

        {#each items as it (it.id)}
          {@const f = !calibrating ? markerFrac(it) : null}
          {#if f}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="marker item-marker"
              class:selected={selectedItemId === it.id}
              class:dragging={dragging === it.id}
              style={`left:${f.fx * 100}%; top:${f.fy * 100}%`}
              onpointerdown={(e) => startDrag(it, e)}
              onclick={(e) => e.stopPropagation()}
              title={it.title?.fr ?? it.type}
              role="button"
              tabindex="0"
            >
              {it.type[0].toUpperCase()}
            </div>
          {/if}
        {/each}
      </div>

      <div class="palette">
        <p class="muted small">
          {selectedItemId
            ? "Clique sur la photo pour placer l'objet sélectionné."
            : "Choisis un objet puis clique sur la photo — ou fais glisser un repère existant."}
        </p>
        <ul>
          {#each items as it (it.id)}
            <li>
              <button
                class="pchip"
                class:selected={selectedItemId === it.id}
                disabled={!canEdit || !calibrated}
                onclick={() => (selectedItemId = selectedItemId === it.id ? null : it.id)}
              >
                <span class="pill">{it.type}</span>
                {it.title?.fr ?? it.id.slice(0, 6)}
              </button>
            </li>
          {/each}
        </ul>
        {#if canEdit}
          <label class="repl">
            Remplacer la photo
            <input type="file" accept="image/*" onchange={onPhotoChange} disabled={uploading} />
          </label>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .hint {
    background: var(--panel-2);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  .cols2 {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  .photo-wrap {
    position: relative;
    line-height: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    user-select: none;
    touch-action: none;
  }
  .photo-wrap.crosshair {
    cursor: crosshair;
  }
  .photo-wrap img {
    width: 100%;
    display: block;
  }
  .marker {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: grab;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5);
  }
  .origin-marker {
    background: #fff;
    color: #000;
    cursor: default;
    font-size: 1rem;
  }
  .item-marker {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .item-marker.selected {
    outline: 2px solid #fff;
  }
  .item-marker.dragging {
    cursor: grabbing;
    opacity: 0.85;
  }
  .palette ul {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0;
    display: grid;
    gap: 0.35rem;
  }
  .pchip {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    text-align: left;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.35rem 0.5rem;
    color: var(--text);
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
  }
  .pchip.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 20%, var(--panel-2));
  }
  .repl {
    display: block;
    font-size: 0.8rem;
    color: var(--muted);
    margin-top: 0.5rem;
  }
  .repl input {
    margin-top: 0.25rem;
  }
  @media (max-width: 700px) {
    .cols2 {
      grid-template-columns: 1fr;
    }
  }
</style>
