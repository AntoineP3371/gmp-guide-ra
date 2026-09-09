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

## Traitements média (Phase 1, hors PocketBase)

- PDF → images par page : `pdftoppm -webp -r 150` dans un hook `onRecordAfterCreateSuccess`.
- Vignette vidéo : `ffmpeg -ss 1 -vframes 1`.
- Vidéo lourde → HLS : `ffmpeg` (Phase 4 seulement ; MP4 progressif + cache casque d'ici là).
- Fichiers volumineux : offload S3 configurable dans l'admin PocketBase.

## Déploiement cible

- Backend + app web : un conteneur sur l'infra atelier (LAN), volume pour `pb_data`.
- App casque : APK signé (keystore dédié, `versionCode` croissant) → app privée Meta Device
  Manager → groupes de casques. Permission `horizonos.permission.HEADSET_CAMERA`, DUC validé.
