import type React from 'react';
import { Download, Eye, File, FilePlus, FileText, Image as ImageIcon, Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { PdfPreview } from '@/components/files/PdfPreview';
import { formatZurichShortDate } from '@/lib/dateZurich';
import { FicheCard, InlineEmpty } from './parts';
import { formatFileSize, getDocTypeLabel } from './model';

const getFileIcon = (type: string) => {
  if (type?.includes('pdf')) return FileText;
  if (type?.includes('image')) return ImageIcon;
  return File;
};

/** Personne du dossier à qui un document peut être rattaché (conjoint, garant, colocataire…). */
export interface DocumentPerson {
  id: string;
  label: string;
}

/** Documents du client : liste, aperçu, renommer / reclasser, télécharger, supprimer, dossier complet. */
export function DocumentsCard({ documents, persons = [], onUpload, onMerge, onPreview, onRename, onDownload, onDelete }: {
  documents: any[];
  /** Personnes liées : le document d'une personne liée affiche son nom. */
  persons?: DocumentPerson[];
  onUpload: () => void;
  onMerge: () => void;
  onPreview: (doc: any) => void;
  onRename: (doc: any) => void;
  onDownload: (doc: any) => void;
  onDelete: (doc: any) => void;
}) {
  return (
    <FicheCard
      icon={FileText}
      title={`Documents (${documents.length})`}
      action={(
        <>
          {documents.length >= 2 && (
            <Button variant="outline" onClick={onMerge}>
              <FilePlus className="h-4 w-4" />
              Créer dossier complet
            </Button>
          )}
          <Button onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Ajouter un document
          </Button>
        </>
      )}
    >
      {documents.length > 0 ? (
        <ul className="divide-y divide-border/50">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.type);
            const canPreview = doc.type?.includes('image') || doc.type === 'application/pdf';
            return (
              <li key={doc.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-[15px] font-medium text-foreground">{doc.nom}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <DashBadge tone="muted">{getDocTypeLabel(doc.type_document)}</DashBadge>
                      {doc.candidate_id && (
                        <DashBadge tone="muted">{persons.find((p) => p.id === doc.candidate_id)?.label ?? 'Personne liée'}</DashBadge>
                      )}
                      {doc.taille ? <span>{formatFileSize(doc.taille)}</span> : null}
                      <span>•</span>
                      <span>{formatZurichShortDate(doc.date_upload)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 pl-12 sm:pl-0">
                  {canPreview && (
                    <Button variant="ghost" size="icon" onClick={() => onPreview(doc)} aria-label={`Aperçu de ${doc.nom}`} title="Aperçu">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onRename(doc)} aria-label={`Renommer ${doc.nom}`} title="Renommer / reclasser / changer de personne">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDownload(doc)} aria-label={`Télécharger ${doc.nom}`} title="Télécharger">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(doc)} aria-label={`Supprimer ${doc.nom}`} title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <InlineEmpty
          icon={FileText}
          title="Aucun document"
          action={(
            <Button onClick={onUpload} variant="outline">
              <Upload className="h-4 w-4" />
              Ajouter le premier document
            </Button>
          )}
        />
      )}
    </FicheCard>
  );
}

const DialogIcon = ({ icon: Icon }: { icon: React.ElementType }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
    <Icon className="h-5 w-5" />
  </span>
);

/** Ajout d'un document (types achat ou location). */
export function UploadDocumentDialog({
  open, onOpenChange, isPurchaseEligible, selectedDocType, setSelectedDocType, fileInputRef,
  selectedFile, setSelectedFile, isUploading, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isPurchaseEligible: boolean;
  selectedDocType: string;
  setSelectedDocType: (v: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  isUploading: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <DialogIcon icon={Upload} />
            Ajouter un document
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="bg-card border-border/70">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                {isPurchaseEligible ? (
                  // ── Documents achat ──
                  <>
                    <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                    <SelectItem value="permis_sejour">🪪 Permis de séjour</SelectItem>
                    <SelectItem value="certificat_salaire">💰 Certificat de salaire annuel</SelectItem>
                    <SelectItem value="fiche_salaire">💰 Fiche de salaire (1)</SelectItem>
                    <SelectItem value="fiche_salaire_2">💰 Fiche de salaire (2)</SelectItem>
                    <SelectItem value="fiche_salaire_3">💰 Fiche de salaire (3)</SelectItem>
                    <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                    <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                    <SelectItem value="releve_bancaire_fonds_propres">🏦 Relevé bancaire fonds propres</SelectItem>
                    <SelectItem value="attestation_3a">🏦 Attestation 3e pilier</SelectItem>
                    <SelectItem value="attestation_lpp">🏦 Attestation LPP</SelectItem>
                    <SelectItem value="attestation_epl">🏦 Attestation EPL</SelectItem>
                    <SelectItem value="attestation_libre_passage">🏦 Attestation libre passage</SelectItem>
                    <SelectItem value="justificatif_placements">📊 Justificatif placements</SelectItem>
                    <SelectItem value="justificatif_donation">🎁 Justificatif donation / avance d'hoirie</SelectItem>
                    <SelectItem value="justificatif_credit_prive">📋 Justificatif crédit privé</SelectItem>
                    <SelectItem value="justificatif_leasing">🚗 Justificatif leasing</SelectItem>
                    <SelectItem value="justificatif_carte_credit">💳 Justificatif carte de crédit</SelectItem>
                    <SelectItem value="justificatif_pension_alimentaire">👶 Justificatif pension alimentaire</SelectItem>
                    <SelectItem value="decision_taxation">📋 Dernière décision de taxation</SelectItem>
                    <SelectItem value="declaration_fiscale">📋 Déclaration fiscale</SelectItem>
                    <SelectItem value="accord_transmission">✅ Accord transmission partenaires financiers</SelectItem>
                    <SelectItem value="consentement_donnees">✅ Consentement traitement données</SelectItem>
                    <SelectItem value="autre">📄 Autre document achat</SelectItem>
                  </>
                ) : (
                  // ── Documents location ──
                  <>
                    <SelectItem value="fiche_salaire">💰 Fiche de salaire</SelectItem>
                    <SelectItem value="extrait_poursuites">📋 Extrait des poursuites</SelectItem>
                    <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                    <SelectItem value="attestation_domicile">🏠 Attestation de domicile</SelectItem>
                    <SelectItem value="rc_menage">🛡️ RC Ménage</SelectItem>
                    <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                    <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                    <SelectItem value="copie_bail">📋 Copie du bail</SelectItem>
                    <SelectItem value="attestation_garantie_loyer">🔐 Attestation garantie de loyer</SelectItem>
                    <SelectItem value="autre">📄 Autre</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fichier</Label>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
              className="bg-card border-border/70"
            />
            <p className="text-sm text-muted-foreground">Formats acceptés: PDF, JPG, PNG (max 1GB)</p>
          </div>
          {selectedFile && (
            <div className="rounded-2xl bg-primary/10 px-3.5 py-3">
              <p className="break-words text-sm font-medium text-primary">
                Fichier sélectionné: {selectedFile.name}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Upload en cours...' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Aperçu PDF / image d'un document. */
export function PreviewDocumentDialog({ open, onOpenChange, previewDocument, previewUrl, onDownload }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  previewDocument: any;
  previewUrl: string;
  onDownload: (doc: any) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-3 pr-8">
            <DialogIcon icon={Eye} />
            <span className="min-w-0 break-words">{previewDocument?.nom || 'Aperçu du document'}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="h-[80vh]">
          {previewDocument?.type?.includes('pdf') ? (
            <PdfPreview
              src={previewUrl}
              className="w-full h-full rounded-xl"
              fallback={(
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="mb-4">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => onDownload(previewDocument)}>
                    <Download className="h-4 w-4" />
                    Télécharger le PDF
                  </Button>
                </div>
              )}
            />
          ) : previewDocument?.type?.includes('image') ? (
            <div className="h-full overflow-auto flex justify-center items-start">
              <img
                src={previewUrl}
                alt={previewDocument?.nom}
                className="max-w-full h-auto rounded-xl"
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aperçu non disponible pour ce type de fichier
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Renommer / reclasser un document, et le rattacher à la bonne personne du dossier. */
export function RenameDocumentDialog({ open, onOpenChange, name, setName, type, setType, persons = [], selfLabel = 'Client principal', person = 'client', setPerson, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  setName: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  /** Personnes liées du dossier ; sans personne liée, le choix n'est pas affiché. */
  persons?: DocumentPerson[];
  selfLabel?: string;
  /** 'client' = client principal, sinon client_candidates.id */
  person?: string;
  setPerson?: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <DialogIcon icon={Pencil} />
            Renommer / reclasser le document
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nouveau nom</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du document"
              className="bg-card border-border/70"
            />
          </div>
          <div className="space-y-2">
            <Label>Catégorie / type de document</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-card border-border/70">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fiche_salaire">💰 Fiche de salaire</SelectItem>
                <SelectItem value="extrait_poursuites">📋 Extrait des poursuites</SelectItem>
                <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                <SelectItem value="attestation_domicile">🏠 Attestation de domicile</SelectItem>
                <SelectItem value="rc_menage">🛡️ RC Ménage</SelectItem>
                <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                <SelectItem value="copie_bail">📋 Copie du bail</SelectItem>
                <SelectItem value="attestation_garantie_loyer">🔐 Attestation garantie de loyer</SelectItem>
                <SelectItem value="dossier_complet">📎 Dossier complet</SelectItem>
                <SelectItem value="autre">📄 Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {persons.length > 0 && setPerson && (
            <div className="space-y-2">
              <Label>Ce document concerne</Label>
              <Select value={person} onValueChange={setPerson}>
                <SelectTrigger className="bg-card border-border/70">
                  <SelectValue placeholder="Choisir la personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">{selfLabel}</SelectItem>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!name.trim()}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
