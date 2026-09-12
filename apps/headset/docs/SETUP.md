# Mise en place du projet Unity (dans le VDI) — pas à pas

Ce guide part du principe que tu n'as jamais ouvert Unity. Trois zones sont marquées **⚠️
incertain** parce que je ne peux pas les vérifier sans éditeur Unity sous les yeux (l'interface
change souvent) — ce sont les seuls endroits où il faudra peut-être improviser un peu par rapport
à ce que je décris. Partout ailleurs, ce sont des menus stables depuis des années.

**Avant de commencer** : clone le dépôt dans le VDI si ce n'est pas déjà fait.
```bash
git clone https://github.com/AntoineP3371/gmp-guide-ra.git
```

---

## Étape 0 — Vérifier le point qui peut tout bloquer

Le Quest 3 devra être branché en USB à la machine qui fait tourner Unity pour le tester
(« Build & Run »). **Si ton VDI ne transmet pas l'USB** (pas de « USB passthrough » côté client
VDI), cette étape précise (branchement + test sur casque) ne pourra pas se faire depuis le VDI —
tout le reste (créer le projet, écrire/compiler le code, faire un `.apk`) fonctionnera quand même.
Pas besoin de le vérifier maintenant, juste à garder en tête : si à l'étape 11 le casque
n'apparaît jamais dans Unity, c'est probablement ça, et il faudra faire cette dernière étape
depuis une machine qui voit vraiment le port USB.

---

## Étape 1 — Installer Unity Hub

1. Dans le VDI, ouvre un navigateur, va sur **unity.com/download**.
2. Télécharge et installe **Unity Hub** (c'est un petit programme séparé de l'éditeur lui-même).
3. Lance Unity Hub. Il demande de te connecter avec un **Unity ID** — crée-en un si tu n'en as
   pas (gratuit, juste un compte).

## Étape 2 — Installer l'éditeur Unity

1. Dans Unity Hub, panneau de gauche → onglet **Installs**.
2. Bouton **Install Editor** (ou **+**) en haut à droite.
3. Choisis **Unity 6** — prends la version proposée la plus récente commençant par `6000.0.`
   (ex. `6000.0.66f2` ou plus récent). Pas la peine de chercher une version précise, la plus
   récente de la branche `6000.0` convient.
4. Un écran **« Add modules »** apparaît juste après avoir choisi la version. **Coche
   « Android Build Support »** — ça fait normalement apparaître/cocher automatiquement deux
   sous-cases en dessous (**OpenJDK**, **Android SDK & NDK Tools**) : laisse-les cochées aussi.
5. Continue, accepte les licences, lance l'installation.

   ⏱️ C'est un gros téléchargement (plusieurs Go). Sur un VDI ça peut prendre un moment — lance-le
   et fais autre chose en attendant si besoin.

## Étape 3 — Créer le projet

1. Unity Hub → onglet **Projects** → bouton **New project**.
2. En haut, vérifie que la version d'éditeur sélectionnée est bien celle installée à l'étape 2.
3. Dans la liste de templates, choisis **3D (Core)** (le plus simple, vide — pas de template
   « VR »/« AR », ils embarquent des exemples dont on n'a pas besoin et qui compliquent la suite).
4. Nom du projet : ce que tu veux, ex. `gmp-guide-ra-headset`. Emplacement : peu importe où dans
   le VDI, mais note l'endroit — tu vas devoir y copier des fichiers à l'étape 9.
5. **Create project**. L'éditeur Unity s'ouvre (peut prendre 1-2 min la première fois).

## Étape 4 — Basculer la plateforme de build sur Android

1. Dans l'éditeur : menu du haut **File → Build Settings…** (ou **File → Build Profiles** selon
   la version — même idée, une fenêtre avec une liste de plateformes à gauche).
2. Dans la liste de gauche, clique **Android**.
3. Bouton **Switch Platform** en bas à droite de la fenêtre. Clique, attends (ça réimporte des
   assets, peut prendre quelques minutes, une barre de progression s'affiche en bas de l'écran).
4. Tu peux fermer cette fenêtre une fois le switch terminé.

## Étape 5 — Installer les packages via le Package Manager

Menu **Window → Package Manager** — une nouvelle fenêtre/onglet s'ouvre. C'est là que tout se
passe pour cette étape.

### 5a. OpenXR Plugin
1. En haut à gauche de la fenêtre Package Manager, un menu déroulant (souvent « In Project » par
   défaut) → sélectionne **Unity Registry**.
