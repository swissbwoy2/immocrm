import { template as clientCredentials } from './client-credentials.tsx'
import { template as serviceNotice } from './service-notice.tsx'
import { template as candidatVisiteConfirmation } from './candidat-visite-confirmation.tsx'
import { template as candidatureRelocationEtape } from './candidature-relocation-etape.tsx'
import { template as candidatSuiviRappelVisite } from './candidat-suivi-rappel-visite.tsx'
import { template as candidatVisiteAnnulee } from './candidat-visite-annulee.tsx'

export type TemplateEntry = {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'client-credentials': clientCredentials,
  'service-notice': serviceNotice,
  'candidat-visite-confirmation': candidatVisiteConfirmation,
  'candidature-relocation-etape': candidatureRelocationEtape,
  'candidat-suivi-rappel-visite': candidatSuiviRappelVisite,
  'candidat-visite-annulee': candidatVisiteAnnulee,
}
