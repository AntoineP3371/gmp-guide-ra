# Architecture

```
┌─ apps/web (GitHub Pages) ───────┐     ┌─ backend (PocketBase, Pi) ─┐     ┌─ apps/headset (Unity) ──────────┐
│ • fiches machines               │     │ • REST auto + auth + rôles │     │ • scan QR (MR Utility Kit)       │
│ • génération / impression QR    │◄───►│ • stockage média            │◄───►│ • Spatial Anchor à la pose QR   │
│ • upload + placement contenus   │HTTPS│ • hooks : QR, publish       │HTTPS│ • lecteur générique : instancie │
│ • éditeur de scénario (étapes)  │ via │ • manifests versionnés      │ via │   objets + exécute le scénario  │
│ • bouton « Publier »            │Cloud│                             │Cloud│ • mode édition → PATCH placements│
└─────────────────────────────────┘flare└─────────────────────────────┘flare└─────────────────────────────────┘
        │                                        ▲          Tunnel                    ▲
        │ publie                                 │ lit /api/manifest/{code}            │ app privée
        ▼                                        │                                     │ Meta Device Manager
   apps/viewer-web (three.js) ───────────────────┘   rend un manifest sans casque (validation du contrat)
```

## Principes

- **Thin client casque.** L'app Unity n'embarque aucun contenu : au scan d'un QR elle
  récupère `GET /api/manifest/{code}` et télécharge les médias. Le cycle APK / Meta Device
  Manager / Data Use Checkup ne sert qu'aux évolutions de fonctionnalités ; le contenu se
  publie instantanément côté web.
- **Le manifest est le contrat.** Web et Unity ne partagent que
  [`schemas/manifest.schema.json`](../schemas/manifest.schema.json). Voir
  [`manifest-contract.md`](manifest-contract.md) pour le repère `F_qr`, la conversion Unity et
  le modèle de **scénario** (étapes, chronologie, séquencement).
- **QR = identifiant + fiducial.** Le payload encode une URL courte (`gmpbordeaux.fr/m/XXXXXX`) ;
  l'ID sert à charger le manifest, la géométrie du QR (taille physique connue) sert à poser
  l'ancre. Après le 1ᵉʳ scan, la Spatial Anchor persiste : le QR n'est plus nécessaire à chaque
  session.
- **Placement en deux temps.** Grossier sur photo (éditeur PC, `source = "photo2d"`), puis fin
  au casque en 6DoF (`source = "headset"`). Le backend garde la précédence.
- **Contenu ET scénario découplés du code.** Objets (vidéo/PDF/3D/callout/texte) et leur
  séquencement (étapes, chronologie, déclencheurs) sont des données servies par le backend.
  L'app Unity est un *lecteur générique* : on ne la reconstruit que pour des évolutions de
  fonctionnalités, jamais pour ajouter/modifier une machine ou un guide.

## Stack

| Brique | Choix | Pourquoi |
|---|---|---|
| Backend | PocketBase (Go + SQLite), sur le Raspberry Pi 4 (2 Go) de l'auteur | 1 binaire auto-hébergeable, auth + fichiers + REST + réel-temps, hooks JS. SQLite suffit à l'échelle atelier. |
| Exposition du backend | **Cloudflare Tunnel** (DNS du domaine OVH basculé chez Cloudflare) | URL HTTPS stable `api.gmpbordeaux.fr`, rien d'entrant sur le réseau domicile, pas de matériel sur le réseau universitaire → la DSI n'a rien à autoriser. Cache Cloudflare en bonus pour les médias. |
| App de préparation | Svelte + Vite + TS, **hébergée sur GitHub Pages** (`gmpbordeaux.fr/gmp-guide-ra/` — page de projet ; sous-domaine dédié `prepa.` pas encore fait) | Accessible de partout, gratuite, versionnée avec le repo. |
| Viewer contrat | three.js (`apps/viewer-web`) | même repère main droite que le manifest → rend sans conversion, valide le contrat sans casque. |
| App casque | **Unity + Meta XR SDK** (Core + MR Utility Kit), app privée poussée par **Meta Device Manager** | Seul chemin viable pour l'AR ancrée sur QR : Wolvic (navigateur imposé par le MDM, Quest Browser désactivé) n'expose pas la caméra en WebXR. |

## Scénario (chronologie / séquencement / animation)

