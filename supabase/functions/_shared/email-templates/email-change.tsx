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
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Confirm your email change for ${siteName}`}>
<EmailHeading>Confirm your email change</EmailHeading>
        <EmailText>
          You requested to change your email address for {siteName} from{' '}
          <a href={`mailto:${oldEmail}`} style={emailStyles.link}>
            {oldEmail}
          </a>{' '}
          to{' '}
          <a href={`mailto:${newEmail}`} style={emailStyles.link}>
            {newEmail}
          </a>
          .
        </EmailText>
        <EmailText>
          Click the button below to confirm this change:
        </EmailText>
        <EmailButton href={confirmationUrl}>Confirm Email Change</EmailButton>
        <EmailText muted>
          If you didn't request this change, please secure your account
          immediately.
        </EmailText>

</EmailLayout>
)

export default EmailChangeEmail

