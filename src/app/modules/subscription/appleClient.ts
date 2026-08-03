import fs from 'fs';
import path from 'path';
import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import { StatusCodes } from 'http-status-codes';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      `Apple subscription configuration is missing ${name}`,
    );
  }
  return value;
};

const readPrivateKey = () => {
  if (config.apple.privateKey) {
    return config.apple.privateKey.replace(/\\n/g, '\n');
  }
  const keyPath = required(config.apple.privateKeyPath, 'APPLE_PRIVATE_KEY');
  return fs.readFileSync(path.resolve(keyPath), 'utf8');
};

const rootCertificates = () =>
  required(config.apple.rootCertificatePaths, 'APPLE_ROOT_CERTIFICATE_PATHS')
    .split(',')
    .map(file => fs.readFileSync(path.resolve(file.trim())));

export const getAppleClient = (environment: Environment) =>
  new AppStoreServerAPIClient(
    readPrivateKey(),
    required(config.apple.keyId, 'APPLE_KEY_ID'),
    required(config.apple.issuerId, 'APPLE_ISSUER_ID'),
    required(config.apple.bundleId, 'APPLE_BUNDLE_ID'),
    environment,
  );

export const getAppleVerifier = (environment: Environment) =>
  new SignedDataVerifier(
    rootCertificates(),
    true,
    environment,
    required(config.apple.bundleId, 'APPLE_BUNDLE_ID'),
    environment === Environment.PRODUCTION
      ? Number(required(config.apple.appAppleId, 'APPLE_APP_ID'))
      : undefined,
  );

export const getTransactionFromApple = async (transactionId: string) => {
  try {
    const response = await getAppleClient(
      Environment.PRODUCTION,
    ).getTransactionInfo(transactionId);
    return {
      environment: Environment.PRODUCTION,
      signedTransactionInfo: response.signedTransactionInfo,
    };
  } catch (error) {
    if (
      !(error instanceof APIException) ||
      error.apiError !== APIError.TRANSACTION_ID_NOT_FOUND
    ) {
      throw error;
    }
    const response = await getAppleClient(
      Environment.SANDBOX,
    ).getTransactionInfo(transactionId);
    return {
      environment: Environment.SANDBOX,
      signedTransactionInfo: response.signedTransactionInfo,
    };
  }
};
