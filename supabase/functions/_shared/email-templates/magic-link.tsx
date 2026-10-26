import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <EmailLayout lang="fr" category="COMPTE ET SÉCURITÉ" preview={`Votre lien de connexion à ${siteName}`}>
<EmailHeading>Votre lien de connexion</EmailHeading>
        <EmailText>
          Cliquez sur le bouton ci-dessous pour vous connecter à {siteName}. Ce lien
          expire rapidement.
        </EmailText>
        <EmailButton href={confirmationUrl}>Me connecter</EmailButton>
        <EmailText muted>
          Si vous n’avez pas demandé ce lien, vous pouvez ignorer cet e-mail.
        </EmailText>

</EmailLayout>
)

export default MagicLinkEmail

