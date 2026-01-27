import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, MapPin, X, Loader2, RefreshCw, AlertTriangle, Copy } from 'lucide-react';
import { useGoogleMapsLoader, LoaderError } from '@/hooks/useGoogleMapsLoader';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiSelect?: boolean;
  types?: string[]; // e.g., ['(regions)', 'locality', 'sublocality']
  restrictToSwitzerland?: boolean;
}

// Error messages for user feedback
const ERROR_MESSAGES: Record<LoaderError, string> = {
  token_error: "Impossible de récupérer la configuration",
  token_timeout: "Délai dépassé (configuration)",
  script_error: "Google Maps bloqué ou indisponible",
  script_timeout: "Délai dépassé (chargement)",
  auth_failure: "Clé API non autorisée pour ce domaine",
  places_missing: "Service de recherche indisponible",
};

// Map Google Places types to icons
function getPlaceTypeIcon(types: string[]): string {
  if (types.includes('administrative_area_level_1')) return '🏴';
  if (types.includes('administrative_area_level_2')) return '📍';
  if (types.includes('locality') || types.includes('sublocality')) return '🏘️';
  if (types.includes('postal_code')) return '📮';
  if (types.includes('street_address') || types.includes('route')) return '🛣️';
  return '📍';
}

function getPlaceTypeLabel(types: string[]): string {
  if (types.includes('administrative_area_level_1')) return 'Canton';
  if (types.includes('administrative_area_level_2')) return 'District';
  if (types.includes('locality')) return 'Ville';
  if (types.includes('sublocality')) return 'Quartier';
  if (types.includes('postal_code')) return 'NPA';
  if (types.includes('street_address') || types.includes('route')) return 'Rue';
  return 'Lieu';
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = "Tapez une adresse ou localité...",
  className,
  disabled = false,
  multiSelect = false,
  types = ['locality', 'sublocality', 'postal_code', 'administrative_area_level_1', 'administrative_area_level_2'],
  restrictToSwitzerland = true,
}: GooglePlacesAutocompleteProps) {
  const { isLoaded, isLoading: mapsLoading, isFallback, error, retry, getDiagnostic } = useGoogleMapsLoader();
  
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedDiagnostic, setCopiedDiagnostic] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInputRef = useRef<string>("");

  // Determine if we're in manual mode (fallback or not loaded)
  const isManualMode = isFallback || (!isLoaded && !mapsLoading);
  const errorMessage = error ? ERROR_MESSAGES[error] || "Erreur inconnue" : null;

  // Parse selected regions from comma-separated value
  const selectedRegions = value ? value.split(',').map(r => r.trim()).filter(Boolean) : [];

  // Initialize Google Places service when loaded
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      
      // Auto-fetch predictions if user already typed something while loading
      if (pendingInputRef.current.length >= 2) {
        console.log('[GooglePlacesAutocomplete] Auto-fetching predictions for pending input');
        fetchPredictions(pendingInputRef.current);
      }
    }
  }, [isLoaded]);

  // Fetch predictions from Google Places
  const fetchPredictions = useCallback(async (input: string) => {
    // Skip if in manual mode or no service
    if (isManualMode || !autocompleteServiceRef.current || !input || input.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        sessionToken: sessionTokenRef.current!,
        language: 'fr',
        ...(restrictToSwitzerland && {
          componentRestrictions: { country: 'ch' },
        }),
      };

      // Add types if specified
      if (types.length > 0) {
        request.types = types;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsSearching(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            // Filter out already selected regions
            const filtered = predictions.filter(
              p => !selectedRegions.includes(p.structured_formatting.main_text)
            );
            setSuggestions(filtered as PlacePrediction[]);
            setIsOpen(true);
            setSelectedIndex(-1);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            setIsOpen(true);
          } else {
            setSuggestions([]);
            setIsOpen(false);
          }
        }
      );
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setIsSearching(false);
      setSuggestions([]);
    }
  }, [isManualMode, restrictToSwitzerland, types, selectedRegions]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    pendingInputRef.current = newValue;

    // In manual mode, just update the input - no autocomplete
    if (isManualMode) {
      return;
    }

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  // Handle selection
  const handleSelect = (prediction: PlacePrediction) => {
    const name = prediction.structured_formatting.main_text;
    pendingInputRef.current = "";

    // Reset session token after selection
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }

    if (multiSelect) {
      if (!selectedRegions.includes(name)) {
        const newRegions = [...selectedRegions, name];
        onChange(newRegions.join(', '));
      }
      setInputValue('');
    } else {
      onChange(name);
      setInputValue(name);
    }

    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Handle manual add (for fallback mode)
  const handleManualAdd = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    if (multiSelect) {
      if (!selectedRegions.includes(trimmedValue)) {
        const newRegions = [...selectedRegions, trimmedValue];
        onChange(newRegions.join(', '));
      }
      setInputValue('');
    } else {
      onChange(trimmedValue);
    }
    pendingInputRef.current = "";
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
    // In manual mode, Enter adds the value
    if (isManualMode) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleManualAdd();
      }
      if (e.key === 'Backspace' && multiSelect && inputValue === '' && selectedRegions.length > 0) {
        handleRemoveRegion(selectedRegions[selectedRegions.length - 1]);
      }
      return;
    }

    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!multiSelect) {
          onChange(inputValue);
        } else {
          handleManualAdd();
        }
      }
      if (e.key === 'Backspace' && multiSelect && inputValue === '' && selectedRegions.length > 0) {
        handleRemoveRegion(selectedRegions[selectedRegions.length - 1]);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else if (!multiSelect) {
          onChange(inputValue);
          setIsOpen(false);
        } else {
          handleManualAdd();
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Clear all
  const handleClearAll = () => {
    onChange('');
    setInputValue('');
    pendingInputRef.current = "";
    inputRef.current?.focus();
  };

  const handleRetry = () => {
    setCopiedDiagnostic(false);
    retry();
  };

  const handleCopyDiagnostic = async () => {
    try {
      const diagnostic = getDiagnostic();
      await navigator.clipboard.writeText(diagnostic);
      setCopiedDiagnostic(true);
      setTimeout(() => setCopiedDiagnostic(false), 2000);
    } catch (err) {
      console.error('Failed to copy diagnostic:', err);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex flex-wrap items-center gap-1 min-h-10 p-1 border rounded-md bg-background",
          multiSelect && selectedRegions.length > 0 && "pb-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Selected regions as badges (multi-select mode) */}
        {multiSelect &&
          selectedRegions.map((region, index) => (
            <Badge
              key={`${region}-${index}`}
              variant="default"
              className="flex items-center gap-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              <MapPin className="h-3 w-3" />
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
          <MapPin className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4",
            isManualMode ? "text-amber-500" : "text-muted-foreground"
          )} />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => !isManualMode && inputValue.length >= 2 && fetchPredictions(inputValue)}
            onBlur={handleBlur}
            placeholder={
              multiSelect && selectedRegions.length > 0 
                ? "Ajouter une localité..." 
                : isManualMode 
                  ? "Saisie manuelle..." 
                  : placeholder
            }
            disabled={disabled}
            className={cn("pl-8 pr-8 border-0 shadow-none focus-visible:ring-0")}
          />
          {isSearching && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {mapsLoading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Status indicators */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {!multiSelect && value && !isManualMode && (
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              <Check className="h-3 w-3 mr-1" />
              OK
            </Badge>
          )}
          {multiSelect && selectedRegions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedRegions.length}
            </Badge>
          )}
          {(value || selectedRegions.length > 0) && !isSearching && !mapsLoading && (
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
      {isOpen && suggestions.length > 0 && !isManualMode && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
          {suggestions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm",
                index === selectedIndex && "bg-muted"
              )}
              onClick={() => handleSelect(prediction)}
            >
              <span className="text-lg">{getPlaceTypeIcon(prediction.types)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {prediction.structured_formatting.main_text}
                </div>
                {prediction.structured_formatting.secondary_text && (
                  <div className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {getPlaceTypeLabel(prediction.types)}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && suggestions.length === 0 && inputValue.length >= 2 && !isSearching && !isManualMode && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground">Aucun résultat pour "{inputValue}"</p>
          <p className="text-xs text-muted-foreground mt-1">
            Appuyez sur Entrée pour utiliser cette valeur
          </p>
        </div>
      )}

      {/* Manual mode helper with diagnostic */}
      {isManualMode && (
        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Mode manuel activé
              </p>
              {errorMessage && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Raison : {errorMessage}
                </p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {inputValue.length > 0 
                  ? `Appuyez sur Entrée pour ajouter "${inputValue}"`
                  : "Tapez une localité et appuyez sur Entrée"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Réessayer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyDiagnostic}
              className="h-7 text-xs"
            >
              {copiedDiagnostic ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Diagnostic
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GooglePlacesAutocomplete;
