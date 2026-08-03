/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Environment,
  GetTransactionHistoryVersion,
  JWSTransactionDecodedPayload,
  NotificationHistoryRequest,
  NotificationTypeV2,
  Order,
  ProductType,
  Status,
} from '@apple/app-store-server-library';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import config from '../../../config';
import QueryBuilder from '../../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import {
  getAppleClient,
  getAppleVerifier,
  getTransactionFromApple,
} from './appleClient';
import { AppleNotification } from './appleNotification.model';
import {
  BILLING_CYCLE,
  ISubscription,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from './subscription.interface';
import { Subscription } from './subscription.model';

type ProductMapping = {
  plan: SUBSCRIPTION_PLAN;
  billingCycle: BILLING_CYCLE;
};

const productMappings = (): Record<string, ProductMapping> => {
  try {
    return JSON.parse(config.apple.productMap || '{}') as Record<
      string,
      ProductMapping
    >;
  } catch {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'APPLE_PRODUCT_MAP must be valid JSON',
    );
  }
};

const mapAppleStatus = (status?: number): SUBSCRIPTION_STATUS => {
  switch (status) {
    case Status.ACTIVE:
      return SUBSCRIPTION_STATUS.ACTIVE;
    case Status.BILLING_RETRY:
      return SUBSCRIPTION_STATUS.BILLING_RETRY;
    case Status.BILLING_GRACE_PERIOD:
      return SUBSCRIPTION_STATUS.GRACE_PERIOD;
    case Status.REVOKED:
      return SUBSCRIPTION_STATUS.REVOKED;
    default:
      return SUBSCRIPTION_STATUS.EXPIRED;
  }
};

const validateTransaction = (
  transaction: JWSTransactionDecodedPayload,
  expectedProductId?: string,
) => {
  if (
    !transaction.transactionId ||
    !transaction.originalTransactionId ||
    !transaction.productId ||
    !transaction.purchaseDate ||
    !transaction.expiresDate ||
    !transaction.environment
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Apple returned incomplete subscription transaction data',
    );
  }
  if (expectedProductId && transaction.productId !== expectedProductId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Product ID does not match');
  }
  const mapping = productMappings()[transaction.productId];
  if (!mapping) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Unsupported Apple product');
  }
  return mapping;
};

const persistTransaction = async (
  userId: string | Types.ObjectId,
  transaction: JWSTransactionDecodedPayload,
  status?: SUBSCRIPTION_STATUS,
  notificationUUID?: string,
  accessExpiresDate?: number,
) => {
  const mapping = validateTransaction(transaction);
  const owner = await Subscription.findOne({
    originalTransactionId: transaction.originalTransactionId,
  }).select('user');
  if (owner && owner.user.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'This Apple subscription belongs to another account',
    );
  }

  const computedStatus =
    status ||
    (transaction.revocationDate
      ? SUBSCRIPTION_STATUS.REVOKED
      : transaction.expiresDate! > Date.now()
        ? SUBSCRIPTION_STATUS.ACTIVE
        : SUBSCRIPTION_STATUS.EXPIRED);
  const effectiveExpiry = new Date(
    Math.max(transaction.expiresDate!, accessExpiresDate || 0),
  );

  const subscription = await Subscription.findOneAndUpdate(
    { transactionId: transaction.transactionId },
    {
      $set: {
        user: userId,
        plan: mapping.plan,
        billingCycle: mapping.billingCycle,
        originalTransactionId: transaction.originalTransactionId,
        productId: transaction.productId,
        environment: transaction.environment,
        startDate: new Date(transaction.purchaseDate!),
        expiryDate: effectiveExpiry,
        revocationDate: transaction.revocationDate
          ? new Date(transaction.revocationDate)
          : undefined,
        status: computedStatus,
        lastNotificationUUID: notificationUUID,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  const premium =
    [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(
      computedStatus,
    ) && effectiveExpiry > new Date();
  await User.findByIdAndUpdate(userId, {
    isPremium: premium,
    plan: premium ? mapping.plan : SUBSCRIPTION_PLAN.FREE,
    expireDate: premium ? effectiveExpiry : null,
  });
  return subscription;
};

const verifyPurchase = async (
  userId: string,
  payload: { transactionId: string; productId: string },
) => {
  const apple = await getTransactionFromApple(payload.transactionId);
  if (!apple.signedTransactionInfo) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      'Apple returned no transaction',
    );
  }
  const transaction = await getAppleVerifier(
    apple.environment,
  ).verifyAndDecodeTransaction(apple.signedTransactionInfo);
  if (transaction.transactionId !== payload.transactionId) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      'Apple returned a different transaction identifier',
    );
  }
  validateTransaction(transaction, payload.productId);
  const subscription = await persistTransaction(userId, transaction);
  const premium =
    subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
    subscription.expiryDate > new Date();
  return { premium, expiresAt: subscription.expiryDate };
};

