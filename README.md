# SICTA — PWA de réservation de visite technique (Côte d'Ivoire)

Prototype **HTML / CSS / JavaScript** (sans framework ni build) assemblé à partir des maquettes Stitch.
Installable, fonctionne **hors ligne** (les Pass QR restent lisibles) et se déploie tel quel sur GitHub Pages
(`https://ebenezeroppong4127.github.io/sicta/`).

> Démonstration : aucun paiement réel, registre et disponibilités simulés (`js/data.js`).

## Parcours

| Espace | Écrans |
|---|---|
| Public | Landing → simulateur de tarif → vérification de vignette |
| Particulier | Tarif → Centre & date → Véhicule & paiement → Reçu (Pass QR) · Mes véhicules · Profil |
| Flotte (B2B) | Dashboard → Planification (groupé / étalé) → Facturation groupée → Pass & Dispatch · Compte (import CSV) |

## Structure

```
index.html            coquille (en-tête, onglets, <main>)
manifest.webmanifest  PWA · sw.js  service worker (précache + hors ligne)
css/                  base (tokens DESIGN.md, chrome) · components · screens
js/app.js             routes + chrome        js/router.js  routeur par hash
js/store.js           état persistant        js/domain.js  tarifs, créneaux, planning, QR
js/data.js            données de démo        js/screens/*  un fichier par écran
js/components/        stepper, paiement, vérificateur de plaque, impression A4
js/vendor/qrcode.js   générateur de QR local (MIT)
icons/                logo, icônes PWA, sprite SVG Material Symbols (local)
scripts/stamp-sw.mjs  versionne le service worker (lancé par le workflow)
```

Choix techniques : routage par **hash** (aucune réécriture serveur, compatible sous-dossier GitHub Pages),
chemins relatifs, polices système (**Georgia**), icônes et QR embarqués (aucun CDN → offline réel),
PDF A4 via l'impression du navigateur.

## Lancer en local

```sh
python3 -m http.server 8000   # puis http://localhost:8000/
```

## Tests

```sh
node --test tests/unit.test.mjs                      # logique métier (aucune dépendance)

python3 -m http.server 8000 &                        # tests de bout en bout (Chromium)
npm i playwright-core jsqr pngjs                     # dans un dossier de votre choix
PW_FROM=/chemin/du/dossier BASE=http://localhost:8000/ node tests/e2e.mjs
```

La suite de bout en bout couvre les parcours complets (réservation, flotte, B2B), les gardes de navigation,
l'horloge simulée (samedi soir, dimanche), le GPS, l'import CSV, le décodage réel des QR, l'accessibilité,
le mode hors ligne et le responsive de 320 à 1536 px.

## Déployer sur GitHub Pages

Le workflow `.github/workflows/static.yml` publie le site à chaque push sur `main`
(Réglages → Pages → Source : **GitHub Actions**). Il versionne d'abord le service worker
(`scripts/stamp-sw.mjs`) pour que chaque déploiement renouvelle le cache hors ligne.

## Format d'import CSV (flotte)

`plaque;modèle;type;échéance;chauffeur;téléphone` — type : `VP`, `PL` ou `Minibus`, échéance `AAAA-MM-JJ`.
