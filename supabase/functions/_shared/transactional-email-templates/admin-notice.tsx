import { EmailHeading, EmailLayout, EmailText } from '../email-layout.tsx'
import type { TemplateEntry } from './registry.ts'
import * as React from 'npm:react@18.3.1'

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
  <EmailLayout category="COMMUNICATION" preview={subject}>
    <EmailHeading>{subject}</EmailHeading>
    <EmailText>{prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</EmailText>
    {toParagraphs(body).map((para, pi) => (
      <EmailText key={`p-${pi}`}>
        {para.split('\n').map((line, li, arr) => (
          <React.Fragment key={`l-${pi}-${li}`}>
            {renderInline(line, `l-${pi}-${li}`)}
            {li < arr.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </EmailText>
    ))}
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

