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
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Reset your password for ${siteName}`}>
<EmailHeading>Reset your password</EmailHeading>
        <EmailText>
          We received a request to reset your password for {siteName}. Click
          the button below to choose a new password.
        </EmailText>
        <EmailButton href={confirmationUrl}>Reset Password</EmailButton>
        <EmailText muted>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </EmailText>

</EmailLayout>
)

export default RecoveryEmail

