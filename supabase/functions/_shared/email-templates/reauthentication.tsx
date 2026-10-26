import { EmailCode, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Votre code de vérification`}>
<EmailHeading>Confirmez votre identité</EmailHeading>
        <EmailText>Saisissez le code ci-dessous pour confirmer votre identité :</EmailText>
        <EmailCode>{token}</EmailCode>
        <EmailText muted>
          Ce code expire rapidement. Si vous n’êtes pas à l’origine de cette
          demande, vous pouvez ignorer cet e-mail.
        </EmailText>

</EmailLayout>
)

export default ReauthenticationEmail

