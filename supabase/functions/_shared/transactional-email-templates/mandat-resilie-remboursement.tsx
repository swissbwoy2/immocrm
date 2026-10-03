import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom }: { prenom?: string }) => (
  <EmailLayout preview={`Résiliation de votre mandat — remboursement`}>
<Heading className="email-heading" style={h1}>Résiliation de votre mandat</Heading>
          <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
          <Text style={text}>Vous avez résilié votre mandat pendant la période éligible au remboursement.</Text>
          <Section style={box}>
            <Text style={boxText}>
              Pour obtenir votre remboursement, merci de nous transmettre vos coordonnées bancaires à l'adresse{' '}
              <Link href="mailto:info@immo-rama.ch" style={link}>info@immo-rama.ch</Link>.
            </Text>
          </Section>
          <Text style={{ ...text, marginTop: '16px' }}>Votre remboursement sera effectué sous un délai de 30 jours.</Text>
    </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Résiliation de votre mandat — remboursement',
  displayName: 'Mandat résilié — remboursement',
  previewData: { prenom: 'Marie' },
} satisfies TemplateEntry

const { box, boxText, h1, link, text } = emailStyles