Voir [`manifest-contract.md`](manifest-contract.md) § Scénario pour le détail. En bref : un
manifest peut être `freeform` (tous les objets visibles, comportement Phase 0) ou `guided`
(suite d'**étapes** ordonnées, chacune avec ses objets actifs, une transition d'entrée et un
déclencheur d'avancement — tap, minuteur, ou fin de lecture média). C'est le mécanisme qui
couvre la 3ᵉ priorité du projet (préparer des scénarios, pas seulement des objets isolés).

## Traitements média — **côté client**, pas sur le Pi

Cible de déploiement du backend : **Raspberry Pi 4 (2 Go)**. Pas de `ffmpeg` ni `pdftoppm` sur
le Pi (CPU/RAM/carte). La préparation des médias se fait dans le navigateur de l'auteur, à
l'upload :

- **PDF → images par page** : rendu via **PDF.js** dans l'app web → upload des pages en WebP
  (`media_pages`). Aucun hook backend.
- **Vidéo** : l'auteur fournit un MP4 web-ready (H.264, 720p, ≤ ~2–4 Mbps). L'app web valide
  codec/résolution/poids et extrait la vignette (frame 1s) via `<canvas>`. Pas de transcodage.
- **glTF** : vérif taille/format côté web, upload tel quel.
- Le backend ne fait que stocker et servir (requêtes Range pour la vidéo).

## Contraintes Pi 4 2 Go

| Point | Décision |
|---|---|
| Usure / débit du stockage | `pb_data` (SQLite + médias) sur **clé/disque USB dédié**, pas sur la carte de boot. Garder les fichiers originaux sur le PC de l'auteur (la clé n'est qu'une copie de travail). Prévoir plus grand (32–128 Go) au passage à l'échelle atelier. |
| Lecture vidéo simultanée par plusieurs casques | **cache hors-ligne côté casque** (télécharge manifest + médias une fois par révision, lecture locale) → **baseline dès la Phase 2**, pas un durcissement tardif. |
| Débit d'envoi du domicile (upload) | Vidéos courtes, qualité raisonnable ; le cache Cloudflare limite les téléchargements répétés depuis le Pi. |
| RAM (~30–60 Mo PocketBase au repos) | OK ; surveiller les uploads concurrents. |

## Déploiement cible — **en service depuis le 12/09/2026**

- **Backend : Raspberry Pi 4, au domicile de l'auteur.** `~/gmp-guide-ra/` (binaire, `pb_data`,
  migrations, hooks), service **systemd** `gmp-guide-ra.service` (`--http=0.0.0.0:8090`,
  redémarre seul sur crash/reboot). RAM réelle de ce Pi : ~900 Mo (plus contraint que les 2 Go
  supposés au départ — à garder en tête pour les uploads concurrents).
  - Exposé via **Cloudflare Tunnel** (`cloudflared.service`, mode connecteur à jeton — la route
    est configurée côté tableau de bord Cloudflare, pas de `config.yml` local) sous
    **`api.gmpbordeaux.fr`**. Aucune ouverture de port sur la box, aucun matériel sur un réseau
    universitaire.
  - Le Pi n'a pas besoin d'être joignable en continu : seulement au moment de la **publication**
    d'un contenu et du **chargement** initial d'un casque (ensuite, cache hors-ligne).
- **App de préparation : GitHub Pages**, `gmpbordeaux.fr/gmp-guide-ra/`. Build déclenché par une
  GitHub Action à chaque push (`.github/workflows/deploy-web.yml`), variable de dépôt
  `PB_URL = https://api.gmpbordeaux.fr` injectée au build.
- **Domaine : OVH (registrar) + Cloudflare (DNS)**. Le domaine reste enregistré/payé chez OVH ;
  les serveurs de noms pointent vers Cloudflare (`alec`/`peaches.ns.cloudflare.com`), ce qui
  permet le Tunnel + le cache + la gestion des sous-domaines au même endroit.
- **App casque : APK signé** (keystore dédié, `versionCode` croissant) → **app privée Meta
  Device Manager** → groupes de casques. Permission `horizonos.permission.HEADSET_CAMERA`, Data
  Use Checkup validé. Doit fonctionner **hors-ligne** une fois le contenu d'une machine mis en
  cache.

## Pourquoi pas le téléphone / pas de WebAR sur le casque (rappel de décisions déjà prises)

- Un simple **navigateur mobile** aurait été plus simple à déployer, mais la priorité du projet
  est explicitement l'usage **casque**, avec des contraintes MDM déjà résolues (app privée) —
  donc pas retenu comme cible principale pour l'instant.
- **WebAR ancré sur QR dans le casque** est écarté : Wolvic (navigateur imposé) n'expose pas
  l'accès caméra WebXR nécessaire à la détection du QR. Seule une app native peut le faire.
