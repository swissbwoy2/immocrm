import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

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
  <EmailLayout preview={`Votre visite est confirmée${dateLabel ? ` — ${dateLabel}` : ''}`}>
<Heading className="email-heading" style={h1}>Votre visite est confirmée</Heading>
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
    </EmailLayout>
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

const { box, button, code, h1, label, link, text, value } = emailStyles
