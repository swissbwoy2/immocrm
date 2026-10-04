// Credentials stay in the Authorization header, including when following Meta pagination.
export async function metaGraph(path: string, token: string, request: typeof fetch = fetch): Promise<any> {
  const url = new URL(path, "https://graph.facebook.com/v21.0/");
  if (url.origin !== "https://graph.facebook.com") throw new Error("Pagination Meta non autorisée");
  url.searchParams.delete("access_token");
  const response = await request(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = Number(body.error?.code) || 0;
    const subcode = Number(body.error?.error_subcode) || 0;
    throw new Error(`Meta HTTP ${response.status} (code ${code}/${subcode})${code === 190 ? " : connexion Meta à réautoriser" : ""}`);
  }
  return response.json();
}
export function metaField(fields: {name: string; values?: string[]}[], name: string): string | undefined {
  const aliases: Record<string,string[]> = { email:["email","e-mail"],full_name:["full_name","full name","nom_complet"],phone:["phone","phone_number","numéro_de_téléphone"],phone_number:["phone_number","phone","numéro_de_téléphone"],first_name:["first_name","prénom"],last_name:["last_name","nom"] };
  return fields?.find(f => (aliases[name] || [name]).includes(f.name?.toLowerCase()))?.values?.[0] || undefined;
}
