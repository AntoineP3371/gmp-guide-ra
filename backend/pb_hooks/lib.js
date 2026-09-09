// Helpers partagés. Chargé via require() DEPUIS l'intérieur des handlers
// (les callbacks de hook PocketBase s'exécutent dans un scope isolé : impossible
//  de référencer des fonctions déclarées au niveau module de main.pb.js).

const SECTIONS = [
  { id: "usage", label: { fr: "Utilisation", en: "Usage" } },
  { id: "maintenance", label: { fr: "Entretien", en: "Maintenance" } },
  { id: "capabilities", label: { fr: "Capacités", en: "Capabilities" } },
  { id: "safety", label: { fr: "Sécurité", en: "Safety" } },
];

function publicBaseUrl() {
  return $os.getenv("PUBLIC_BASE_URL") || "https://guide.gmp.example";
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function randomCode() {
  return $security.randomStringWithAlphabet(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");
}

function fileUrl(record, filename) {
  if (!filename) return "";
  return `${publicBaseUrl()}/api/files/${record.collection().id}/${record.id}/${filename}`;
}

// Assemble le scene manifest (voir docs/manifest-contract.md + schemas/manifest.schema.json)
function buildManifest(app, machine) {
  let items = [];
  try {
    items = app.findRecordsByFilter(
      "content_items",
      "machine = {:m}",
      "+section,+sort",
      500,
      0,
      { m: machine.id }
    );
  } catch (_) {
    items = [];
  }

  const objects = [];
  for (const it of items) {
    let placement;
    try {
      placement = app.findFirstRecordByFilter("placements", "content_item = {:c}", { c: it.id });
    } catch (_) {
      continue; // pas encore placé -> exclu du manifest publié
    }

    const cfg = Object.assign({}, it.get("config") || {});
    const type = it.get("type");
    if (it.get("media")) {
      const u = fileUrl(it, it.get("media"));
      if (type === "video" || type === "image" || type === "model") cfg.src = u;
      else if (type === "pdf") cfg.src = cfg.src || u;
    }
    if (type === "pdf") {
      const pages = it.get("media_pages") || [];
      cfg.pages = pages.map((p) => fileUrl(it, p));
    }

    objects.push({
      id: it.id,
      type: type,
      section: it.get("section"),
      title: it.get("title") || undefined,
      sort: it.get("sort") || 0,
      placement: {
        anchorMode: placement.get("anchor_mode") || "qr-relative",
        position: placement.get("position"),
        rotation: placement.get("rotation"),
        size: placement.get("size") || undefined,
        scale: placement.get("scale") || undefined,
        billboard: placement.get("billboard") || "none",
        source: placement.get("source") || "photo2d",
        updatedAt: placement.get("updated"),
      },
      config: cfg,
    });
  }

  const nextRevision = (machine.get("current_revision") || 0) + 1;

  return {
    revision: nextRevision,
    data: {
      manifestVersion: "1.0",
      machine: {
        id: machine.id,
        name: machine.get("name"),
        slug: machine.get("slug"),
        category: machine.get("category") || undefined,
        location: machine.get("location") || undefined,
        languages: machine.get("languages") || ["fr"],
        revision: nextRevision,
        publishedAt: new Date().toISOString(),
      },
      qr: {
        code: machine.get("qr_code"),
        payload: machine.get("qr_payload") || undefined,
        physicalSizeMeters: machine.get("qr_size_m"),
        errorCorrection: machine.get("qr_ecc") || "H",
      },
      frame: {
        convention: "right-handed",
        origin: "centre de la matrice de modules du QR (hors quiet zone)",
        axes: "X:+droite bord haut, Y:+haut bord gauche, Z:+normale sortante vers l'observateur",
        units: "meters",
      },
      sections: SECTIONS,
      objects: objects,
    },
  };
}

module.exports = { SECTIONS, publicBaseUrl, slugify, randomCode, fileUrl, buildManifest };
