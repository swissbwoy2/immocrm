
# 📌 Wishlist "Biens à suivre" — Admin & Agent

Objectif : ne plus jamais perdre un bien intéressant pour lequel tu as contacté l'annonceur sans réponse. Une wishlist centralisée, ultra lisible, qui se met automatiquement à jour quand tu envoies une offre sur la même annonce.

---

## 1. Base de données — Nouvelle table `wishlist_biens`

Migration SQL :

```sql
CREATE TABLE public.wishlist_biens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Infos bien
  adresse TEXT NOT NULL,
  npa TEXT,
  ville TEXT,
  nb_pieces NUMERIC,
  surface NUMERIC,
  prix NUMERIC,
  type_bien TEXT,                   -- Appartement / Maison / Studio / Local
  
  -- Lien annonce (clé de dédoublonnage)
  lien_annonce TEXT NOT NULL,
  lien_annonce_normalise TEXT GENERATED ALWAYS AS (lower(regexp_replace(lien_annonce, '^https?://(www\.)?', ''))) STORED,
  source_portail TEXT,              -- Homegate / ImmoScout / Comparis / autre (auto-détecté)
  photo_url TEXT,
  
  -- Contact annonceur
  contact_nom TEXT,
  contact_telephone TEXT,
  contact_email TEXT,
  
  -- Suivi
  statut TEXT NOT NULL DEFAULT 'a_contacter' 
    CHECK (statut IN ('a_contacter','contacte_sans_reponse','offre_envoyee','indisponible','archive')),
  date_dernier_contact TIMESTAMPTZ,
  nb_relances INT DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  
  -- Lien automatique vers offre envoyée
  offre_id UUID REFERENCES public.offres(id) ON DELETE SET NULL,
  date_offre_envoyee TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, lien_annonce_normalise)
);

CREATE INDEX idx_wishlist_user_statut ON wishlist_biens(user_id, statut);
CREATE INDEX idx_wishlist_lien_norm ON wishlist_biens(lien_annonce_normalise);

-- RLS
ALTER TABLE wishlist_biens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist"
  ON wishlist_biens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins see all wishlists"
  ON wishlist_biens FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER wishlist_set_updated_at
  BEFORE UPDATE ON wishlist_biens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 🔁 Trigger auto-sync avec `offres`

Quand une offre est insérée avec un `lien_annonce`, on marque automatiquement le bien correspondant dans la wishlist comme `offre_envoyee` :

```sql
CREATE OR REPLACE FUNCTION sync_wishlist_on_offre()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  norm TEXT;
BEGIN
  IF NEW.lien_annonce IS NULL OR NEW.lien_annonce = '' THEN RETURN NEW; END IF;
  norm := lower(regexp_replace(NEW.lien_annonce, '^https?://(www\.)?', ''));
  
  UPDATE wishlist_biens
     SET statut = 'offre_envoyee',
         offre_id = NEW.id,
         date_offre_envoyee = COALESCE(NEW.date_envoi, now())
   WHERE lien_annonce_normalise = norm
     AND statut <> 'archive';
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_wishlist_on_offre
  AFTER INSERT ON offres
  FOR EACH ROW EXECUTE FUNCTION sync_wishlist_on_offre();
