import { z } from 'zod';
import { PLATFORM, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from './subscription.interface';

const createSubscriptionZodSchema = z.object({
  body: z.object({
    plan: z.nativeEnum(SUBSCRIPTION_PLAN),
    platform: z.nativeEnum(PLATFORM),
    transactionId: z.string({ required_error: 'Transaction ID is required' }),
    purchaseToken: z.string({ required_error: 'Purchase token/receipt is required' }),
    startDate: z.string({ required_error: 'Start date is required' }).datetime(),
    expiryDate: z.string({ required_error: 'Expiry date is required' }).datetime(),
    status: z.nativeEnum(SUBSCRIPTION_STATUS).optional().default(SUBSCRIPTION_STATUS.ACTIVE),
  }),
});

export const SubscriptionValidation = {
  createSubscriptionZodSchema,
};
