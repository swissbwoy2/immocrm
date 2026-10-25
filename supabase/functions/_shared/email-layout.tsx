import * as React from "npm:react@18.3.1";
import {
  Body,
  Head,
  Html,
  Preview,
} from "npm:@react-email/components@0.0.22";
import {
  EMAIL_BRAND as B,
  EMAIL_RESPONSIVE_CSS,
  EMAIL_THEME as T,
  emailStyles,
  emailUrl,
  layoutStyles as L,
} from "./email-brand.ts";
export { emailStyles } from "./email-brand.ts";

/**
 * react-email mirror of renderEmailLayout (email-brand.ts): same tokens, same
 * structure — logo, eyebrow, content card, signature, common footer.
 */
const table = {
  role: "presentation",
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
} as const;

export function EmailLayout(
  { children, preview, category = "VOTRE ESPACE IMMOBILIER", lang = "fr" }: {
    children: React.ReactNode;
    preview: string;
    category?: string;
    lang?: string;
  },
) {
  return (
    <Html lang={lang} dir="ltr">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <style>{EMAIL_RESPONSIVE_CSS}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={L.body}>
        <table {...table} width="100%" style={{ backgroundColor: T.page }}>
          <tbody>
            <tr>
              <td align="center" className="email-outer" style={L.outer}>
                <table
                  {...table}
                  width={T.width}
                  style={{ ...L.card, borderCollapse: "separate" }}
                >
                  <tbody>
                    <tr>
                      <td className="email-pad" style={L.header}>
                        <a href={B.site} style={{ textDecoration: "none" }}>
                          <img
                            src={B.logo}
                            width="144"
                            height="40"
                            alt="Logisorama"
                            style={L.logo}
                          />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="email-pad" style={L.content}>
                        {category
                          ? <p style={emailStyles.eyebrow}>{category}</p>
                          : null}
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td className="email-pad" style={L.signature}>
                        <div style={L.signatureRule}>
                          <strong style={{ color: T.heading }}>
                            L’équipe Logisorama
                          </strong>
                          <br />Votre recherche de logement, au même endroit.
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table
                  {...table}
                  width={T.width}
                  style={{ width: "100%", maxWidth: `${T.width}px` }}
                >
                  <tbody>
                    <tr>
                      <td className="email-pad" style={L.footer}>
                        <strong style={{ color: T.muted }}>Immo-Rama.ch</strong>
                        {" "}· Crissier (VD)
                        <br />
                        <a href={B.site} style={L.footerLink}>logisorama.ch</a>
                        {" · "}
                        <a
                          href="mailto:support@logisorama.ch"
                          style={L.footerLink}
                        >
                          support@logisorama.ch
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export const EmailHeading = ({ children }: { children: React.ReactNode }) => (
  <h1 className="email-heading" style={emailStyles.h1}>{children}</h1>
);

export const EmailText = (
  { children, muted = false }: { children: React.ReactNode; muted?: boolean },
) => <p style={muted ? emailStyles.small : emailStyles.text}>{children}</p>;

/** Bulletproof pill button, identical to emailButton() in email-brand.ts. */
export const EmailButton = (
  { href, children, variant = "primary" }: {
    href: string;
    children: React.ReactNode;
    variant?: "primary" | "secondary";
  },
) => {
  const primary = variant === "primary";
  const bg = primary ? T.green : T.card;
  return (
    <table
      {...table}
      className="email-btn"
      style={{ margin: "8px 0 22px", borderCollapse: "separate" }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderRadius: "999px",
              border: `1px solid ${T.green}`,
              backgroundColor: bg,
            }}
          >
            <a
              href={emailUrl(href)}
              style={{
                ...emailStyles.button,
                backgroundColor: bg,
                color: primary ? "#ffffff" : T.green,
                border: 0,
                textAlign: "center",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

/** Label / value block, identical to emailDetails() in email-brand.ts. */
export const EmailDetails = (
  { rows }: { rows: Array<[string, React.ReactNode] | null | false> },
) => {
  const items = rows.filter((r): r is [string, React.ReactNode] =>
    !!r && r[1] !== undefined && r[1] !== null && r[1] !== ""
  );
  if (!items.length) return null;
  return (
    <table
      {...table}
      width="100%"
      style={{
        margin: "8px 0 22px",
        backgroundColor: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: T.panelRadius,
        borderCollapse: "separate",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "18px 20px" }}>
            <table {...table} width="100%">
              <tbody>
                {items.map(([label, value], i) => (
                  <tr key={label}>
                    <td
                      className="email-detail-label"
                      valign="top"
                      width="38%"
                      style={{
                        padding: `${i ? "10px" : "0"} 12px 0 0`,
                        fontSize: "14px",
                        lineHeight: "22px",
                        color: T.muted,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      className="email-detail-value"
                      valign="top"
                      style={{
                        padding: `${i ? "10px" : "0"} 0 0`,
                        fontSize: "15px",
                        lineHeight: "22px",
                        fontWeight: 600,
                        color: T.heading,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

/** Highlighted note, identical to emailNotice(…, "info") in email-brand.ts. */
export const EmailNote = (
  { title, children }: { title?: string; children: React.ReactNode },
) => (
  <table
    {...table}
    width="100%"
    style={{
      margin: "8px 0 22px",
      backgroundColor: T.greenSoft,
      border: "1px solid #d3e6db",
      borderLeft: `4px solid ${T.green}`,
      borderRadius: T.panelRadius,
      borderCollapse: "separate",
    }}
  >
    <tbody>
      <tr>
        <td
          style={{
            padding: "16px 20px",
            fontSize: "15px",
            lineHeight: "24px",
            color: T.greenDark,
          }}
        >
          {title
            ? (
              <p
                style={{
                  margin: "0 0 4px",
                  fontWeight: 600,
                  fontSize: "15px",
                  lineHeight: "22px",
                }}
              >
                {title}
              </p>
            )
            : null}
          {children}
        </td>
      </tr>
    </tbody>
  </table>
);

export const EmailCode = ({ children }: { children: React.ReactNode }) => (
  <p style={emailStyles.code}>{children}</p>
);
