

# Fix calendrier admin : rechargements + RDV téléphoniques manquants

## Problèmes constatés

### 1. Le calendrier se recharge constamment et bloque la sélection de date
Dans `src/pages/admin/Calendrier.tsx` :
- `setLoading(true)` est appelé **à chaque rechargement** (initial, polling 30s, realtime), ce qui fait disparaître tout le calendrier et affiche le spinner plein écran → impossible de cliquer sur une date pendant le rechargement.
- Le `useEffect` a `[loadData, debouncedReload]` en dépendances : ces fonctions sont recréées si quelque chose change → la subscription realtime + le `setInterval` sont détruits et recréés en boucle.
- **Triple source de rechargement** redondante : realtime (visites + calendar_events + candidatures) + polling 30 s + reload manuel après chaque action → cascade de requêtes lourdes (tous les visites paginées + candidatures paginées) toutes les 30 s.

### 2. Les rendez-vous téléphoniques n'apparaissent pas
La table `lead_phone_appointments` (créée pour la prise de RDV depuis la landing « Analyse de dossier ») n'est **jamais lue** par `Calendrier.tsx`. Les RDV confirmés via `confirm-phone-appointment` envoient bien l'invitation au lead + admin, mais ne s'affichent nulle part dans `/admin/calendrier`.

## Correctif

### Fichier 1 — `src/pages/admin/Calendrier.tsx`

**Performance / stabilité du chargement** :
1. Distinguer **chargement initial** (avec spinner plein écran) et **refresh silencieux** (realtime / polling) :
   ```ts
   const loadData = useCallback(async (silent = false) => {
     if (!silent) setLoading(true);
     // ... fetch ...
     if (!silent) setLoading(false);
   }, []);
   ```
   → realtime, polling et reloads après actions appellent `loadData(true)` ; seul le mount initial appelle `loadData()`.
2. Stabiliser le `useEffect` : retirer `loadData` et `debouncedReload` des dépendances (ils sont stables grâce à `useCallback([])`) → la subscription realtime + l'interval ne sont plus recréés.
3. Augmenter le polling de **30 s → 120 s** (le realtime fait déjà le job, le polling n'est qu'un filet de sécurité).
4. Augmenter le debounce realtime de **1.5 s → 2.5 s** pour absorber les rafales d'updates (ex. confirmation visite qui touche plusieurs tables).

**Ajout des RDV téléphoniques** :
5. Ajouter dans le `Promise.all` un fetch des rendez-vous téléphoniques confirmés/en attente :
   ```ts
   supabase.from('lead_phone_appointments')
     .select('id, lead_id, slot_start, slot_end, status, prospect_name, prospect_email, prospect_phone, leads(prenom, nom, email, telephone)')
     .in('status', ['confirme', 'en_attente'])
     .order('slot_start', { ascending: true })
     .limit(5000)
   ```
6. Transformer chaque RDV en événement virtuel ajouté à `events` :
   ```ts
   {
     id: `phone-rdv-${appt.id}`,
     title: `📞 RDV téléphonique — ${prospectName}`,
     event_date: appt.slot_start,
     event_type: 'rdv_telephonique',
     status: appt.status === 'confirme' ? 'confirme' : 'planifie',
     description: `Téléphone : ${appt.prospect_phone}\nEmail : ${appt.prospect_email}`,
     all_day: false,
   }
   ```
7. Ajouter `lead_phone_appointments` à la liste des channels realtime pour rafraîchir automatiquement quand un lead réserve / l'admin confirme.
8. La suppression d'un événement `phone-rdv-*` met le statut à `annule` dans `lead_phone_appointments` (pas un DELETE, garder l'historique).

### Fichier 2 — `src/components/calendar/types.ts` (si nécessaire)

Ajouter `'rdv_telephonique'` au type union `event_type` si l'union est strictement typée (sinon rien à faire).

### Fichier 3 — `src/components/calendar/PremiumEventFilters.tsx`

Ajouter une option « 📞 RDV téléphonique » dans le filtre **Type d'événement** pour que l'admin puisse filtrer.

### Fichier 4 — Affichage couleur

Dans le composant qui mappe `event_type → couleur` (probablement `PremiumDayEvents` ou `PremiumCalendarView`), ajouter une couleur dédiée pour `rdv_telephonique` (suggéré : indigo/violet avec icône `Phone`).

## Validation

1. Ouvrir `/admin/calendrier` : le spinner s'affiche **une seule fois** au mount initial.
2. Cliquer immédiatement sur une date → la sélection fonctionne sans attendre.
3. Réserver un RDV téléphonique depuis la landing « Analyse de dossier » → l'événement apparaît dans le calendrier admin **dans les ~3 s** (realtime).
4. Confirmer le RDV depuis `/admin/leads` → le badge passe de « planifié » à « confirmé » sans rechargement visible.
5. Filtrer par type « RDV téléphonique » → seuls ces événements restent visibles.
6. Aucun spinner plein écran toutes les 30 s.
7. Le calendrier reste interactif en permanence (clic, navigation mois) même quand un refresh silencieux tourne en arrière-plan.

## Fichiers touchés

```text
[MOD] src/pages/admin/Calendrier.tsx
      - loadData(silent) : pas de setLoading(true) sur refresh
      - useEffect deps stabilisées (vides)
      - polling 30s → 120s, debounce 1.5s → 2.5s
      - fetch lead_phone_appointments + transformation en CalendarEvent
      - realtime channel + lead_phone_appointments
      - handleDeleteEvent : cas "phone-rdv-*" → update status=annule
[MOD] src/components/calendar/PremiumEventFilters.tsx
      - option "RDV téléphonique" dans le select Type
[MOD] src/components/calendar/PremiumDayEvents.tsx (ou équivalent)
      - mapping couleur + icône Phone pour event_type='rdv_telephonique'
```

