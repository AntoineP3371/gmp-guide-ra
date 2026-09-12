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

- [x] Upload médias (image / vidéo / PDF / glb) : `ContentItemForm` envoie de vrais fichiers
      (`FormData` multi-fichiers) plutôt que des URLs, avec repli URL externe si pas de fichier
- [x] **PDF → pages WebP dans le navigateur** (`pdfjs-dist`), pas sur le Pi — `lib/media.ts`
- [x] Validation vidéo côté client (durée/résolution/poids, alerte si débit > 6 Mbps) + vignette
      capturée via `<canvas>` — `lib/media.ts`
  - ⚠️ Le mécanisme d'upload multi-fichiers (`media` + `media_pages[]` en une requête, résolution
    en URLs dans le manifest publié) est **vérifié de bout en bout côté backend** (multipart réel
    + publish). Le rendu PDF.js et la capture vidéo sont du DOM pur (canvas/`<video>`) : build
    TypeScript propre contre l'API réelle de `pdfjs-dist`, mais pas encore rejoué dans un vrai
    navigateur cette session (outil de navigateur indisponible ponctuellement) — à repasser au
    prochain tour avant de considérer la case définitivement fermée.
- [x] Éditeur 2D : déposer les contenus sur une photo de la machine → offsets `F_qr`
      (upload photo, calibration QR 2 clics, placer/glisser les repères) — vérifié de bout en
      bout dans le navigateur (calibration, placement, glisser-déposer, persistance après reload)
- [x] Onglets Utilisation / Entretien / Capacités / Sécurité
- [x] **Éditeur de scénario** : étapes ordonnées (↑/↓), objets actifs par étape, transition
      d'entrée, déclencheur tap/timer/media_end — écrit `scenario_steps` + bascule
      `machines.scenario_mode` — vérifié de bout en bout dans le navigateur
- [ ] Prévisualisation (placement + scénario) dans le viewer 3D depuis l'éditeur
- [x] **Déploiement GitHub Pages** : workflow CI en place et vert, app en ligne sur
      `gmpbordeaux.fr/gmp-guide-ra/` (domaine personnalisé dédié `prepa.` pas encore fait,
      page de projet suffit pour l'instant)
- [x] **Backend en production sur le Pi** : instance PocketBase dédiée (`~/gmp-guide-ra/`,
      service systemd `gmp-guide-ra.service`), séparée de l'ancienne instance partagée
      (réservation-machines, archivée puis supprimée à la demande)
- [x] **Cloudflare Tunnel** : DNS OVH basculé chez Cloudflare, tunnel `cloudflared.service` sur
      le Pi, `api.gmpbordeaux.fr` → `localhost:8090` — vérifié accessible depuis l'extérieur
- [x] `PB_URL` GitHub Actions réglé sur `https://api.gmpbordeaux.fr` — l'app publiée sur GitHub
      Pages parle maintenant au vrai backend

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
