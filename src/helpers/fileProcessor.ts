import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export const compressImage = async (
  buffer: Buffer,
  quality: number = 80,
): Promise<Buffer> => {
  return await sharp(buffer).jpeg({ quality: quality }).toBuffer();
};

export const compressPdf = async (buffer: Buffer): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(buffer);
  // No direct compression API in pdf-lib, but we can re-save it
  // which might reduce some overhead. For more advanced compression,
  // a dedicated PDF library or service would be needed.
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
