import { EmailButton, EmailCode, EmailDetails, EmailHeading, EmailLayout, EmailNote, EmailText } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

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
  <EmailLayout category="VOTRE COMPTE" preview={`Vos identifiants de connexion Logisorama`}>
    <EmailHeading>Vos identifiants de connexion</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    <EmailText>
      Votre compte Logisorama a été créé. Voici vos identifiants provisoires pour vous connecter :
    </EmailText>
    <EmailDetails rows={[
      ['E-mail', recipient],
      ['Mot de passe provisoire', <EmailCode>{tempPassword}</EmailCode>],
    ]} />
    <EmailButton href={`${siteUrl}/login`}>Se connecter</EmailButton>
    <EmailNote title="Important">
      Pour votre sécurité, changez ce mot de passe dès votre première connexion dans <strong>Paramètres → Changer le mot de passe</strong>.
    </EmailNote>
    <EmailText muted>
      Si vous n'êtes pas à l'origine de cette création de compte, ignorez simplement cet e-mail ou contactez-nous.
    </EmailText>
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
