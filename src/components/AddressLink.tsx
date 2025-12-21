import { MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AddressLinkProps {
  address: string;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
  showExternalIcon?: boolean;
  truncate?: boolean;
}

export function AddressLink({
  address,
  className,
  iconClassName,
  showIcon = true,
  showExternalIcon = false,
  truncate = false,
}: AddressLinkProps) {
  const openGoogleMapsDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={openGoogleMapsDirections}
            className={cn(
              "inline-flex items-start gap-2 text-left",
              "hover:text-primary transition-colors duration-200",
              "cursor-pointer group",
              className
            )}
          >
            {showIcon && (
              <MapPin className={cn(
                "w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors",
                iconClassName
              )} />
            )}
            <span className={cn(
              truncate && "line-clamp-2"
            )}>
              {address}
            </span>
            {showExternalIcon && (
              <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cliquer pour voir l'itinéraire</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
