import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import {
  EMAIL_BRAND as B,
  EMAIL_RESPONSIVE_CSS,
  emailStyles,
} from "./email-brand.ts";
export { emailStyles } from "./email-brand.ts";
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
        <meta name="color-scheme" content="light" />
        <style>{EMAIL_RESPONSIVE_CSS}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="email-outer"
        style={{
          margin: 0,
          padding: "24px 12px",
          backgroundColor: B.background,
          fontFamily: "Arial,Helvetica,sans-serif",
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "640px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderTop: `4px solid ${B.green}`,
          }}
        >
          <Section
            className="email-pad"
            style={{
              padding: "24px 36px",
              borderBottom: `1px solid ${B.border}`,
            }}
          >
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
            >
              <tbody>
                <tr>
                  <td>
                    <Text
                      style={{
                        fontSize: "27px",
                        lineHeight: "30px",
                        fontWeight: 700,
                        letterSpacing: "-1px",
                        color: B.dark,
                        margin: 0,
                      }}
                    >
                      Logisorama
                    </Text>
                    <Img
                      src={B.logo}
                      width="104"
                      height="16"
                      alt="Immo-rama"
                      style={{ marginTop: "3px" }}
                    />
                  </td>
                  <td
                    align="right"
                    className="email-brandline"
                    style={{
                      fontSize: "10px",
                      lineHeight: "17px",
                      letterSpacing: "1.2px",
                      color: "#677a6c",
                    }}
                  >
                    {category}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section
            className="email-pad"
            style={{
              padding: "32px 36px 30px",
              color: B.muted,
              overflowWrap: "anywhere",
            }}
          >
            {children}
          </Section>
          <Section
            className="email-pad"
            style={{
              padding: "22px 36px",
              backgroundColor: B.cream,
              borderTop: `1px solid ${B.border}`,
            }}
          >
            <Text
              style={{
                fontSize: "13px",
                lineHeight: "22px",
                color: "#435b47",
                margin: 0,
              }}
            >
              <strong>L’équipe Logisorama</strong>
              <br />Votre recherche de logement, au même endroit.
            </Text>
          </Section>
          <Section className="email-pad" style={{ padding: "22px 36px" }}>
            <Text style={emailStyles.footer}>
              <strong>Logisorama · Immo-rama</strong>
              <br />
              <Link href={B.site} style={{ color: B.green }}>
                logisorama.ch
              </Link>{" "}
              ·{" "}
              <Link
                href="mailto:support@logisorama.ch"
                style={{ color: B.green }}
              >
                support@logisorama.ch
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
