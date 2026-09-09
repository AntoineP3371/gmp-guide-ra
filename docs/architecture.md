# Architecture

```
┌─ apps/web (PC, auteurs) ────────┐     ┌─ backend (PocketBase) ────┐     ┌─ apps/headset (Unity, Phase 2) ─┐
│ • fiches machines               │     │ • REST auto + auth + rôles │     │ • scan QR (MR Utility Kit)       │
│ • génération / impression QR    │◄───►│ • stockage média (→ S3)   │◄───►│ • Spatial Anchor à la pose QR   │
│ • upload + placement contenus   │ REST│ • hooks : QR, publish     │ REST│ • instancie les objets du       │
│ • bouton « Publier »            │     │ • manifests versionnés    │     │   manifest (offsets F_qr)       │
└─────────────────────────────────┘     └───────────────────────────┘     │ • mode édition → PATCH placements│
        │                                        ▲                        └─────────────────────────────────┘
        │ publie                                 │ lit /api/manifest/{code}
        ▼                                        │
   apps/viewer-web (three.js) ───────────────────┘   rend un manifest sans casque (validation du contrat)
```

## Principes

- **Thin client casque.** L'app Unity n'embarque aucun contenu : au scan d'un QR elle
  récupère `GET /api/manifest/{code}` et télécharge les médias. Le cycle APK / Meta Device
  Manager / Data Use Checkup ne sert qu'aux évolutions de fonctionnalités ; le contenu se
  publie instantanément côté web.
- **Le manifest est le contrat.** Web et Unity ne partagent que
  [`schemas/manifest.schema.json`](../schemas/manifest.schema.json). Voir
  [`manifest-contract.md`](manifest-contract.md) pour le repère `F_qr` et la conversion Unity.
- **QR = identifiant + fiducial.** Le payload encode une URL courte (`/m/XXXXXX`) ; l'ID sert à
  charger le manifest, la géométrie du QR (taille physique connue) sert à poser l'ancre.
  Après le 1ᵉʳ scan, la Spatial Anchor persiste : le QR n'est plus nécessaire à chaque session.
- **Placement en deux temps.** Grossier sur photo (éditeur PC, `source = "photo2d"`), puis fin
  au casque en 6DoF (`source = "headset"`). Le backend garde la précédence.

## Stack

| Brique | Choix | Pourquoi |
|---|---|---|
| Backend | PocketBase (Go + SQLite) | 1 binaire auto-hébergeable, auth + fichiers + REST + réel-temps, hooks JS. SQLite suffit à l'échelle atelier. |
| App web | Svelte + Vite + TS | outil interne, peu de boilerplate ; servie en statique par PocketBase (`backend/pb_public`). |
| Viewer contrat | three.js | même repère main droite que le manifest → rend sans conversion. |
| App casque | Unity + Meta XR SDK (Core + MR Utility Kit) | seul chemin viable : Wolvic n'expose pas la caméra WebXR. |

## Traitements média — **côté client**, pas sur le Pi

Cible de déploiement : **Raspberry Pi 4 2 Go**. Pas de `ffmpeg` ni `pdftoppm` sur le Pi
(CPU/RAM/carte SD). La préparation des médias se fait dans le navigateur de l'auteur, à l'upload :

- **PDF → images par page** : rendu via **PDF.js** dans l'app web → upload des pages en WebP
  (`media_pages`). Aucun hook backend.
- **Vidéo** : l'auteur fournit un MP4 web-ready (H.264, 720p, ≤ ~2–4 Mbps). L'app web valide
  codec/résolution/poids et extrait la vignette (frame 1s) via `<canvas>`. Pas de transcodage.
- **glTF** : vérif taille/format côté web, upload tel quel.
- Le backend ne fait que stocker et servir (requêtes Range pour la vidéo).

Conséquence : pas de hook média, pas de sidecar, pas de file d'attente.

## Contraintes Pi 4 2 Go

| Point | Décision |
|---|---|
| Usure / débit carte SD | `pb_data` (SQLite + médias) sur **SSD USB**, pas sur la SD. |
| Lecture vidéo simultanée par plusieurs casques | **cache hors-ligne côté casque** (télécharge manifest + médias une fois par révision, lecture locale) → passe de la Phase 4 à la **Phase 2 (baseline)**. |
| RAM (~30–60 Mo PocketBase au repos) | OK ; surveiller les uploads concurrents. |
| Gros fichiers | offload possible vers S3 / MinIO (NAS) configurable dans l'admin PocketBase. |

## Déploiement cible

- **Backend + app web : Raspberry Pi 4 (2 Go)** déjà en service, PocketBase accessible sur le LAN.
  - Binaire `pocketbase_*_linux_arm64` ; `pb_data` sur SSD USB.
  - L'app web Svelte se build dans **`backend/pb_public/`** → servie par PocketBase, même origine,
    même port : aucune config CORS, `VITE_PB_URL` inutile en prod.
  - LAN en http suffit pour l'app web et pour les fetch Unity. TLS optionnel via Caddy + CA locale.
- App casque : APK signé (keystore dédié, `versionCode` croissant) → app privée Meta Device
  Manager → groupes de casques. Permission `horizonos.permission.HEADSET_CAMERA`, DUC validé.
  Doit fonctionner **hors-ligne** une fois le contenu d'une machine mis en cache.
