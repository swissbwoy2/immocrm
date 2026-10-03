// Pure email transformation. Authentication and unsubscribe links keep their original URL.
export function decodeHref(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(
    /&#(?:x([0-9a-f]+)|(\d+));/gi,
    (_, hex, dec) => {
      const n = parseInt(hex || dec, hex ? 16 : 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    },
  );
}
export function trackableUrl(value: string): string | null {
  const url = decodeHref(value);
  if (
    /unsubscribe|désinscri|desinscri|\/auth\/|token(?:_hash)?=|track-email-/i
      .test(url)
  ) return null;
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && !u.username && !u.password &&
        url.length <= 8192
      ? url
      : null;
  } catch {
    return null;
  }
}
export function emailLinks(html: string): string[] {
  const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)].map(
    (m) => trackableUrl(m[2]),
  );
  return [...new Set(links.filter((x): x is string => !!x))];
}
export function trackedHtml(
  html: string,
  base: string,
  logId: string,
  links: Map<string, string>,
): string {
  let result = html.replace(
    /(<a\b[^>]*\bhref\s*=\s*)(["'])(.*?)\2/gi,
    (all, before, quote, raw) => {
      const target = trackableUrl(raw), id = target && links.get(target);
      return id
        ? `${before}${quote}${base}/track-email-click?link=${id}${quote}`
        : all;
    },
  );
  if (!/track-email-open\?id=/i.test(result)) {
    const pixel =
      `<img src="${base}/track-email-open?id=${logId}" width="1" height="1" alt="" style="width:1px;height:1px;border:0" />`;
    result = /<\/body>/i.test(result)
      ? result.replace(/<\/body>/i, `${pixel}</body>`)
      : result + pixel;
  }
  return result;
}
export function publicLink(url: string | null): string | null {
  if (!url) return null;
  return url.split(/[?#]/)[0];
}

export function stripLegacyTracking(html: string): string {
  const escaped = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return html.replace(/<img\b[^>]*track-email-open[^>]*>/gi, "").replace(
    /(<a\b[^>]*\bhref\s*=\s*)(["'])(.*?)\2/gi,
    (all, before, quote, raw) => {
      try {
        const u = new URL(decodeHref(raw));
        const target = u.searchParams.get("url");
        return u.pathname.endsWith("/track-email-click") && target &&
            /^https?:\/\//i.test(target)
          ? `${before}${quote}${escaped(target)}${quote}`
          : all;
      } catch {
        return all;
      }
    },
  );
}
