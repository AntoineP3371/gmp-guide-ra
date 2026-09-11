/// <reference path="../pb_data/types.d.ts" />

// Ajoute le séquencement (scénario) : mode freeform/guided sur `machines`
// + collection `scenario_steps` (étapes ordonnées, objets actifs, déclencheur d'avancement).
// Voir docs/manifest-contract.md § « Scénario (chronologie / séquencement) ».

migrate(
  (app) => {
    const AUTHOR = '@request.auth.role = "admin" || @request.auth.role = "author"';
    const AUTHED = '@request.auth.id != ""';

    const machines = app.findCollectionByNameOrId("machines");
    machines.fields.add(
      new SelectField({
        name: "scenario_mode",
        required: true,
        maxSelect: 1,
        values: ["freeform", "guided"],
      })
    );
    machines.fields.add(new JSONField({ name: "scenario_always_visible", maxSize: 4000 }));
    app.save(machines);

    const steps = new Collection({
      type: "base",
      name: "scenario_steps",
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
        { type: "number", name: "sort", onlyInt: true }, // PB : `required` + number rejette 0 ("cannot be blank")
        { type: "json", name: "title", maxSize: 2000 },
        { type: "json", name: "object_ids", required: true, maxSize: 4000 },
        {
          type: "select",
          name: "enter_transition",
          maxSelect: 1,
          values: ["none", "fade", "pop", "slide"],
        },
        { type: "number", name: "enter_duration_ms", onlyInt: true, min: 0 },
        {
          type: "select",
          name: "advance_trigger",
          required: true,
          maxSelect: 1,
          values: ["tap", "timer", "media_end"],
        },
        { type: "number", name: "advance_after_seconds", min: 0 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX `idx_scenario_steps_machine` ON `scenario_steps` (`machine`, `sort`)",
      ],
    });
    app.save(steps);
  },

  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("scenario_steps"));
    } catch (_) {}
    try {
      const machines = app.findCollectionByNameOrId("machines");
      for (const name of ["scenario_mode", "scenario_always_visible"]) {
        const f = machines.fields.getByName(name);
        if (f) machines.fields.removeById(f.id);
      }
      app.save(machines);
    } catch (_) {}
  }
);
