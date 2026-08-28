import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import config from '../config';

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
};

const s3 = new S3Client({
  region: config.storage.s3.region,
  maxAttempts: 3,
});

const getPublicUrl = (key: string) => {
  const domain = config.storage.cloudfrontDomain;
  if (domain) {
    return `${domain}/${key}`;
  }
  const bucket = config.storage.s3.bucket;
  const region = config.storage.s3.region;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const uploadBufferToS3 = async (
  buffer: Buffer,
  originalFileName: string,
  mimetype: string,
  keyPrefix = 'chat-attachments',
) => {
  if (!originalFileName.trim()) {
    throw new Error('S3 object file name is required');
  }
  const ext = extensionByMimeType[mimetype.toLowerCase()];
  if (!ext) {
    throw new Error('S3 object content type is not supported');
  }
  const safePrefix = keyPrefix
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+/, '');
  if (!safePrefix || safePrefix.includes('..')) {
    throw new Error('S3 object prefix is invalid');
  }
  const key = `${safePrefix}/${Date.now()}-${randomUUID()}${ext}`;

  const bucket = config.storage.s3.bucket;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ServerSideEncryption: 'AES256',
    CacheControl: 'private, max-age=31536000, immutable',
  });
  await s3.send(command);
  return { key, url: getPublicUrl(key) };
};

export const s3Uploader = {
  uploadBufferToS3,
  async deleteByKey(key: string) {
    const bucket = config.storage.s3.bucket;
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
  },
};
