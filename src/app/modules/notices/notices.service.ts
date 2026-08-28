import { Express } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { INotice } from './notices.interface';
import { Notice } from './notices.model';

import QueryBuilder from '../../../builder/QueryBuilder';
import { errorContext, errorLogger } from '../../../shared/logger';

const createNotice = async (
  payload: Partial<INotice>,
  file: Express.Multer.File,
): Promise<INotice | null> => {
  if (!file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please upload a notice');
  }

  const { buffer, originalname, mimetype } = file;

  let uploadKey: string | undefined;
  try {
    const uploadResult = await s3Uploader.uploadBufferToS3(
      buffer,
      originalname,
      mimetype,
      'notices',
    );
    uploadKey = uploadResult.key;
    payload.document = uploadResult.url;
    payload.documentKey = uploadResult.key;
  } catch (error) {
    errorLogger.error('Notice upload failed', errorContext(error));
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to upload notice.',
    );
  }

  try {
    return await Notice.create(payload);
  } catch (error) {
    if (uploadKey) {
      await s3Uploader.deleteByKey(uploadKey).catch(cleanupError => {
        errorLogger.error('Notice upload cleanup failed', {
          key: uploadKey,
          ...errorContext(cleanupError),
        });
      });
    }
    throw error;
  }
};

const getAllNotices = async (query: Record<string, unknown>) => {
  const noticeQuery = new QueryBuilder(Notice.find({}), query)
    .filter(['type'])
    .sort(['createdAt', 'type'])
    .paginate();

  const result = await noticeQuery.modelQuery;
  const pagination = await noticeQuery.pagination();

  return { result, pagination };
};

const deleteNotice = async (id: string): Promise<INotice | null> => {
  const isExistNotice =
    await Notice.findByIdAndDelete(id).select('+documentKey');
  if (!isExistNotice) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notice doesn't exist!");
  }

  const lastSegment = isExistNotice.document.split('/').pop();
  const key =
    isExistNotice.documentKey ||
    (lastSegment ? `notices/${lastSegment}` : undefined);
  if (key) {
    await s3Uploader.deleteByKey(key).catch(error => {
      errorLogger.error('Notice object deletion failed', {
        key,
        ...errorContext(error),
      });
    });
  }
  return isExistNotice;
};

export const NoticesService = {
  createNotice,
  getAllNotices,
  deleteNotice,
};
