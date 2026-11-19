# OddsLab

Générateur de scores exacts probabilistes pour 25 compétitions de football. Les pages « Cotes réelles » et « Matchs et cotes par ligue » affichent les matchs à venir réellement retournés par The Odds API, avec leurs cotes 1X2 et leur nombre de bookmakers. Ce ne sont pas des classements officiels ni des notes Elo. Le modèle Poisson ajuste les buts attendus aux cotes 1X2 et, lorsque disponibles, aux marchés over/under 2,5. Les scores affichés sont des estimations de marché, jamais des garanties; le modèle ne reçoit pas les compositions, blessures ou statistiques détaillées des équipes.

## Mise en service

1. Dans le projet Google Apps Script déjà lié à l’application, remplacez le contenu de `Code.gs` par ce fichier et remplacez le fichier HTML nommé `index` par la dernière version de `index.html` du dépôt.
2. Dans **Paramètres du projet → Propriétés du script**, ajoutez `ODDS_KEY` avec une nouvelle clé The Odds API. `GEMINI_KEY` est facultative; sans elle, l’analyse utilise le résumé de secours. `ADMIN_EMAIL` et `ADMIN_PASS` sont facultatives et activent le compte administrateur quand les deux sont définies.
3. Dans l’éditeur Apps Script, choisissez `setupDatabase` dans la liste des fonctions et cliquez **Exécuter**. Autorisez l’accès à Google Sheets; cette fonction crée la base et ses onglets une seule fois.
4. Enregistrez, puis mettez à jour le déploiement Web App existant vers une nouvelle version. La page GitHub Pages redirige vers la Web App Apps Script afin d’éviter le blocage CORS; dans cette Web App, `index.html` appelle le serveur via `google.script.run`. Si vous créez un nouveau déploiement avec une URL différente, mettez à jour `GAS_URL` dans `index.html` avant de publier la page GitHub.
5. Dans le déploiement, choisissez **Exécuter en tant que : moi** pour que le serveur utilise l’autorisation Sheets du propriétaire. Vérifiez aussi l’accès Web App.

Le serveur interroge les 25 compétitions à la première requête, puis garde les résultats en cache pendant 15 minutes. Vérifiez la consommation et les limites de votre forfait The Odds API avant d’activer ce déploiement.

## Configuration des secrets

Les clés API et les identifiants administrateur ne sont pas stockés dans le dépôt. Les anciennes valeurs présentes dans la copie source initiale ont été retirées; révoquez-les et créez de nouvelles clés avant la mise en service.
