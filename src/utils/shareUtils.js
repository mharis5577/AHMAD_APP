import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Format a phone number for Pakistan / international WhatsApp
 * e.g., 03351234567 -> 923351234567
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    return '92' + cleaned.slice(1);
  }
  return cleaned;
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

      // If no specific phone number or direct WhatsApp is not needed, open native share sheet
      await Share.share({
        title: title,
        text: text,
        dialogTitle: 'Share Bill via'
      });
      return { success: true, method: 'native-share' };
    } catch (err) {
      console.warn('Native share failed, attempting web fallback:', err);
      // Fallback to web WhatsApp URL or location navigation
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.location.href = waUrl;
      return { success: true, method: 'wa-fallback' };
    }
  }

  // 2. Web browser environment
  try {
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    return { success: true, method: 'web-window-open' };
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
      console.warn('Web share cancelled or error:', err);
      return false;
    }
  }
  return false;
}

/**
 * Export and share a file (HD Image or PDF)
 * - On Mobile (Capacitor): writes file to Cache and opens Android Share Sheet with file attached.
 * - On Web: triggers browser download link.
 */
export async function shareOrDownloadFile({
  filename,
  dataUrl,
  mimeType = 'image/jpeg',
  title = 'Receipt',
  dialogTitle = 'Share File'
}) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Extract pure base64 without "data:...;base64," prefix
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
      alert('Could not open file sharing dialog. Please check app permissions.');
      return { success: false, error: err };
    }
  }

  // Fallback for Web Browser
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, method: 'browser-download' };
  } catch (err) {
    console.error('Browser file download failed:', err);
    alert('Failed to download file.');
    return { success: false, error: err };
  }
}
