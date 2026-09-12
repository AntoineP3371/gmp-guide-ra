# Mise en place du projet Unity (dans le VDI)

Sources officielles à garder ouvertes pendant l'install — l'UI de l'éditeur/du Package Manager
change assez souvent pour que je préfère te renvoyer dessus plutôt que de décrire des clics
précis que je ne peux pas vérifier moi-même :
- Setup général Quest : https://developers.meta.com/horizon/documentation/unity/unity-project-setup/
- Détection QR (MRUK) : https://developers.meta.com/horizon/documentation/unity/unity-mr-utility-kit-qrcode-detection/
- Échantillon officiel MRUK (à cloner pour comparer le câblage exact des événements) :
  https://github.com/oculus-samples/Unity-MRUtilityKitSample

## 1. Unity Hub + Editor

- **Unity 6000.0.66f2 ou plus récent** (exigence Meta pour le dev Quest en 2026). Installe via
  Unity Hub, pas de zip manuel.
- Pendant l'install, coche le module **Android Build Support** (+ ses sous-modules SDK/NDK/OpenJDK
  proposés par défaut).

## 2. Créer le projet

- Nouveau projet, template **3D (Core)** ou **VR** si Hub le propose. Nomme-le comme tu veux
  (ex. `gmp-guide-ra-headset`), peu importe l'emplacement dans le VDI — ce qui compte est de
  synchroniser `Assets/Scripts/` avec ce dépôt (voir README de ce dossier).

## 3. Packages à installer (Window > Package Manager)

| Package | Où le trouver |
|---|---|
| **OpenXR Plugin** (`com.unity.xr.openxr`) | Package Manager > Unity Registry |
| **Meta XR Core SDK** (+ **Meta MR Utility Kit**, inclus ou séparé selon la version) | Suivre le lien « Set up Unity » ci-dessus — Meta distribue son SDK soit via l'Asset Store (« Meta XR All-in-One SDK »), soit via un package Git/scoped registry ; la page officielle a le lien à jour |
| **Newtonsoft Json** (`com.unity.nuget.newtonsoft-json`) | Package Manager > Add package by name : `com.unity.nuget.newtonsoft-json` |

Après install du SDK Meta, l'éditeur propose généralement un **« Project Setup Tool »** /
**« Fix all »** qui configure automatiquement OpenXR, Android, et les Player Settings requis —
accepte-le, c'est plus fiable que de régler à la main.

## 4. Player Settings (Edit > Project Settings)

- **Platform** : bascule sur **Android** (File > Build Settings > Android > Switch Platform).
- **XR Plug-in Management** > Android : coche **OpenXR**, puis dans OpenXR ajoute le feature
  group **Meta Quest Support**.
- **Player > Other Settings** :
  - Color Space : **Linear**
  - Target API Level : suit la recommandation Meta du moment (≥ Android 13 / API 34 courant
    2026 — le Project Setup Tool le règle normalement tout seul)
  - Minimum API Level : celui recommandé par le Project Setup Tool

## 5. Permission caméra (nécessaire pour la détection QR)

Dans le manifeste Android généré par le SDK Meta (`Assets/Plugins/Android/AndroidManifest.xml`,
ou via les Player Settings si le SDK propose un panneau dédié), il faut la permission Meta
spécifique :

```xml
<uses-permission android:name="horizonos.permission.HEADSET_CAMERA" />
<uses-permission android:name="android.permission.CAMERA" />
```

Rappel du chantier précédent (voir `docs/architecture.md` racine) : cette permission déclenche un
consentement à l'exécution la première fois, et l'app devra passer un **Data Use Checkup** côté
Meta Horizon Developer Center avant de fonctionner comme app privée via Meta Device Manager.

## 6. Copier les scripts

Une fois le projet créé et les packages installés, copie le contenu de
`apps/headset/Assets/Scripts/` (ce dépôt) dans `Assets/Scripts/` du projet Unity. Unity va
générer les `.meta` correspondants tout seul à l'import — ne les copie pas depuis le dépôt (ils
n'existent pas encore ici, exprès).

## 7. Test minimal (walking skeleton)

1. Crée une scène vide, ajoute un GameObject vide, accroche-lui le script
   `QrManifestLoader.cs`.
2. Renseigne dans l'inspecteur : `backendBaseUrl` = `https://api.gmpbordeaux.fr` (ou l'URL locale
   du Pi en dev), `viewerEmail`/`viewerPassword` = le compte de service `casque@gmpbordeaux.fr`
   (identifiants donnés lors de la mise en prod du backend — à ressaisir ici).
3. Build & Run sur un Quest 3 connecté en USB (ADB), vise un QR imprimé.
4. Regarde la Logcat (`adb logcat -s Unity`) : tu dois voir `[GMP] Authentifié...` puis, en
   pointant un QR, `[GMP] QR détecté...` et `[GMP] Manifest chargé...`.

Si le câblage MRUK (`QrManifestLoader.cs`) ne compile pas ou ne déclenche rien : compare avec la
scène d'exemple `QRCodeDetection` de l'échantillon officiel (lien en haut) et ajuste les noms
d'API — cette partie est une ébauche, pas du code vérifié.
