import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  title: string;
  content: string;
  variant?: 'call' | 'email';
}

export function ScriptBlock({ title, content, variant = 'call' }: Props) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const Icon = variant === 'call' ? Phone : Mail;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast({ title: 'Copié dans le presse-papiers' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden border-l-4 border-l-accent">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-8">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          <span className="ml-1 text-xs">{copied ? 'Copié' : 'Copier'}</span>
        </Button>
      </div>
      <pre className="p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
    </Card>
  );
}
