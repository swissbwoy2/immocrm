import { EmailHeading, EmailLayout, EmailNote, EmailText, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

const Email = ({ prenom }: { prenom?: string }) => (
  <EmailLayout category="VOTRE MANDAT" preview={`Résiliation de votre mandat — remboursement`}>
    <EmailHeading>Résiliation de votre mandat</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    <EmailText>Vous avez résilié votre mandat pendant la période éligible au remboursement.</EmailText>
    <EmailNote>
      Pour obtenir votre remboursement, merci de nous transmettre vos coordonnées bancaires à l'adresse{' '}
      <a href="mailto:info@immo-rama.ch" style={emailStyles.link}>info@immo-rama.ch</a>.
    </EmailNote>
    <EmailText>Votre remboursement sera effectué sous un délai de 30 jours.</EmailText>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Résiliation de votre mandat — remboursement',
  displayName: 'Mandat résilié — remboursement',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry
