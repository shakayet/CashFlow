import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionValidation } from './subscription.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(SubscriptionValidation.createSubscriptionZodSchema),
    SubscriptionController.createSubscription,
  )
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SubscriptionController.getMySubscription,
  );

router.get(
  '/check-status',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SubscriptionController.checkSubscriptionStatus,
);

router.get(
  '/history',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SubscriptionController.getSubscriptionHistory,
);

export const SubscriptionRoutes = router;
