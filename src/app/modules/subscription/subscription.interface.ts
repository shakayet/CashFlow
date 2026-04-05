/* eslint-disable no-unused-vars */
import { Types } from 'mongoose';

export enum SUBSCRIPTION_PLAN {
  FREE = 'Free',
  BASIC_GROWTH = 'Basic-Growth',
  PRO_PROFESSIONAL = 'Pro-Professional',
  ELITE_POWER_USER = 'Elite-Power User',
  SHIELD_AUDIT_DEFENSE = 'CashFlowIQ Shield-Audit Defense',
}

export enum SUBSCRIPTION_STATUS {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PLATFORM {
  IOS = 'ios',
  ANDROID = 'android',
}

export type ISubscription = {
  user: Types.ObjectId;
  plan: SUBSCRIPTION_PLAN;
  platform: PLATFORM;
  transactionId: string;
  purchaseToken: string; // receipt/token
  startDate: Date;
  expiryDate: Date;
  status: SUBSCRIPTION_STATUS;
};