const getStatus = async (userId: string) => {
  const stored = await Subscription.findOne({ user: userId })
    .sort({ expiryDate: -1 })
    .select('originalTransactionId environment expiryDate status');
  if (!stored) return { premium: false, expiresAt: null };

  const environment = stored.environment as Environment;
  const response = await getAppleClient(environment).getAllSubscriptionStatuses(
    stored.originalTransactionId,
  );
  const items = (response.data || []).flatMap(
    item => item.lastTransactions || [],
  );
  const decoded = await Promise.all(
    items
      .filter(item => item.signedTransactionInfo)
      .map(async item => {
        const verifier = getAppleVerifier(environment);
        return {
          status: item.status,
          transaction: await verifier.verifyAndDecodeTransaction(
            item.signedTransactionInfo!,
          ),
          renewal: item.signedRenewalInfo
            ? await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo)
            : undefined,
        };
      }),
  );
  const latest = decoded.sort(
    (a, b) =>
      (b.transaction.expiresDate || 0) - (a.transaction.expiresDate || 0),
  )[0];
  if (!latest) {
    await User.findByIdAndUpdate(userId, {
      isPremium: false,
      plan: SUBSCRIPTION_PLAN.FREE,
      expireDate: null,
    });
    return { premium: false, expiresAt: null };
  }
  const subscription = await persistTransaction(
    userId,
    latest.transaction,
    mapAppleStatus(latest.status),
    undefined,
    latest.renewal?.gracePeriodExpiresDate,
  );
  const premium =
    [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE_PERIOD].includes(
      subscription.status,
    ) && subscription.expiryDate > new Date();
  return { premium, expiresAt: subscription.expiryDate };
};

const fetchHistory = async (
  originalTransactionId: string,
  environment: Environment,
) => {
  const client = getAppleClient(environment);
  const verifier = getAppleVerifier(environment);
  let revision: string | null = null;
  let hasMore = false;
  const transactions: JWSTransactionDecodedPayload[] = [];
  do {
    const response = await client.getTransactionHistory(
      originalTransactionId,
      revision,
      { sort: Order.ASCENDING, productTypes: [ProductType.AUTO_RENEWABLE] },
      GetTransactionHistoryVersion.V2,
    );
    for (const signed of response.signedTransactions || []) {
      transactions.push(await verifier.verifyAndDecodeTransaction(signed));
    }
    revision = response.revision || null;
    hasMore = response.hasMore === true;
  } while (hasMore);
  return transactions;
};

const restorePurchase = async (
  userId: string,
  originalTransactionId: string,
) => {
  const apple = await getTransactionFromApple(originalTransactionId);
  const environment = apple.environment;
  const transactions = await fetchHistory(originalTransactionId, environment);
  if (!transactions.length) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'No Apple purchase history found',
    );
  }
  for (const transaction of transactions) {
    await persistTransaction(userId, transaction);
  }
  return getStatus(userId);
};

const getAppleHistory = async (userId: string) => {
  const subscription = await Subscription.findOne({ user: userId }).sort({
    expiryDate: -1,
  });
  if (!subscription) return [];
  const transactions = await fetchHistory(
    subscription.originalTransactionId,
    subscription.environment as Environment,
  );
  for (const transaction of transactions) {
    await persistTransaction(userId, transaction);
  }
  return transactions.map(transaction => ({
    purchaseDate: transaction.purchaseDate
      ? new Date(transaction.purchaseDate)
      : null,
    expiresAt: transaction.expiresDate
      ? new Date(transaction.expiresDate)
      : null,
    productId: transaction.productId,
    transactionId: transaction.transactionId,
    originalTransactionId: transaction.originalTransactionId,
    environment: transaction.environment,
    revoked: Boolean(transaction.revocationDate),
  }));
};

