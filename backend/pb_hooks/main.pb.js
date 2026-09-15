/// <reference path="../pb_data/types.d.ts" />

// GMP Guide RA — logique backend
//  1. génération slug / qr_code / qr_payload à la création d'une machine
//  2. garde-fou sur l'écriture des placements par le compte casque (role "viewer")
//  3. POST /api/publish/{machine}   → assemble + fige un manifest, incrémente la révision
//  4. GET  /api/manifest/{code}     → dernier manifest publié pour un qr_code (app casque)
//
// NB1 : chaque callback de hook/route s'exécute dans un scope isolé → on require('lib.js')
//       À L'INTÉRIEUR de chaque callback (les déclarations top-level de ce fichier ne sont
//       pas visibles depuis les callbacks).
// NB2 : deux pièges JSVM constatés empiriquement (PocketBase 0.40.x), tous deux contournés
//       ci-dessous :
//       a) Indexer (`v[i]`) ou lire `.length` sur la valeur renvoyée par `record.get()` pour
//          un champ `json` (array/objet) peut la corrompre (on récupère les octets de sa
//          représentation JSON au lieu des éléments). Lecture fiable :
//          `JSON.parse(record.getString(name))` → voir `jsonArr`/`jsonObj` ci-dessous.
//       b) Un DateTime Go brut (`record.get()` sur un champ `date`/`autodate`) intégré tel
//          quel dans l'objet passé à `record.set("champJson", ...)` casse le marshal JSON de
//          TOUT l'enregistrement — PocketBase répond alors « <champ>: cannot be blank » sans
//          rapport apparent avec la vraie cause. Toujours faire `String(record.get("champDate"))`
//          avant d'embarquer une date dans un champ `json`.

// ------------------------------------------------------------- machines: création
onRecordCreate((e) => {
  const { slugify, randomCode, publicBaseUrl } = require(`${__hooks}/lib.js`);
  const r = e.record;

  if (!r.get("slug")) r.set("slug", slugify(r.get("name")));
  if (!r.get("qr_ecc")) r.set("qr_ecc", "H");
  if (!r.get("status")) r.set("status", "draft");
  if (r.get("qr_size_m") == null || r.get("qr_size_m") === 0) r.set("qr_size_m", 0.12);
  if (!r.get("languages")) r.set("languages", ["fr"]);
  if (!r.get("scenario_mode")) r.set("scenario_mode", "freeform");
  r.set("current_revision", 0);

  if (!r.get("qr_code")) {
    const suffix = randomCode();
    r.set("qr_code", `GMP-${suffix}`);
    if (!r.get("qr_payload")) r.set("qr_payload", `${publicBaseUrl()}/m/${suffix}`);
  }

  e.next();
}, "guidera_machines");

// ------------------------------------------ placements: écriture par compte casque
// Un compte role "viewer" (app Unity) ne peut que déplacer un objet existant :
// il force source = "headset" et ne touche pas aux champs de liaison.
onRecordUpdateRequest((e) => {
  const auth = e.auth;
  if (auth && auth.get("role") === "viewer") {
    const original = e.app.findRecordById("guidera_placements", e.record.id);
    e.record.set("content_item", original.get("content_item"));
    e.record.set("anchor_mode", original.get("anchor_mode"));
    e.record.set("source", "headset");
  }
  e.next();
}, "guidera_placements");

