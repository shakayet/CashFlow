/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import Tesseract from 'tesseract.js';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { Expense } from '../expense/expense.model';
import { IOcrResult } from './scan.interface';
import { unlink } from 'fs/promises';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import fs from 'fs';
import path from 'path';

const extractAndCreateExpenseFromImage = async (
  user: JwtPayload,
  file: Express.Multer.File,
) => {
  const userId = user.id;

  // Save the uploaded file to a temporary location
  const tempFilePath = path.join(
    __dirname,
    '../../../../uploads',
    `${uuidv4()}-${file.originalname}`,
  );
  await fs.promises.writeFile(tempFilePath, file.buffer);

  // Upload the file to S3 temporarily for OCR processing
  const uploadResult = await s3Uploader.uploadFileToS3(
    tempFilePath,
    'scan-receipts',
  );

  // Delete the temporary local file
  await unlink(tempFilePath);

  if (!uploadResult || !uploadResult.url) {
    throw new Error('Failed to upload image to S3 for OCR processing.');
  }

  // Perform OCR using tesseract.js
  const {
    data: { text },
  } = await Tesseract.recognize(uploadResult.url, 'eng');

  // Parse OCR text to extract expense details
  const extractedData: IOcrResult = {
    amount: null,
    category: null,
    date: null,
    description: null,
    fileUrl: uploadResult.url,
    fileName: file.originalname,
  };

  // Improved Amount parsing logic
  const amountRegexes = [
    /(?:total|balance|due|amount|subtotal|grand\s*total)\s*[:\-\s]*[\$€£]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i, // With keywords
    /[\$€£]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i, // Currency symbol followed by amount
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:usd|eur|gbp)/i, // Amount followed by currency code
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g, // General number pattern (last resort)
  ];

  let detectedAmount: number | null = null;

  for (const regex of amountRegexes) {
    const matches = text.match(regex);
    if (matches) {
      // For the general number pattern, we might get many matches,
      // so we'll try to pick the largest one as a heuristic.
      if (regex === amountRegexes[amountRegexes.length - 1]) {
        let maxAmount = 0;
        for (const match of matches) {
          const parsed = parseFloat(match.replace(',', '.'));
          if (!isNaN(parsed) && parsed > maxAmount) {
            maxAmount = parsed;
          }
        }
        if (maxAmount > 0) {
          detectedAmount = maxAmount;
          break;
        }
      } else {
        // For more specific regexes, take the first valid amount
        const parsedAmount = parseFloat(matches[1].replace(',', '.'));
        if (!isNaN(parsedAmount)) {
          detectedAmount = parsedAmount;
          break;
        }
      }
    }
  }
  extractedData.amount = detectedAmount;

  // Improved Category detection
  const categoryKeywords: { [key: string]: string[] } = {
    Food: [
      'restaurant',
      'cafe',
      'food',
      'dine',
      'lunch',
      'dinner',
      'breakfast',
      'grocery',
    ],
    Transport: [
      'taxi',
      'uber',
      'lyft',
      'bus',
      'train',
      'subway',
      'transport',
      'fuel',
      'gas',
    ],
    Shopping: ['store', 'shop', 'retail', 'purchase', 'goods', 'market'],
    Utilities: ['electricity', 'water', 'internet', 'phone', 'utility'],
    Entertainment: ['movie', 'cinema', 'concert', 'event', 'ticket', 'leisure'],
    Travel: ['flight', 'hotel', 'travel', 'airline', 'accommodation'],
  };

  for (const category in categoryKeywords) {
    if (
      categoryKeywords[category].some(keyword =>
        text.toLowerCase().includes(keyword),
      )
    ) {
      extractedData.category = category;
      break;
    }
  }

  // Improved Date detection (supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, MM-DD-YYYY)
  const dateRegex =
    /(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/g;
  let dateMatch;
  let latestDate: Date | null = null;

  while ((dateMatch = dateRegex.exec(text)) !== null) {
    const dateString = dateMatch[0];
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      if (!latestDate || parsedDate > latestDate) {
        latestDate = parsedDate;
      }
    }
  }

  if (latestDate) {
    extractedData.date = latestDate.toISOString();
  }

  // Description can be a summary of the text or left for user input
  extractedData.description = text.substring(0, Math.min(text.length, 100)); // Take first 100 chars as description

  // Create the expense record in the database directly
  const newExpense = await Expense.create({
    user: userId,
    amount: extractedData.amount,
    category: extractedData.category,
    date: extractedData.date,
    description: extractedData.description,
    fileUrl: extractedData.fileUrl,
    fileName: extractedData.fileName,
  });

  return newExpense;
};

const updateExpenseInDB = async (
  user: JwtPayload,
  expenseId: string,
  updatedData: Partial<IOcrResult>,
) => {
  const userId = user.id;

  const expense = await Expense.findOneAndUpdate(
    { _id: expenseId, user: userId },
    updatedData,
    { new: true },
  );

  if (!expense) {
    throw new Error('Expense not found or user not authorized');
  }

  return expense;
};

export const ScanService = {
  extractAndCreateExpenseFromImage,
  updateExpenseInDB,
};
