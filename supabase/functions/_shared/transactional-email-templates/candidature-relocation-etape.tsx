import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  titre?: string
  intro?: string
  prenom?: string
  bien?: string
  detail?: string
  ctaLabel?: string
  ctaUrl?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ titre, intro, prenom, bien, detail, ctaLabel, ctaUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{titre || 'Mise à jour de votre candidature'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>Logisorama</Text></Section>
        <Heading style={h1}>{titre || 'Mise à jour de votre candidature'}</Heading>
        <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
        {intro ? <Text style={text}>{intro}</Text> : null}
        {(bien || detail) ? (
          <Section style={box}>
            {bien ? (<><Text style={label}>Logement</Text><Text style={value}>{bien}</Text></>) : null}
            {detail ? (<><Text style={label}>Détail</Text><Text style={value}>{detail}</Text></>) : null}
          </Section>
        ) : null}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={ctaUrl || `${SITE_URL}/candidat/candidatures`}>{ctaLabel || 'Voir ma candidature'}</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Logisorama — Immo-rama Sàrl · <Link href={SITE_URL} style={link}>logisorama.ch</Link></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.titre || 'Mise à jour de votre candidature',
  displayName: 'Étape candidature relocation',
  previewData: {
    titre: 'Votre dossier est retenu', prenom: 'Marie', intro: 'Bonne nouvelle : votre dossier a été retenu.',
    bien: 'Rue du Lac 12, 1003 Lausanne', detail: 'Confirmez dans votre espace que vous souhaitez conclure.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '16px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(158, 55%, 38%)', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const label = { fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px' }
const value = { fontSize: '15px', color: '#0f172a', margin: '0 0 14px' }
const box = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }
const link = { color: 'hsl(158, 55%, 38%)' }
const button = { backgroundColor: 'hsl(158, 55%, 38%)', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#eaeaea', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: 0 }
