
- Multi-rôles : AuthContext lit tous les rôles de user_roles ; mono-rôle = identique, multi-rôle = choix mémorisé (logisorama.active-role) sinon priorité. Why: double rôle candidat+client sans casser les comptes existants.
- Candidat→client uniquement via RPC activate_candidat_searches (SECURITY DEFINER). Why: jamais d’INSERT libre dans user_roles.
