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
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Confirm your email for ${siteName}`}>
<EmailHeading>Confirm your email</EmailHeading>
        <EmailText>
          Thanks for signing up for{' '}
          <a href={siteUrl} style={emailStyles.link}>
            <strong>{siteName}</strong>
          </a>
          !
        </EmailText>
        <EmailText>
          Please confirm your email address (
          <a href={`mailto:${recipient}`} style={emailStyles.link}>
            {recipient}
          </a>
          ) by clicking the button below:
        </EmailText>
        <EmailButton href={confirmationUrl}>Verify Email</EmailButton>
        <EmailText muted>
          If you didn't create an account, you can safely ignore this email.
        </EmailText>

</EmailLayout>
)

export default SignupEmail

