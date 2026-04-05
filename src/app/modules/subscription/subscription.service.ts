import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import {
  ISubscription,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from './subscription.interface';
import { Subscription } from './subscription.model';

const createSubscriptionToDB = async (
  userId: string,
  payload: Omit<ISubscription, 'user'>,
): Promise<ISubscription> => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Check if transaction already exists (idempotency)
  const existingTransaction = await Subscription.findOne({
    transactionId: payload.transactionId,
  });
  if (existingTransaction) {
    throw new ApiError(StatusCodes.CONFLICT, 'Transaction already processed');
  }

  // Deactivate any previous active subscriptions for this user
  await Subscription.updateMany(
    { user: userId, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.CANCELLED },
  );

  // Create new subscription
  const subscription = await Subscription.create({
    ...payload,
    user: new Types.ObjectId(userId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // Update user's current plan
  await User.findByIdAndUpdate(userId, { plan: payload.plan });

  // Sync user plan check (simple notification logic for now as notification module wasn't found)
  // In a real scenario, you would import a Notification model or Service here

  return subscription;
};

const getMySubscriptionFromDB = async (
  userId: string,
): Promise<ISubscription | null> => {
  const subscription = await Subscription.findOne({
    user: userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  return subscription;
};

const getSubscriptionHistoryFromDB = async (
  userId: string,
): Promise<ISubscription[]> => {
  const subscriptions = await Subscription.find({ user: userId }).sort({
    createdAt: -1,
  });
  return subscriptions;
};

const checkSubscriptionStatus = async (userId: string): Promise<void> => {
  const activeSubscription = await Subscription.findOne({
    user: userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (activeSubscription && activeSubscription.expiryDate < new Date()) {
    activeSubscription.status = SUBSCRIPTION_STATUS.EXPIRED;
    await activeSubscription.save();

    // Fallback user plan to Free
    await User.findByIdAndUpdate(userId, { plan: SUBSCRIPTION_PLAN.FREE });
  }
};

export const SubscriptionService = {
  createSubscriptionToDB,
  getMySubscriptionFromDB,
  getSubscriptionHistoryFromDB,
  checkSubscriptionStatus,
};
