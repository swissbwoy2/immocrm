interface InvoiceWorkflowPayload {
  clientUuid: string;
  addressUuid: string;
  email: string;
  expiresAt: number;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signature(payloadPart: string): Promise<Uint8Array> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) throw new Error("Invoice workflow signing is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart)),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

export async function createInvoiceWorkflowToken(
  input: Omit<InvoiceWorkflowPayload, "expiresAt">,
): Promise<string> {
  const payload: InvoiceWorkflowPayload = {
    ...input,
    email: input.email.trim().toLowerCase(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  const payloadPart = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${payloadPart}.${encodeBase64Url(await signature(payloadPart))}`;
}

export async function verifyInvoiceWorkflowToken(
  token: string | null | undefined,
  expected: Omit<InvoiceWorkflowPayload, "expiresAt">,
): Promise<boolean> {
  if (!token) return false;
  const [payloadPart, signaturePart, extra] = token.split(".");
  if (!payloadPart || !signaturePart || extra) return false;

  try {
    const supplied = decodeBase64Url(signaturePart);
    const calculated = await signature(payloadPart);
    if (!constantTimeEqual(supplied, calculated)) return false;

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart))) as InvoiceWorkflowPayload;
    return payload.expiresAt > Date.now() &&
      payload.clientUuid === expected.clientUuid &&
      payload.addressUuid === expected.addressUuid &&
      payload.email === expected.email.trim().toLowerCase();
  } catch {
    return false;
  }
}
