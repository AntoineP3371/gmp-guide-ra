# Reprise de session — où on en est

Dernier commit poussé : **`d31bad1`** (`git pull` en arrivant pour être à jour).

## Depuis la dernière session : collections PocketBase renommées

Les collections métier (`machines`, `content_items`, `placements`, `manifests`, `anchors`,
`analytics_events`, `scenario_steps`) portent maintenant le préfixe `guidera_` côté PocketBase —
l'instance du Pi héberge aussi un autre projet (`sae_*`), d'où la clarification. **Aucun impact
attendu côté casque** : `QrManifestLoader`/`ManifestClient`/`AuthClient` ne parlent qu'aux routes
personnalisées (`/api/publish/{machine}`, `/api/manifest/{code}`) et à `/api/collections/users/...`
(auth, collection non renommée) — jamais aux collections métier en direct. À garder en tête
seulement si une erreur inattendue apparaît côté casque après ce changement.

## État réel au moment de la pause (session précédente)

Premier vrai test sur casque effectué ce soir, progrès concret :

- L'app **s'installe et se lance** sur le casque via Meta Device Manager, malgré un avertissement
  de compatibilité affiché dans Device Manager (« Mode partagé : contient Insight SDK / Platform
  SDK ») — l'avertissement s'est révélé **non bloquant** à l'installation. C'est un bug connu côté
  Meta lié au Scene Understanding en Mode partagé (voir § Points de vigilance), à surveiller surtout
  au moment d'une **mise à jour** de l'app plus tard (plusieurs retours du forum Meta rapportent que
  l'install initiale passe mais que les updates suivantes peuvent se remettre à échouer).
- **MR Utility Kit fonctionne réellement** : les logs montraient `MRUK Shared:
  execOnSceneAnchorAddedEvent`, `execOnRoomAnchorAddedEvent`, `execOnDiscoveryFinishedEvent result:
  0` — la permission Scene/Caméra a donc bien été accordée et la découverte de pièce aboutit.
- Une inquiétude initiale (`OnSessionStateChange` qui oscillait 5→4→5→4 sans jamais avancer,
  symptôme habituel d'une boîte de dialogue système qui bloque le focus) semble s'être résolue
  d'elle-même par la suite (log vu ensuite : `2 -> 3`, donc ça progresse).
- **Pas encore vu** de message `[GMP] QR détecté...` ni `[GMP] Manifest chargé...` — mais le
  panneau de logs (`OnScreenLogger`) n'affichait à ce moment que 14 lignes et était noyé par le
  bruit de diagnostic interne du SDK Meta (`[MetaXRFeature] OnSessionStateChange`, `MRUK Shared:
  exec...`), qui se sont avérés être loggés en `Warning` — donc pas filtrés par la première version
  du filtre. **Corrigé dans `fa2e8f0`** : le panneau ne garde plus désormais que nos messages
  `[GMP]` et les vraies erreurs/exceptions. Donc le test de ce soir n'a **pas vraiment confirmé ni
  infirmé** la détection de QR elle-même — c'est la toute première chose à refaire à la reprise.

## Prochaine étape immédiate

1. `git pull` dans le VDI.
2. Reconstruire l'APK (étape 11a de `docs/SETUP.md`).
3. Redéployer via le cycle habituel (étape 11b/11c, résumé ci-dessous).
4. **Viser un QR imprimé** et regarder le panneau de logs — avec le filtre corrigé, tu devrais voir
   apparaître, dans l'ordre : `[GMP] Authentifié auprès du backend.`, puis en visant le QR,
   `[GMP] QR détecté — payload=... code=...`, puis `[GMP] Manifest chargé : ...`. S'il y a une
   erreur, elle apparaîtra aussi (`[ERR] ...`) — copie-la telle quelle, ne pas deviner.

## Rappel du cycle de déploiement complet (à chaque build de test)

Détail complet dans `docs/SETUP.md` étape 11 — résumé ici pour aller vite :

1. **Build** : `File → Build Settings → Build` (pas *Build And Run*).
2. **Publier l'APK** : `github.com/AntoineP3371/gmp-guide-ra/releases/new`, glisser l'`.apk`,
   **Publish release** (pas Save draft — Device Manager doit le récupérer sans authentification).
   ⚠️ Le dépôt est public et l'APK embarque les identifiants du compte `viewer` PocketBase — d'où
   les deux derniers points ci-dessous, à ne pas sauter.
3. **Device Manager** : donner l'URL de l'asset publié (clic droit sur le lien de téléchargement de
   la release → copier l'adresse) à l'app privée dans Meta Horizon Developer Center.
4. Installer/lancer sur le casque, lire les logs via le panneau à l'écran.
5. **Dès que récupéré côté casque : supprimer la release GitHub** (Releases → Delete).
6. **Changer le mot de passe du compte `casque@gmpbordeaux.fr`** dans l'admin PocketBase
   (`https://api.gmpbordeaux.fr/_/` → collection `users`) — invalide les identifiants exposés
   pendant la fenêtre publique.
7. **Reporter le nouveau mot de passe** dans l'Inspector Unity (objet `ManifestLoader` → composant
   `Qr Manifest Loader` → champ `Viewer Password`) avant le prochain build, sinon l'authentification
   échouera au prochain test.

## Points de vigilance / non résolus

- **Mode partagé + Insight SDK** : avertissement Meta non bloquant à l'installation initiale ce
  soir, mais un bug documenté côté Meta touche parfois les **mises à jour** d'app en Mode partagé
  avec ce même message. Le Mode partagé n'est pas négociable côté organisation. Si une future mise
  à jour se met à échouer avec ce message, voir ces deux fils (déjà identifiés comme pertinents) :
  - https://communityforums.atmeta.com/discussions/dev-general/deploying-passthrough-app-in-shared-mode-without-insight-sdk-blocking-hms-horizo/1334603
  - https://communityforums.atmeta.com/discussions/Questions_Discussions/shared-mode-via-meta-horizon-managed-services-hms-error-contains-insight-sdk/1347630
- La taille de l'APK (~105 Mo, plancher quasi incompressible pour une app Meta XR/MRUK) restera
  toujours au-dessus de la limite Cloudflare (100 Mo) — le cycle GitHub Release publiée est donc la
  méthode définitive pour ce projet, pas une solution provisoire.
- Une fois le QR confirmé détecté et le manifest chargé, la suite (non commencée) est
  l'instanciation des objets du manifest et le lecteur de scénario — voir `docs/roadmap.md` § Phase
  2.
