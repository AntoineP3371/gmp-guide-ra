Tout fichier posé ici est copié tel quel à la racine du build (`dist/`), donc du site publié.

**Domaine personnalisé GitHub Pages** : pour servir l'app sur `prepa.tondomaine.fr`, créer un
fichier `CNAME` (sans extension) dans ce dossier, contenant une seule ligne :

```
prepa.tondomaine.fr
```

Puis, chez Cloudflare (DNS du domaine) : un enregistrement `CNAME prepa -> <user>.github.io`
(proxy Cloudflare désactivé — nuage gris — pour que la vérification GitHub Pages passe), et dans
Settings > Pages du dépôt GitHub, renseigner le même domaine personnalisé.

Ce fichier n'est pas commité tant que le domaine réel n'est pas choisi (pour ne pas casser
`actions/deploy-pages` avec un domaine bidon).