2. Barre de recherche → tape `OpenXR Plugin`.
3. Clique sur le résultat dans la liste, puis bouton **Install** en bas à droite du panneau de
   détail.
4. Attends la fin (petite roue de chargement en haut).

### 5b. Newtonsoft Json
1. Toujours dans Package Manager, bouton **+** en haut à gauche (ou **Add package by name...**
   selon la version) → **Add package by name…**
2. Tape exactement : `com.unity.nuget.newtonsoft-json`
3. **Add**. Attends la fin.

### 5c. Meta XR SDK + MR Utility Kit — ⚠️ incertain

C'est l'étape la moins stable dans le temps. Voici le chemin le plus courant ; si ton écran ne
correspond pas exactement, l'idée générale (« récupérer le package depuis l'Asset Store Meta puis
l'importer ») reste la même.

1. Dans un navigateur, connecté avec le **même compte Unity** que dans Hub, va sur :
   **assetstore.unity.com**, cherche **« Meta XR SDK »** (ou « Meta XR All-in-One SDK »).
2. Sur la page du package : bouton **Add to My Assets** (c'est gratuit).
3. Retour dans l'éditeur Unity → Package Manager → menu déroulant en haut à gauche → cherche une
   option du genre **My Assets** ou **Asset Store** (dans Unity 6, l'Asset Store est intégré
   directement dans cette fenêtre, plus besoin d'un site séparé).
4. Trouve **Meta XR SDK** (ou **Meta XR Core SDK**) dans la liste → **Download** puis **Import**.
5. Une fenêtre **« Import Unity Package »** liste plein de fichiers cochés → laisse tout coché →
   **Import**. Ça peut prendre plusieurs minutes.
6. Cherche aussi **« Meta MR Utility Kit »** de la même façon (c'est parfois inclus
   automatiquement dans le SDK principal, parfois un package séparé à ajouter en plus — si tu ne
   le trouves pas séparément après l'import du SDK principal, c'est probablement qu'il est déjà
   inclus).

### 5d. Le Project Setup Tool (automatique, à laisser faire)

Après l'import du SDK Meta, une fenêtre s'ouvre normalement toute seule : **« Meta » (ou
« Oculus ») → Project Setup Tool**. Si elle ne s'ouvre pas automatiquement, cherche un nouveau
menu **Meta** (ou **Oculus**) apparu dans la barre de menus tout en haut, puis dedans quelque
chose comme **Tools → Project Setup Tool**.

Cette fenêtre liste des réglages à corriger avec un bouton **Fix All** (ou des boutons **Fix**
un par un). **Clique Fix All puis Apply** — c'est plus fiable que de régler ça à la main, il
configure OpenXR/Android/les Player Settings tout seul.

## Étape 6 — Vérifier XR Plug-in Management

(Normalement déjà fait par le Project Setup Tool à l'étape 5d — cette étape sert juste à
vérifier.)

1. **Edit → Project Settings**.
2. Dans le panneau de gauche, clique **XR Plug-in Management**.
3. En haut du panneau, un onglet **Android** (icône robot vert) — clique dessus s'il n'est pas
   déjà sélectionné.
4. Vérifie que la case **OpenXR** est cochée.
5. En dessous de « XR Plug-in Management » dans le panneau de gauche, un sous-menu **OpenXR** est
   apparu — clique dessus. Vérifie qu'un feature group du genre **« Meta Quest Support »**
   (le nom exact peut varier légèrement) est coché dans la liste des « Interaction Profiles » /
   « OpenXR Feature Groups ».
6. S'il y a un triangle jaune d'avertissement quelque part sur cette page, clique dessus : ça
   affiche une liste de problèmes avec des boutons **Fix** à côté de chacun.

## Étape 7 — Player Settings

1. **Edit → Project Settings → Player**.
2. En haut du panneau, vérifie que l'onglet **Android** (icône robot) est sélectionné (pas
   Windows).
3. Déroule **« Other Settings »**.
   - **Color Space** → **Linear**.
   - **Minimum API Level** / **Target API Level** : laisse ce que le Project Setup Tool a réglé à
     l'étape 5d — ne change pas ces valeurs à la main sauf si Unity affiche une erreur explicite
     à ce sujet.
4. Section **« Identification »** (un peu plus haut) → **Package Name** : remplace la valeur par
   défaut par quelque chose de stable, ex. `fr.gmpbordeaux.guidera` (ça ne changera plus jamais
   après, important pour la suite avec Meta Device Manager).

## Étape 8 — Permission caméra (nécessaire pour scanner les QR)

1. **Edit → Project Settings → Player → onglet Android → Publishing Settings**.
2. Coche **« Custom Main Manifest »** — ça génère un fichier `Assets/Plugins/Android/AndroidManifest.xml`
   (crée les dossiers `Plugins/Android` s'ils n'existaient pas).
3. Dans le panneau Project (en bas à gauche de l'éditeur en général), navigue jusqu'à
   `Assets/Plugins/Android/AndroidManifest.xml` et double-clique pour l'ouvrir dans l'éditeur de
   texte du VDI.
4. Ajoute ces deux lignes juste avant la balise `<application ...>` :
   ```xml
   <uses-permission android:name="horizonos.permission.HEADSET_CAMERA" />
   <uses-permission android:name="android.permission.CAMERA" />
   ```
5. Sauvegarde le fichier, reviens dans Unity (il recompile/revalide automatiquement).

## Étape 9 — Copier les scripts du dépôt

1. Ouvre l'explorateur de fichiers du VDI (pas Unity).
2. Va dans le dossier où tu as cloné le dépôt (étape « Avant de commencer ») →
   `apps/headset/Assets/Scripts/`.
3. Copie tout le dossier **`Scripts`**.
4. Colle-le dans `<emplacement de ton projet Unity>/Assets/` (donc tu te retrouves avec
   `Assets/Scripts/Manifest/...` et `Assets/Scripts/QrManifestLoader.cs` dans le projet).
5. Reviens dans l'éditeur Unity (clique sur sa fenêtre) — il détecte les nouveaux fichiers et les
   importe automatiquement (courte barre de progression).
6. **Ouvre la Console** : **Window → General → Console**. S'il y a des erreurs de compilation en
   rouge, c'est très probablement dans `QrManifestLoader.cs` (le fichier explicitement marqué
   non-vérifié) — copie-moi le message d'erreur exact, je corrige.

## Étape 10 — Brancher le script de test à une scène

1. **Indispensable, oublié facilement** : dans le panneau **Project**, cherche un prefab nommé
   **`MRUK`** (fourni par le SDK Meta — barre de recherche du panneau Project, tape `MRUK`).
   Glisse-le dans le panneau **Hierarchy**. Sans lui, `MRUK.Instance` reste `null` et rien ne se
   passe jamais (le script logue une erreur explicite dans ce cas, donc si tu la vois dans la
   Console, c'est ça).
2. Toujours dans **Hierarchy** → clic droit dans le vide → **Create Empty**. Renomme-le
   (double-clic sur le nom) en `ManifestLoader`.
3. Sélectionne-le. Dans le panneau **Inspector** (à droite), bouton **Add Component** en bas.
4. Tape `Qr Manifest Loader` dans la recherche, clique dessus pour l'ajouter.
5. Trois champs apparaissent dans l'Inspector, remplis-les :
   - **Backend Base Url** : `https://api.gmpbordeaux.fr`
   - **Viewer Email** : `casque@gmpbordeaux.fr`
   - **Viewer Password** : (celui donné lors de la mise en prod du backend — redemande-le moi si
     tu ne l'as plus sous la main, je ne le remets pas ici en clair)
6. **Ctrl+S** (ou File → Save) pour sauvegarder la scène.

## Étape 11 — Build & Run sur le casque

1. Casque en **mode développeur** activé (app Meta Horizon sur téléphone → réglages du casque →
   mode développeur — si ce n'est pas déjà fait, c'est indépendant du VDI).
2. Branche le Quest 3 en USB à la machine qui exécute réellement l'éditeur (voir Étape 0 si ça
   coince ici).
3. Dans le casque, accepte le popup **« Autoriser le débogage USB »**.
4. Unity → **File → Build Settings** → onglet Android toujours sélectionné → en bas, menu
   déroulant **« Run Device »** : le Quest doit apparaître dans la liste une fois détecté.
5. **Build And Run**. Choisis un dossier de sortie pour l'APK si demandé. Premier build = plusieurs
   minutes.
6. Une fois lancé sur le casque, vise un QR imprimé et observe. Pour voir les logs en détail :
   `adb logcat -s Unity` depuis un terminal qui a accès à l'ADB (celui utilisé pour builder).
   Tu dois voir `[GMP] Authentifié...` au démarrage, puis `[GMP] QR détecté...` et
   `[GMP] Manifest chargé...` en visant le QR.

---

Si quelque chose ne correspond pas à ce que tu vois à l'écran (surtout aux étapes ⚠️ marquées
incertaines), décris-moi ce que tu observes plutôt que de deviner — je réajuste ce guide.
