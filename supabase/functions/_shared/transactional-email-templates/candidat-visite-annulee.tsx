import { EmailButton, EmailHeading, EmailLayout, EmailNote, EmailText } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

interface Props {
  prenom?: string
  titre?: string
  adresse?: string
  dateLabel?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom, titre, adresse, dateLabel }: Props) => {
  const bien = titre && adresse ? `${titre} (${adresse})` : (titre || adresse || 'votre logement')
  return (
    <EmailLayout category="VOTRE VISITE" preview={`Votre visite a été annulée`}>
      <EmailHeading>Votre visite a été annulée</EmailHeading>
      <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
      <EmailText>
        La visite prévue pour {bien}{dateLabel ? ` le ${dateLabel}` : ''} a malheureusement été annulée. Nous en sommes désolés.
      </EmailText>
      <EmailNote>
        Ne perdez pas de temps : laissez nos agents immobiliers chercher et postuler à votre place. Activez votre recherche en un clic.
      </EmailNote>
      <EmailButton href={`${SITE_URL}/nouveau-mandat`}>Activer ma recherche</EmailButton>
    </EmailLayout>
  )
}

export const template = {
  component: Email,
  subject: 'Votre visite a été annulée',
  displayName: 'Candidat — visite annulée',
  previewData: { prenom: 'Marie', titre: '3.5 pièces lumineux', adresse: 'Rue du Lac 12, 1003 Lausanne', dateLabel: 'mardi 6 octobre 2026 à 17h30' },
} satisfies TemplateEntry
