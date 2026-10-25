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
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`You've been invited to join ${siteName}`}>
<EmailHeading>You've been invited</EmailHeading>
        <EmailText>
          You've been invited to join{' '}
          <a href={siteUrl} style={emailStyles.link}>
            <strong>{siteName}</strong>
          </a>
          . Click the button below to accept the invitation and create your
          account.
        </EmailText>
        <EmailButton href={confirmationUrl}>Accept Invitation</EmailButton>
        <EmailText muted>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </EmailText>

</EmailLayout>
)

export default InviteEmail

