
## Diagnostic

L'utilisateur ne voit pas les modifications récentes (Hero text, ordre des sections). Causes probables :

1. **Cache navigateur / Service Worker PWA** — la mémoire indique que le PWA évite `SKIP_WAITING` pour préserver les sessions, donc les nouvelles versions ne s'activent qu'après fermeture complète des onglets.
2. **Cache CDN Lovable** — le preview peut servir une version cachée.
3. **Mauvaise URL** — l'utilisateur regarde peut-être `https://logisorama.ch` (production publiée) au lieu du preview, alors que les changements ne sont visibles qu'en preview tant qu'ils ne sont pas publiés.

## Vérifications à faire (ordre)

1. Confirmer l'URL regardée : preview (`id-preview--...lovable.app`) vs production (`logisorama.ch` / `immocrm.lovable.app`)
2. Vérifier que les fichiers contiennent bien les modifications attendues
3. Si tout est en ordre côté code → problème de cache PWA → demander hard reload

## Plan

Aucune modification de code nécessaire à priori. Je vais :

1. **Lire** `src/pages/public-site/HomePage.tsx` et `src/components/public-site/sections/HeroSection.tsx` pour confirmer que les changements sont bien présents dans le code.
2. Si OK → expliquer à l'utilisateur :
   - Les modifications ne sont visibles que sur le **Preview** (`id-preview--f4e29d86-...lovable.app`), pas encore sur `logisorama.ch` tant qu'il n'a pas cliqué sur **Publish**.
   - Pour voir les changements sur le preview : hard reload (Cmd+Shift+R / Ctrl+Shift+R) car le Service Worker PWA conserve l'ancienne version.
3. Si les modifications **ne sont pas** dans le code → re-appliquer les 4 changements précédents (Hero, ordre Pricing, ordre Budget/Dossier, Dossier en première place).

Aucun fichier modifié sans validation supplémentaire.
