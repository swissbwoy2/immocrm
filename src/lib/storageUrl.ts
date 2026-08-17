import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Buckets privés : toute URL "publique" historique pointant vers ces buckets
 * doit être re-signée à l'affichage (createSignedUrl).
 */
export const PRIVATE_BUCKETS = [
  'client-documents',
  'documents_immeuble',
  'message-attachments',
] as const;

const SIGNED_TTL_SECONDS = 3600; // 1 h
const CACHE_TTL_MS = 50 * 60 * 1000; // on renouvelle avant expiration

interface CacheEntry {
  url: string;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

/** Extrait { bucket, path } d'une URL Supabase Storage (public ou signée) ou d'un chemin brut. */
export function parseStorageRef(raw: string): { bucket: string; path: string } | null {
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return null;

  const match = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }

  // Chemin relatif du type "bucket/dossier/fichier.pdf"
  if (!raw.includes('://')) {
    const bucket = PRIVATE_BUCKETS.find((b) => raw.startsWith(`${b}/`));
    if (bucket) return { bucket, path: raw.slice(bucket.length + 1) };
  }
  return null;
}

const isPrivateBucket = (bucket: string) =>
  (PRIVATE_BUCKETS as readonly string[]).includes(bucket);

/**
 * Renvoie une URL utilisable pour afficher / télécharger un fichier.
 * - Bucket privé → URL signée (avec cache mémoire).
 * - Sinon → URL d'origine inchangée.
 */
export async function resolveStorageUrl(raw?: string | null): Promise<string> {
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  const ref = parseStorageRef(raw);
  if (!ref || !isPrivateBucket(ref.bucket)) return raw;

  const key = `${ref.bucket}/${ref.path}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.url;

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const { data, error } = await supabase.storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, SIGNED_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.warn('[storageUrl] signature impossible', key, error?.message);
      return raw;
    }
    cache.set(key, { url: data.signedUrl, at: Date.now() });
    return data.signedUrl;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Hook : URL signée réactive. Retourne '' tant que la signature n'est pas prête. */
export function useSignedUrl(raw?: string | null): string {
  const [url, setUrl] = useState<string>(() => {
    if (!raw) return '';
    const ref = parseStorageRef(raw);
    return !ref || !isPrivateBucket(ref.bucket) ? raw : '';
  });

  useEffect(() => {
    let alive = true;
    if (!raw) {
      setUrl('');
      return;
    }
    const ref = parseStorageRef(raw);
    if (!ref || !isPrivateBucket(ref.bucket)) {
      setUrl(raw);
      return;
    }
    resolveStorageUrl(raw).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [raw]);

  return url;
}

/** Ouvre un fichier (bucket privé compris) dans un nouvel onglet. */
export async function openStorageFile(raw?: string | null) {
  const url = await resolveStorageUrl(raw);
  if (url) window.open(url, '_blank', 'noopener');
}

/** Télécharge un fichier (bucket privé compris). */
export async function downloadStorageFile(raw?: string | null, filename?: string) {
  const url = await resolveStorageUrl(raw);
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}
