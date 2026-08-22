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

const transactionResult = async (
  transactionId: string,
  environment: Environment,
) => {
  const response = await getAppleClient(environment).getTransactionInfo(
    transactionId,
  );
  return {
    environment,
    signedTransactionInfo: response.signedTransactionInfo,
  };
};

const shouldTrySandbox = (error: unknown) =>
  error instanceof APIException &&
  (error.apiError === APIError.TRANSACTION_ID_NOT_FOUND ||
    error.httpStatusCode === StatusCodes.UNAUTHORIZED);

const throwAppleApiError = (error: unknown): never => {
  if (!(error instanceof APIException)) {
    throw error;
  }

  if (
    error.apiError === APIError.TRANSACTION_ID_NOT_FOUND ||
    error.httpStatusCode === StatusCodes.NOT_FOUND
  ) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Apple transaction was not found');
  }

  if (
    error.httpStatusCode === StatusCodes.UNAUTHORIZED ||
    error.httpStatusCode === StatusCodes.FORBIDDEN
  ) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Apple rejected the configured App Store Server API credentials',
    );
  }

  const appleMessage = error.errorMessage?.trim();
  throw new ApiError(
    StatusCodes.BAD_GATEWAY,
    appleMessage
      ? `Apple App Store Server API request failed: ${appleMessage}`
      : `Apple App Store Server API request failed (HTTP ${error.httpStatusCode})`,
  );
};

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
  // Local development and StoreKit testing use Apple's sandbox directly.
  if (config.node_env.toLowerCase() !== 'production') {
    try {
      return await transactionResult(transactionId, Environment.SANDBOX);
    } catch (error) {
      return throwAppleApiError(error);
    }
  }

  try {
    return await transactionResult(transactionId, Environment.PRODUCTION);
  } catch (productionError) {
    if (!shouldTrySandbox(productionError)) {
      return throwAppleApiError(productionError);
    }

    try {
      return await transactionResult(transactionId, Environment.SANDBOX);
    } catch (sandboxError) {
      // Preserve an actionable credential error if production authorization
      // failed and the sandbox lookup did not validate the transaction either.
      if (
        productionError instanceof APIException &&
        productionError.httpStatusCode === StatusCodes.UNAUTHORIZED
      ) {
        return throwAppleApiError(productionError);
      }
      return throwAppleApiError(sandboxError);
    }
  }
};
