# Mise en place du projet Unity (dans le VDI) — pas à pas

Ce guide part du principe que tu n'as jamais ouvert Unity. Certaines zones sont marquées **⚠️
incertain** parce que je ne peux pas les vérifier sans éditeur/casque sous les yeux (interfaces
qui changent souvent, ou jamais vues par moi) — ce sont les seuls endroits où il faudra peut-être
improviser par rapport à ce que je décris. Partout ailleurs, ce sont des menus stables depuis des
années.

**Avant de commencer** : clone le dépôt dans le VDI si ce n'est pas déjà fait.
```bash
git clone https://github.com/AntoineP3371/gmp-guide-ra.git
```

---

## Étape 0 — Confirmé : pas d'USB, pas de mode développeur visible

Deux contraintes déjà vérifiées pour ce projet, pas la peine de retester :
- **Le VDI ne transmet pas l'USB** au casque → pas de « Build & Run » classique.
- **Les casques en MDM ne semblent pas avoir de mode développeur accessible**.

Conséquence : créer le projet, écrire/compiler le code, produire un `.apk` — tout ça se fait
normalement dans le VDI (étapes 1 à 10). Seule l'**étape 11** (tester sur le casque) change de
méthode : APK construit dans le VDI, sorti du VDI, puis poussé au casque **par le réseau** via
Meta Device Manager plutôt que par câble — détaillé dans l'étape 11.

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

### 5e. Si la Console affiche des erreurs rouges sur « Meta XR Simulator »

Le SDK Meta importe parfois automatiquement le package **Meta XR Simulator** — il sert à tester en
Play Mode dans l'éditeur *sans* casque réel, via un composant natif installé hors Unity (nécessite
les droits admin). On ne s'en sert pas ici (on teste toujours sur un vrai casque via Meta Device
Manager) et ce n'est pas une dépendance obligatoire de MR Utility Kit — si tu n'as pas les droits
admin sur le VDI pour l'installateur natif, **retire le package** plutôt que d'essayer de
l'installer :
1. `Window → Package Manager` → menu déroulant en haut à gauche → **In Project**.
2. Cherche **Meta XR Simulator** (ou **Meta XR Simulator Support**) dans la liste.
3. Sélectionne-le → **Remove** en bas à droite.

Ça doit faire disparaître les erreurs rouges liées — et donc débloquer `Add Component`, qui reste
vide pour **tous** les scripts custom (pas juste celui concerné) tant qu'il y a une seule erreur de
compilation dans le projet.

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

## Étape 10 — Nettoyer la scène par défaut et brancher le script de test

Selon le template choisi à l'étape 3 (ou selon ce qui était déjà préparé dans le VDI), la scène de
départ n'est pas forcément vide — deux cas possibles :

**Cas A — scène vide type « 3D (Core) »** : une **Main Camera** de bureau classique, fixe, qui ne
suivra jamais les mouvements de tête.
1. Dans **Hierarchy**, sélectionne **Main Camera** → clic droit → **Delete**. (La **Directional
   Light** à côté peut rester.)
