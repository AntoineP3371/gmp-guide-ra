# Feuille de route

## Phase 0 — Contrat + socle  ← *en cours*

- [x] Contrat du *scene manifest* (`schemas/manifest.schema.json` + `docs/manifest-contract.md`)
- [x] Manifest d'exemple (`examples/manifest.example.json`)
- [x] Schéma PocketBase (`backend/`) : `machines`, `content_items`, `placements`, `manifests`, `anchors`, `analytics_events`
- [x] Hooks : génération ID/QR, route d'assemblage `/api/publish/:machine`, route `/api/manifest/:code`
- [x] App web squelette : auth, CRUD machine, génération QR + export PDF, bouton Publier
- [x] Mini-viewer 3D (three.js) qui charge un manifest et le rend — **validation du contrat sans casque**
- [ ] Seed de démo (1 machine, 2 contenus, placements) — bloqué par l'upload média (Phase 1)

## Phase 1 — Éditeur de placement

- [ ] Upload médias (image / vidéo / PDF / glb) + vignettes
- [ ] Hook rasterisation PDF → images par page (`pdftoppm`)
- [ ] Éditeur 2D : déposer les contenus sur une photo de la machine → offsets `F_qr`
- [ ] Onglets Utilisation / Entretien / Capacités / Sécurité
- [ ] Prévisualisation dans le viewer 3D depuis l'éditeur

## Phase 2 — App casque (walking skeleton)

- [ ] Projet Unity + Meta XR SDK (Core + MR Utility Kit)
- [ ] Build APK signé, Data Use Checkup, push app privée Meta Device Manager
- [ ] Scan QR (MRUK) → création Spatial Anchor à la pose du QR
- [ ] Chargement `/api/manifest/:code` → instanciation **d'un** contenu à l'offset du manifest
- [ ] Conversion repère main droite (manifest) → main gauche (Unity) — voir `docs/manifest-contract.md`

## Phase 3 — Boucle d'édition casque

- [ ] Mode édition : grab 6DoF des objets
- [ ] `PATCH /api/placements/:id` avec `source = "headset"`
- [ ] Résolution de précédence photo2d vs headset

## Phase 4 — Durcissement

- [ ] Cache hors-ligne (manifests + médias) sur le casque
- [ ] Shared Spatial Anchors (plusieurs casques, même placement)
- [ ] Workflow de validation des consignes (draft → review → published)
- [ ] Analytics (contenus vus, QR illisibles)
- [ ] Multilingue de bout en bout
