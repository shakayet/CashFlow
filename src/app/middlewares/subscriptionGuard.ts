import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import { SUBSCRIPTION_PLAN } from '../app/modules/subscription/subscription.interface';
import { User } from '../app/modules/user/user.model';
import { Subscription } from '../app/modules/subscription/subscription.model';

const subscriptionGuard = (...requiredPlans: SUBSCRIPTION_PLAN[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPayload = req.user as JwtPayload;
      if (!userPayload) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }

      const user = await User.findById(userPayload.id);
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
      }

      // 1. Check if user's current plan is in the required list
      // If the list is empty, any authenticated user can pass (handled by auth middleware)
      if (requiredPlans.length > 0 && !requiredPlans.includes(user.plan)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `This feature requires one of the following plans: ${requiredPlans.join(', ')}`,
        );
      }

      // 2. Double check with actual active subscription record (if not Free)
      if (user.plan !== SUBSCRIPTION_PLAN.FREE) {
        const activeSub = await Subscription.findOne({
          user: user._id,
          plan: user.plan,
          status: 'active',
          expiryDate: { $gt: new Date() },
        });

        if (!activeSub) {
          // Sync user plan if sub expired
          await User.findByIdAndUpdate(user._id, { plan: SUBSCRIPTION_PLAN.FREE });
          
          if (requiredPlans.length > 0 && !requiredPlans.includes(SUBSCRIPTION_PLAN.FREE)) {
            throw new ApiError(
              StatusCodes.FORBIDDEN,
              'Your subscription has expired. Please renew to access this feature.',
            );
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default subscriptionGuard;
