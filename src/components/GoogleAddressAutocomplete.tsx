import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, RefreshCw, AlertTriangle, Copy, Check } from "lucide-react";
import { useGoogleMapsLoader, LoaderError, LoaderStage } from "@/hooks/useGoogleMapsLoader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface AddressComponents {
  fullAddress: string;
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  canton: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: AddressComponents) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  restrictToSwitzerland?: boolean;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
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

export function GoogleAddressAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = "Commencez à taper une adresse...",
  className,
  disabled = false,
  restrictToSwitzerland = true,
}: GoogleAddressAutocompleteProps) {
  const { isLoaded, isLoading: mapsLoading, isFallback, error, stage, retry, getDiagnostic } = useGoogleMapsLoader();
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedDiagnostic, setCopiedDiagnostic] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInputRef = useRef<string>("");

  // Initialize services
  useEffect(() => {
    if (isLoaded && !isFallback && window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      
      // Auto-fetch predictions if user already typed something while loading
      if (pendingInputRef.current.length >= 3) {
        console.log('[GoogleAddressAutocomplete] Auto-fetching predictions for pending input');
        fetchPredictions(pendingInputRef.current);
      }
    }
  }, [isLoaded, isFallback]);

  // Sync input value with prop
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || !autocompleteServiceRef.current || !isLoaded || isFallback) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        sessionToken: sessionTokenRef.current || undefined,
        types: ["address"],
        ...(restrictToSwitzerland && {
          componentRestrictions: { country: "ch" },
        }),
      };

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions as PlacePrediction[]);
            setIsOpen(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setIsSearching(false);
      setSuggestions([]);
    }
  }, [isLoaded, isFallback, restrictToSwitzerland]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    pendingInputRef.current = newValue;
    onInputChange?.(newValue);
    setSelectedIndex(-1);

    // Debounce the API call
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newValue.length >= 3 && isLoaded && !isFallback) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const getPlaceDetails = (placeId: string): Promise<AddressComponents> => {
    return new Promise((resolve) => {
      if (!placesServiceRef.current) {
        resolve({
          fullAddress: inputValue,
          street: "",
          streetNumber: "",
          postalCode: "",
          city: "",
          canton: "",
          country: "",
          latitude: null,
          longitude: null,
        });
        return;
      }

      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: ["address_components", "formatted_address", "geometry"],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (place, status) => {
          // Reset session token after getting details
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

          if (status === google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
            const components = place.address_components;
            
            const getComponent = (types: string[]) => {
              const comp = components.find((c) =>
                types.some((t) => c.types.includes(t))
              );
              return comp?.long_name || "";
            };

            // Extract coordinates from geometry
            const lat = place.geometry?.location?.lat() || null;
            const lng = place.geometry?.location?.lng() || null;

            resolve({
              fullAddress: place.formatted_address || inputValue,
              street: getComponent(["route"]),
              streetNumber: getComponent(["street_number"]),
              postalCode: getComponent(["postal_code"]),
              city: getComponent(["locality", "political"]),
              canton: getComponent(["administrative_area_level_1"]),
              country: getComponent(["country"]),
              latitude: lat,
              longitude: lng,
            });
          } else {
            resolve({
              fullAddress: inputValue,
              street: "",
              streetNumber: "",
              postalCode: "",
              city: "",
              canton: "",
              country: "",
              latitude: null,
              longitude: null,
            });
          }
        }
      );
    });
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    setInputValue(prediction.description);
    pendingInputRef.current = "";
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);

    const addressComponents = await getPlaceDetails(prediction.place_id);
    onChange(addressComponents);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    // Delay closing to allow click on suggestion
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
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

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const showFallbackMode = isFallback || (!isLoaded && !mapsLoading);
  const errorMessage = error ? ERROR_MESSAGES[error] || "Erreur inconnue" : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
          showFallbackMode ? "text-amber-500" : "text-muted-foreground"
        )} />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={showFallbackMode ? "Saisie manuelle de l'adresse..." : placeholder}
          disabled={disabled}
          className={cn("pl-10 pr-10", className)}
        />
        {(isSearching || mapsLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-start gap-2",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">
                  {suggestion.structured_formatting.main_text}
                </span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.structured_formatting.secondary_text}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fallback mode with diagnostic info */}
      {showFallbackMode && (
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
                Entrez l'adresse complète avec le code postal manuellement.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="h-7 text-xs bg-white dark:bg-gray-800"
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
                  Copier diagnostic
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