2. **Ajouter le rig caméra du casque** — ⚠️ incertain (le nom exact dépend de la version du SDK
   Meta importée à l'étape 5c) :
   - Dans le panneau **Project**, barre de recherche → tape `OVRCameraRig`. S'il apparaît, glisse
     le prefab dans **Hierarchy**.
   - S'il n'existe pas sous ce nom, cherche un menu **Meta → Tools → Building Blocks** (parfois
     **GameObject → Meta XR → Camera Rig**), ou directement un objet **`XR Origin (XR Rig)`** /
     **`XR Origin Hands (XR Rig)`** — c'est le nom plus récent du même genre de rig (voir Cas B).

**Cas B — scène déjà fournie avec un exemple Meta** (rig + objets de démo d'interaction — cube,
totems, panneaux UI, zone de téléportation…) : c'est souvent le cas si le VDI vient avec un projet
pré-configuré.
1. **Garde** l'objet **`XR Origin Hands (XR Rig)`** (ou `XR Origin (XR Rig)`, `OVRCameraRig`) —
   c'est le rig caméra du casque, exactement ce que le Cas A demande d'ajouter. Ne le supprime pas,
   n'en ajoute pas un second.
2. **Supprime tout le reste** qui ne sert à rien pour notre app — repère les groupes du genre
   `Interactables` (cube/cylindre/tore/totems/blaster…), `UI` (panneaux, tutoriel), `Environment`
   (sol/mur de démo), `Teleport Area Setup` : sélectionne-les (Shift+clic pour tout prendre d'un
   coup) → **Delete**. La **Lighting** (Directional Light, Post Process Volume) peut rester.

Dans les deux cas, une fois la scène nettoyée et le rig caméra en place :

3. **Indispensable, oublié facilement** : dans le panneau **Project**, cherche un prefab nommé
   **`MRUK`** (fourni par le SDK Meta — barre de recherche du panneau Project, tape `MRUK`).
   Glisse-le dans le panneau **Hierarchy**. Sans lui, `MRUK.Instance` reste `null` et rien ne se
   passe jamais (le script logue une erreur explicite dans ce cas, donc si tu la vois dans la
   Console, c'est ça).
4. Toujours dans **Hierarchy** → clic droit dans le vide → **Create Empty**. Renomme-le
   (double-clic sur le nom) en `ManifestLoader`.
5. Sélectionne-le. Dans le panneau **Inspector** (à droite), bouton **Add Component** en bas.
6. Tape `Qr Manifest Loader` dans la recherche, clique dessus pour l'ajouter.
7. Trois champs apparaissent dans l'Inspector, remplis-les :
   - **Backend Base Url** : `https://api.gmpbordeaux.fr`
   - **Viewer Email** : `casque@gmpbordeaux.fr`
   - **Viewer Password** : (celui donné lors de la mise en prod du backend — redemande-le moi si
     tu ne l'as plus sous la main, je ne le remets pas ici en clair)
8. **Ctrl+S** (ou File → Save) pour sauvegarder la scène.

## Étape 10.5 — Voir les logs sans câble ni mode développeur

Sans USB ni logcat, `Debug.Log` ne mène nulle part. `OnScreenLogger.cs` (déjà copié à l'étape 9)
affiche les derniers logs **directement dans la vue du casque** — aucun réglage dans l'éditeur au
delà de l'accrocher :

1. **Hierarchy** → clic droit → **Create Empty**, renomme en `Logger`.
2. **Add Component** → `On Screen Logger`.
3. Sauvegarde la scène (Ctrl+S).

Non testé sur casque réel de mon côté (pas d'éditeur/casque disponible ici) — si le panneau
n'apparaît pas une fois l'app lancée, le plus probable est que `Camera.main` ne pointe pas vers la
caméra du rig Meta (vérifie qu'elle a bien le tag **MainCamera** dans son Inspector).

## Étape 11 — Build de l'APK, puis déploiement via Meta Device Manager

Le VDI ne voit pas le port USB du casque (confirmé), et les casques en MDM ne semblent pas avoir
de mode développeur accessible — donc pas de « Build & Run » classique ici. On construit l'APK
dans le VDI, on le sort du VDI, et on le pousse au casque **par le réseau**, via le même canal que
pour la mise en prod finale (Meta Device Manager) plutôt que par câble.

### 11a. Construire juste l'APK (pas de casque nécessaire)

1. **File → Build Settings**, onglet **Android** sélectionné.
2. Bouton **Build** (pas *Build And Run* — celui-ci ne demande pas de casque connecté).
3. Choisis un nom/dossier de sortie, ex. `gmp-guide-ra.apk`. Ça peut prendre plusieurs minutes la
   première fois.

### 11b. Rendre l'APK accessible par une URL publique

**Contrainte découverte à l'usage : Device Manager ne propose qu'un champ URL, pas un champ
d'upload direct** — c'est son propre serveur qui va chercher le fichier, pas ton navigateur. Il
faut donc une vraie URL publique, sans authentification, qui pointe directement sur l'`.apk`.

**Contrainte de taille, elle aussi confirmée à l'usage** : un rapport de build (Console → dernier
message *Build Report* après un build, ou `Editor.log` si absent de la Console) a montré que
les assets propres au projet ne pèsent que ~60 Mo — le reste (APK final ~105 Mo) vient des
bibliothèques natives du SDK Meta XR / MR Utility Kit (scene understanding, hand tracking,
passthrough…), qui pèsent lourd même dans une app minimale. **C'est un plancher quasi
incompressible** : quasiment toute app Meta XR/MRUK, même vide de contenu, pèse 80-150 Mo une fois
compilée. Ne perds pas de temps à essayer de descendre sous ce poids par des réglages de build.

Or ce poids dépasse la limite de 100 Mo par requête que Cloudflare impose sur le tunnel qui expose
le Pi (plan gratuit) — donc **héberger l'APK via PocketBase/le Pi ne fonctionnera pas** pour ce
projet. On utilise **GitHub Releases** à la place (limite de 2 Go par fichier, largement
suffisant) :

⚠️ Le dépôt `gmp-guide-ra` est public, et l'APK embarque en dur les identifiants du compte
`viewer` PocketBase saisis à l'étape 10 (Unity les compile dans les données de la scène,
extractibles du binaire). Contrairement à une Release GitHub en brouillon (inaccessible sans
connexion, donc inutilisable ici puisque Device Manager doit la récupérer lui-même sans
authentification), il faut cette fois **publier réellement** la Release le temps du transfert, puis
refermer l'exposition immédiatement après :

**À chaque build**, depuis le VDI :
1. `github.com/AntoineP3371/gmp-guide-ra/releases/new`, glisse l'`.apk` construit à l'étape 11a
   dans la zone d'attachement de binaires. Tag/titre quelconques (ex. `test-apk-1`).
2. Cette fois, clique **Publish release** (pas Save draft) — Device Manager doit pouvoir
   télécharger le fichier sans être connecté à GitHub.
3. Une fois publiée, clic droit sur le lien de téléchargement de l'`.apk` dans la page de la
   release → **Copier l'adresse du lien** — c'est cette URL qu'on donne à Device Manager (étape
   11c).
4. **Dès que l'app est installée sur le casque** :
   - Supprime la release (`Releases` → la release → **Delete**) pour refermer l'accès public au
     fichier.
   - **Change le mot de passe du compte `viewer@gmp.local`** dans l'admin PocketBase
     (`https://api.gmpbordeaux.fr/_/` → collection `users` → `viewer@gmp.local` → Edit → nouveau
     mot de passe) — pour invalider les identifiants qui ont transité en clair dans un binaire
     public pendant la fenêtre d'exposition. Uniquement via le navigateur, pas besoin de SSH.
   - Remets à jour le champ **Viewer Password** dans l'Inspector Unity (étape 10) avec le nouveau
     mot de passe avant le prochain build, sinon l'app ne pourra plus s'authentifier.

### 11c. Pousser l'app au casque via Meta Device Manager — ⚠️ incertain

Je n'ai jamais eu ce tableau de bord sous les yeux, donc je décris le principe plutôt que des
clics exacts :

1. **Meta Horizon Developer Center** (developers.meta.com/horizon) → ton organisation → section
   apps privées / **Device Manager**.
2. Créer/mettre à jour une **app privée** en donnant l'**URL publique** de l'APK obtenue à l'étape
   11b (`https://api.gmpbordeaux.fr/<nom-aleatoire>.apk`) — confirmé que ce dashboard récupère le
   fichier lui-même depuis une URL plutôt que d'accepter un envoi direct depuis le navigateur.
3. **Data Use Checkup** : la première fois, Meta demande de justifier les permissions utilisées
   (ici la caméra, `horizonos.permission.HEADSET_CAMERA`) avant de rendre l'app disponible — ça
   peut prendre un peu de temps, pas juste un clic. Si l'app refuse de s'installer ou de démarrer
   correctement la première fois, c'est le premier endroit à vérifier.
4. Assigner l'app au casque de test (ou à son groupe) dans **Device Manager**.
5. Sur le casque : l'app apparaît dans sa bibliothèque une fois poussée (peut prendre quelques
   minutes), la lancer manuellement.
6. Viser un QR imprimé, lire les logs directement dans le casque grâce au panneau de l'étape 10.5
   (`[GMP] Authentifié...`, `[GMP] QR détecté...`, `[GMP] Manifest chargé...`).

Si un écran ne correspond pas à ce que je décris ici, c'est le passage le moins fiable de ce guide
— décris-moi ce que tu vois, je corrige.

---

Si quelque chose ne correspond pas à ce que tu vois à l'écran (surtout aux étapes ⚠️ marquées
incertaines), décris-moi ce que tu observes plutôt que de deviner — je réajuste ce guide.
