/* eslint-disable no-undef */
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';

jest.mock('../src/helpers/s3Uploader', () => ({
  s3Uploader: {
    uploadBufferToS3: jest.fn(),
    uploadFileToS3: jest.fn(),
    deleteByKey: jest.fn(),
  },
}));

jest.mock('../src/helpers/ocr', () => ({
  recognizeImageText: jest.fn(),
  OCR_CONCURRENCY_LIMIT: 2,
}));

jest.mock('../src/app/modules/ocr/ocr.service', () => ({
  OCRService: { analyzeReceipt: jest.fn() },
}));

jest.mock('../src/app/modules/expense/expense.model', () => ({
  Expense: {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../src/app/modules/income/income.service', () => ({
  IncomeService: {
    createIncomeToDB: jest.fn(),
    updateIncomeToDB: jest.fn(),
  },
}));

jest.mock('../src/app/modules/expense/expense.service', () => ({
  ExpenseService: {
    createExpenseToDB: jest.fn(),
    updateExpenseToDB: jest.fn(),
  },
}));

import { chatUpload, upload } from '../src/helpers/multer';
import { recognizeImageText } from '../src/helpers/ocr';
import { s3Uploader } from '../src/helpers/s3Uploader';
import { ExpenseController } from '../src/app/modules/expense/expense.controller';
import { Expense } from '../src/app/modules/expense/expense.model';
import { ExpenseService } from '../src/app/modules/expense/expense.service';
import { IncomeController } from '../src/app/modules/income/income.controller';
import { IncomeService } from '../src/app/modules/income/income.service';
import { OCRService } from '../src/app/modules/ocr/ocr.service';
import { ScanService } from '../src/app/modules/scan/scan.service';
import { ScanValidation } from '../src/app/modules/scan/scan.validation';

const fileBuffer = Buffer.from('receipt');
const imageFile = {
  buffer: fileBuffer,
  originalname: 'receipt.png',
  mimetype: 'image/png',
} as Express.Multer.File;

const makeResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
};

describe('memory-backed transaction attachments', () => {
  it.each([
    {
      controller: IncomeController.createIncome,
      create: IncomeService.createIncomeToDB,
      prefix: 'income',
    },
    {
      controller: ExpenseController.createExpense,
      create: ExpenseService.createExpenseToDB,
      prefix: 'expense',
    },
  ])('uploads $prefix files from their buffers', async item => {
    const uploadBufferToS3 = s3Uploader.uploadBufferToS3 as jest.Mock;
    uploadBufferToS3.mockResolvedValue({
      key: `${item.prefix}/receipt.png`,
      url: `https://files.test/${item.prefix}/receipt.png`,
    });
    (item.create as jest.Mock).mockResolvedValue({ id: 'record-id' });

    const requestObject = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: {
        amount: 12.5,
        category: 'Food',
        date: '2026-08-26',
      },
      files: { image: [imageFile] },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;

    await item.controller(requestObject, makeResponse(), next);

    expect(next).not.toHaveBeenCalled();
    expect(uploadBufferToS3).toHaveBeenCalledWith(
      fileBuffer,
      'receipt.png',
      'image/png',
      item.prefix,
    );
    expect(item.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fileKey: `${item.prefix}/receipt.png`,
        fileUrl: `https://files.test/${item.prefix}/receipt.png`,
      }),
    );
  });

  it('removes a newly uploaded file when persistence fails', async () => {
    (s3Uploader.uploadBufferToS3 as jest.Mock).mockResolvedValue({
      key: 'income/orphan.png',
      url: 'https://files.test/income/orphan.png',
    });
    (IncomeService.createIncomeToDB as jest.Mock).mockRejectedValue(
      new Error('database unavailable'),
    );

    const next = jest.fn() as NextFunction;
    await IncomeController.createIncome(
      {
        user: { id: '507f1f77bcf86cd799439011' },
        body: { amount: 12.5, category: 'Food', date: '2026-08-26' },
        files: { image: [imageFile] },
      } as unknown as Request,
      makeResponse(),
      next,
    );

    expect(s3Uploader.deleteByKey).toHaveBeenCalledWith('income/orphan.png');
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('scan flow', () => {
  it('returns 422 without uploading when OCR misses required fields', async () => {
    (recognizeImageText as jest.Mock).mockResolvedValue('unreadable receipt');
    (OCRService.analyzeReceipt as jest.Mock).mockResolvedValue({
      amount: null,
      category: 'Others',
    });

    await expect(
      ScanService.extractAndCreateExpenseFromImage(
        { id: '507f1f77bcf86cd799439011' },
        imageFile,
      ),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(s3Uploader.uploadBufferToS3).not.toHaveBeenCalled();
    expect(s3Uploader.deleteByKey).not.toHaveBeenCalled();
  });

  it('OCRs the buffer directly and cleans S3 when database creation fails', async () => {
    (recognizeImageText as jest.Mock).mockResolvedValue(
      'Restaurant\nTotal 42.50\nDate 2026-08-26',
    );
    (OCRService.analyzeReceipt as jest.Mock).mockResolvedValue({
      amount: 42.5,
      category: 'Food',
    });
    (s3Uploader.uploadBufferToS3 as jest.Mock).mockResolvedValue({
      key: 'scan-receipts/receipt.png',
      url: 'https://files.test/scan-receipts/receipt.png',
    });
    (Expense.create as jest.Mock).mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      ScanService.extractAndCreateExpenseFromImage(
        { id: '507f1f77bcf86cd799439011' },
        imageFile,
      ),
    ).rejects.toThrow('database unavailable');

    expect(recognizeImageText).toHaveBeenCalledWith(fileBuffer);
    expect(s3Uploader.uploadBufferToS3).toHaveBeenCalledWith(
      fileBuffer,
      'receipt.png',
      'image/png',
      'scan-receipts',
    );
    expect(s3Uploader.deleteByKey).toHaveBeenCalledWith(
      'scan-receipts/receipt.png',
    );
  });

  it('validates the request body wrapper and enables Mongoose validators', async () => {
    expect(
      ScanValidation.updateExpenseZodSchema.parse({
        body: { amount: 25, date: '2026-08-26' },
      }),
    ).toBeDefined();
    expect(() =>
      ScanValidation.updateExpenseZodSchema.parse({ amount: 25 }),
    ).toThrow();

    (Expense.findOneAndUpdate as jest.Mock).mockResolvedValue({
      id: 'expense',
    });
    await ScanService.updateExpenseInDB(
      { id: '507f1f77bcf86cd799439011' },
      '507f191e810c19729de860ea',
      { amount: 25 },
    );

    expect(Expense.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: '507f191e810c19729de860ea',
        user: '507f1f77bcf86cd799439011',
      },
      { $set: { amount: 25 } },
      { new: true, runValidators: true },
    );
  });
});

describe('upload MIME policies', () => {
  const makeApp = (middleware: ReturnType<typeof upload.single>) => {
    const app = express();
    app.post('/upload', middleware, (req, res) => {
      res.status(200).json({ mimetype: req.file?.mimetype });
    });
    return app;
  };

  it('accepts PDF attachments for chat while scan/OCR remains image-only', async () => {
    await request(makeApp(chatUpload.single('file')))
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.7'), {
        filename: 'statement.pdf',
        contentType: 'application/pdf',
      })
      .expect(200, { mimetype: 'application/pdf' });

    await request(makeApp(upload.single('file')))
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.7'), {
        filename: 'statement.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });
});
