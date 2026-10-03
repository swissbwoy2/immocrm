import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props {
  titre?: string
  intro?: string
  prenom?: string
  bien?: string
  detail?: string
  ctaLabel?: string
  ctaUrl?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ titre, intro, prenom, bien, detail, ctaLabel, ctaUrl }: Props) => (
  <EmailLayout preview={titre || 'Mise à jour de votre candidature'}>
<Heading className="email-heading" style={h1}>{titre || 'Mise à jour de votre candidature'}</Heading>
        <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
        {intro ? <Text style={text}>{intro}</Text> : null}
        {(bien || detail) ? (
          <Section style={box}>
            {bien ? (<><Text style={label}>Logement</Text><Text style={value}>{bien}</Text></>) : null}
            {detail ? (<><Text style={label}>Détail</Text><Text style={value}>{detail}</Text></>) : null}
          </Section>
        ) : null}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={ctaUrl || `${SITE_URL}/candidat/candidatures`}>{ctaLabel || 'Voir ma candidature'}</Button>
        </Section>
    </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.titre || 'Mise à jour de votre candidature',
  displayName: 'Étape candidature relocation',
  previewData: {
    titre: 'Votre dossier est retenu', prenom: 'Marie', intro: 'Bonne nouvelle : votre dossier a été retenu.',
    bien: 'Rue du Lac 12, 1003 Lausanne', detail: 'Confirmez dans votre espace que vous souhaitez conclure.',
  },
} satisfies TemplateEntry

const { box, button, h1, label, text, value } = emailStyles
