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
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Your login link for ${siteName}`}>
<EmailHeading>Your login link</EmailHeading>
        <EmailText>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </EmailText>
        <EmailButton href={confirmationUrl}>Log In</EmailButton>
        <EmailText muted>
          If you didn't request this link, you can safely ignore this email.
        </EmailText>

</EmailLayout>
)

export default MagicLinkEmail

