/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe Logisorama</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Logisorama</Text>
        </Section>
        <Heading style={h1}>Réinitialisation de votre mot de passe</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Vous avez demandé la réinitialisation de votre mot de passe sur votre espace
          Logisorama. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Réinitialiser mon mot de passe
          </Button>
        </Section>
        <Text style={text}>
          Ou copiez ce lien dans votre navigateur :<br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email —
          votre mot de passe restera inchangé.
        </Text>
        <Text style={footer}>
          Logisorama — Immo-rama Sàrl · Lausanne, Suisse ·{' '}
          <Link href="https://logisorama.ch" style={link}>logisorama.ch</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '16px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(158, 55%, 38%)', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: 'hsl(158, 55%, 38%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const link = { color: 'hsl(158, 55%, 38%)', wordBreak: 'break-all' as const }
const hr = { borderColor: '#eaeaea', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
