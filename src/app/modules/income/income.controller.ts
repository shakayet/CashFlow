/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import unlinkFile from '../../../shared/unlinkFile';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { IncomeService } from './income.service';
import { IncomeValidation } from './income.validation';

const createIncome = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;

    let bodyData = req.body;
    if (req.body.data) {
      bodyData = IncomeValidation.createIncomeZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }

    const { amount, category, date, description } = bodyData;

    let fileUrl: string | undefined;
    let fileKey: string | undefined;

    const files = req.files as any;
    const docFile = files?.doc?.[0];
    const imageFile = files?.image?.[0];
    const selectedFile = docFile || imageFile;

    if (selectedFile?.path) {
      const { url, key } = await s3Uploader.uploadFileToS3(
        selectedFile.path as string,
        'income',
      );
      fileUrl = url;
      fileKey = key;
      const relative = docFile?.filename
        ? `/doc/${docFile.filename}`
        : `/image/${imageFile.filename}`;
      unlinkFile(relative);
    }

    const result = await IncomeService.createIncomeToDB(user, {
      amount: Number(amount),
      category,
      date: new Date(date),
      description,
      fileUrl,
      fileKey,
    });

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Income recorded successfully',
      data: result,
    });
  },
);

const getIncomes = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { month, year } = req.query as Record<string, string | undefined>;
  const result = await IncomeService.getIncomeFromDB(user, { month, year });
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      result.mode === 'detailed'
        ? 'Income list retrieved successfully'
        : 'Monthly income summary retrieved successfully',
    data: result.data as any,
  });
});

const updateIncome = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const { id } = req.params as any;

    let bodyData = req.body;
    if (req.body.data) {
      bodyData = IncomeValidation.updateIncomeZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }

    let uploadUrl: string | undefined;
    let uploadKey: string | undefined;
    const files = req.files as any;
    const docFile = files?.doc?.[0];
    const imageFile = files?.image?.[0];
    const selectedFile = docFile || imageFile;
    if (selectedFile?.path) {
      const { url, key } = await s3Uploader.uploadFileToS3(
        selectedFile.path as string,
        'income',
      );
      uploadUrl = url;
      uploadKey = key;
      const relative = docFile?.filename
        ? `/doc/${docFile.filename}`
        : `/image/${imageFile.filename}`;
      unlinkFile(relative);
    }

    const payload: any = { ...bodyData };
    if (payload.amount !== undefined) payload.amount = Number(payload.amount);
    if (payload.date !== undefined) payload.date = new Date(payload.date);
    if (uploadUrl && uploadKey) {
      payload.fileUrl = uploadUrl;
      payload.fileKey = uploadKey;
    }

    const result = await IncomeService.updateIncomeToDB(user, id, payload);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Income updated successfully',
      data: result,
    });
  },
);

const deleteIncome = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params as any;
  const result = await IncomeService.deleteIncomeFromDB(user, id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Income deleted successfully',
    data: result,
  });
});

const getIncomeHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await IncomeService.getIncomeHistoryFromDB(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Income history retrieved successfully',
    data: result,
  });
});

export const IncomeController = {
  createIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
  getIncomeHistory,
};
