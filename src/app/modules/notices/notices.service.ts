/* eslint-disable no-console */
import { Express } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { INotice } from './notices.interface';
import { Notice } from './notices.model';

const createNotice = async (
  payload: Partial<INotice>,
  file: Express.Multer.File,
): Promise<INotice | null> => {
  if (!file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please upload a notice');
  }

  const { buffer, originalname, mimetype } = file;

  try {
    const uploadResult = await s3Uploader.uploadBufferToS3(
      buffer,
      originalname,
      mimetype,
      'notices',
    );
    payload.document = uploadResult.url;
  } catch (error) {
    console.error('Error uploading notice to S3:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to upload notice.',
    );
  }

  const result = await Notice.create(payload);
  return result;
};

const getAllNotices = async (): Promise<INotice[]> => {
  const result = await Notice.find({});
  return result;
};

const deleteNotice = async (id: string): Promise<INotice | null> => {
  const isExistNotice = await Notice.findById(id);
  if (!isExistNotice) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notice doesn't exist!");
  }

  try {
    const lastSegment = isExistNotice.document.split('/').pop();
    if (lastSegment) {
      await s3Uploader.deleteByKey(`notices/${lastSegment}`);
    }
  } catch (error) {
    console.error('Error deleting notice from S3:', error);
  }

  const result = await Notice.findByIdAndDelete(id);
  return result;
};

export const NoticesService = {
  createNotice,
  getAllNotices,
  deleteNotice,
};
