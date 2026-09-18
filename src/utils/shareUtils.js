import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { showAppAlert } from './dialog.js';

/**
 * Format a phone number for Pakistan / international WhatsApp
 * e.g., 03351234567 -> 923351234567
 * e.g., 3351234567  -> 923351234567
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    return '92' + cleaned.slice(1);
  }
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return '92' + cleaned;
  }
  return cleaned;
}

/**
 * Convert base64 data URL to a binary Blob
 */
export function dataUrlToBlob(dataUrl) {
  try {
    const parts = dataUrl.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'application/octet-stream';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('Failed to convert dataUrl to Blob', e);
    return null;
  }
}

/**
 * Share formatted text (e.g. Bill receipt, ledger balance, payment advice)
 * Handles native Android/Capacitor as well as web browsers.
 */
export async function shareBillText({ title = 'Bill Receipt', text = '', phone = '' } = {}) {
  const cleanPhone = formatWhatsAppPhone(phone);
  const isNative = Capacitor.isNativePlatform();

  // 1. If on Native Mobile (Android/iOS via Capacitor)
  if (isNative) {
    try {
      // If customer has a phone number, attempt direct WhatsApp intent first
      if (cleanPhone) {
        const directWaUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
        window.location.href = directWaUrl;
        return { success: true, method: 'whatsapp-direct' };
      }

      // If no specific phone number, open native share sheet
      await Share.share({
        title: title,
        text: text,
        dialogTitle: 'Share Bill via'
      });
      return { success: true, method: 'native-share' };
    } catch (err) {
      console.warn('Native share failed, attempting web fallback:', err);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.location.href = waUrl;
      return { success: true, method: 'wa-fallback' };
    }
  }

  // 2. Web browser environment (Mobile Chrome / Safari or Desktop)
  try {
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    // On mobile devices, window.location opens WhatsApp directly without popup blockers
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileBrowser) {
      window.location.href = waUrl;
    } else {
      window.open(waUrl, '_blank');
    }
    return { success: true, method: 'web-whatsapp' };
  } catch (err) {
    console.error('Web share failed:', err);
    return { success: false, error: err };
  }
}

/**
 * Open the native Android/device Share Sheet with text directly
 */
export async function openNativeShareSheet({ title = 'Share Bill', text = '' } = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: 'Share via'
      });
      return true;
    } catch (err) {
      console.warn('Share sheet cancelled or error:', err);
      return false;
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web share error:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Export and share a file (HD Image or PDF)
 * - On Mobile (Capacitor Native): writes file to Cache and opens Android Share Sheet with file attached.
 * - On Mobile Browser: uses navigator.share with File if supported (shares straight to WhatsApp/Files).
 * - Fallback: triggers safe Blob download link.
 */
export async function shareOrDownloadFile({
  filename,
  dataUrl,
  mimeType = 'image/jpeg',
  title = 'Receipt',
  dialogTitle = 'Share File'
}) {
  const isNative = Capacitor.isNativePlatform();

  // 1. Native Android / Capacitor App
  if (isNative) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      // Write to app cache directory
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      // Invoke native share sheet with file uri
      await Share.share({
        title: title,
        url: savedFile.uri,
        dialogTitle: dialogTitle
      });

      return { success: true, uri: savedFile.uri };
    } catch (err) {
      console.error('Native file share failed:', err);
      showAppAlert({
        title: 'Share Error',
        message: 'Could not open file sharing dialog. Please check app storage permissions.',
        type: 'warning'
      });
      return { success: false, error: err };
    }
  }

  // 2. Web / Mobile Browser Environment
  const blob = dataUrlToBlob(dataUrl);

  if (blob) {
    // Check if browser supports sharing files directly (Android Chrome & iOS Safari support this!)
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: title
        });
        return { success: true, method: 'web-share-files' };
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'user-cancelled' };
      }
      console.warn('Web file share failed, falling back to download:', shareErr);
    }

    // Standard safe Blob download fallback
    try {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      return { success: true, method: 'blob-download' };
    } catch (err) {
      console.error('Blob download failed:', err);
    }
  }

  // Final fallback: Direct dataUrl link
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, method: 'dataurl-download' };
  } catch (err) {
    console.error('Download failed:', err);
    showAppAlert({
      title: 'Download Failed',
      message: 'Failed to download or share file.',
      type: 'error'
    });
    return { success: false, error: err };
  }
}

