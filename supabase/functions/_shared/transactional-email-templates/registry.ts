import { template as clientCredentials } from './client-credentials.tsx'
import { template as serviceNotice } from './service-notice.tsx'

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
}
