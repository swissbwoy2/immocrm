import { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';
import { RotateCcw, PenLine } from 'lucide-react';

interface Props {
  value: string;
  onChange: (data: string) => void;
}

export default function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      signaturePadRef.current = new SignaturePadLib(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 3,
      });

      signaturePadRef.current.addEventListener('beginStroke', () => {
        setIsDrawing(true);
      });

      signaturePadRef.current.addEventListener('endStroke', () => {
        setIsDrawing(false);
        setIsEmpty(signaturePadRef.current?.isEmpty() || false);
        if (signaturePadRef.current) {
          onChange(signaturePadRef.current.toDataURL('image/png'));
        }
      });

      // Restaurer la signature si elle existe
      if (value) {
        signaturePadRef.current.fromDataURL(value);
        setIsEmpty(false);
      }
    }

    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, []);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      // Clear with transparent background
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      setIsEmpty(true);
      onChange('');
    }
  };

  return (
    <div className="space-y-3">
      <div className={`
        relative rounded-xl overflow-hidden transition-all duration-300
        ${isDrawing 
          ? 'ring-2 ring-primary shadow-lg shadow-primary/20' 
          : isEmpty 
            ? 'ring-2 ring-dashed ring-muted-foreground/30' 
            : 'ring-2 ring-green-500/50 shadow-lg shadow-green-500/10'
        }
      `}>
        {/* Animated border gradient when drawing */}
        {isDrawing && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse pointer-events-none" />
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full h-44 touch-none rounded-xl"
          style={{ touchAction: 'none', backgroundColor: 'transparent', backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px' }}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <PenLine className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground/70 text-sm">Signez ici</p>
          </div>
        )}

        {/* Success indicator */}
        {!isEmpty && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
