import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  prenom?: string
}

const SITE_URL = 'https://logisorama.ch'
const GREEN = 'hsl(158, 55%, 38%)'
const GREEN_DARK = 'hsl(158, 60%, 24%)'

const Email = ({ prenom }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre visite approche — suivez votre recherche</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Row>
            <Column>
              <Text style={logo}>IMMO-RAMA</Text>
              <Text style={logoSub}>Logisorama</Text>
            </Column>
            <Column align="right">
              <Text style={headerRight}>Suivi de votre recherche</Text>
            </Column>
          </Row>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Votre visite approche à grand pas !</Heading>
          <Text style={text}>
            {prenom ? `Bonjour ${prenom},` : 'Bonjour,'} votre visite approche à grand pas ! Connectez-vous à votre espace pour suivre l'avancée de votre recherche de logement.
          </Text>
          <Section style={box}>
            <Text style={boxText}>
              Utilisez le mot de passe que vous avez déjà reçu lors de votre inscription — inutile d'en créer un nouveau.
            </Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={button} href={`${SITE_URL}/login?redirect=/candidat`}>Accéder à mon espace</Button>
          </Section>
        </Section>
        <Section style={footerWrap}>
          <Text style={footer}>
            Immo-Rama · Logisorama — Agence de relocation en Suisse romande · <Link href={SITE_URL} style={link}>logisorama.ch</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Votre visite approche — suivez votre recherche',
  displayName: 'Suivi candidat — rappel de visite',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', border: '1px solid #e5efe9', borderRadius: '14px', overflow: 'hidden' as const }
const header = { background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`, backgroundColor: GREEN, padding: '22px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#ffffff', letterSpacing: '2px', margin: 0 }
const logoSub = { fontSize: '12px', color: '#d6f2e6', margin: '2px 0 0' }
const headerRight = { fontSize: '13px', color: '#ffffff', fontWeight: 'bold' as const, margin: 0, textAlign: 'right' as const }
const content = { padding: '32px 28px 16px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.65', margin: '0 0 20px' }
const box = { backgroundColor: '#eaf7f1', borderLeft: `4px solid ${GREEN}`, borderRadius: '10px', padding: '14px 18px' }
const boxText = { fontSize: '14px', color: GREEN_DARK, lineHeight: '1.6', margin: 0 }
const button = { backgroundColor: GREEN, color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '15px 30px', textDecoration: 'none', display: 'inline-block' }
const footerWrap = { backgroundColor: '#f6faf8', padding: '18px 28px', borderTop: '1px solid #e5efe9' }
const footer = { fontSize: '12px', color: '#6b7280', margin: 0, textAlign: 'center' as const }
const link = { color: GREEN }
