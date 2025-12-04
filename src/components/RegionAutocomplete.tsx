import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, MapPin, X } from 'lucide-react';
import { 
  searchLocations, 
  findLocation, 
  getLocationTypeIcon, 
  getLocationTypeLabel,
  Location,
  SWISS_ROMANDE_LOCATIONS
} from '@/data/swissRomandeLocations';
import { REGIONS } from '@/components/mandat/types';

interface RegionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RegionAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Tapez une région, district ou commune...",
  className,
  disabled = false
}: RegionAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Vérifier si la valeur actuelle est reconnue
  const isRecognized = value ? !!findLocation(value) : false;

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.length >= 2) {
      const results = searchLocations(newValue, 8);
      
      // Ajouter les régions prédéfinies qui correspondent
      const matchingRegions = REGIONS.filter(r => 
        r.toLowerCase().includes(newValue.toLowerCase()) &&
        !results.some(loc => loc.name === r)
      ).map(r => ({
        name: r,
        type: 'region' as const,
        aliases: [],
        coords: [0, 0] as [number, number]
      }));
      
      setSuggestions([...results, ...matchingRegions].slice(0, 10));
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  // Handle selection
  const handleSelect = (location: Location | string) => {
    const name = typeof location === 'string' ? location : location.name;
    setInputValue(name);
    onChange(name);
    setIsOpen(false);
    setSuggestions([]);
  };

  // Handle blur - save value
  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
      setIsOpen(false);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear value
  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length >= 2 && setSuggestions(searchLocations(inputValue, 8))}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-9 pr-20",
            isRecognized && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isRecognized && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              OK
            </Badge>
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
          {suggestions.map((location, index) => (
            <button
              key={`${location.name}-${index}`}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm",
                index === selectedIndex && "bg-muted"
              )}
              onClick={() => handleSelect(location)}
            >
              <span className="text-lg">{getLocationTypeIcon(location.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{location.name}</div>
                {location.parent && (
                  <div className="text-xs text-muted-foreground truncate">
                    {location.parent}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {getLocationTypeLabel(location.type)}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Quick suggestions when empty */}
      {isOpen && suggestions.length === 0 && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground">
            Aucun résultat pour "{inputValue}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Appuyez sur Entrée pour utiliser cette valeur
          </p>
        </div>
      )}
    </div>
  );
}

export default RegionAutocomplete;
