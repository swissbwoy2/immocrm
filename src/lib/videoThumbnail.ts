// Génère une miniature JPEG (frame à ~1s) depuis un fichier vidéo.
// Renvoie un Blob JPEG ou null si la génération échoue (codec non supporté, etc.).
export async function generateVideoThumbnail(file: File, seekSeconds = 1): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => URL.revokeObjectURL(url);

      const fail = () => {
        cleanup();
        resolve(null);
      };

      video.onerror = fail;

      video.onloadedmetadata = () => {
        const target = Math.min(seekSeconds, Math.max(0, (video.duration || 1) - 0.1));
        try {
          video.currentTime = target;
        } catch {
          fail();
        }
      };

      video.onseeked = () => {
        try {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 360;
          // Limiter la taille de la miniature
          const maxDim = 720;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const tw = Math.round(w * scale);
          const th = Math.round(h * scale);

          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext("2d");
          if (!ctx) return fail();
          ctx.drawImage(video, 0, 0, tw, th);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            "image/jpeg",
            0.82,
          );
        } catch {
          fail();
        }
      };

      // Garde-fou : 10s max
      setTimeout(() => fail(), 10000);
    } catch {
      resolve(null);
    }
  });
}