// ----------------------------------------------------- POST /api/publish/{machine}
routerAdd(
  "POST",
  "/api/publish/{machine}",
  (e) => {
    const { SECTIONS, publicBaseUrl } = require(`${__hooks}/lib.js`);

    const auth = e.auth;
    if (!auth || (auth.get("role") !== "admin" && auth.get("role") !== "author")) {
      return e.json(403, { error: "role auteur requis" });
    }

    let machine;
    try {
      machine = e.app.findRecordById("guidera_machines", e.request.pathValue("machine"));
    } catch (_) {
      return e.json(404, { error: "machine inconnue" });
    }

    // ---- lecture sûre des champs `json` — voir NB2 en tête de fichier ----
    function jsonArr(record, name) {
      try {
        const p = JSON.parse(record.getString(name) || "[]");
        return Array.isArray(p) ? p : [];
      } catch (_) {
        return [];
      }
    }
    function jsonObj(record, name) {
      try {
        const p = JSON.parse(record.getString(name) || "{}");
        return p && typeof p === "object" && !Array.isArray(p) && Object.keys(p).length
          ? p
          : undefined;
      } catch (_) {
        return undefined;
      }
    }
    function fileUrl(record, filename) {
      if (!filename) return "";
      return `${publicBaseUrl()}/api/files/${record.collection().id}/${record.id}/${filename}`;
    }
    function stripNulls(v) {
      if (Array.isArray(v)) return v.map(stripNulls);
      if (v && typeof v === "object") {
        const out = {};
        const keys = Object.keys(v);
        for (let i = 0; i < keys.length; i++) {
          const c = stripNulls(v[keys[i]]);
          if (c !== null && c !== undefined) out[keys[i]] = c;
        }
        return out;
      }
      return v;
    }

    // ---- objets + placements ----
    let items = [];
    try {
      items = e.app.findRecordsByFilter(
        "guidera_content_items",
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
        placement = e.app.findFirstRecordByFilter("guidera_placements", "content_item = {:c}", {
          c: it.id,
        });
      } catch (_) {
        continue; // pas encore placé -> exclu du manifest publié
      }

      const cfg = jsonObj(it, "config") || {};
      const type = it.get("type");
      if (it.get("media")) {
        const u = fileUrl(it, it.get("media"));
        if (type === "video" || type === "image" || type === "model") cfg.src = u;
        else if (type === "pdf") cfg.src = cfg.src || u;
      }
      if (type === "pdf") {
        // media_pages est un champ `file` multi (pas `json`) : .get() renvoie un vrai array JS.
        const files = it.get("media_pages") || [];
        cfg.pages = files.map((p) => fileUrl(it, p));
      }

      const size = jsonArr(placement, "size");

      objects.push({
        id: it.id,
        type: type,
        section: it.get("section"),
        title: jsonObj(it, "title"),
        sort: it.get("sort") || 0,
        placement: {
          anchorMode: placement.get("anchor_mode") || "qr-relative",
          position: jsonArr(placement, "position"),
          rotation: jsonArr(placement, "rotation"),
          size: size.length ? size : undefined,
          scale: placement.get("scale") || undefined,
          billboard: placement.get("billboard") || "none",
          source: placement.get("source") || "photo2d",
          // new Date(String(...)) : un DateTime Go brut casse le marshal JSON de tout
          // l'enregistrement (PocketBase renvoie "data: cannot be blank" — piège JSVM
          // constaté) ; on repasse aussi par Date pour un ISO 8601 strict (le format
          // natif PocketBase a un espace au lieu du "T").
          updatedAt: new Date(String(placement.get("updated"))).toISOString(),
        },
        config: cfg,
      });
    }

    // ---- scénario ----
    const scenarioMode = machine.get("scenario_mode") || "freeform";
    const scenario = { mode: scenarioMode };
    if (scenarioMode === "guided") {
      scenario.alwaysVisible = jsonArr(machine, "scenario_always_visible");
      let stepRows = [];
      try {
        stepRows = e.app.findRecordsByFilter("guidera_scenario_steps", "machine = {:m}", "+sort", 200, 0, {
          m: machine.id,
        });
      } catch (_) {
        stepRows = [];
      }
      scenario.steps = stepRows.map((s) => {
        const step = {
          id: s.id,
          title: jsonObj(s, "title"),
          objectIds: jsonArr(s, "object_ids"),
          enter: {
            transition: s.get("enter_transition") || "fade",
            durationMs: s.get("enter_duration_ms") || 300,
          },
          advance: { trigger: s.get("advance_trigger") || "tap" },
        };
        if (step.advance.trigger === "timer") {
          step.advance.afterSeconds = s.get("advance_after_seconds") || 5;
        }
        return step;
      });
    }

    // ---- assemblage ----
    const nextRevision = (machine.get("current_revision") || 0) + 1;
    const languagesRaw = jsonArr(machine, "languages");

    const manifestData = stripNulls({
      manifestVersion: "1.0",
      machine: {
        id: machine.id,
        name: machine.get("name"),
        slug: machine.get("slug"),
        category: machine.get("category") || undefined,
        location: machine.get("location") || undefined,
        languages: languagesRaw.length ? languagesRaw : ["fr"],
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
      scenario: scenario,
      objects: objects,
    });

    const col = e.app.findCollectionByNameOrId("guidera_manifests");
    const rec = new Record(col);
    rec.set("machine", machine.id);
    rec.set("revision", nextRevision);
    rec.set("data", manifestData);
    rec.set("published_by", auth.id);
    e.app.save(rec);

    machine.set("current_revision", nextRevision);
    machine.set("status", "published");
    e.app.save(machine);

    return e.json(200, { revision: nextRevision, manifest: manifestData });
  },
  $apis.requireAuth()
);

// ------------------------------------------------------ GET /api/manifest/{code}
// {code} = qr_code complet (GMP-XXXXXX) ou suffixe court (XXXXXX)
routerAdd(
  "GET",
  "/api/manifest/{code}",
  (e) => {
    let code = e.request.pathValue("code");
    if (code && !code.startsWith("GMP-")) code = `GMP-${code}`;

    let machine;
    try {
      machine = e.app.findFirstRecordByFilter("guidera_machines", "qr_code = {:c}", { c: code });
    } catch (_) {
      return e.json(404, { error: "QR inconnu" });
    }

    let manifest;
    try {
      const rows = e.app.findRecordsByFilter(
        "guidera_manifests",
        "machine = {:m}",
        "-revision",
        1,
        0,
        { m: machine.id }
      );
      manifest = rows[0];
    } catch (_) {
      manifest = null;
    }
    if (!manifest) return e.json(409, { error: "machine jamais publiée" });

    e.response.header().set("Cache-Control", "public, max-age=60");
    return e.json(200, JSON.parse(manifest.getString("data") || "{}"));
  },
  $apis.requireAuth()
);
