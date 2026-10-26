import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Confirmez votre adresse e-mail pour ${siteName}`}>
<EmailHeading>Confirmez votre adresse e-mail</EmailHeading>
        <EmailText>
          Merci pour votre inscription sur{' '}
          <a href={siteUrl} style={emailStyles.link}>
            <strong>{siteName}</strong>
          </a>
          !
        </EmailText>
        <EmailText>
          Confirmez votre adresse e-mail (
          <a href={`mailto:${recipient}`} style={emailStyles.link}>
            {recipient}
          </a>
          ) en cliquant sur le bouton ci-dessous :
        </EmailText>
        <EmailButton href={confirmationUrl}>Confirmer mon adresse</EmailButton>
        <EmailText muted>
          Si vous n’avez pas créé de compte, vous pouvez ignorer cet e-mail.
        </EmailText>

</EmailLayout>
)

export default SignupEmail

