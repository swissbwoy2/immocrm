import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Vous êtes invité(e) à rejoindre ${siteName}`}>
<EmailHeading>Vous êtes invité(e)</EmailHeading>
        <EmailText>
          Vous êtes invité(e) à rejoindre{' '}
          <a href={siteUrl} style={emailStyles.link}>
            <strong>{siteName}</strong>
          </a>
          . Cliquez sur le bouton ci-dessous pour accepter l’invitation et créer
          votre compte.
        </EmailText>
        <EmailButton href={confirmationUrl}>Accepter l’invitation</EmailButton>
        <EmailText muted>
          Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet
          e-mail.
        </EmailText>

</EmailLayout>
)

export default InviteEmail

