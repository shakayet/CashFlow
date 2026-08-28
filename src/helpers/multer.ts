import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';

const storage = multer.memoryStorage();
const imageMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    if (imageMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          'Only JPEG and PNG images are allowed',
        ),
      );
    }
  },
});

const chatUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    if (
      imageMimeTypes.has(file.mimetype) ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          'Only JPEG, PNG, and PDF files are allowed',
        ),
      );
    }
  },
});

export { chatUpload, upload };
