import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture an element and export as an Ultra HD Mobile Image (JPG)
 * Using scale: 2.5 for crisp 1080px+ mobile resolution.
 */
export async function exportElementAsHdImage(element, filename = 'TheChocolateHouse_Bill.jpg') {
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return dataUrl;
  } catch (err) {
    console.error('HD Image Export failed:', err);
    alert('Failed to generate HD image. Please try again.');
  }
}

/**
 * Capture an element and export as HD PDF
 */
export async function exportElementAsHdPdf(element, filename = 'TheChocolateHouse_Bill.pdf') {
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Fit to portrait page
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, (100 * canvas.height) / canvas.width] // Dynamic mobile card aspect ratio
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 100, (100 * canvas.height) / canvas.width);
    pdf.save(filename);
  } catch (err) {
    console.error('HD PDF Export failed:', err);
    alert('Failed to generate HD PDF. Please try again.');
  }
}
