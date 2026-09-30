
- Multi-rôles : AuthContext lit tous les rôles de user_roles ; mono-rôle = identique, multi-rôle = choix mémorisé (logisorama.active-role) sinon priorité. Why: double rôle candidat+client sans casser les comptes existants.
- Candidat→client uniquement via RPC activate_candidat_searches (SECURITY DEFINER). Why: jamais d’INSERT libre dans user_roles.
- Tableau candidat : réutiliser la couverture, l'entête, les pastilles et les tuiles client avec des destinations candidat ; agenda et messages candidat restent isolés des routes client protégées. Why: cohérence visuelle sans élargir les accès ni changer les espaces mono-rôle.
- Critères candidat : table candidat_criteres (1 ligne/user, RLS propriétaire + lecture admin/agent), formulaire = MandatFormStep4 réutilisé, écran bloquant CandidatCriteresGate sur routes candidat ; pré-remplit /nouveau-mandat via son brouillon localStorage. Why: cohérence client et aucun changement du formulaire mandat.
