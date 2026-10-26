# Le Relevé

Journal quotidien : bourse (CAC 40 + 20 valeurs US, cours en direct), reporting hebdomadaire et veille aéronautique / géopolitique / énergie.

- `index.html` : la page.
- `journal.json` : l'édition du jour, régénérée chaque soir vers 20h52 (heure de Paris) par Claude et poussée sur ce dépôt.
- `api/cours.js` : fonction Vercel qui renvoie les cours en direct ; la page l'interroge chaque minute.

Hébergement : Vercel (offre gratuite Hobby), déploiement automatique à chaque push sur `main`.
Ce site ne constitue pas un conseil en investissement.
