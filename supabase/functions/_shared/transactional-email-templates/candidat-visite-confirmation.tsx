import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  prenom?: string
  adresse?: string
  titre?: string
  dateLabel?: string
  email?: string
  tempPassword?: string
  annonceUrl?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom, adresse, titre, dateLabel, email, tempPassword, annonceUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre visite est confirmée{dateLabel ? ` — ${dateLabel}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Text style={brand}>Logisorama</Text></Section>
        <Heading style={h1}>Votre visite est confirmée</Heading>
        <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
        <Text style={text}>Nous avons bien enregistré votre réservation de visite.</Text>
        <Section style={box}>
          <Text style={label}>Bien</Text>
          <Text style={value}>{titre || 'Annonce Logisorama'}</Text>
          {adresse ? (<><Text style={label}>Adresse</Text><Text style={value}>{adresse}</Text></>) : null}
          <Text style={label}>Date et heure</Text>
          <Text style={value}>{dateLabel || '—'}</Text>
          {annonceUrl ? <Link href={annonceUrl} style={link}>Voir l'annonce</Link> : null}
        </Section>
        {tempPassword ? (
          <>
            <Text style={text}>Votre espace candidat a été créé. Voici vos identifiants :</Text>
            <Section style={box}>
              <Text style={label}>E-mail</Text>
              <Text style={value}>{email}</Text>
              <Text style={label}>Mot de passe provisoire</Text>
              <Text style={code}>{tempPassword}</Text>
            </Section>
            <Text style={text}>Pour votre sécurité, changez ce mot de passe dès votre première connexion.</Text>
          </>
        ) : (
          <Text style={text}>Connectez-vous à votre espace candidat avec votre compte existant pour suivre votre candidature.</Text>
        )}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={`${SITE_URL}/login?redirect=/candidat`}>Accéder à mon espace candidat</Button>
        </Section>
        <Text style={text}>Vous pourrez y compléter votre demande de location.</Text>
        <Hr style={hr} />
        <Text style={footer}>Logisorama — Immo-rama Sàrl · <Link href={SITE_URL} style={link}>logisorama.ch</Link></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Visite confirmée${d?.dateLabel ? ` — ${d.dateLabel}` : ''}`,
  displayName: 'Confirmation de visite candidat',
  previewData: {
    prenom: 'Marie', titre: '3.5 pièces lumineux', adresse: 'Rue du Lac 12, 1003 Lausanne',
    dateLabel: 'mardi 6 octobre 2026 à 17h30', email: 'marie@exemple.ch', tempPassword: 'Ab3xKp9mQt7Lz2',
    annonceUrl: `${SITE_URL}/annonces/exemple`,
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
const code = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0f172a', letterSpacing: '1.5px', margin: 0 }
const box = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }
const link = { color: 'hsl(158, 55%, 38%)' }
const button = { backgroundColor: 'hsl(158, 55%, 38%)', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#eaeaea', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: 0 }