```

---

## 2. Routes & Sidebar

- Ajouter `/admin/wishlist` et `/agent/wishlist` dans `src/App.tsx`
- Ajouter dans `AppSidebar.tsx` (section **Communications**, juste sous "Offres envoyées") :
  - Icône : `Bookmark` (lucide)
  - Label : **"À suivre"** avec badge = nb biens en `contacte_sans_reponse`

---

## 3. Page Wishlist — Interface ultra pertinente

Fichier : `src/pages/shared/Wishlist.tsx` (mutualisée admin/agent, détecte le rôle).

### Structure visuelle (Premium components existants)

**Header** — `PremiumPageHeader`
- Titre : "Biens à suivre"
- Bouton primaire : **+ Ajouter un bien** (ouvre dialog)
- KPIs : `À contacter` / `Sans réponse` / `Relancés` / `Offre envoyée`

**Filtres**
- Recherche texte (adresse, contact, notes)
- Statut (chips)
- Tri : date dernier contact / prix / pièces

**Liste de cartes** — Grille responsive (1 col mobile, 2 col tablet, 3 col desktop)

Chaque carte affiche :
```
┌─────────────────────────────────────┐
│ [Photo 16:10 ou placeholder]        │
│ Badge statut (couleur)              │
├─────────────────────────────────────┤
│ 📍 Rue de Genève 42, 1003 Lausanne │
│ 🏠 3.5 pièces · 75 m² · 2'200 CHF  │
│ 🏷️ Homegate                         │
│                                     │
│ 👤 Régie Dupont                     │
│ 📞 021 123 45 67  📧 ...            │
│                                     │
│ 🔗 Voir l'annonce ↗                 │
│ 📝 "Contacté le 24/04, sans réponse"│
│                                     │
│ [Marquer relancé] [Envoyer offre →] │
│ [Modifier] [Archiver]               │
└─────────────────────────────────────┘
```

**État `offre_envoyee`** : carte avec liseré vert + badge ✅ "Offre envoyée le JJ/MM" + lien direct vers la fiche offre.

### Dialog "Ajouter un bien" — `WishlistAddDialog.tsx`

Champs :
- **Lien annonce** (obligatoire, validation URL, auto-détection portail via regex)
- **Adresse complète** (autocomplete Google Places existant → extrait NPA/ville)
- Nb pièces, surface, prix, type
- Contact : nom, téléphone, email
- Notes libres + tags

Bouton **"Coller depuis presse-papier"** : si une URL Homegate/ImmoScout est dans le clipboard, parsing automatique du titre/prix/pièces via fetch côté Edge Function (optionnel V2).

### Dédoublonnage à l'ajout

Avant insert : `SELECT id FROM wishlist_biens WHERE user_id = $1 AND lien_annonce_normalise = $2`. Si trouvé → toast "Ce bien est déjà dans ta liste" + ouvre la fiche existante.

---

## 4. Sync inverse depuis "Envoyer une offre"

Dans `src/pages/admin/EnvoyerOffre.tsx` et `src/pages/agent/EnvoyerOffre.tsx` :
- Si `formData.lienAnnonce` correspond à un bien wishlist → afficher un encart info bleu : *"Ce bien vient de ta wishlist (statut : sans réponse depuis 5j)"*
- Le trigger SQL fait le reste automatiquement après insert.

Bouton sur chaque carte wishlist **"Envoyer offre →"** : redirige vers `/admin/envoyer-offre?lien=...&adresse=...&prix=...&pieces=...` (pré-remplissage via query params).

---

## 5. Notifications & relances (léger, non bloquant)

- Badge sidebar = `count(statut IN ('a_contacter','contacte_sans_reponse'))`
- Optionnel : notif quotidienne si un bien est en `contacte_sans_reponse` depuis > 3 jours sans relance (cron edge function — pas dans ce lot, mentionné pour V2).

---

## 📦 Fichiers impactés

**Créés :**
- `supabase/migrations/{ts}_create_wishlist_biens.sql`
- `src/pages/shared/Wishlist.tsx`
- `src/components/wishlist/WishlistAddDialog.tsx`
- `src/components/wishlist/WishlistCard.tsx`
- `src/components/wishlist/WishlistFilters.tsx`
- `src/hooks/useWishlist.ts`

**Modifiés :**
- `src/App.tsx` — 2 nouvelles routes
- `src/components/AppSidebar.tsx` — entrée "À suivre" pour admin & agent + badge
- `src/pages/admin/EnvoyerOffre.tsx` & `src/pages/agent/EnvoyerOffre.tsx` — encart info wishlist + lecture query params

---

## ✅ Comportement final

1. Tu vois une annonce intéressante → **+ Ajouter** → fiche dans wishlist (statut "À contacter")
2. Tu appelles l'annonceur → bouton **"Marquer contacté"** → statut "Sans réponse" + date
3. Pas de retour pendant 3j → badge sidebar te le rappelle
4. Tu envoies finalement une offre via `/envoyer-offre` avec le même lien → **statut passe automatiquement à "Offre envoyée"** avec lien direct vers la fiche offre
5. Si l'annonce disparaît du marketplace, tu retrouves toujours toutes les infos (adresse, pièces, contact, notes) dans la wishlist

Confirme et j'implémente.
