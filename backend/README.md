# Backend — PocketBase

Binaire Go + SQLite. Fournit l'API REST, le stockage média, l'auth et les rôles.
Testé avec **PocketBase >= 0.23** (API JSVM `BaseCollection` / `*Field`).

## Démarrage

```bash
npm run backend:get         # télécharge backend/bin/pocketbase(.exe)
npm run backend:dev         # serve sur http://127.0.0.1:8090  (admin UI : /_/)
```

Au 1ᵉʳ lancement PocketBase applique `pb_migrations/1757400000_init_schema.js` puis demande
la création d'un superuser (admin UI). Crée ensuite les comptes applicatifs :

| Compte | `role` | Usage |
|---|---|---|
| ton compte | `admin` | tout |
| préparateurs | `author` | CRUD machines / contenus / placements, publication |
| `casque@gmpbordeaux.fr` | `viewer` | **compte de service de l'app casque** : lecture manifest + `PATCH` placements (forcé `source=headset`) |

```bash
# exemple : compte de service casque
node backend/scripts/run.mjs superuser upsert  # (superuser only ; les users se créent via l'API/UI)
```

## Collections (`pb_migrations/1757400000_init_schema.js`)

Préfixées `guidera_` (sauf `users`, natif PocketBase) depuis `pb_migrations/1757800000_guidera_prefix.js`
— cette instance héberge aussi des collections `sae_*` d'un autre projet, sans rapport avec celui-ci.

| Collection | Champs clés | Règles |
|---|---|---|
| `users` (+`role`) | `role` ∈ admin/author/viewer | défaut PocketBase |
| `guidera_machines` | `name`, `slug`ᵘ, `category`, `location`, `languages[]`, `photos[]`, `qr_code`ᵘ, `qr_payload`, `qr_size_m`, `qr_ecc`, `status`, `current_revision` | lecture: authentifié · écriture: author+ |
| `guidera_content_items` | `machine`→, `type`, `section`, `title{}`, `config{}`, `media`, `media_pages[]`, `thumbnail`, `sort` | author+ |
| `guidera_placements` | `content_item`→ᵘ, `anchor_mode`, `position[]`, `rotation[]`, `size[]`, `scale`, `billboard`, `source` | update: authentifié (garde-fou casque dans les hooks) |
| `guidera_manifests` | `machine`→, `revision`, `data{}`, `published_by`→ | écriture: hook `/api/publish` seulement |
| `guidera_anchors` | `machine`→, `device_id`, `anchor_uuid`, `space`, `shared` | authentifié |
| `guidera_analytics_events` | `machine`→, `object_id`, `event`, `device_id`, `meta{}`, `ts` | create: authentifié · lecture: author+ |
| `guidera_scenario_steps` | `machine`→, `sort`, `title{}`, `object_ids[]`, `enter_transition`, `enter_duration_ms`, `advance_trigger`, `advance_after_seconds` | author+ |

`guidera_machines` porte aussi `scenario_mode` (`freeform`\|`guided`, défaut `freeform`) et
`scenario_always_visible` (array d'ids de `guidera_content_items`) — voir
[`../docs/manifest-contract.md`](../docs/manifest-contract.md) § Scénario.

ᵘ = index unique · → = relation

Si la migration échoue sur ta version de PocketBase, crée les collections à la main via l'admin UI
en suivant ce tableau — le reste du système ne dépend que des **noms de champs**.

## Routes personnalisées (`pb_hooks/main.pb.js`)

| Route | Auth | Effet |
|---|---|---|
| `POST /api/publish/{machine}` | author+ | Assemble le *scene manifest* depuis `guidera_machines`+`guidera_content_items`+`guidera_placements`, incrémente `revision`, fige un enregistrement `guidera_manifests`, repasse la machine en `published`. Renvoie `{ revision, manifest }`. |
| `GET /api/manifest/{code}` | authentifié | Dernier manifest publié pour un `qr_code` (`GMP-XXXXXX` ou suffixe `XXXXXX`). Consommé par l'app casque. |

Hooks additionnels : génération `slug`/`qr_code`/`qr_payload` à la création d'une machine ;
verrouillage des champs de `guidera_placements` quand l'appelant a le rôle `viewer`.

## Variables d'environnement

| Var | Défaut | Rôle |
|---|---|---|
| `PUBLIC_BASE_URL` | `https://guide.gmp.example` | préfixe des URLs média et du `qr_payload` dans les manifests |
| `PB_VERSION` | dernière release | version à télécharger (`backend:get`) |

## Pièges JSVM rencontrés (voir commentaires en tête de `pb_hooks/main.pb.js`)

Deux comportements non documentés de ce binding PocketBase 0.40.x, contournés dans le code :

1. Indexer ou lire `.length` sur la valeur de `record.get()` pour un champ `json` peut la
   corrompre (octets de sa représentation JSON au lieu des éléments décodés). Lecture fiable :
   `JSON.parse(record.getString(name))`.
2. Un `DateTime` Go brut embarqué tel quel dans un objet passé à `record.set("champJson", ...)`
   fait échouer le marshal de **tout** l'enregistrement (PocketBase répond « cannot be blank »
   sans rapport apparent). Toujours `String(record.get("champDate"))` avant d'embarquer une date.

`backend/scripts/smoketest.mjs` est un script de vérification de bout en bout (pas un test
automatisé formel) qui couvre ces deux cas — à relancer après toute modification des hooks.

## À faire (Phase 1)

- Hook `onRecordAfterCreateSuccess("content_items")` : si `type = pdf`, rasteriser le PDF en
  `media_pages` (`pdftoppm -webp -r 150`).
- Hook vignettes vidéo (`ffmpeg -ss 1 -vframes 1`).
- Offload stockage fichiers vers S3 (paramétrable dans l'admin UI PocketBase).
