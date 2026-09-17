import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { showAppAlert } from './dialog';

/**
 * Capture an element and export as an Ultra HD Mobile Image (JPG)
 */
export async function exportElementAsHdImage(element, filename = 'TheChocolateHouse_Bill.jpg') {
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0
    });

    if (Capacitor.isNativePlatform()) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Save / Share Image'
      });
    } else {
      // Direct reliable browser download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 500);
    }
    return true;
  } catch (err) {
    console.error('HD Image Export failed:', err);
    showAppAlert({
      title: 'Export Failed',
      message: 'Failed to generate HD image. Please try again.',
      type: 'error'
    });
  }
}

/**
 * Capture an element and export as HD PDF with guaranteed download
 */
export async function exportElementAsHdPdf(element, filename = 'TheChocolateHouse_Statement.pdf') {
  if (!element) {
    showAppAlert({
      title: 'Export Error',
      message: 'Could not find document content to export as PDF.',
      type: 'warning'
    });
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas render width or height is 0');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Fit to standard A4 page (210mm wide x 297mm high)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    if (Capacitor.isNativePlatform()) {
      // Native Android: write to cache and trigger Android native share sheet
      const base64Data = pdf.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Save / Share PDF Statement'
      });
    } else {
      // Web / Browser: Direct instant file download using jsPDF native save
      pdf.save(filename);
    }
    return true;
  } catch (err) {
    console.error('HD PDF Export failed:', err);
    showAppAlert({
      title: 'PDF Export Failed',
      message: 'Failed to generate PDF: ' + (err?.message || 'Please try again.'),
      type: 'error'
    });
  }
}
