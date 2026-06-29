/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification Logisorama</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>Logisorama</Text></Section>
        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Utilisez le code ci-dessous pour confirmer votre identité sur Logisorama :
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Ce code expirera prochainement. Si vous n'êtes pas à l'origine de cette demande,
          ignorez simplement cet email.
        </Text>
        <Text style={footer}>
          Logisorama — Immo-rama Sàrl · Lausanne, Suisse ·{' '}
          <Link href="https://logisorama.ch" style={link}>logisorama.ch</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '16px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(158, 55%, 38%)', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: 'hsl(158, 55%, 38%)' }
const codeStyle = {
  fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const,
  color: '#0f172a', backgroundColor: '#f1f5f9', padding: '16px 24px',
  borderRadius: '8px', textAlign: 'center' as const, letterSpacing: '4px',
  margin: '24px 0',
}
const hr = { borderColor: '#eaeaea', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
