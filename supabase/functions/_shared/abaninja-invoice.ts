/**
 * Outils AbaNinja partagés (factures).
 *
 * Deux erreurs empêchaient l'envoi des factures, qui restaient en brouillon :
 * 1. La réponse de création (POST /documents/v2/invoices) a la forme { data: { documents: [ … ] } }.
 *    L'ancien code lisait data.data[0] ou data.documents[0] : l'UUID de la facture était perdu
 *    (undefined), donc jamais enregistré dans demandes_mandat et jamais envoyé.
 * 2. L'envoi par e-mail se fait avec PATCH /documents/v2/invoices/{uuid}/actions/email
 *    (docs.abaninja.ch, « Execute email action »). Les anciens appels POST …/send et POST …/actions/send
 *    n'existent pas.
 * L'e-mail part vers l'adresse enregistrée sur le contact AbaNinja du destinataire.
 */

export const ABANINJA_API = 'https://api.abaninja.ch';

export interface CreatedInvoice {
  uuid: string | null;
  number: string | null;
}

/** Lit la facture créée dans la réponse de POST /documents/v2/invoices (toutes formes connues). */
export function extractCreatedInvoice(payload: any): CreatedInvoice {
  const doc =
    payload?.data?.documents?.[0] ??
    (Array.isArray(payload?.data) ? payload.data[0] : null) ??
    payload?.documents?.[0] ??
    (payload?.data && typeof payload.data === 'object' && payload.data.uuid ? payload.data : null) ??
    (payload?.uuid ? payload : null);
  return {
    uuid: doc?.uuid ?? null,
    number: doc?.number ?? doc?.documentNumber ?? doc?.reference ?? null,
  };
}

/** Envoie une facture existante par e-mail depuis AbaNinja. Ne lève pas d'exception. */
export async function emailInvoice(
  accountUuid: string,
  apiKey: string,
  invoiceUuid: string,
): Promise<{ ok: boolean; status: number; detail: string }> {
  try {
    const res = await fetch(
      `${ABANINJA_API}/accounts/${accountUuid}/documents/v2/invoices/${invoiceUuid}/actions/email`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: '{}',
      },
    );
    const detail = (await res.text()).slice(0, 500);
    if (!res.ok) console.warn('AbaNinja email action failed', { status: res.status, detail });
    return { ok: res.ok, status: res.status, detail };
  } catch (e) {
    console.warn('AbaNinja email action error', e);
    return { ok: false, status: 0, detail: String(e) };
  }
}
