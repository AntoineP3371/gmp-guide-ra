/// <reference path="../pb_data/types.d.ts" />

// Schéma initial GMP Guide RA — testé avec PocketBase 0.40.x
// Collections : users(+role), machines, content_items, placements, manifests, anchors, analytics_events

migrate(
  (app) => {
    const AUTHOR = '@request.auth.role = "admin" || @request.auth.role = "author"';
    const AUTHED = '@request.auth.id != ""';

    // ---------------------------------------------------------------- users.role
    {
      const users = app.findCollectionByNameOrId("users");
      users.fields.add(
        new SelectField({
          name: "role",
          required: true,
          maxSelect: 1,
          values: ["admin", "author", "viewer"],
        })
      );
      app.save(users);
    }

    // ------------------------------------------------------------------ machines
    const machines = new Collection({
      type: "base",
      name: "machines",
      listRule: AUTHED,
      viewRule: AUTHED,
      createRule: AUTHOR,
      updateRule: AUTHOR,
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        { type: "text", name: "name", required: true, max: 200 },
        { type: "text", name: "slug", required: true, pattern: "^[a-z0-9-]+$" },
        { type: "text", name: "category" },
        { type: "text", name: "location" },
        { type: "json", name: "languages", maxSize: 2000 },
        { type: "editor", name: "description" },
        {
          type: "file",
          name: "photos",
          maxSelect: 10,
          maxSize: 15728640,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { type: "text", name: "qr_code", required: true },
        { type: "text", name: "qr_payload" },
        { type: "number", name: "qr_size_m", required: true, min: 0.02 },
        { type: "select", name: "qr_ecc", required: true, maxSelect: 1, values: ["L", "M", "Q", "H"] },
        {
          type: "select",
          name: "status",
          required: true,
          maxSelect: 1,
          values: ["draft", "review", "published"],
        },
        { type: "number", name: "current_revision", onlyInt: true },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_machines_slug` ON `machines` (`slug`)",
        "CREATE UNIQUE INDEX `idx_machines_qr_code` ON `machines` (`qr_code`)",
      ],
    });
    app.save(machines);

    // ------------------------------------------------------------- content_items
    const content = new Collection({
      type: "base",
      name: "content_items",
      listRule: AUTHED,
      viewRule: AUTHED,
      createRule: AUTHOR,
      updateRule: AUTHOR,
      deleteRule: AUTHOR,
      fields: [
        {
          type: "relation",
          name: "machine",
          required: true,
          maxSelect: 1,
          collectionId: machines.id,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "type",
          required: true,
          maxSelect: 1,
          values: ["video", "pdf", "image", "model", "callout", "text", "hotspot"],
        },
        {
          type: "select",
          name: "section",
          required: true,
          maxSelect: 1,
          values: ["usage", "maintenance", "capabilities", "safety"],
        },
        { type: "json", name: "title", maxSize: 4000 },
        { type: "json", name: "config", maxSize: 20000 },
        { type: "file", name: "media", maxSelect: 1, maxSize: 524288000 },
        { type: "file", name: "media_pages", maxSelect: 200 },
        { type: "file", name: "thumbnail", maxSelect: 1 },
        { type: "number", name: "sort", onlyInt: true },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX `idx_content_machine` ON `content_items` (`machine`)"],
    });
    app.save(content);

    // ---------------------------------------------------------------- placements
    const placements = new Collection({
      type: "base",
      name: "placements",
      listRule: AUTHED,
      viewRule: AUTHED,
      createRule: AUTHOR,
      updateRule: AUTHED, // auteurs + compte casque ; garde-fou role viewer dans les hooks
      deleteRule: AUTHOR,
      fields: [
        {
          type: "relation",
          name: "content_item",
          required: true,
          maxSelect: 1,
          collectionId: content.id,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "anchor_mode",
          required: true,
          maxSelect: 1,
          values: ["qr-relative", "world"],
        },
        { type: "json", name: "position", required: true, maxSize: 200 },
        { type: "json", name: "rotation", required: true, maxSize: 200 },
        { type: "json", name: "size", maxSize: 200 },
        { type: "number", name: "scale", min: 0.0001 },
        { type: "select", name: "billboard", maxSelect: 1, values: ["none", "y", "full"] },
        { type: "select", name: "source", required: true, maxSelect: 1, values: ["photo2d", "headset"] },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_placements_item` ON `placements` (`content_item`)"],
    });
    app.save(placements);

    // ----------------------------------------------------------------- manifests
    const manifests = new Collection({
      type: "base",
      name: "manifests",
      listRule: AUTHED,
      viewRule: AUTHED,
      createRule: null, // superuser / hook /api/publish seulement
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "machine",
          required: true,
          maxSelect: 1,
          collectionId: machines.id,
          cascadeDelete: true,
        },
        { type: "number", name: "revision", required: true, onlyInt: true },
        { type: "json", name: "data", required: true, maxSize: 5000000 },
        { type: "relation", name: "published_by", maxSelect: 1, collectionId: "_pb_users_auth_" },
        { type: "autodate", name: "published", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_manifest_machine_rev` ON `manifests` (`machine`, `revision`)"],
    });
    app.save(manifests);

    // ------------------------------------------------------------------- anchors
    const anchors = new Collection({
      type: "base",
      name: "anchors",
      listRule: AUTHED,
      viewRule: AUTHED,
      createRule: AUTHED,
      updateRule: AUTHED,
      deleteRule: AUTHOR,
      fields: [
        {
          type: "relation",
          name: "machine",
          required: true,
          maxSelect: 1,
          collectionId: machines.id,
          cascadeDelete: true,
        },
        { type: "text", name: "device_id", required: true },
        { type: "text", name: "anchor_uuid", required: true },
        { type: "text", name: "space" },
        { type: "bool", name: "shared" },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_anchor_dev_machine` ON `anchors` (`device_id`, `machine`)"],
    });
    app.save(anchors);

    // ----------------------------------------------------------- analytics_events
    const analytics = new Collection({
      type: "base",
      name: "analytics_events",
      listRule: AUTHOR,
      viewRule: AUTHOR,
      createRule: AUTHED,
      updateRule: null,
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        {
          type: "relation",
          name: "machine",
          maxSelect: 1,
          collectionId: machines.id,
          cascadeDelete: true,
        },
        { type: "text", name: "object_id" },
        {
          type: "select",
          name: "event",
          required: true,
          maxSelect: 1,
          values: ["scan", "view", "expand", "section_switch", "qr_miss", "manifest_load_fail"],
        },
        { type: "text", name: "device_id" },
        { type: "json", name: "meta", maxSize: 4000 },
        { type: "autodate", name: "ts", onCreate: true },
      ],
      indexes: ["CREATE INDEX `idx_analytics_machine` ON `analytics_events` (`machine`)"],
    });
    app.save(analytics);
  },

  // ---- down --------------------------------------------------------------------
  (app) => {
    for (const name of [
      "analytics_events",
      "anchors",
      "manifests",
      "placements",
      "content_items",
      "machines",
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    try {
      const users = app.findCollectionByNameOrId("users");
      const f = users.fields.getByName("role");
      if (f) users.fields.removeById(f.id);
      app.save(users);
    } catch (_) {}
  }
);
