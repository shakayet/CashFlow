import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';

const storage = multer.memoryStorage();
const imageMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
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
  limits: { fileSize: 5 * 1024 * 1024 },
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
