/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';
import { SUBSCRIPTION_PLAN } from '../subscription/subscription.interface';

export type IUser = {
  name: string;
  role: USER_ROLES;
  contact: string;
  email: string;
  password: string;
  image?: string;
  avatar?: string;
  status: 'active' | 'block';
  plan: SUBSCRIPTION_PLAN;
  expireDate?: Date;
  verified: boolean;
  provider?: 'local' | 'google' | 'facebook' | 'github';
  providerId?: string;
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
