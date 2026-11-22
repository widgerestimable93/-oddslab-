# OddsLab Intelligence

OddsLab affiche les matchs à venir et les cotes disponibles depuis The Odds API. Le moteur Poisson transforme les cotes 1X2 et, quand ils sont fournis, les totaux en probabilités et scores estimés. Ce ne sont pas des scores garantis, un classement officiel, une note Elo ou une preuve de rentabilité. Le projet ne dispose pas encore d’un historique de résultats permettant de mesurer sa précision ni de faire un backtest.

## Architecture

- GitHub Pages héberge la coque installable PWA et le manifeste.
- Cette coque conserve l’origine GitHub Pages et ouvre l’application Apps Script dans une iframe plein écran. L’application embarquée utilise `google.script.run`, ce qui évite les appels API cross-origin depuis la page GitHub.
- Apps Script appelle The Odds API, calcule le modèle et stocke les comptes dans Google Sheets.
- Le service worker met en cache la coque web. Les cotes et l’application Apps Script demandent une connexion Internet.

L’adresse Apps Script est définie par `GAS_URL` dans `index.html`. Si l’URL du déploiement change, remplacez-la avant de publier.

## Installation Apps Script

1. Dans le projet Apps Script, remplacez le contenu de `Code.gs` par la version du dépôt.
2. Remplacez le fichier HTML Apps Script nommé `index` par `index.html` du dépôt. Dans Apps Script, le nom visible du fichier HTML peut être `index.html`; `createHtmlOutputFromFile("index")` utilise son nom sans extension.
3. Dans **Paramètres du projet → Propriétés du script**, configurez :
   - `ODDS_KEY` : clé The Odds API, gardée uniquement côté serveur.
   - `ADMIN_EMAIL` et `ADMIN_PASS` : facultatifs; les deux doivent être définis pour activer l’administration. Utilisez un mot de passe fort d’au moins 10 caractères.
   - `GEMINI_KEY` : facultative; sans clé, un résumé de secours est utilisé.
   - Pour activer le bouton PayPal, ajoutez `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID` et `PAYPAL_ENV` (`sandbox` ou `live`). Le serveur vérifie l’état, le forfait et l’adresse acheteur auprès de PayPal avant d’activer l’abonnement.
4. Dans l’éditeur Apps Script, exécutez `setupDatabase` une fois et autorisez Google Sheets.
5. Dans **Déployer → Gérer les déploiements**, modifiez la Web App vers une **nouvelle version**. Choisissez **Exécuter en tant que : moi** et donnez à la Web App l’accès nécessaire à ses utilisateurs.

Ne collez jamais une clé API, un mot de passe ou un fichier de signature dans le dépôt ou dans une capture d’écran.

## PWA GitHub Pages

Le dépôt est configuré pour publier depuis la branche `main`, à la racine. Après la publication, ouvrez la page GitHub Pages sous Chrome, puis choisissez **Installer OddsLab** dans le menu du navigateur. Si l’installation n’est pas proposée, vérifiez que le manifeste et le service worker sont accessibles et rechargez après la publication.

Les icônes, le manifeste et le service worker sont à la racine : `icon.svg`, `manifest.webmanifest` et `sw.js`.

## Clés exposées à révoquer

Une ancienne capture d’écran a rendu visible une clé The Odds API, et un fichier keystore Android a été publié dans l’historique du dépôt. Le keystore a été retiré de la version actuelle et les fichiers de signature sont ignorés, mais l’ancien historique Git reste public. Révoquez la clé Odds API divulguée et remplacez le certificat de signature Android exposé selon la situation de publication de l’application.

## Android

Le workflow `.github/workflows/build-apk.yml` crée un APK uniquement lorsque les fichiers Android ou le workflow changent, ou sur lancement manuel. Il nécessite des secrets GitHub `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` et `KEY_PASSWORD`. Ne réutilisez pas le keystore publié. Le fichier Digital Asset Links `/.well-known/assetlinks.json` avec l’empreinte du certificat de signature reste nécessaire pour valider une Trusted Web Activity.

## Limites à régler avant un lancement commercial

- Les cotes de 25 compétitions sont interrogées avec les marchés `h2h` et `totals`; surveillez le quota The Odds API.
- Les routes scanner et marchés de buts vérifient le forfait depuis le serveur; l’interface ne peut pas accorder premium en changeant le stockage local. La limite « 5 analyses/jour » reste locale au navigateur et n’est pas un quota serveur robuste; ne la présentez pas comme une protection anti-abus.
- L’activation PayPal est vérifiée côté serveur, et le forfait actif est revérifié à l’usage (état mis en cache 5 minutes). Il reste à ajouter une notification PayPal pour une révocation immédiate, ainsi qu’un processus de remboursement/annulation.
- Les pages backtest, attribution SHAP, Elo et classements ne sont pas implémentées faute de sources dédiées. Elles sont maintenant signalées comme indisponibles au lieu d’afficher des chiffres fictifs.
