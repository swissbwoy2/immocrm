import { EmailLayout, emailStyles } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'

interface AdminNoticeProps {
  prenom?: string
  subject?: string
  body?: string
}

// Rend **texte** en gras ; le reste en texte brut (React échappe le HTML).
const renderInline = (line: string, key: string) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>
  )
}

const toParagraphs = (body: string) =>
  body.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

export const AdminNoticeEmail = ({ prenom, subject = 'Communication Logisorama', body = '' }: AdminNoticeProps) => (
  <EmailLayout preview={subject}>
    <Heading className="email-heading" style={h1}>{subject}</Heading>
    <Text style={text}>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</Text>
    {toParagraphs(body).map((para, pi) => (
      <Text key={`p-${pi}`} style={text}>
        {para.split('\n').map((line, li, arr) => (
          <React.Fragment key={`l-${pi}-${li}`}>
            {renderInline(line, `l-${pi}-${li}`)}
            {li < arr.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </Text>
    ))}
    <Text style={text}>L'équipe Logisorama – Immo-Rama</Text>
  </EmailLayout>
)

export const template = {
  component: AdminNoticeEmail,
  subject: (data: Record<string, any>) => (typeof data?.subject === 'string' && data.subject.trim()) || 'Communication Logisorama',
  displayName: 'Communication ciblée (admin)',
  previewData: {
    prenom: 'Marie',
    subject: 'Information importante concernant votre dossier',
    body: 'Nous revenons vers vous au sujet de votre recherche.\n\nMerci de **mettre à jour vos documents** dans l\'application.\nNous restons à disposition.',
  },
} satisfies TemplateEntry

const { h1, text } = emailStyles
