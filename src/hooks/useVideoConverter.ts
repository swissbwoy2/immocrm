import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Formats vidéo supportés nativement par les navigateurs
const BROWSER_SUPPORTED_FORMATS = ['video/mp4', 'video/webm', 'video/ogg'];

// Extensions qui nécessitent une conversion
const NEEDS_CONVERSION_EXTENSIONS = ['mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v', 'mpeg', 'mpg'];

export interface ConversionProgress {
  stage: 'loading' | 'converting' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
}

export const useVideoConverter = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const needsConversion = useCallback((file: File): boolean => {
    // Check by MIME type first
    if (BROWSER_SUPPORTED_FORMATS.includes(file.type)) {
      return false;
    }
    
    // Check by extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && NEEDS_CONVERSION_EXTENSIONS.includes(extension)) {
      return true;
    }
    
    // If it's a video but not in supported formats, convert it
    if (file.type.startsWith('video/') && !BROWSER_SUPPORTED_FORMATS.includes(file.type)) {
      return true;
    }
    
    return false;
  }, []);

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setConversionProgress({
      stage: 'loading',
      progress: 0,
      message: 'Chargement du convertisseur vidéo...'
    });

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress }) => {
      setConversionProgress({
        stage: 'converting',
        progress: Math.round(progress * 100),
        message: `Conversion en cours... ${Math.round(progress * 100)}%`
      });
    });

    // Load FFmpeg with CORS-enabled URLs
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    loadedRef.current = true;
    return ffmpeg;
  }, []);

  const convertToMp4 = useCallback(async (file: File): Promise<File> => {
    if (!needsConversion(file)) {
      return file;
    }

    setIsConverting(true);
    
    try {
      const ffmpeg = await loadFFmpeg();
      
      const inputFileName = `input_${Date.now()}.${file.name.split('.').pop()}`;
      const outputFileName = `output_${Date.now()}.mp4`;

      setConversionProgress({
        stage: 'converting',
        progress: 0,
        message: 'Préparation de la vidéo...'
      });

      // Write input file to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));

      setConversionProgress({
        stage: 'converting',
        progress: 5,
        message: 'Conversion en cours...'
      });

      // Convert to MP4 with H.264 codec for maximum compatibility
      await ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputFileName
      ]);

      // Read the output file
      const data = await ffmpeg.readFile(outputFileName);
      
      // Clean up virtual filesystem
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      // Create a new File from the converted data
      // Create a copy of the Uint8Array to ensure proper ArrayBuffer type
      const uint8Array = new Uint8Array(data as Uint8Array);
      const convertedBlob = new Blob([uint8Array], { type: 'video/mp4' });
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const convertedFile = new File([convertedBlob], `${originalName}.mp4`, { 
        type: 'video/mp4' 
      });

      setConversionProgress({
        stage: 'done',
        progress: 100,
        message: 'Conversion terminée!'
      });

      return convertedFile;
    } catch (error) {
      console.error('Video conversion error:', error);
      setConversionProgress({
        stage: 'error',
        progress: 0,
        message: 'Erreur lors de la conversion. Le fichier original sera utilisé.'
      });
      // Return original file if conversion fails
      return file;
    } finally {
      setIsConverting(false);
    }
  }, [loadFFmpeg, needsConversion]);

  const resetProgress = useCallback(() => {
    setConversionProgress(null);
  }, []);

  return {
    convertToMp4,
    isConverting,
    conversionProgress,
    needsConversion,
    resetProgress
  };
};
