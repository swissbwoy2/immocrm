import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ServiceNoticeProps {
  prenom?: string
  siteUrl?: string
}

const SITE_URL = 'https://logisorama.ch'

export const ServiceNoticeEmail = ({ prenom, siteUrl = SITE_URL }: ServiceNoticeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Communication officielle — vos demandes sont désormais traitées exclusivement via l'onglet Support</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Logisorama</Text>
          <Text style={brandSub}>by Immo-rama.ch</Text>
        </Section>

        <Heading style={h1}>Communication officielle</Heading>
        <Text style={text}>{prenom ? `Madame, Monsieur ${prenom},` : 'Madame, Monsieur,'}</Text>

        <Text style={text}>
          À la suite d'un incident technique général affectant nos canaux de communication depuis trois semaines,
          nous vous adressons nos excuses les plus sincères pour la gêne occasionnée. Afin de rétablir un suivi
          rigoureux et d'éviter toute confusion, les règles suivantes s'appliquent avec effet immédiat.
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>1. Canal unique : l'onglet « Support »</Text>
          <Text style={boxText}>
            Toute demande doit être formulée exclusivement depuis l'onglet <strong>Support</strong> de votre espace
            client. Aucune demande transmise en dehors de l'application (WhatsApp, téléphone, SMS ou e-mail direct)
            ne sera traitée.
          </Text>
        </Section>

        <Section style={box}>
          <Text style={boxTitle}>2. Visites : instruction écrite obligatoire</Text>
          <Text style={boxText}>
            Sans mention explicite de votre part transmise via l'application, <strong>aucune visite ne sera
            effectuée</strong> par l'agent en charge de votre dossier.
          </Text>
        </Section>

        <Section style={box}>
          <Text style={boxTitle}>3. Mise à jour de l'application</Text>
          <Text style={boxText}>
            Veuillez impérativement mettre à jour l'application, ou la télécharger, depuis l'<strong>App Store</strong>
            {' '}ou le <strong>Google Play Store</strong>. Cette mise à jour est indispensable au bon fonctionnement
            de votre espace.
          </Text>
        </Section>

        <Section style={box}>
          <Text style={boxTitle}>4. Documents et suivi de votre recherche</Text>
          <Text style={boxText}>
            Maintenez vos documents à jour dans votre dossier afin de ne manquer aucune offre, et suivez
            rigoureusement l'avancement de votre recherche directement dans l'application.
          </Text>
        </Section>

        <Section style={box}>
          <Text style={boxTitle}>5. Demandes de remboursement</Text>
          <Text style={boxText}>
            Toute demande de remboursement doit être effectuée via le bouton dédié situé sous l'onglet
            <strong> Mon mandat / Mon contrat</strong> de votre espace client. Aucune autre voie ne sera prise en compte.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={`${siteUrl}/support`}>Accéder à l'onglet Support</Button>
        </Section>

        <Text style={text}>
          Une copie de cette communication a été déposée dans votre onglet Support : vous pouvez y répondre
          directement afin que votre demande soit prise en charge.
        </Text>

        <Text style={text}>
          Nous vous renouvelons nos excuses pour ce désagrément et vous remercions de votre compréhension.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Logisorama — Immo-rama.ch · +41 21 634 31 61 · info@immo-rama.ch
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ServiceNoticeEmail,
  subject: 'Communication officielle — Traitement exclusif de vos demandes via l\'onglet Support',
  displayName: 'Communication officielle (incident & canal unique)',
  previewData: { prenom: 'Dupont' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '640px' }
const header = { paddingBottom: '8px' }
const brand = { fontSize: '20px', fontWeight: 700, color: '#0f766e', margin: '0' }
const brandSub = { fontSize: '12px', color: '#64748b', margin: '2px 0 0' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '20px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 14px' }
const box = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '0 0 12px',
}
const boxTitle = { fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }
const boxText = { fontSize: '14px', lineHeight: '22px', color: '#334155', margin: '0' }
const button = {
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0' }
