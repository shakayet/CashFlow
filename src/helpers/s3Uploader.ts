import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import config from '../config';

const s3 = new S3Client({
  region: config.storage.s3.region as string,
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

const uploadFileToS3 = async (localFilePath: string, keyPrefix = 'income') => {
  const fileBuffer = fs.readFileSync(localFilePath);
  const ext = path.extname(localFilePath);
  const base = path.basename(localFilePath);
  const contentType =
    (mime.lookup(ext) as string) || 'application/octet-stream';
  const key = `${keyPrefix}/${Date.now()}-${base}`;

  const bucket = config.storage.s3.bucket as string;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });
  await s3.send(command);
  return { key, url: getPublicUrl(key) };
};

export const s3Uploader = {
  uploadFileToS3,
  async deleteByKey(key: string) {
    const bucket = config.storage.s3.bucket as string;
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
  },
};
