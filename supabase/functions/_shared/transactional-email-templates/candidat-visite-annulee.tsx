import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props {
  prenom?: string
  titre?: string
  adresse?: string
  dateLabel?: string
}

const SITE_URL = 'https://logisorama.ch'

const Email = ({ prenom, titre, adresse, dateLabel }: Props) => {
  const bien = titre && adresse ? `${titre} (${adresse})` : (titre || adresse || 'votre logement')
  return (
    <EmailLayout preview={`Votre visite a été annulée`}>
<Heading className="email-heading" style={h1}>Votre visite a été annulée</Heading>
            <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
            <Text style={text}>
              La visite prévue pour {bien}{dateLabel ? ` le ${dateLabel}` : ''} a malheureusement été annulée. Nous en sommes désolés.
            </Text>
            <Section style={box}>
              <Text style={boxText}>
                Ne perdez pas de temps : laissez nos agents immobiliers chercher et postuler à votre place. Activez votre recherche en un clic.
              </Text>
            </Section>
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={button} href={`${SITE_URL}/nouveau-mandat`}>Activer ma recherche</Button>
            </Section>
    </EmailLayout>
  )
}

export const template = {
  component: Email,
  subject: 'Votre visite a été annulée',
  displayName: 'Candidat — visite annulée',
  previewData: { prenom: 'Marie', titre: '3.5 pièces lumineux', adresse: 'Rue du Lac 12, 1003 Lausanne', dateLabel: 'mardi 6 octobre 2026 à 17h30' },
} satisfies TemplateEntry

const { box, boxText, button, h1, text } = emailStyles
