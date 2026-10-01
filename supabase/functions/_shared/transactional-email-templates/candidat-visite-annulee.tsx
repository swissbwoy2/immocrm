import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  prenom?: string
  titre?: string
  adresse?: string
  dateLabel?: string
}

const SITE_URL = 'https://logisorama.ch'
const GREEN = 'hsl(158, 55%, 38%)'
const GREEN_DARK = 'hsl(158, 60%, 24%)'

const Email = ({ prenom, titre, adresse, dateLabel }: Props) => {
  const bien = titre && adresse ? `${titre} (${adresse})` : (titre || adresse || 'votre logement')
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Votre visite a été annulée</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>IMMO-RAMA</Text>
            <Text style={sub}>Logisorama</Text>
          </Section>
          <Section style={content}>
            <Heading style={h1}>Votre visite a été annulée</Heading>
            <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
            <Text style={text}>
              La visite prévue pour {bien}{dateLabel ? ` le ${dateLabel}` : ''} a malheureusement été annulée. Nous en sommes désolés.
            </Text>
            <Section style={box}>
              <Text style={boxText}>
                Ne perdez pas de temps : laissez nos agents immobiliers chercher et postuler à votre place. Activez votre recherche en un clic.
              </Text>
            </Section>
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={button} href={`${SITE_URL}/nouveau-mandat`}>Activer ma recherche</Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              Immo-Rama · Logisorama — Agence de relocation en Suisse romande · <Link href={SITE_URL} style={link}>logisorama.ch</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Votre visite a été annulée',
  displayName: 'Candidat — visite annulée',
  previewData: { prenom: 'Marie', titre: '3.5 pièces lumineux', adresse: 'Rue du Lac 12, 1003 Lausanne', dateLabel: 'mardi 6 octobre 2026 à 17h30' },
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
const button = { backgroundColor: GREEN, color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const link = { color: GREEN }
const hr = { borderColor: '#eaeaea', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: 0 }
