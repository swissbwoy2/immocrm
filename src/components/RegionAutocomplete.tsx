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
} from '@/data/swissRomandeLocations';
import { REGIONS } from '@/components/mandat/types';

interface RegionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiSelect?: boolean;
}

export function RegionAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Tapez une région, district ou commune...",
  className,
  disabled = false,
  multiSelect = false
}: RegionAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse selected regions from comma-separated value
  const selectedRegions = value ? value.split(',').map(r => r.trim()).filter(Boolean) : [];

  // Check if a region is recognized
  const isRegionRecognized = (region: string) => !!findLocation(region);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.length >= 2) {
      const results = searchLocations(newValue, 8);
      
      // Add predefined regions that match
      const matchingRegions = REGIONS.filter(r => 
        r.toLowerCase().includes(newValue.toLowerCase()) &&
        !results.some(loc => loc.name === r) &&
        !selectedRegions.includes(r)
      ).map(r => ({
        name: r,
        type: 'region' as const,
        aliases: [],
        coords: [0, 0] as [number, number]
      }));
      
      // Filter out already selected regions
      const filteredResults = [...results, ...matchingRegions]
        .filter(loc => !selectedRegions.includes(loc.name))
        .slice(0, 10);
      
      setSuggestions(filteredResults);
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
    
    if (multiSelect) {
      // Add to existing selections
      if (!selectedRegions.includes(name)) {
        const newRegions = [...selectedRegions, name];
        onChange(newRegions.join(', '));
      }
      setInputValue('');
    } else {
      // Single selection mode
      onChange(name);
      setInputValue(name);
    }
    
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Remove a selected region (multi-select mode)
  const handleRemoveRegion = (region: string) => {
    const newRegions = selectedRegions.filter(r => r !== region);
    onChange(newRegions.join(', '));
  };

  // Handle blur
  const handleBlur = () => {
    setTimeout(() => {
      if (!multiSelect && inputValue !== value) {
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
        if (!multiSelect) {
          onChange(inputValue);
        }
      }
      // Handle backspace to remove last region in multi-select
      if (e.key === 'Backspace' && multiSelect && inputValue === '' && selectedRegions.length > 0) {
        handleRemoveRegion(selectedRegions[selectedRegions.length - 1]);
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
        } else if (!multiSelect) {
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

  // Sync input value with prop for single select mode
  useEffect(() => {
    if (!multiSelect) {
      setInputValue(value || '');
    }
  }, [value, multiSelect]);

  // Clear all
  const handleClearAll = () => {
    onChange('');
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={cn(
        "relative flex flex-wrap items-center gap-1 min-h-10 p-1 border rounded-md bg-background",
        multiSelect && selectedRegions.length > 0 && "pb-1",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        {/* Selected regions as badges (multi-select mode) */}
        {multiSelect && selectedRegions.map((region, index) => (
          <Badge 
            key={`${region}-${index}`}
            variant={isRegionRecognized(region) ? "default" : "secondary"}
            className={cn(
              "flex items-center gap-1 text-xs",
              isRegionRecognized(region) 
                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className="text-sm">{getLocationTypeIcon(findLocation(region)?.type || 'region')}</span>
            {region}
            <button
              type="button"
              onClick={() => handleRemoveRegion(region)}
              className="ml-1 hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        {/* Input field */}
        <div className="relative flex-1 min-w-[150px]">
          <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && setSuggestions(searchLocations(inputValue, 8))}
            onBlur={handleBlur}
            placeholder={multiSelect && selectedRegions.length > 0 ? "Ajouter une région..." : placeholder}
            disabled={disabled}
            className={cn(
              "pl-8 pr-8 border-0 shadow-none focus-visible:ring-0",
              !multiSelect && isRegionRecognized(value) && "text-green-700"
            )}
          />
        </div>

        {/* Status indicators */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {!multiSelect && value && isRegionRecognized(value) && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              OK
            </Badge>
          )}
          {multiSelect && selectedRegions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedRegions.filter(isRegionRecognized).length}/{selectedRegions.length}
            </Badge>
          )}
          {(value || selectedRegions.length > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:bg-muted rounded"
              disabled={disabled}
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

      {/* No results message */}
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
