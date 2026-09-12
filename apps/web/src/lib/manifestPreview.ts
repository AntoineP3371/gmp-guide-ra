// Assemble un manifest DE PRÉVISUALISATION, côté client, à partir de l'état courant en base —
// sans passer par /api/publish (pas de nouvelle révision, pas de changement de statut machine).
// Reflète la même forme que backend/pb_hooks/main.pb.js (buildManifest), en plus permissif :
// les objets sans placement sont simplement ignorés plutôt que de faire échouer l'aperçu.

import { pb } from "./pb";
import type { Machine, ContentItem, Placement, ScenarioStep } from "./types";
import type { Manifest } from "@gmp-guide-ra/viewer3d";

function fileUrl(record: { collectionId?: string; collectionName?: string; id: string }, filename?: string) {
  if (!filename) return undefined;
  return pb.files.getURL(record as any, filename);
}

export async function assembleDraftManifest(machine: Machine): Promise<Manifest> {
  const items = await pb.collection("content_items").getFullList<ContentItem>({
    filter: `machine="${machine.id}"`,
  });
  const placements = items.length
    ? await pb.collection("placements").getFullList<Placement>({
        filter: items.map((i) => `content_item="${i.id}"`).join(" || "),
      })
    : [];
  const placementByItem = new Map(placements.map((p) => [p.content_item, p]));

  const objects: Manifest["objects"] = [];
  for (const it of items) {
    const p = placementByItem.get(it.id);
    if (!p) continue; // pas encore placé -> pas d'aperçu possible pour cet objet

    const cfg: Record<string, unknown> = { ...(it.config ?? {}) };
    if (it.media) {
      const url = fileUrl(it, it.media);
      if (it.type === "video" || it.type === "image" || it.type === "model") cfg.src = url;
      else if (it.type === "pdf") cfg.src = cfg.src || url;
    }
    if (it.type === "pdf" && it.media_pages?.length) {
      cfg.pages = it.media_pages.map((f) => fileUrl(it, f));
    }

    objects.push({
      id: it.id,
      type: it.type,
      section: it.section,
      title: it.title,
      placement: {
        position: p.position,
        rotation: p.rotation,
        size: p.size ?? undefined,
        scale: p.scale,
        billboard: p.billboard ?? "none",
      },
      config: cfg,
    });
  }

  const mode = machine.scenario_mode ?? "freeform";
  const scenario: Manifest["scenario"] = { mode };
  if (mode === "guided") {
    scenario.alwaysVisible = machine.scenario_always_visible ?? [];
    const steps = await pb.collection("scenario_steps").getFullList<ScenarioStep>({
      filter: `machine="${machine.id}"`,
      sort: "sort",
    });
    scenario.steps = steps.map((s) => ({
      id: s.id,
      title: s.title,
      objectIds: s.object_ids ?? [],
      advance: { trigger: s.advance_trigger, afterSeconds: s.advance_after_seconds },
    }));
  }

  return {
    machine: { name: machine.name },
    qr: { physicalSizeMeters: machine.qr_size_m },
    scenario,
    objects,
  };
}
