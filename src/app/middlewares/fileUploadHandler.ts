/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import ApiError from '../../errors/ApiError';

const fileUploadHandler = () => {
  const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {
    if (file.fieldname === 'image') {
      if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg'
      ) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .jpeg, .png, .jpg file supported',
          ),
        );
      }
    } else if (file.fieldname === 'media') {
      if (file.mimetype === 'video/mp4' || file.mimetype === 'audio/mpeg') {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .mp4, .mp3, file supported',
          ),
        );
      }
    } else if (file.fieldname === 'doc' || file.fieldname === 'document') {
      if (
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .pdf, .doc, .docx supported',
          ),
        );
      }
    } else {
      cb(new ApiError(StatusCodes.BAD_REQUEST, 'This file is not supported'));
    }
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: filterFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
  return upload;
};

export default fileUploadHandler;
