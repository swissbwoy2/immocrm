

## Corriger le depot de candidature (edge function error)

### Problemes identifies (via les logs)

1. **URLs de documents invalides** : Les documents clients ont des URLs de type `480101c6-ec71-4b66-b6ad-4b2cc00cf30c/1771505247427_dossier_complet.pdf` (chemin de stockage brut). Le edge function `send-smtp-email` ne reconnait pas ce format et echoue avec `TypeError: Invalid URL`.

2. **Erreurs d'adresse email** : Des fautes de frappe dans les adresses destinataires (`immo-rama.cg` au lieu de `.ch`, `imma-rama.ch` au lieu de `immo-rama.ch`) causent un rejet SMTP `450: Recipient address rejected: Domain not found`. Ce n'est pas un bug code mais une erreur de saisie.

### Corrections a apporter

**1. `supabase/functions/send-smtp-email/index.ts`**

Ameliorer la gestion des URLs de documents stockes dans le storage :
- Si l'URL ne commence pas par `http` et ne commence pas par `client-documents/`, ajouter automatiquement le prefixe `client-documents/`
- Generer un signed URL pour tous les chemins de stockage relatifs
- Ajouter une meilleure gestion d'erreur pour eviter que l'echec d'une piece jointe bloque tout l'envoi

Modification dans la section de traitement des URLs (autour de la ligne 74) :

```text
Avant:
  if (attachment.url.startsWith('client-documents/')) {
    // get signed URL
  }

Apres:
  let storageKey = attachment.url;
  if (!attachment.url.startsWith('http')) {
    // C'est un chemin de stockage relatif
    if (!storageKey.startsWith('client-documents/')) {
      // Ajouter le prefixe du bucket
      storageKey = storageKey; // utiliser tel quel comme clef dans le bucket
    } else {
      storageKey = storageKey.replace('client-documents/', '');
    }
    // Generer signed URL depuis le bucket
    const { data: signedUrlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(storageKey, 300);
    if (signedUrlData?.signedUrl) {
      fetchUrl = signedUrlData.signedUrl;
    }
  }
```

**2. `src/pages/agent/DeposerCandidature.tsx`**

S'assurer que l'URL envoyee au edge function inclut le bon chemin :
- Verifier le format des URLs de documents avant envoi
- Si l'URL est un chemin relatif, la prefixer correctement

### Resultat attendu
- Les pieces jointes seront correctement telechargees depuis le storage via signed URLs
- L'envoi d'email ne sera plus bloque par un `TypeError: Invalid URL`
- Les candidatures pourront etre deposees avec succes (si l'adresse email destinataire est correcte)

