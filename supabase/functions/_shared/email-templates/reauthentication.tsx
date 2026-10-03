import { EmailLayout, emailStyles } from '../email-layout.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Text } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout lang="en" category="ACCOUNT & SECURITY" preview={`Your verification code`}>
<Heading className="email-heading" style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={code}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>

</EmailLayout>
)

export default ReauthenticationEmail

const { code, footer, h1, text } = emailStyles
