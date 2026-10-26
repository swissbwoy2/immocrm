import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Confirmez le changement d’adresse e-mail sur ${siteName}`}>
<EmailHeading>Confirmez votre nouvelle adresse e-mail</EmailHeading>
        <EmailText>
          Vous avez demandé à remplacer votre adresse e-mail sur {siteName}{' '}
          <a href={`mailto:${oldEmail}`} style={emailStyles.link}>
            {oldEmail}
          </a>{' '}
          par{' '}
          <a href={`mailto:${newEmail}`} style={emailStyles.link}>
            {newEmail}
          </a>
          .
        </EmailText>
        <EmailText>
          Cliquez sur le bouton ci-dessous pour confirmer ce changement :
        </EmailText>
        <EmailButton href={confirmationUrl}>Confirmer le changement</EmailButton>
        <EmailText muted>
          Si vous n’êtes pas à l’origine de cette demande, sécurisez votre compte
          sans attendre en changeant votre mot de passe.
        </EmailText>

</EmailLayout>
)

export default EmailChangeEmail

