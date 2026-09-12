// Traitements média CÔTÉ CLIENT (voir docs/architecture.md § Traitements média) : le Pi qui
// héberge PocketBase ne doit pas faire de conversion. Tout se passe ici, dans le navigateur de
// l'auteur, avant l'upload.

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfjsReady: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsReady) {
    pdfjsReady = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return mod;
    });
  }
  return pdfjsReady;
}

export interface PdfPage {
  blob: Blob;
  width: number;
  height: number;
}

/** Rasterise chaque page d'un PDF en WebP, dans le navigateur (pas sur le backend). */
export async function renderPdfToPages(
  file: File,
  opts: { scale?: number; quality?: number } = {}
): Promise<PdfPage[]> {
  const scale = opts.scale ?? 2;
  const quality = opts.quality ?? 0.85;
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const pages: PdfPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Contexte canvas indisponible");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) throw new Error(`Échec de rendu de la page ${i}`);
    pages.push({ blob, width: canvas.width, height: canvas.height });
  }
  return pages;
}

export interface VideoMeta {
  duration: number;
  width: number;
  height: number;
  bitrateMbps: number;
}

/** Lit durée/résolution d'une vidéo sans l'uploader, pour donner un retour à l'auteur. */
export function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const bitrateMbps = duration > 0 ? (file.size * 8) / duration / 1_000_000 : 0;
      resolve({ duration, width: video.videoWidth, height: video.videoHeight, bitrateMbps });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Vidéo illisible par le navigateur"));
    };
  });
}

/** Capture une image (WebP) à `atSeconds` dans la vidéo, pour servir de vignette. */
export function captureVideoThumbnail(file: File, atSeconds = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(atSeconds, Math.max(0, video.duration - 0.05));
    });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Contexte canvas indisponible"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (b) => {
          cleanup();
          b ? resolve(b) : reject(new Error("Capture de vignette échouée"));
        },
        "image/webp",
        0.85
      );
    });
    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Vidéo illisible par le navigateur"));
    });
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
