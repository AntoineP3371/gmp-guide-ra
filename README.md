# GMP Guide RA

Guides d'atelier en réalité augmentée sur Meta Quest 3 : un QR code collé sur une machine-outil
déclenche l'affichage, tout autour de la machine, de contenus (vidéos, pages PDF, modèles 3D,
call-outs, panneaux texte) organisés en **scénarios séquencés** (chronologie, étapes,
déclencheurs) expliquant son **utilisation**, son **entretien**, ses **capacités** et les
consignes de **sécurité**.

## Composants

| Dossier | Rôle | Stack | Hébergement cible |
|---|---|---|---|
| `apps/web/` | Interface de préparation : fiches machines, génération/impression QR, upload et placement des contenus, éditeur de scénario, publication | Svelte + Vite + TypeScript | **GitHub Pages** (`prepa.gmpbordeaux.fr`) |
| `backend/` | API, stockage média, assemblage et versionnement des *manifests* | PocketBase (binaire Go + SQLite) + hooks JS | **Raspberry Pi 4** au domicile de l'auteur, exposé via **Cloudflare Tunnel** (`api.gmpbordeaux.fr`) |
| `apps/viewer-web/` | Mini-viewer 3D (three.js) qui rend un manifest **sans casque**, pour valider le contrat | Vite + three.js | dev local |
| `packages/viewer3d/` | Rendu 3D partagé (objets + scénario) entre `viewer-web` et le panneau « Aperçu 3D » de `apps/web` | three.js | — (package interne) |
| `apps/headset/` | *(Phase 2)* App Unity « lecteur générique » de scénario, poussée en app privée via Meta Device Manager | Unity + Meta XR SDK | casques Quest 3 (MDM) |
| `schemas/` | `manifest.schema.json` — le contrat d'échange web ↔ Unity (objets + scénario) | JSON Schema | — |
| `docs/` | Architecture, contrat de manifest, feuille de route | Markdown | — |

## Démarrage (dev local)

```bash
npm install
npm run backend:get      # télécharge le binaire PocketBase dans backend/bin
npm run backend:dev      # PocketBase sur http://127.0.0.1:8090 (admin UI /_/)
npm run web:dev          # app de préparation sur http://127.0.0.1:5173
npm run viewer:dev       # viewer 3D sur http://127.0.0.1:5174
```

Voir `docs/roadmap.md` pour l'état d'avancement (Phase 0 terminée, Phase 1 en cours) et
`docs/architecture.md` pour le déploiement cible (GitHub Pages + Pi/Cloudflare Tunnel + Unity/MDM).

## Contraintes de déploiement (rappel)

- Casques gérés en **Meta Device Manager** → l'app casque est distribuée en **app privée**
  (pas de Store), signée avec un keystore dédié, `versionCode` croissant, **Data Use Checkup** validé.
- Navigateur imposé sur les casques = **Wolvic** (Quest Browser désactivé) → **pas d'accès
  caméra WebXR** : la visionneuse casque **doit** être native Unity. Le web ne sert qu'à la
  préparation.
- Backend sur un **Raspberry Pi 4 (2 Go)** au domicile de l'auteur, pas dans l'atelier (à
  l'université de Bordeaux) → exposé via **Cloudflare Tunnel** (domaine OVH, DNS chez
  Cloudflare) : URL HTTPS stable, rien d'entrant, aucun matériel sur le réseau universitaire.
- App casque = *thin client* : aucun contenu embarqué, tout est streamé depuis le backend et mis
  en **cache hors-ligne**. Le cycle APK/MDM ne sert qu'aux évolutions de fonctionnalités ; le
  contenu et les scénarios se publient côté web, instantanément.
