import { Attachment } from './types';
// @ts-ignore
import { read, write, utils } from 'xlsx';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
  });
};

// Safe Unicode Base64 encoding
export const utf8_to_b64 = (str: string) => {
  return window.btoa(unescape(encodeURIComponent(str)));
};

export const processFiles = async (files: FileList | null): Promise<Attachment[]> => {
  if (!files) return [];
  const attachments: Attachment[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      let mimeType = file.type || 'application/octet-stream';
      let data = '';

      if (file.name.endsWith('.json') || mimeType === 'application/json') {
        const text = await fileToText(file);
        data = utf8_to_b64(text);
        mimeType = 'application/json';
      } 
      else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await fileToArrayBuffer(file);
        const workbook = read(buffer, { type: 'array' });
        
        let extractedText = `Filename: ${file.name}\n\n`;
        workbook.SheetNames.forEach((sheetName: string) => {
           const sheet = workbook.Sheets[sheetName];
           // Convert sheet to CSV for structured text representation
           const csv = utils.sheet_to_csv(sheet);
           extractedText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        });

        data = utf8_to_b64(extractedText);
        // Send as text/plain so the model treats it as a text context
        mimeType = 'text/plain';
      } 
      else {
        data = await fileToBase64(file);
      }

      attachments.push({
        name: file.name,
        mimeType: mimeType,
        data: data,
      });
    } catch (error) {
      console.error(`Failed to process file ${file.name}`, error);
    }
  }
  return attachments;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Generation Utilities

export const generateExcelBase64 = (csvContent: string): string => {
    const wb = utils.book_new();
    // Parse CSV to sheet
    const ws = utils.csv_to_sheet(csvContent);
    utils.book_append_sheet(wb, ws, "Sheet1");
    // Write to base64 string
    const wbout = write(wb, { bookType: 'xlsx', type: 'base64' });
    return wbout;
};

export const generateWordDocBase64 = (htmlContent: string): string => {
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Document</title></head>
      <body>${htmlContent}</body>
      </html>
    `;
    return utf8_to_b64(fullHtml);
};

// --- Color & Theme Utilities ---

export const extractColorFromImage = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#14b8a6'); // Default teal if fail
        return;
      }
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      resolve(rgbToHex(r, g, b));
    };
    img.onerror = () => resolve('#14b8a6');
    img.src = imageSrc;
  });
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

// Simple tint/shade generator to create a palette from a single hex
// 500 is base. 50 is lightest, 950 is darkest.
export const generatePalette = (hex: string): Record<number, string> => {
  const rgb = hexToRgb(hex);
  if (!rgb) return {}; // fallback?

  const mix = (c1: number[], c2: number[], weight: number) => {
    const r = Math.round(c1[0] * weight + c2[0] * (1 - weight));
    const g = Math.round(c1[1] * weight + c2[1] * (1 - weight));
    const b = Math.round(c1[2] * weight + c2[2] * (1 - weight));
    return rgbToHex(r, g, b);
  };

  const white = [255, 255, 255];
  const black = [0, 0, 0];
  const base = [rgb.r, rgb.g, rgb.b];

  return {
    50: mix(white, base, 0.95),
    100: mix(white, base, 0.9),
    200: mix(white, base, 0.75),
    300: mix(white, base, 0.6),
    400: mix(white, base, 0.3),
    500: hex,
    600: mix(black, base, 0.1),
    700: mix(black, base, 0.3),
    800: mix(black, base, 0.5),
    900: mix(black, base, 0.7),
    950: mix(black, base, 0.85),
  };
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};