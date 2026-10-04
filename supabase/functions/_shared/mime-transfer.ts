/** Decode the transfer encoding declared in the message headers (not its body). */
export function decodeMimeTransfer(body: string, headers: string): string {
  const h = headers.replace(/\r?\n[ \t]+/g, " ");
  const encoding = h.match(/^Content-Transfer-Encoding:\s*([^\s;]+)/im)?.[1]
    .toLowerCase();
  const charset = h.match(/^Content-Type:.*?charset=["']?([^\s;"']+)/im)?.[1] ||
    "utf-8";
  if (!encoding || !["base64", "quoted-printable"].includes(encoding)) {
    return body;
  }
  const bytes: number[] = [];
  if (encoding === "base64") {
    const binary = atob(body.replace(/\s/g, ""));
    for (const char of binary) bytes.push(char.charCodeAt(0));
  } else {
    const unfolded = body.replace(/=\r?\n/g, "");
    for (let i = 0; i < unfolded.length; i++) {
      if (
        unfolded[i] === "=" &&
        /^[0-9a-f]{2}$/i.test(unfolded.slice(i + 1, i + 3))
      ) {
        bytes.push(parseInt(unfolded.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(...new TextEncoder().encode(unfolded[i]));
    }
  }
  return new TextDecoder(charset).decode(new Uint8Array(bytes));
}
