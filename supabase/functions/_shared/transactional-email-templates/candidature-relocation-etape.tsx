import { EmailButton, EmailDetails, EmailHeading, EmailLayout, EmailText } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

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
  <EmailLayout category="VOTRE CANDIDATURE" preview={titre || 'Mise à jour de votre candidature'}>
    <EmailHeading>{titre || 'Mise à jour de votre candidature'}</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    {intro ? <EmailText>{intro}</EmailText> : null}
    <EmailDetails rows={[['Logement', bien], ['Détail', detail]]} />
    <EmailButton href={ctaUrl || `${SITE_URL}/candidat/candidatures`}>{ctaLabel || 'Voir ma candidature'}</EmailButton>
  </EmailLayout>
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
