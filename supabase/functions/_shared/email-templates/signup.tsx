/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse email Logisorama</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>Logisorama</Text></Section>
        <Heading style={h1}>Bienvenue sur Logisorama</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Merci d'avoir créé votre compte sur{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>,
          votre plateforme suisse de gestion immobilière.
        </Text>
        <Text style={text}>
          Pour activer votre espace personnel ({recipient}), confirmez votre adresse email :
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>Confirmer mon email</Button>
        </Section>
        <Text style={text}>
          Ou copiez ce lien dans votre navigateur :<br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.
        </Text>
        <Text style={footer}>
          Logisorama — Immo-rama Sàrl · Lausanne, Suisse ·{' '}
          <Link href="https://logisorama.ch" style={link}>logisorama.ch</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '16px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(158, 55%, 38%)', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: 'hsl(158, 55%, 38%)', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: 'hsl(158, 55%, 38%)', color: '#ffffff', fontSize: '15px',
  fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
}
const hr = { borderColor: '#eaeaea', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
