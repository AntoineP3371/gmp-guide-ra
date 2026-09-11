/// <reference path="../pb_data/types.d.ts" />

// Calibration de la photo de la machine pour l'éditeur de placement 2D :
// où le QR apparaît dans la photo (origine, en fraction 0..1 de la largeur/hauteur
// image — indépendant de la taille d'affichage) et sa largeur (fraction de la
// largeur totale de l'image), qui donne l'échelle mètres/pixel via qr_size_m.
// Voir docs/manifest-contract.md et apps/web/src/components/PlacementEditor.svelte.

migrate(
  (app) => {
    const machines = app.findCollectionByNameOrId("machines");
    machines.fields.add(new JSONField({ name: "photo_qr_origin", maxSize: 200 })); // [fx, fy] 0..1
    machines.fields.add(new NumberField({ name: "photo_qr_width_frac", min: 0.001, max: 1 }));
    app.save(machines);
  },
  (app) => {
    const machines = app.findCollectionByNameOrId("machines");
    for (const name of ["photo_qr_origin", "photo_qr_width_frac"]) {
      const f = machines.fields.getByName(name);
      if (f) machines.fields.removeById(f.id);
    }
    app.save(machines);
  }
);
