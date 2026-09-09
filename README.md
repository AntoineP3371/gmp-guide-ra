# GMP Guide RA

Guides d'atelier en réalité augmentée sur Meta Quest 3 : un QR code collé sur une machine-outil
déclenche l'affichage, tout autour de la machine, de contenus (vidéos, pages PDF, modèles 3D,
call-outs, panneaux texte) expliquant son **utilisation**, son **entretien**, ses **capacités**
et les consignes de **sécurité**.

## Composants

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/web/` | Interface PC de préparation : fiches machines, génération/impression QR, upload et placement des contenus, publication | Svelte + Vite + TypeScript, servie en statique par PocketBase |
| `backend/` | API, stockage média, assemblage et versionnement des *manifests* | PocketBase (binaire Go + SQLite) + hooks JS |
| `apps/viewer-web/` | Mini-viewer 3D (three.js) qui rend un manifest **sans casque**, pour valider le contrat | Vite + three.js |
| `apps/headset/` | *(Phase 2)* App Unity poussée en app privée via Meta Device Manager | Unity + Meta XR SDK |
| `schemas/` | `manifest.schema.json` — le contrat d'échange web ↔ Unity | JSON Schema |
| `docs/` | Architecture, contrat de manifest, feuille de route | Markdown |

## Démarrage

```bash
npm install
npm run backend:get      # télécharge le binaire PocketBase dans backend/bin
npm run backend:dev      # PocketBase sur http://127.0.0.1:8090 (admin UI /_/)
npm run web:dev          # app de préparation sur http://127.0.0.1:5173
npm run viewer:dev       # viewer 3D sur http://127.0.0.1:5174
```

Voir `docs/roadmap.md` pour l'état d'avancement (on est en **Phase 0**).

## Contraintes de déploiement (rappel)

- Casques gérés en **Meta Device Manager** → l'app casque est distribuée en **app privée**
  (pas de Store), signée avec un keystore dédié, `versionCode` croissant, **Data Use Checkup** validé.
- Navigateur = **Wolvic** (Quest Browser désactivé) → **pas d'accès caméra WebXR** : la visionneuse
  casque **doit** être native Unity. Le web ne sert qu'à la préparation.
- App casque = *thin client* : aucun contenu embarqué, tout est streamé depuis le backend.
  Le cycle APK/MDM ne sert qu'aux évolutions de fonctionnalités ; le contenu se publie côté web.
