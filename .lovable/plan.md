## Constat

- `contacted = true` sur la table `leads` = email envoyé, **aucun rapport avec WhatsApp**.
- Le bouton WhatsApp doit donc cibler **tous les leads avec téléphone (hors opt-out)**, sauf ceux **déjà contactés sur WhatsApp** (logs `whatsapp_notification_logs` sur le template `location_rdv_activation_v2`).
- Vérification base : **113 leads** avec téléphone visible, dont **112 jamais WhatsApp'és** aujourd'hui → c'est ce que doit afficher le bouton.

## Plan

### 1. `src/pages/admin/Leads.tsx`

**a. Charger les logs WhatsApp pour la dédup (via React Query) :**

```ts
const { data: waSentRows = [] } = useQuery({
  queryKey: ["leads-wa-sent"],
  queryFn: async () => {
    const all: { context_ref: string }[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 50000; from += PAGE) {
      const { data, error } = await supabase
        .from("whatsapp_notification_logs")
        .select("context_ref")
        .eq("template_key", "location_rdv_activation_v2")
        .eq("context_type", "lead")
        .in("status", ["sent", "delivered", "read"])
        .not("context_ref", "is", null)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data || []) as any[];
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    return all;
  },
});

const waAlreadySent = useMemo(
  () => new Set(waSentRows.map((r) => r.context_ref).filter(Boolean)),
  [waSentRows],
);
```

**b. Remplacer le filtre `waCandidates` :**

Avant :
```ts
filteredLeads.filter((l) => {
  if (l.contacted) return false;          // ← À SUPPRIMER (c'est l'email)
  if (!l.telephone && !l.phone_e164) return false;
  if (l.whatsapp_opt_out) return false;
  return true;
})
```

Après :
```ts
filteredLeads.filter((l) => {
  if (!l.telephone && !(l as any).phone_e164) return false;
  if ((l as any).whatsapp_opt_out) return false;
  if (waAlreadySent.has(l.id)) return false;   // ← dédup WhatsApp uniquement
  return true;
})
```

**c. Invalider la query après envoi** dans `sendWhatsappRelanceAll` :
```ts
queryClient.invalidateQueries({ queryKey: ["leads-wa-sent"] });
```

### 2. `src/components/admin/leads/LeadsHero.tsx`

Mettre à jour le `title` (tooltip) du bouton WhatsApp :

> *"Leads Shortlist avec téléphone, jamais contactés sur WhatsApp (dédup logs Meta)."*

### Résultat attendu

- Bouton **`WhatsApp (112)`** au lieu de `(2)`.
- Bouton **`Relancer (2)`** inchangé (lui reste basé sur `contacted` = email).
- Après envoi, les leads envoyés disparaissent automatiquement du compteur (dédup live).
- Aucun changement à l'edge function `send-followup-whatsapp` ni à `meta_leads`.