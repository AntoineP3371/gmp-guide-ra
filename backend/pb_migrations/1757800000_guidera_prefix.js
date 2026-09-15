/// <reference path="../pb_data/types.d.ts" />

// Préfixe `guidera_` sur les collections propres à ce projet, pour les distinguer des
// autres collections qui partagent cette même instance PocketBase (ex. `sae_*`, un
// projet sans rapport). `users` (authentification native) n'est pas renommée.
//
// Le renommage a d'abord été fait à la main via l'admin UI sur le Pi de prod (avant
// l'écriture de cette migration) — donc `from` n'existe déjà plus quand cette migration
// tourne là-bas. Chaque renommage est silencieusement ignoré si `from` est introuvable,
// pour rester rejouable aussi bien sur une base déjà à jour que sur un premier
// déploiement qui repart des migrations depuis zéro.

migrate(
  (app) => {
    const renames = [
      ["machines", "guidera_machines"],
      ["content_items", "guidera_content_items"],
      ["placements", "guidera_placements"],
      ["manifests", "guidera_manifests"],
      ["anchors", "guidera_anchors"],
      ["analytics_events", "guidera_analytics_events"],
      ["scenario_steps", "guidera_scenario_steps"],
    ];
    for (const [from, to] of renames) {
      let col;
      try {
        col = app.findCollectionByNameOrId(from);
      } catch (_) {
        continue; // déjà renommée (ex. faite à la main sur le Pi de prod)
      }
      col.name = to;
      app.save(col);
    }
  },
  (app) => {
    const renames = [
      ["guidera_machines", "machines"],
      ["guidera_content_items", "content_items"],
      ["guidera_placements", "placements"],
      ["guidera_manifests", "manifests"],
      ["guidera_anchors", "anchors"],
      ["guidera_analytics_events", "analytics_events"],
      ["guidera_scenario_steps", "scenario_steps"],
    ];
    for (const [from, to] of renames) {
      let col;
      try {
        col = app.findCollectionByNameOrId(from);
      } catch (_) {
        continue;
      }
      col.name = to;
      app.save(col);
    }
  }
);
