/**
 * Utility for downloading or sharing PDFs across Desktop and Mobile (especially iOS/Safari)
 */

export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function canSharePdfFile(file: File): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    return (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

/**
 * Downloads a PDF file on desktop or triggers the native iOS Share Sheet ("Save to Files" / AirDrop / WhatsApp)
 * on iOS mobile devices where standard blob downloads are restricted.
 */
export async function downloadOrSharePdf(
  fileOrBlob: Blob | File,
  filename: string
): Promise<void> {
  const isIOS = isIosDevice();
  const file =
    fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], filename, { type: "application/pdf" });

  // 1. On iOS: Use Web Share API if supported
  // iOS Safari ignores the download attribute on blob URLs and opens a preview tab with no download button.
  // The Web Share API opens the native iOS Share Sheet with "Save to Files" (Simpan ke File) and WhatsApp.
  if (isIOS && canSharePdfFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });
      return;
    } catch (err: unknown) {
      const shareError = err as { name?: string };
      if (shareError?.name === "AbortError") {
        // User tapped cancel/close on the iOS share sheet; do not fallback or error
        return;
      }
      console.warn("navigator.share on iOS failed, falling back to download link:", err);
    }
  }

  // 2. Desktop (Windows / macOS / Linux) & Android devices, or iOS fallback:
  // Standard anchor download to save the PDF directly to device storage.
  try {
    const blobUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";

    if (isIOS) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 4000);
  } catch (err) {
    console.error("Direct download failed, falling back to window.open:", err);
    const blobUrl = URL.createObjectURL(file);
    window.open(blobUrl, "_blank");
  }
}
