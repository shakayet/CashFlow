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

  // Update user's current plan and expireDate
  await User.findByIdAndUpdate(userId, {
    plan: payload.plan,
    expireDate: payload.expiryDate,
  });

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

const checkSubscriptionStatus = async (
  userId: string,
): Promise<{ isPremium: boolean; plan: SUBSCRIPTION_PLAN }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const now = new Date();

  // If user is not on FREE plan but expireDate has passed, update to FREE
  if (
    user.plan !== SUBSCRIPTION_PLAN.FREE &&
    user.expireDate &&
    user.expireDate < now
  ) {
    user.plan = SUBSCRIPTION_PLAN.FREE;
    user.expireDate = undefined;
    await user.save();

    // Also update any active subscription in the Subscription model to EXPIRED
    await Subscription.updateMany(
      {
        user: userId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $lt: now },
      },
      { status: SUBSCRIPTION_STATUS.EXPIRED },
    );
  }

  const isPremium = user.plan !== SUBSCRIPTION_PLAN.FREE;

  return {
    isPremium,
    plan: user.plan,
  };
};

export const SubscriptionService = {
  createSubscriptionToDB,
  getMySubscriptionFromDB,
  getSubscriptionHistoryFromDB,
  checkSubscriptionStatus,
};
