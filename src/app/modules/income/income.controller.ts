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
      const relative =
        docFile?.filename ? `/doc/${docFile.filename}` : `/image/${imageFile.filename}`;
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

export const IncomeController = {
  createIncome,
};