const processWebhook = async (signedPayload: string) => {
  let unverifiedPayload: { data?: { environment?: Environment } };
  try {
    unverifiedPayload = JSON.parse(
      Buffer.from(signedPayload.split('.')[1] || '', 'base64url').toString(),
    ) as { data?: { environment?: Environment } };
  } catch {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Malformed Apple signed payload',
    );
  }
  const environment = unverifiedPayload.data?.environment;
  if (![Environment.PRODUCTION, Environment.SANDBOX].includes(environment!)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Apple environment');
  }
  const verifier = getAppleVerifier(environment!);
  const notification =
    await verifier.verifyAndDecodeNotification(signedPayload);
  if (!notification.notificationUUID) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing notification UUID');
  }
  if (
    await AppleNotification.exists({
      notificationUUID: notification.notificationUUID,
    })
  ) {
    return { duplicate: true };
  }
  const signedTransaction = notification.data?.signedTransactionInfo;
  const transaction = signedTransaction
    ? await verifier.verifyAndDecodeTransaction(signedTransaction)
    : undefined;
  const renewal = notification.data?.signedRenewalInfo
    ? await verifier.verifyAndDecodeRenewalInfo(
        notification.data.signedRenewalInfo,
      )
    : undefined;

  if (transaction?.originalTransactionId) {
    const owner = await Subscription.findOne({
      originalTransactionId: transaction.originalTransactionId,
    }).select('user');
    if (owner) {
      let status = mapAppleStatus(notification.data?.status);
      if (notification.notificationType === NotificationTypeV2.REFUND) {
        status = SUBSCRIPTION_STATUS.REFUNDED;
      } else if (notification.notificationType === NotificationTypeV2.REVOKE) {
        status = SUBSCRIPTION_STATUS.REVOKED;
      } else if (
        notification.notificationType ===
        NotificationTypeV2.GRACE_PERIOD_EXPIRED
      ) {
        status = SUBSCRIPTION_STATUS.EXPIRED;
      }
      await persistTransaction(
        owner.user,
        transaction,
        status,
        notification.notificationUUID,
        renewal?.gracePeriodExpiresDate,
      );
    }
  }
  await AppleNotification.create({
    notificationUUID: notification.notificationUUID,
    notificationType: notification.notificationType,
    subtype: notification.subtype,
    signedDate: notification.signedDate
      ? new Date(notification.signedDate)
      : undefined,
    transactionId: transaction?.transactionId,
    originalTransactionId: transaction?.originalTransactionId,
    processedAt: new Date(),
  });
  return { duplicate: false };
};

const requestNotificationTest = (environment: Environment) =>
  getAppleClient(environment).requestTestNotification();

const getNotificationHistory = (
  environment: Environment,
  request: NotificationHistoryRequest,
  paginationToken: string | null,
) =>
  getAppleClient(environment).getNotificationHistory(paginationToken, request);

const getNotificationDetails = (notificationUUID: string) =>
  AppleNotification.findOne({ notificationUUID });

const getSubscriptionHistoryFromDB = async (
  userId: string,
  query: Record<string, any>,
): Promise<{ pagination: any; result: ISubscription[] }> => {
  const subscriptionQuery = new QueryBuilder(
    Subscription.find({ user: userId }),
    query,
  )
    .filter()
    .sort()
    .paginate();
  return {
    result: await subscriptionQuery.modelQuery,
    pagination: await subscriptionQuery.pagination(),
  };
};

export const SubscriptionService = {
  verifyPurchase,
  getStatus,
  restorePurchase,
  getAppleHistory,
  processWebhook,
  requestNotificationTest,
  getNotificationHistory,
  getNotificationDetails,
  getSubscriptionHistoryFromDB,
};
