import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://logisorama.ch'
const GREEN = 'hsl(158, 55%, 38%)'
const GREEN_DARK = 'hsl(158, 60%, 24%)'

const Email = ({ prenom }: { prenom?: string }) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Résiliation de votre mandat — remboursement</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>IMMO-RAMA</Text>
          <Text style={sub}>Logisorama</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Résiliation de votre mandat</Heading>
          <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
          <Text style={text}>Vous avez résilié votre mandat pendant la période éligible au remboursement.</Text>
          <Section style={box}>
            <Text style={boxText}>
              Pour obtenir votre remboursement, merci de nous transmettre vos coordonnées bancaires à l'adresse{' '}
              <Link href="mailto:info@immo-rama.ch" style={link}>info@immo-rama.ch</Link>.
            </Text>
          </Section>
          <Text style={{ ...text, marginTop: '16px' }}>Votre remboursement sera effectué sous un délai de 30 jours.</Text>
          <Hr style={hr} />
          <Text style={footer}>Immo-Rama · Logisorama · <Link href={SITE_URL} style={link}>logisorama.ch</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Résiliation de votre mandat — remboursement',
  displayName: 'Mandat résilié — remboursement',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, backgroundColor: GREEN, padding: '22px 24px', borderRadius: '12px 12px 0 0' }
const logo = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' as const, letterSpacing: '2px', margin: 0 }
const sub = { color: '#ffffff', fontSize: '13px', opacity: 0.9, margin: '2px 0 0' }
const content = { padding: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const box = { backgroundColor: 'hsl(158, 50%, 95%)', borderLeft: `4px solid ${GREEN}`, borderRadius: '8px', padding: '16px 18px' }
const boxText = { fontSize: '15px', color: GREEN_DARK, lineHeight: '1.6', margin: 0 }
const link = { color: GREEN }
const hr = { borderColor: '#eaeaea', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: 0 }
