import { Environment } from '@apple/app-store-server-library';
import config from '../src/config';
import { User } from '../src/app/modules/user/user.model';
import { Subscription } from '../src/app/modules/subscription/subscription.model';
import { SubscriptionService } from '../src/app/modules/subscription/subscription.service';
import * as appleClient from '../src/app/modules/subscription/appleClient';
import {
  BILLING_CYCLE,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../src/app/modules/subscription/subscription.interface';

describe('Apple purchase verification flow', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists only Apple-verified transaction fields and enables premium', async () => {
    config.apple.productMap = JSON.stringify({
      premium_monthly: {
        plan: SUBSCRIPTION_PLAN.PRO_PROFESSIONAL,
        billingCycle: BILLING_CYCLE.MONTHLY,
      },
    });
    jest.spyOn(appleClient, 'getTransactionFromApple').mockResolvedValue({
      environment: Environment.SANDBOX,
      signedTransactionInfo: 'signed-by-apple',
    });
    jest.spyOn(appleClient, 'getAppleVerifier').mockReturnValue({
      verifyAndDecodeTransaction: jest.fn().mockResolvedValue({
        transactionId: 'apple-transaction',
        originalTransactionId: 'apple-original',
        productId: 'premium_monthly',
        bundleId: 'com.example.cashflow',
        purchaseDate: Date.now() - 1000,
        expiresDate: Date.now() + 86_400_000,
        environment: Environment.SANDBOX,
      }),
    } as never);
    jest.spyOn(Subscription, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as never);
    const stored = {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiryDate: new Date(Date.now() + 86_400_000),
    };
    const save = jest
      .spyOn(Subscription, 'findOneAndUpdate')
      .mockResolvedValue(stored as never);
    const updateUser = jest
      .spyOn(User, 'findByIdAndUpdate')
      .mockResolvedValue(null);

    const result = await SubscriptionService.verifyPurchase('user-1', {
      transactionId: 'apple-transaction',
      productId: 'premium_monthly',
    });

    expect(result.premium).toBe(true);
    expect(save).toHaveBeenCalledWith(
      { transactionId: 'apple-transaction' },
      expect.objectContaining({
        $set: expect.objectContaining({
          user: 'user-1',
          originalTransactionId: 'apple-original',
          productId: 'premium_monthly',
          status: SUBSCRIPTION_STATUS.ACTIVE,
        }),
      }),
      { upsert: true, new: true, runValidators: true },
    );
    expect(updateUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ isPremium: true }),
    );
  });
});
