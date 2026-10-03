import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

interface ClientCredentialsEmailProps {
  siteUrl?: string
  recipient?: string
  tempPassword?: string
  prenom?: string
}

const SITE_URL = 'https://logisorama.ch'

export const ClientCredentialsEmail = ({
  siteUrl = SITE_URL,
  recipient,
  tempPassword,
  prenom,
}: ClientCredentialsEmailProps) => (
  <EmailLayout preview={`Vos identifiants de connexion Logisorama`}>
<Heading className="email-heading" style={h1}>Vos identifiants de connexion</Heading>
        <Text style={text}>
          {prenom ? `Bonjour ${prenom},` : 'Bonjour,'}
        </Text>
        <Text style={text}>
          Votre compte Logisorama a été créé. Voici vos identifiants provisoires pour vous connecter :
        </Text>

        <Section style={box}>
          <Text style={label}>Email</Text>
          <Text style={value}>{recipient}</Text>
          <Text style={label}>Mot de passe provisoire</Text>
          <Text style={code}>{tempPassword}</Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={`${siteUrl}/login`}>
            Se connecter
          </Button>
        </Section>

        <Text style={text}>
          <strong>Important :</strong> pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion dans <strong>Paramètres → Changer le mot de passe</strong>.
        </Text>

        <Text style={text}>
          Si vous n'êtes pas à l'origine de cette création de compte, ignorez simplement cet email ou contactez-nous.
        </Text>
    </EmailLayout>
)

export const template = {
  component: ClientCredentialsEmail,
  subject: 'Vos identifiants de connexion Logisorama',
  displayName: 'Identifiants de connexion client',
  previewData: {
    siteUrl: SITE_URL,
    recipient: 'marie@exemple.ch',
    tempPassword: 'Ab3xKp9mQt',
    prenom: 'Marie',
  },
} satisfies TemplateEntry

const { box, button, code, h1, label, text, value } = emailStyles
