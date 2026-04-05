/* eslint-disable prefer-const */
/* eslint-disable no-undef */
import Tesseract from 'tesseract.js';
import {
  CATEGORY_KEYWORDS,
  EXPENSE_CATEGORIES,
  IOCRResponse,
} from './ocr.interface';

const analyzeReceipt = async (
  input: string | Buffer,
): Promise<IOCRResponse> => {
  let rawText = '';

  if (typeof input === 'string') {
    rawText = input;
  } else {
    // Perform OCR if buffer is provided
    const {
      data: { text },
    } = await Tesseract.recognize(input, 'eng');
    rawText = text;
  }

  const amount = extractAmount(rawText);
  const category = detectCategory(rawText);

  return {
    amount,
    category,
  };
};

const extractAmount = (text: string): number | null => {
  // Common total keywords
  const totalKeywords = [
    'total',
    'balance',
    'due',
    'amount',
    'subtotal',
    'grand total',
    'sum',
    'pay',
  ];
  const lines = text.split('\n');

  let potentialAmounts: number[] = [];

  // 1. Look for lines containing total keywords
  for (const line of lines) {
    const lowercaseLine = line.toLowerCase();
    if (totalKeywords.some(keyword => lowercaseLine.includes(keyword))) {
      const match = line.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
      if (match) {
        potentialAmounts.push(parseFloat(match[1].replace(',', '.')));
      }
    }
  }

  if (potentialAmounts.length > 0) {
    return Math.max(...potentialAmounts);
  }

  // 2. Fallback: Find the largest currency-like number in the entire text
  const allAmounts = text.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g);
  if (allAmounts) {
    const parsedAmounts = allAmounts
      .map(a => parseFloat(a.replace(',', '.')))
      .filter(a => !isNaN(a));

    if (parsedAmounts.length > 0) {
      return Math.max(...parsedAmounts);
    }
  }

  return null;
};

const detectCategory = (text: string): string => {
  const lowercaseText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === EXPENSE_CATEGORIES.OTHERS) continue;

    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      return category;
    }
  }

  return EXPENSE_CATEGORIES.OTHERS;
};

export const OCRService = {
  analyzeReceipt,
};
