import { EmailCode, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'


interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Your verification code`}>
<EmailHeading>Confirm reauthentication</EmailHeading>
        <EmailText>Use the code below to confirm your identity:</EmailText>
        <EmailCode>{token}</EmailCode>
        <EmailText muted>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </EmailText>

</EmailLayout>
)

export default ReauthenticationEmail

