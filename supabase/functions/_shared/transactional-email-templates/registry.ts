import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ClientCredentialsEmailProps {
  siteUrl?: string
  recipient?: string
  tempPassword?: string
  prenom?: string
}

const SITE_URL = 'https://logisorama.ch'

export const ClientCredentialsEmail = ({
  siteUrl = SITE_URL,
  recipient,
  tempPassword,
  prenom,
}: ClientCredentialsEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vos identifiants de connexion Logisorama</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Logisorama</Text>
        </Section>
        <Heading style={h1}>Vos identifiants de connexion</Heading>
        <Text style={text}>
          {prenom ? `Bonjour ${prenom},` : 'Bonjour,'}
        </Text>
        <Text style={text}>
          Votre compte Logisorama a été créé. Voici vos identifiants provisoires pour vous connecter :
        </Text>

        <Section style={credentialsBox}>
          <Text style={label}>Email</Text>
          <Text style={value}>{recipient}</Text>
          <Text style={label}>Mot de passe provisoire</Text>
          <Text style={code}>{tempPassword}</Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={`${siteUrl}/login`}>
            Se connecter
          </Button>
        </Section>

        <Text style={text}>
          <strong>Important :</strong> pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion dans <strong>Paramètres → Changer le mot de passe</strong>.
        </Text>

        <Text style={text}>
          Si vous n'êtes pas à l'origine de cette création de compte, ignorez simplement cet email ou contactez-nous.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Logisorama — Immo-rama Sàrl · Lausanne, Suisse ·{' '}
          <Link href={siteUrl} style={link}>logisorama.ch</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientCredentialsEmail,
  subject: 'Vos identifiants de connexion Logisorama',
  displayName: 'Identifiants de connexion client',
  previewData: {
    siteUrl: SITE_URL,
    recipient: 'marie@exemple.ch',
    tempPassword: 'Ab3xKp9mQt',
    prenom: 'Marie',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '16px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(158, 55%, 38%)', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const label = { fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px' }
const value = { fontSize: '15px', color: '#0f172a', margin: '0 0 16px' }
const code = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', letterSpacing: '1.5px', margin: '0 0 0' }
const credentialsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }
const link = { color: 'hsl(158, 55%, 38%)', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: 'hsl(158, 55%, 38%)', color: '#ffffff', fontSize: '15px',
  fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
}
const hr = { borderColor: '#eaeaea', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
