import { EmailButton, EmailCode, EmailDetails, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

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
  <EmailLayout category="VOTRE VISITE" preview={`Votre visite est confirmée${dateLabel ? ` — ${dateLabel}` : ''}`}>
    <EmailHeading>Votre visite est confirmée</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    <EmailText>Nous avons bien enregistré votre réservation de visite.</EmailText>
    <EmailDetails rows={[
      ['Bien', titre || 'Annonce Logisorama'],
      ['Adresse', adresse],
      ['Date et heure', dateLabel || '—'],
      annonceUrl ? ['Annonce', <a href={annonceUrl} style={emailStyles.link}>Voir l'annonce</a>] : null,
    ]} />
    {tempPassword ? (
      <>
        <EmailText>Votre espace candidat a été créé. Voici vos identifiants :</EmailText>
        <EmailDetails rows={[
          ['E-mail', email],
          ['Mot de passe provisoire', <EmailCode>{tempPassword}</EmailCode>],
        ]} />
        <EmailText muted>Pour votre sécurité, changez ce mot de passe dès votre première connexion.</EmailText>
      </>
    ) : (
      <EmailText>Connectez-vous à votre espace candidat avec votre compte existant pour suivre votre candidature.</EmailText>
    )}
    <EmailButton href={`${SITE_URL}/login?redirect=/candidat`}>Accéder à mon espace candidat</EmailButton>
    <EmailText>Vous pourrez y compléter votre demande de location.</EmailText>
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
