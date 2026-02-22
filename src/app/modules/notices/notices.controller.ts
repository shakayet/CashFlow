import { Request, Response, Express } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NoticesService } from './notices.service';

const createNotice = catchAsync(async (req: Request, res: Response) => {
  const { ...noticeData } = req.body;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  const file =
    files?.doc?.[0] ||
    files?.document?.[0] ||
    (undefined as unknown as Express.Multer.File);
  const result = await NoticesService.createNotice(noticeData, file);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notice created successfully',
    data: result,
  });
});

const getAllNotices = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticesService.getAllNotices();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notices retrieved successfully',
    data: result,
  });
});

const deleteNotice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NoticesService.deleteNotice(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notice deleted successfully',
    data: result,
  });
});

export const NoticeController = {
  createNotice,
  getAllNotices,
  deleteNotice,
};
