import { useEffect, useState } from 'react';

const EVENT = 'story-dialog-open-change';
let openCount = 0;

export function setStoryDialogOpen(open: boolean) {
  openCount = Math.max(0, openCount + (open ? 1 : -1));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: openCount > 0 }));
}

export function useStoryDialogOpen() {
  const [open, setOpen] = useState(openCount > 0);
  useEffect(() => {
    const handler = (e: Event) => setOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return open;
}
