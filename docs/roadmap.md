# Feuille de route

## Phase 0 — Contrat + socle ✅

- [x] Contrat du *scene manifest* (`schemas/manifest.schema.json` + `docs/manifest-contract.md`),
      y compris le **scénario** (étapes, chronologie, déclencheurs)
- [x] Manifest d'exemple (`examples/manifest.example.json`)
- [x] Schéma PocketBase (`backend/`) : `machines`, `content_items`, `placements`, `manifests`,
      `anchors`, `analytics_events`, `scenario_steps` (+ `scenario_mode`/`scenario_always_visible`
      sur `machines`)
- [x] Hooks : génération ID/QR, route d'assemblage `/api/publish/:machine`, route
      `/api/manifest/:code` — **testés de bout en bout** (`backend/scripts/smoketest.mjs`)
- [x] App web squelette : auth, CRUD machine, génération QR + export PDF, bouton Publier
- [x] Mini-viewer 3D (three.js) qui charge un manifest et le rend — validation du contrat sans casque

## Phase 1 — Éditeur de placement + scénario + déploiement web

- [ ] Upload médias (image / vidéo / PDF / glb)
- [ ] **PDF → pages WebP dans le navigateur** (PDF.js), pas sur le Pi — voir `docs/architecture.md`
- [ ] Validation vidéo côté client (codec/résolution/poids) + vignette via `<canvas>`
- [ ] Éditeur 2D : déposer les contenus sur une photo de la machine → offsets `F_qr`
      (en attendant, placement par défaut auto-créé à la création du contenu)
- [x] Onglets Utilisation / Entretien / Capacités / Sécurité
- [x] **Éditeur de scénario** : étapes ordonnées (↑/↓), objets actifs par étape, transition
      d'entrée, déclencheur tap/timer/media_end — écrit `scenario_steps` + bascule
      `machines.scenario_mode` — vérifié de bout en bout dans le navigateur
- [ ] Prévisualisation (placement + scénario) dans le viewer 3D depuis l'éditeur
- [ ] **Déploiement GitHub Pages** : workflow CI, domaine personnalisé `prepa.tondomaine.fr`,
      variable de dépôt `PB_URL`
- [ ] **Cloudflare Tunnel** sur le Pi : `api.tondomaine.fr`, DNS du domaine OVH basculé chez
      Cloudflare (geste manuel, une fois)

## Phase 2 — App casque (walking skeleton)

- [ ] Projet Unity + Meta XR SDK (Core + MR Utility Kit)
- [ ] Build APK signé, Data Use Checkup, push app privée Meta Device Manager
- [ ] Scan QR (MRUK) → création Spatial Anchor à la pose du QR
- [ ] Chargement `/api/manifest/:code` → instanciation des objets aux offsets du manifest
- [ ] **Lecteur de scénario** : exécute les étapes `guided` (transitions, déclencheurs tap/timer/media_end)
- [ ] Conversion repère main droite (manifest) → main gauche (Unity) — voir `docs/manifest-contract.md`
- [ ] **Cache hors-ligne** manifest + médias par (machine, révision) — requis par la cible Pi 4 2 Go

## Phase 3 — Boucle d'édition casque

- [ ] Mode édition : grab 6DoF des objets
- [ ] `PATCH /api/placements/:id` avec `source = "headset"`
- [ ] Résolution de précédence photo2d vs headset

## Phase 4 — Durcissement

- [ ] Shared Spatial Anchors (plusieurs casques, même placement)
- [ ] Workflow de validation des consignes (draft → review → published)
- [ ] Analytics (contenus vus, étapes de scénario suivies, QR illisibles)
- [ ] Multilingue de bout en bout
- [ ] Scénarios avec branches conditionnelles (au-delà du linéaire de la Phase 1)
