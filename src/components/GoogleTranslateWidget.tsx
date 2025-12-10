import { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

interface GoogleTranslateWidgetProps {
  className?: string;
}

export function GoogleTranslateWidget({ className = '' }: GoogleTranslateWidgetProps) {
  useEffect(() => {
    // Prevent multiple initializations
    if (document.getElementById('google-translate-script')) {
      return;
    }

    // Define the initialization function
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'fr',
          includedLanguages: '', // Empty = all languages (130+)
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    // Load Google Translate script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      const existingScript = document.getElementById('google-translate-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div 
      id="google_translate_element" 
      className={`google-translate-widget ${className}`}
    />
  );
}
