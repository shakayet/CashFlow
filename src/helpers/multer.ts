import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';

const storage = multer.memoryStorage();
const imageMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);
const ocrImageMimeTypes = new Set([
  ...imageMimeTypes,
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/tif',
  'image/tiff',
  'image/webp',
  'image/x-tiff',
]);
const ocrImageExtension = /\.(?:avif|gif|heic|heif|jpe?g|png|tiff?|webp)$/i;

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

const ocrUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    const normalizedMimeType = file.mimetype.toLowerCase();
    const hasKnownMimeType = ocrImageMimeTypes.has(normalizedMimeType);
    const hasKnownFallbackExtension =
      normalizedMimeType === 'application/octet-stream' &&
      ocrImageExtension.test(file.originalname);

    if (hasKnownMimeType || hasKnownFallbackExtension) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          'Supported image formats are JPEG, PNG, WebP, HEIC/HEIF, TIFF, GIF, and AVIF',
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

export { chatUpload, ocrUpload, upload };
