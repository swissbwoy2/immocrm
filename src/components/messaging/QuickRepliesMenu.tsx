import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, MessageSquare, FileText, Search, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickReply {
  id: string;
  title: string;
  icon: React.ReactNode;
  template: string;
}

export const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'bienvenue',
    title: '👋 Message de bienvenue',
    icon: <MessageSquare className="h-4 w-4" />,
    template: `Salut [Prénom] 👋

Bienvenue chez Logisorama et merci pour ta confiance.
Je serai ton/ta conseiller·ère dédié·e pendant les 90 prochains jours pour t'aider à trouver ton appart en Suisse romande.

Concrètement, voici ce qu'on va faire pour toi :

On surveille les annonces et notre réseau pour dénicher des biens qui collent à ton profil.

On te propose uniquement les logements réalistes par rapport à ton budget, ta situation et tes délais.

On t'aide à organiser les visites et à présenter un dossier solide aux régies et propriétaires.

Et comme prévu dans ton mandat, si aucun bail n'est signé au bout de 90 jours, tu bénéficies de la garantie de remboursement.​

De ton côté, pour que ça roule :

Réponds rapidement quand tu reçois une nouvelle proposition.

Préviens‑nous si tu visites ou trouves un bien par un autre canal.

Assure‑toi que tes documents (revenus, permis, extrait de poursuites, etc.) sont à jour dans ton espace.

On commence dès maintenant : tu verras ici même les premières offres et messages.
Si tu as la moindre question, n'hésite pas à m'écrire directement dans cette messagerie.

À très vite,

[NomAgent]`
  },
  {
    id: 'rappel_documents',
    title: '📄 Rappel documents',
    icon: <FileText className="h-4 w-4" />,
    template: `Salut [Prénom],

Je voulais juste te rappeler de vérifier que tous tes documents sont à jour dans ton espace :
- Pièce d'identité
- Attestation de revenus
- Extrait de poursuites récent
- Contrat de travail

Ça nous permettra d'aller plus vite quand on trouvera le bon bien !

[NomAgent]`
  },
  {
    id: 'suivi_recherche',
    title: '🔍 Point sur la recherche',
    icon: <Search className="h-4 w-4" />,
    template: `Hello [Prénom],

Je fais un petit point sur ta recherche.
On continue à surveiller le marché pour toi et on a quelques pistes en cours.

Est-ce que tes critères sont toujours les mêmes ? N'hésite pas à me dire si quelque chose a changé.

[NomAgent]`
  },
  {
    id: 'encouragement',
    title: '💪 Encouragement',
    icon: <ThumbsUp className="h-4 w-4" />,
    template: `Salut [Prénom],

Je sais que la recherche peut parfois sembler longue, mais on ne lâche rien !
Le marché bouge régulièrement et je reste attentif·ve pour toi.

On reste en contact,

[NomAgent]`
  }
];

interface QuickRepliesMenuProps {
  onSelectReply: (template: string) => void;
  clientFirstName?: string;
  agentFullName?: string;
  disabled?: boolean;
}

export const QuickRepliesMenu: React.FC<QuickRepliesMenuProps> = ({
  onSelectReply,
  clientFirstName = '',
  agentFullName = '',
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSelectReply = (template: string) => {
    // Replace placeholders with actual values
    let processedTemplate = template
      .replace(/\[Prénom\]/g, clientFirstName || '[Prénom]')
      .replace(/\[NomAgent\]/g, agentFullName || '[NomAgent]');
    
    onSelectReply(processedTemplate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            'shrink-0 rounded-xl h-10 w-10',
            'hover:bg-amber-500/10 hover:text-amber-500',
            'transition-all duration-200 hover:scale-110',
            open && 'bg-amber-500/10 text-amber-500'
          )}
        >
          <Zap className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-80 p-0 max-h-[400px] overflow-hidden"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Messages rapides</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sélectionnez un message prédéfini
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {QUICK_REPLIES.map((reply) => (
              <button
                type="button"
                key={reply.id}
                onClick={() => handleSelectReply(reply.template)}
                className={cn(
                  'w-full text-left p-3 rounded-lg',
                  'hover:bg-muted/80 transition-colors',
                  'group cursor-pointer'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary/70 group-hover:text-primary transition-colors">
                    {reply.icon}
                  </span>
                  <span className="font-medium text-sm">{reply.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {reply.template.substring(0, 80)}...
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
