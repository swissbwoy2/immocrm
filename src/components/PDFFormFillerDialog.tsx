import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Type, 
  Pen, 
  Download, 
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  MousePointer,
  Check
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import SignaturePad from '@/components/mandat/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Set worker path for Vite compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  pageIndex: number;
}

interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

interface PDFFormFillerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
}

export default function PDFFormFillerDialog({
  open,
  onOpenChange,
  clientId,
  clientName
}: PDFFormFillerDialogProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<'select' | 'text' | 'signature'>('select');
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [signatureData, setSignatureData] = useState('');
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [newText, setNewText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF and render
  const loadPdf = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(0);
      renderPage(0, pdf);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Erreur lors du chargement du PDF');
    }
  }, []);

  const renderPage = async (pageIndex: number, pdf?: pdfjsLib.PDFDocumentProxy) => {
    const pdfDoc = pdf || pdfDocRef.current;
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(pageIndex + 1);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale: zoom * 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    // Draw annotations for current page
    drawAnnotations(context, viewport, pageIndex);
  };

  const drawAnnotations = (
    context: CanvasRenderingContext2D, 
    viewport: pdfjsLib.PageViewport,
    pageIndex: number
  ) => {
    // Draw text annotations
    const pageAnnotations = annotations.filter(a => a.pageIndex === pageIndex);
    context.fillStyle = '#000';
    pageAnnotations.forEach(annotation => {
      context.font = `${annotation.fontSize * zoom * 1.5}px Helvetica`;
      context.fillText(annotation.text, annotation.x * zoom * 1.5, annotation.y * zoom * 1.5);
    });

    // Draw signature if on current page
    if (signaturePosition && signaturePosition.pageIndex === pageIndex && signatureData) {
      const img = new Image();
      img.src = signatureData;
      img.onload = () => {
        context.drawImage(
          img,
          signaturePosition.x * zoom * 1.5,
          signaturePosition.y * zoom * 1.5,
          signaturePosition.width * zoom * 1.5,
          signaturePosition.height * zoom * 1.5
        );
      };
    }
  };

  // Re-render when annotations or signature changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [annotations, signaturePosition, signatureData, currentPage, zoom]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(arrayBuffer);
      loadPdf(arrayBuffer);
      setAnnotations([]);
      setSignaturePosition(null);
    } else {
      toast.error('Veuillez sélectionner un fichier PDF');
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom * 1.5);
    const y = (e.clientY - rect.top) / (zoom * 1.5);

    if (mode === 'text') {
      setNewTextPosition({ x, y });
      setIsAddingText(true);
      setNewText('');
    } else if (mode === 'signature' && signatureData) {
      setSignaturePosition({
        x,
        y,
        width: 150,
        height: 50,
        pageIndex: currentPage
      });
      toast.success('Signature positionnée');
    }
  };

  // Add text annotation
  const addTextAnnotation = () => {
    if (!newTextPosition || !newText.trim()) return;

    const annotation: TextAnnotation = {
      id: crypto.randomUUID(),
      x: newTextPosition.x,
      y: newTextPosition.y,
      text: newText,
      fontSize,
      pageIndex: currentPage
    };

    setAnnotations(prev => [...prev, annotation]);
    setIsAddingText(false);
    setNewTextPosition(null);
    setNewText('');
  };

  // Delete annotation
  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Generate filled PDF
  const generateFilledPdf = async (): Promise<Uint8Array | null> => {
    if (!pdfBytes) return null;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      // Add text annotations
      for (const annotation of annotations) {
        const page = pages[annotation.pageIndex];
        if (page) {
          const { height } = page.getSize();
          page.drawText(annotation.text, {
            x: annotation.x,
            y: height - annotation.y,
            size: annotation.fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        }
      }

      // Add signature
      if (signaturePosition && signatureData) {
        const page = pages[signaturePosition.pageIndex];
        if (page) {
          const { height } = page.getSize();
          
          // Convert data URL to bytes
          const base64Data = signatureData.split(',')[1];
          const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const signatureImage = await pdfDoc.embedPng(signatureBytes);
          
          page.drawImage(signatureImage, {
            x: signaturePosition.x,
            y: height - signaturePosition.y - signaturePosition.height,
            width: signaturePosition.width,
            height: signaturePosition.height
          });
        }
      }

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      return null;
    }
  };

  // Download PDF
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const pdfBytesResult = await generateFilledPdf();
      if (!pdfBytesResult) return;

      const blob = new Blob([new Uint8Array(pdfBytesResult)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demande-location-${clientName || 'rempli'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to documents
  const handleSave = async () => {
    if (!clientId) {
      toast.error('Aucun client sélectionné');
      return;
    }

    setIsSaving(true);
    try {
      const pdfBytesResult = await generateFilledPdf();
      if (!pdfBytesResult) return;

      const fileName = `demande-location-${Date.now()}.pdf`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBytesResult, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (clientData?.user_id) {
        await supabase.from('documents').insert({
          client_id: clientId,
          user_id: clientData.user_id,
          nom: `Demande de location - ${new Date().toLocaleDateString('fr-CH')}`,
          type: 'application/pdf',
          type_document: 'demande_location',
          url: urlData.publicUrl,
          statut: 'valide'
        });
      }

      toast.success('Document sauvegardé');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all
  const clearAll = () => {
    setAnnotations([]);
    setSignaturePosition(null);
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  };

  const pageAnnotations = annotations.filter(a => a.pageIndex === currentPage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Remplir un formulaire de location</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Importez un PDF, ajoutez du texte et signez
              </p>
            </div>
            {clientName && (
              <Badge variant="secondary" className="ml-auto">
                <Sparkles className="h-3 w-3 mr-1" />
                {clientName}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(95vh - 140px)' }}>
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {pdfFile ? 'Changer PDF' : 'Importer PDF'}
                </Button>
                {pdfFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {pdfFile.name}
                  </span>
                )}
              </div>

              {pdfFile && (
                <>
                  {/* Mode buttons */}
                  <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
                    <Button
                      variant={mode === 'select' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMode('select')}
                      className="gap-1.5"
                    >
                      <MousePointer className="h-4 w-4" />
                      Sélection
                    </Button>
                    <Button
                      variant={mode === 'text' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMode('text')}
                      className="gap-1.5"
                    >
                      <Type className="h-4 w-4" />
                      Texte
                    </Button>
                    <Button
                      variant={mode === 'signature' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMode('signature')}
                      className="gap-1.5"
                    >
                      <Pen className="h-4 w-4" />
                      Signature
                    </Button>
                  </div>

                  {/* Zoom & navigation */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-2" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* PDF Canvas */}
            <ScrollArea className="flex-1 bg-muted/20">
              <div 
                ref={containerRef}
                className="flex items-center justify-center p-4 min-h-full"
              >
                {!pdfFile ? (
                  <div
                    className="w-full max-w-lg aspect-[3/4] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Glissez un PDF ici</p>
                      <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className={`border shadow-lg rounded cursor-${mode === 'select' ? 'default' : 'crosshair'}`}
                      style={{ cursor: mode === 'select' ? 'default' : 'crosshair' }}
                    />
                    {mode === 'text' && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                        Cliquez pour ajouter du texte
                      </div>
                    )}
                    {mode === 'signature' && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                        {signatureData ? 'Cliquez pour positionner la signature' : 'Dessinez d\'abord votre signature'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Text input modal */}
            {isAddingText && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                <Card className="p-6 w-80 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Ajouter du texte</Label>
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingText(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Saisissez le texte..."
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && addTextAnnotation()}
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Taille:</Label>
                    <Input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20"
                      min={8}
                      max={72}
                    />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                  <Button onClick={addTextAnnotation} className="w-full gap-2">
                    <Check className="h-4 w-4" />
                    Ajouter
                  </Button>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {pdfFile && (
            <div className="w-80 border-l flex flex-col bg-background">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Annotations list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Annotations ({annotations.length})</Label>
                      {annotations.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-destructive">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Tout effacer
                        </Button>
                      )}
                    </div>
                    {pageAnnotations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucune annotation sur cette page
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pageAnnotations.map((annotation) => (
                          <div
                            key={annotation.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                          >
                            <span className="truncate flex-1">{annotation.text}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => deleteAnnotation(annotation.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Signature pad */}
                  <div>
                    <Label className="font-semibold mb-2 block">Signature</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <SignaturePad
                        value={signatureData}
                        onChange={setSignatureData}
                      />
                    </div>
                    {signatureData && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {signaturePosition 
                          ? '✓ Signature positionnée sur le PDF'
                          : 'Passez en mode "Signature" et cliquez sur le PDF pour positionner'
                        }
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Action buttons */}
              <div className="p-4 border-t space-y-2">
                <Button
                  onClick={handleDownload}
                  disabled={!pdfFile || isGenerating}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? 'Génération...' : 'Télécharger'}
                </Button>
                {clientId && (
                  <Button
                    onClick={handleSave}
                    disabled={!pdfFile || isSaving}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder dans les documents'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
