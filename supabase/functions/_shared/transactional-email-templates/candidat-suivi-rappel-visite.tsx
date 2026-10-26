import { EmailButton, EmailHeading, EmailLayout, EmailNote, EmailText } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

interface Props {
  prenom?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom }: Props) => (
  <EmailLayout category="VOTRE VISITE" preview={`Votre visite approche — suivez votre recherche`}>
    <EmailHeading>Votre visite approche à grands pas</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    <EmailText>
      Votre visite approche à grands pas ! Connectez-vous à votre espace pour suivre l'avancée de votre recherche de logement.
    </EmailText>
    <EmailNote>
      Utilisez le mot de passe que vous avez déjà reçu lors de votre inscription — inutile d'en créer un nouveau.
    </EmailNote>
    <EmailButton href={`${SITE_URL}/login?redirect=/candidat`}>Accéder à mon espace</EmailButton>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Votre visite approche — suivez votre recherche',
  displayName: 'Suivi candidat — rappel de visite',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry
