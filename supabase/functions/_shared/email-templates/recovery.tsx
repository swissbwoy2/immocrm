import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Réinitialisez votre mot de passe ${siteName}`}>
<EmailHeading>Réinitialisez votre mot de passe</EmailHeading>
        <EmailText>
          Nous avons reçu une demande de réinitialisation de votre mot de passe
          {siteName}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </EmailText>
        <EmailButton href={confirmationUrl}>Choisir un nouveau mot de passe</EmailButton>
        <EmailText muted>
          Si vous n’avez rien demandé, ignorez cet e-mail : votre mot de passe
          reste inchangé.
        </EmailText>

</EmailLayout>
)

export default RecoveryEmail

