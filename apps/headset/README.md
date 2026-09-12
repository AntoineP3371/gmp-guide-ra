# apps/headset — App Unity (Quest 3)

Lecteur générique de guide : scanne le QR d'une machine, récupère son *scene manifest*
(`GET /api/manifest/{code}`), instancie les objets à leur placement, exécute le scénario s'il y
en a un. Aucun contenu embarqué — tout vient du backend (voir `docs/manifest-contract.md` et
`docs/architecture.md` à la racine du repo).

## Contrainte de dev : VDI

Ce projet est développé depuis un **VDI** (accès Internet/GitHub confirmé, presse-papiers
disponible en secours, persistance du disque entre sessions **non confirmée**). Conséquence :
**ce dossier `apps/headset/` est la source de vérité**, pas l'état local du VDI. Réflexe à
chaque session :

```bash
git pull            # en arrivant
# ... travail dans Unity ...
git add apps/headset && git commit -m "..." && git push   # avant de fermer la session
```

Si le VDI repart de zéro à chaque connexion, seul ce qui a été poussé ici survit — committe
souvent, pas seulement en fin de fonctionnalité.

## Ce dossier n'est PAS un projet Unity complet

Il ne contient que ce qui se transporte proprement en texte : scripts C#, et cette doc. Les
fichiers générés par l'éditeur (`ProjectSettings/`, `Packages/packages-lock.json`,
`Library/`, `.meta` des dossiers…) ne sont pas fournis à la main — trop de risques d'erreur sans
pouvoir les tester. **Tu crées le projet Unity toi-même** (`docs/SETUP.md`), puis tu copies
`Assets/Scripts/` de ce dossier dans le projet créé (ou tu ouvres directement ce dossier comme
racine du projet Unity une fois `ProjectSettings/`/`Packages/` en place — au choix).

## Statut

- [x] Modèles C# du manifest (`Assets/Scripts/Manifest/ManifestModels.cs`)
- [x] Client HTTP + auth (`ManifestClient.cs`, `AuthClient.cs`)
- [x] Conversion de repère main droite (manifest) → main gauche (Unity) (`FrameConversion.cs`)
- [x] Détection QR (MR Utility Kit) — `QrManifestLoader.cs` recalé sur le code source réel de
      l'échantillon officiel Meta (`QRCodeManager.cs`) après un premier essai raté à la
      compilation (`MRUKRoom.TrackableAdded` n'existe pas ; le bon abonnement est
      `MRUK.Instance.SceneSettings.TrackableAdded.AddListener(...)`) — compile désormais, encore
      **jamais testé sur casque réel**
- [ ] Instanciation des objets (vidéo/PDF/image/modèle/callout/texte/hotspot)
- [ ] Lecteur de scénario (étapes, transitions, déclencheurs)
- [ ] Spatial Anchor persistante
- [ ] Cache hors-ligne
- [ ] Build signé + app privée Meta Device Manager

Voir `docs/roadmap.md` (racine du repo) § Phase 2 pour le détail.
