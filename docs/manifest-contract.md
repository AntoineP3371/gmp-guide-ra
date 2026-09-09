# Contrat du *scene manifest*

Le *manifest* est le seul point de contact entre l'app web de préparation et l'app casque Unity.
Il décrit **une machine**, son **QR code** et la liste des **objets** à afficher, chacun **placé
relativement au QR**. Schéma formel : [`schemas/manifest.schema.json`](../schemas/manifest.schema.json).

## Repère spatial `F_qr`

Tous les placements sont exprimés dans le repère défini par le QR code imprimé.

| Élément | Définition |
|---|---|
| **Origine** | Centre géométrique de la **matrice de modules** du QR (hors *quiet zone*). |
| **+X** | Vers la droite, le long du bord supérieur du QR lu à l'endroit. |
| **+Y** | Vers le haut, le long du bord gauche du QR lu à l'endroit. |
| **+Z** | Normale sortante de la surface, **vers l'observateur** (donc à l'opposé de la machine). |
| **Chiralité** | **Main droite** (convention glTF / three.js / WebXR). |
| **Unités** | Mètres. |

`qr.physicalSizeMeters` = longueur d'un côté de la matrice de modules **telle qu'imprimée**.
C'est la seule donnée d'échelle ; l'app web stocke la valeur qu'elle a imposée à l'impression.

### Conversion vers Unity (main gauche, Y haut, Z avant)

Unity est en main gauche. À l'import du manifest, le client Unity convertit chaque placement :

```
position_unity  = ( x,  y, -z )
rotation_unity  = ( -qx, -qy, qz, qw )      // quaternion : négation des composantes X et Y
```

Le repère `F_qr` Unity a donc : +X droite, +Y haut, **+Z vers la machine** (dos du QR).
Un objet « devant » l'opérateur a `position.z < 0` côté Unity.
Les modèles glTF importés dans Unity subissent déjà cette conversion via l'importateur — ne pas
l'appliquer deux fois aux `model`.

## Placement d'un objet

```jsonc
"placement": {
  "anchorMode": "qr-relative",     // v1 : toujours "qr-relative". "world" réservé Phase 3+
  "position": [0.25, 0.10, 0.05],  // mètres, dans F_qr
  "rotation": [0, 0, 0, 1],        // quaternion [x, y, z, w], dans F_qr
  "size": [0.40, 0.225],           // objets plans (video/pdf/image/text) : [largeur, hauteur] en m
  "scale": 1.0,                    // objets volumiques (model) : facteur uniforme
  "billboard": "none",             // "none" | "y" (lacet vers l'observateur) | "full"
  "source": "photo2d",             // "photo2d" (éditeur PC) | "headset" (réglage fin in situ)
  "updatedAt": "2026-09-09T10:00:00Z"
}
```

- `size` **ou** `scale` selon le type (voir table ci-dessous), jamais imposé aux deux.
- `source` + `updatedAt` : quand le casque réécrit un placement, il pose `source = "headset"`.
  L'app web n'écrase un placement `headset` que sur action explicite de l'auteur.

## Types d'objets

| `type` | Charge utile (`config`) | Géométrie | Notes |
|---|---|---|---|
| `video` | `{ src, poster?, loop, muted, autoplay }` | plan `size` | MP4 progressif en v1 ; HLS Phase 4 |
| `pdf` | `{ src, pages: [url…], pageAspect }` | plan `size`, feuilletable | `pages` = images rasterisées par le hook backend |
| `image` | `{ src }` | plan `size` | |
| `model` | `{ src, animation?, autoRotate? }` | volume `scale` | glb/gltf |
| `callout` | `{ target: [x,y,z], label, style }` | ligne + étiquette | `target` = point de `F_qr` à désigner sur la machine |
| `text` | `{ format: "markdown"\|"plain", content, maxWidth }` | panneau `size` | tableaux de specs, checklists |
| `hotspot` | `{ icon, expands: "<objectId>" }` | pastille `size` | déplie un autre objet au tap |

Chaque objet porte aussi : `id` (stable), `section` (`usage`\|`maintenance`\|`capabilities`\|`safety`),
`title` (objet localisé `{ "fr": "…", "en": "…" }`), `sort` (entier).

## Structure de haut niveau

```jsonc
{
  "manifestVersion": "1.0",
  "machine":  { "id", "name", "slug", "category", "location", "languages", "revision", "publishedAt" },
  "qr":       { "code", "payload", "physicalSizeMeters", "errorCorrection" },
  "frame":    { "convention": "right-handed", "origin": "...", "axes": "...", "units": "meters" },
  "sections": [ { "id": "usage", "label": { "fr": "Utilisation", "en": "Usage" } }, … ],
  "objects":  [ { "id", "type", "section", "title", "sort", "placement", "config" }, … ]
}
```

`frame` est redondant avec ce document mais **inclus dans chaque manifest** pour que l'app casque
soit auto-portante et qu'un changement de convention future soit détectable à l'exécution.

## Règles de compatibilité

- `manifestVersion` en `MAJOR.MINOR`. Le client casque **refuse** un `MAJOR` inconnu, **tolère**
  un `MINOR` supérieur (champs inconnus ignorés).
- Un `type` d'objet inconnu est ignoré avec un log, pas une erreur.
- URLs média : absolues, servies par le backend (ou son offload S3). Le client casque les met en
  cache par `(machineId, revision)`.
