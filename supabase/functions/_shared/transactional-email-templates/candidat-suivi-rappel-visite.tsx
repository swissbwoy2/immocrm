import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props {
  prenom?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom }: Props) => (
  <EmailLayout preview={`Votre visite approche — suivez votre recherche`}>
<Heading className="email-heading" style={h1}>Votre visite approche à grand pas !</Heading>
          <Text style={text}>
            {prenom ? `Bonjour ${prenom},` : 'Bonjour,'} votre visite approche à grand pas ! Connectez-vous à votre espace pour suivre l'avancée de votre recherche de logement.
          </Text>
          <Section style={box}>
            <Text style={boxText}>
              Utilisez le mot de passe que vous avez déjà reçu lors de votre inscription — inutile d'en créer un nouveau.
            </Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={button} href={`${SITE_URL}/login?redirect=/candidat`}>Accéder à mon espace</Button>
          </Section>

    </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Votre visite approche — suivez votre recherche',
  displayName: 'Suivi candidat — rappel de visite',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry

const { box, boxText, button, h1, text } = emailStyles
