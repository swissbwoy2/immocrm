import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  Type, 
  Download, 
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Circle,
  Square,
  Minus,
  Plus
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import SignaturePad from '@/components/mandat/SignaturePad';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Set worker path for Vite compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  pageIndex: number;
  color: string;
}

interface SymbolAnnotation {
  id: string;
  x: number;
  y: number;
  type: 'cross' | 'check' | 'dot' | 'rectangle' | 'line';
  pageIndex: number;
  color: string;
}

interface SignatureData {
  id: string;
  data: string;
  name: string;
  createdAt: Date;
}

interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  signatureId: string;
}

type AnnotationMode = 'select' | 'text' | 'cross' | 'check' | 'dot' | 'rectangle' | 'line' | 'signature';

const COLORS = {
  black: '#000000',
  blue: '#0066CC',
  red: '#CC0000',
};

export default function PDFFormFiller() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<AnnotationMode>('select');
  const [selectedColor, setSelectedColor] = useState<string>(COLORS.black);
  
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [symbolAnnotations, setSymbolAnnotations] = useState<SymbolAnnotation[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SignatureData[]>([]);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [currentSignatureData, setCurrentSignatureData] = useState('');
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [newText, setNewText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const scale = zoom * 1.5;

    // Draw text annotations
    const pageTextAnnotations = textAnnotations.filter(a => a.pageIndex === pageIndex);
    pageTextAnnotations.forEach(annotation => {
      context.fillStyle = annotation.color;
      context.font = `${annotation.fontSize * scale}px Helvetica`;
      context.fillText(annotation.text, annotation.x * scale, annotation.y * scale);
    });

    // Draw symbol annotations
    const pageSymbolAnnotations = symbolAnnotations.filter(a => a.pageIndex === pageIndex);
    pageSymbolAnnotations.forEach(annotation => {
      context.strokeStyle = annotation.color;
      context.fillStyle = annotation.color;
      context.lineWidth = 2 * scale;
      
      const x = annotation.x * scale;
      const y = annotation.y * scale;
      const size = 12 * scale;

      switch (annotation.type) {
        case 'cross':
          context.beginPath();
          context.moveTo(x - size/2, y - size/2);
          context.lineTo(x + size/2, y + size/2);
          context.moveTo(x + size/2, y - size/2);
          context.lineTo(x - size/2, y + size/2);
          context.stroke();
          break;
        case 'check':
          context.beginPath();
          context.moveTo(x - size/2, y);
          context.lineTo(x - size/6, y + size/2);
          context.lineTo(x + size/2, y - size/2);
          context.stroke();
          break;
        case 'dot':
          context.beginPath();
          context.arc(x, y, size/4, 0, Math.PI * 2);
          context.fill();
          break;
        case 'rectangle':
          context.strokeRect(x - size/2, y - size/2, size, size);
          break;
        case 'line':
          context.beginPath();
          context.moveTo(x - size, y);
          context.lineTo(x + size, y);
          context.stroke();
          break;
      }
    });

    // Draw signatures
    const pageSignatures = signaturePositions.filter(s => s.pageIndex === pageIndex);
    pageSignatures.forEach(sigPos => {
      const signature = savedSignatures.find(s => s.id === sigPos.signatureId);
      if (signature) {
        const img = new Image();
        img.src = signature.data;
        img.onload = () => {
          context.drawImage(
            img,
            sigPos.x * scale,
            sigPos.y * scale,
            sigPos.width * scale,
            sigPos.height * scale
          );
        };
      }
    });
  };

  // Re-render when annotations change
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [textAnnotations, symbolAnnotations, signaturePositions, currentPage, zoom]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(arrayBuffer);
      loadPdf(arrayBuffer);
      setTextAnnotations([]);
      setSymbolAnnotations([]);
      setSignaturePositions([]);
    } else {
      toast.error('Veuillez sélectionner un fichier PDF');
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || mode === 'select') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom * 1.5);
    const y = (e.clientY - rect.top) / (zoom * 1.5);

    if (mode === 'text') {
      setNewTextPosition({ x, y });
      setIsAddingText(true);
      setNewText('');
    } else if (mode === 'signature' && selectedSignatureId) {
      setSignaturePositions(prev => [...prev, {
        x,
        y,
        width: 150,
        height: 50,
        pageIndex: currentPage,
        signatureId: selectedSignatureId
      }]);
      toast.success('Signature positionnée');
    } else if (['cross', 'check', 'dot', 'rectangle', 'line'].includes(mode)) {
      setSymbolAnnotations(prev => [...prev, {
        id: crypto.randomUUID(),
        x,
        y,
        type: mode as SymbolAnnotation['type'],
        pageIndex: currentPage,
        color: selectedColor
      }]);
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
      pageIndex: currentPage,
      color: selectedColor
    };

    setTextAnnotations(prev => [...prev, annotation]);
    setIsAddingText(false);
    setNewTextPosition(null);
    setNewText('');
  };

  // Save signature
  const saveCurrentSignature = () => {
    if (!currentSignatureData) return;
    
    const newSignature: SignatureData = {
      id: crypto.randomUUID(),
      data: currentSignatureData,
      name: `Signature ${savedSignatures.length + 1}`,
      createdAt: new Date()
    };
    
    setSavedSignatures(prev => [...prev, newSignature]);
    setCurrentSignatureData('');
    setShowSignaturePad(false);
    setSelectedSignatureId(newSignature.id);
    toast.success('Signature sauvegardée');
  };

  // Delete signature
  const deleteSignature = (id: string) => {
    setSavedSignatures(prev => prev.filter(s => s.id !== id));
    setSignaturePositions(prev => prev.filter(sp => sp.signatureId !== id));
    if (selectedSignatureId === id) {
      setSelectedSignatureId(null);
    }
  };

  // Delete annotation
  const deleteTextAnnotation = (id: string) => {
    setTextAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const deleteSymbolAnnotation = (id: string) => {
    setSymbolAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Generate filled PDF
  const generateFilledPdf = async (): Promise<Uint8Array | null> => {
    if (!pdfBytes) return null;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      // Add text annotations
      for (const annotation of textAnnotations) {
        const page = pages[annotation.pageIndex];
        if (page) {
          const { height } = page.getSize();
          const color = annotation.color === COLORS.red ? rgb(0.8, 0, 0) :
                       annotation.color === COLORS.blue ? rgb(0, 0.4, 0.8) :
                       rgb(0, 0, 0);
          page.drawText(annotation.text, {
            x: annotation.x,
            y: height - annotation.y,
            size: annotation.fontSize,
            font: helveticaFont,
            color
          });
        }
      }

      // Add symbol annotations
      for (const annotation of symbolAnnotations) {
        const page = pages[annotation.pageIndex];
        if (page) {
          const { height } = page.getSize();
          const color = annotation.color === COLORS.red ? rgb(0.8, 0, 0) :
                       annotation.color === COLORS.blue ? rgb(0, 0.4, 0.8) :
                       rgb(0, 0, 0);
          const posX = annotation.x;
          const posY = height - annotation.y;
          const size = 12;

          switch (annotation.type) {
            case 'cross':
              page.drawLine({ start: { x: posX - size/2, y: posY + size/2 }, end: { x: posX + size/2, y: posY - size/2 }, color, thickness: 2 });
              page.drawLine({ start: { x: posX + size/2, y: posY + size/2 }, end: { x: posX - size/2, y: posY - size/2 }, color, thickness: 2 });
              break;
            case 'check':
              page.drawLine({ start: { x: posX - size/2, y: posY }, end: { x: posX - size/6, y: posY - size/2 }, color, thickness: 2 });
              page.drawLine({ start: { x: posX - size/6, y: posY - size/2 }, end: { x: posX + size/2, y: posY + size/2 }, color, thickness: 2 });
              break;
            case 'dot':
              page.drawCircle({ x: posX, y: posY, size: size/4, color });
              break;
            case 'rectangle':
              page.drawRectangle({ x: posX - size/2, y: posY - size/2, width: size, height: size, borderColor: color, borderWidth: 2 });
              break;
            case 'line':
              page.drawLine({ start: { x: posX - size, y: posY }, end: { x: posX + size, y: posY }, color, thickness: 2 });
              break;
          }
        }
      }

      // Add signatures
      for (const sigPos of signaturePositions) {
        const signature = savedSignatures.find(s => s.id === sigPos.signatureId);
        if (signature) {
          const page = pages[sigPos.pageIndex];
          if (page) {
            const { height } = page.getSize();
            const base64Data = signature.data.split(',')[1];
            const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            
            page.drawImage(signatureImage, {
              x: sigPos.x,
              y: height - sigPos.y - sigPos.height,
              width: sigPos.width,
              height: sigPos.height
            });
          }
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
      a.download = `document-signe-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear all
  const clearAll = () => {
    setTextAnnotations([]);
    setSymbolAnnotations([]);
    setSignaturePositions([]);
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  };

  const allAnnotationsCount = textAnnotations.length + symbolAnnotations.length + signaturePositions.length;
  const currentPageAnnotations = [
    ...textAnnotations.filter(a => a.pageIndex === currentPage),
    ...symbolAnnotations.filter(a => a.pageIndex === currentPage)
  ];

  const toolButtons: { mode: AnnotationMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'text', icon: <Type className="h-4 w-4" />, label: 'Texte' },
    { mode: 'cross', icon: <X className="h-4 w-4" />, label: 'Croix' },
    { mode: 'check', icon: <Check className="h-4 w-4" />, label: 'Coche' },
    { mode: 'dot', icon: <Circle className="h-4 w-4 fill-current" />, label: 'Point' },
    { mode: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
    { mode: 'line', icon: <Minus className="h-4 w-4" />, label: 'Ligne' },
  ];

  return (
    <div className="h-full flex">
      {/* Left Panel - Tools */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Signer électroniquement</h2>
          </div>
          
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Remplir et signer vous-même
          </p>
          
          {/* Tool buttons */}
          <div className="flex flex-wrap gap-1 mb-4">
            {toolButtons.map(tool => (
              <Button
                key={tool.mode}
                variant={mode === tool.mode ? 'default' : 'outline'}
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setMode(tool.mode)}
                title={tool.label}
              >
                {tool.icon}
              </Button>
            ))}
            
            {/* Color picker */}
            <div className="flex items-center gap-1 ml-2 border-l pl-2">
              {Object.entries(COLORS).map(([name, color]) => (
                <button
                  key={name}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform",
                    selectedColor === color ? "scale-110 border-primary" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Signatures section */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Vos signatures</Label>
              
              {savedSignatures.length === 0 && !showSignaturePad && (
                <p className="text-sm text-muted-foreground mb-3">
                  Aucune signature sauvegardée
                </p>
              )}
              
              {/* Saved signatures list */}
              <div className="space-y-2 mb-3">
                {savedSignatures.map(sig => (
                  <div
                    key={sig.id}
                    className={cn(
                      "border rounded-lg p-2 cursor-pointer transition-all",
                      selectedSignatureId === sig.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/50"
                    )}
                    onClick={() => {
                      setSelectedSignatureId(sig.id);
                      setMode('signature');
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{sig.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSignature(sig.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <img 
                      src={sig.data} 
                      alt={sig.name} 
                      className="max-h-12 w-full object-contain bg-white rounded"
                    />
                  </div>
                ))}
              </div>

              {/* Signature pad */}
              {showSignaturePad ? (
                <div className="space-y-2">
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <SignaturePad
                      value={currentSignatureData}
                      onChange={setCurrentSignatureData}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowSignaturePad(false);
                        setCurrentSignatureData('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={saveCurrentSignature}
                      disabled={!currentSignatureData}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSignaturePad(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une signature
                </Button>
              )}
            </div>

            {/* Current page annotations */}
            {currentPageAnnotations.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Annotations page {currentPage + 1}
                </Label>
                <div className="space-y-1">
                  {textAnnotations
                    .filter(a => a.pageIndex === currentPage)
                    .map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <span className="truncate flex-1">{a.text}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteTextAnnotation(a.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  {symbolAnnotations
                    .filter(a => a.pageIndex === currentPage)
                    .map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <span className="capitalize">{a.type}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteSymbolAnnotation(a.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom actions */}
        <div className="p-4 border-t space-y-2">
          {allAnnotationsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive"
              onClick={clearAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tout effacer ({allAnnotationsCount})
            </Button>
          )}
          <Button
            onClick={handleDownload}
            disabled={!pdfFile || isGenerating}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Génération...' : 'Télécharger le PDF'}
          </Button>
        </div>
      </div>

      {/* Center - PDF Preview */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card">
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
              {pdfFile ? 'Changer de PDF' : 'Importer un PDF'}
            </Button>
            {pdfFile && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {pdfFile.name}
              </span>
            )}
          </div>

          {pdfFile && (
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
              <span className="text-sm min-w-[60px] text-center">
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
          )}
        </div>

        {/* PDF Canvas */}
        <ScrollArea className="flex-1">
          <div className="flex items-center justify-center p-6 min-h-full">
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
                  className="border shadow-lg rounded"
                  style={{ cursor: mode === 'select' ? 'default' : 'crosshair' }}
                />
                {mode !== 'select' && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                    {mode === 'text' && 'Cliquez pour ajouter du texte'}
                    {mode === 'signature' && (selectedSignatureId ? 'Cliquez pour positionner la signature' : 'Sélectionnez d\'abord une signature')}
                    {['cross', 'check', 'dot', 'rectangle', 'line'].includes(mode) && `Cliquez pour ajouter un(e) ${mode}`}
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

      {/* Right Panel - Page thumbnails (optional, minimal) */}
      {pdfFile && totalPages > 1 && (
        <div className="w-16 border-l bg-card flex flex-col items-center py-4 gap-2">
          <Label className="text-xs text-muted-foreground mb-2">Pages</Label>
          <ScrollArea className="flex-1 w-full">
            <div className="flex flex-col items-center gap-2 px-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-10 h-14 rounded border text-xs font-medium flex items-center justify-center transition-all",
                    currentPage === i 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setCurrentPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
