import { EmailButton, EmailHeading, EmailLayout, EmailText, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

interface ServiceNoticeProps {
  prenom?: string
  siteUrl?: string
}

const SITE_URL = 'https://logisorama.ch'

export const ServiceNoticeEmail = ({ prenom, siteUrl = SITE_URL }: ServiceNoticeProps) => (
  <EmailLayout category="COMMUNICATION OFFICIELLE" preview={`Communication officielle — vos demandes sont désormais traitées exclusivement via l'onglet Support`}>
<EmailHeading>Communication officielle</EmailHeading>
        <EmailText>{prenom ? `Madame, Monsieur ${prenom},` : 'Madame, Monsieur,'}</EmailText>

        <EmailText>
          À la suite d'un incident technique général affectant nos canaux de communication depuis trois semaines,
          nous vous adressons nos excuses les plus sincères pour la gêne occasionnée. Afin de rétablir un suivi
          rigoureux et d'éviter toute confusion, les règles suivantes s'appliquent avec effet immédiat.
        </EmailText>

        <div style={{ ...box, margin: '0 0 12px' }}>
          <p style={boxTitle}>1. Canal unique : l'onglet « Support »</p>
          <p style={boxText}>
            Toute demande doit être formulée exclusivement depuis l'onglet <strong>Support</strong> de votre espace
            client. Aucune demande transmise en dehors de l'application (WhatsApp, téléphone, SMS ou e-mail direct)
            ne sera traitée.
          </p>
        </div>

        <div style={{ ...box, margin: '0 0 12px' }}>
          <p style={boxTitle}>2. Visites : instruction écrite obligatoire</p>
          <p style={boxText}>
            Sans mention explicite de votre part transmise via l'application, <strong>aucune visite ne sera
            effectuée</strong> par l'agent en charge de votre dossier.
          </p>
        </div>

        <div style={{ ...box, margin: '0 0 12px' }}>
          <p style={boxTitle}>3. Mise à jour de l'application</p>
          <p style={boxText}>
            Veuillez impérativement mettre à jour l'application, ou la télécharger, depuis l'<strong>App Store</strong>
            {' '}ou le <strong>Google Play Store</strong>. Cette mise à jour est indispensable au bon fonctionnement
            de votre espace.
          </p>
        </div>

        <div style={{ ...box, margin: '0 0 12px' }}>
          <p style={boxTitle}>4. Documents et suivi de votre recherche</p>
          <p style={boxText}>
            Maintenez vos documents à jour dans votre dossier afin de ne manquer aucune offre, et suivez
            rigoureusement l'avancement de votre recherche directement dans l'application.
          </p>
        </div>

        <div style={{ ...box, margin: '0 0 12px' }}>
          <p style={boxTitle}>5. Demandes de remboursement</p>
          <p style={boxText}>
            Toute demande de remboursement doit être effectuée via le bouton dédié situé sous l'onglet
            <strong> Mon mandat / Mon contrat</strong> de votre espace client. Aucune autre voie ne sera prise en compte.
          </p>
        </div>

        <EmailButton href={`${siteUrl}/support`}>Accéder à l'onglet Support</EmailButton>

        <EmailText>
          Une copie de cette communication a été déposée dans votre onglet Support : vous pouvez y répondre
          directement afin que votre demande soit prise en charge.
        </EmailText>

        <EmailText>
          Nous vous renouvelons nos excuses pour ce désagrément et vous remercions de votre compréhension.
        </EmailText>
    </EmailLayout>
)

export const template = {
  component: ServiceNoticeEmail,
  subject: 'Communication officielle — Traitement exclusif de vos demandes via l\'onglet Support',
  displayName: 'Communication officielle (incident & canal unique)',
  previewData: { prenom: 'Dupont' },
} satisfies TemplateEntry

const { box, boxText, boxTitle } = emailStyles
