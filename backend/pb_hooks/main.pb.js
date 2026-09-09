/// <reference path="../pb_data/types.d.ts" />

// GMP Guide RA — logique backend
//  1. génération slug / qr_code / qr_payload à la création d'une machine
//  2. garde-fou sur l'écriture des placements par le compte casque (role "viewer")
//  3. POST /api/publish/{machine}   → assemble + fige un manifest, incrémente la révision
//  4. GET  /api/manifest/{code}     → dernier manifest publié pour un qr_code (app casque)
//
// NB : chaque callback s'exécute dans un scope isolé → on require('lib.js') À L'INTÉRIEUR.

// ------------------------------------------------------------- machines: création
onRecordCreate((e) => {
  const { slugify, randomCode, publicBaseUrl } = require(`${__hooks}/lib.js`);
  const r = e.record;

  if (!r.get("slug")) r.set("slug", slugify(r.get("name")));
  if (!r.get("qr_ecc")) r.set("qr_ecc", "H");
  if (!r.get("status")) r.set("status", "draft");
  if (r.get("qr_size_m") == null || r.get("qr_size_m") === 0) r.set("qr_size_m", 0.12);
  if (!r.get("languages")) r.set("languages", ["fr"]);
  r.set("current_revision", 0);

  if (!r.get("qr_code")) {
    const suffix = randomCode();
    r.set("qr_code", `GMP-${suffix}`);
    if (!r.get("qr_payload")) r.set("qr_payload", `${publicBaseUrl()}/m/${suffix}`);
  }

  e.next();
}, "machines");

// ------------------------------------------ placements: écriture par compte casque
// Un compte role "viewer" (app Unity) ne peut que déplacer un objet existant :
// il force source = "headset" et ne touche pas aux champs de liaison.
onRecordUpdateRequest((e) => {
  const auth = e.auth;
  if (auth && auth.get("role") === "viewer") {
    const original = e.app.findRecordById("placements", e.record.id);
    e.record.set("content_item", original.get("content_item"));
    e.record.set("anchor_mode", original.get("anchor_mode"));
    e.record.set("source", "headset");
  }
  e.next();
}, "placements");

// ----------------------------------------------------- POST /api/publish/{machine}
routerAdd(
  "POST",
  "/api/publish/{machine}",
  (e) => {
    const { buildManifest } = require(`${__hooks}/lib.js`);

    const auth = e.auth;
    if (!auth || (auth.get("role") !== "admin" && auth.get("role") !== "author")) {
      return e.json(403, { error: "role auteur requis" });
    }

    let machine;
    try {
      machine = e.app.findRecordById("machines", e.request.pathValue("machine"));
    } catch (_) {
      return e.json(404, { error: "machine inconnue" });
    }

    const built = buildManifest(e.app, machine);

    const col = e.app.findCollectionByNameOrId("manifests");
    const rec = new Record(col);
    rec.set("machine", machine.id);
    rec.set("revision", built.revision);
    rec.set("data", built.data);
    rec.set("published_by", auth.id);
    e.app.save(rec);

    machine.set("current_revision", built.revision);
    machine.set("status", "published");
    e.app.save(machine);

    return e.json(200, { revision: built.revision, manifest: built.data });
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
      machine = e.app.findFirstRecordByFilter("machines", "qr_code = {:c}", { c: code });
    } catch (_) {
      return e.json(404, { error: "QR inconnu" });
    }

    let manifest;
    try {
      const rows = e.app.findRecordsByFilter(
        "manifests",
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
    return e.json(200, manifest.get("data"));
  },
  $apis.requireAuth()
);
