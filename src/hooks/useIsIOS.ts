import { useState, useEffect } from 'react';

export function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
      const isIOSWebView = (window as any).webkit?.messageHandlers;
      
      return isIOSDevice || (isSafari && 'ontouchend' in document) || !!isIOSWebView;
    };

    setIsIOS(checkIsIOS());
  }, []);

  return isIOS;
}

// Static check for SSR or immediate use
export function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
  const isIOSWebView = (window as any).webkit?.messageHandlers;
  
  return isIOSDevice || (isSafari && 'ontouchend' in document) || !!isIOSWebView;
}
