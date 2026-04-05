import { Schema, model } from 'mongoose';
import {
  ISubscription,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from './subscription.interface';

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLAN),
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate transactions
      index: true,
    },
    purchaseToken: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

// Virtual to check if subscription is currently valid based on expiry date
subscriptionSchema.virtual('isValid').get(function () {
  return this.status === SUBSCRIPTION_STATUS.ACTIVE && this.expiryDate > new Date();
});

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
