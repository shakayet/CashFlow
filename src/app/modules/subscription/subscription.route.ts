import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionValidation } from './subscription.validation';

const router = express.Router();
const authenticated = auth(
  USER_ROLES.USER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
);
const admin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);

router.post(
  '/verify',
  authenticated,
  validateRequest(SubscriptionValidation.verifyPurchase),
  SubscriptionController.verifyPurchase,
);
router.get('/status', authenticated, SubscriptionController.getStatus);
router.post(
  '/restore',
  authenticated,
  validateRequest(SubscriptionValidation.restorePurchase),
  SubscriptionController.restorePurchase,
);
router.get('/history', authenticated, SubscriptionController.getHistory);
router.post(
  '/notifications/test',
  admin,
  validateRequest(SubscriptionValidation.notificationTest),
  SubscriptionController.notificationTest,
);
router.post(
  '/notifications/history',
  admin,
  validateRequest(SubscriptionValidation.notificationHistory),
  SubscriptionController.notificationHistory,
);
router.get(
  '/notifications/history/:notificationId',
  admin,
  SubscriptionController.notificationDetails,
);

const appleWebhookRouter = express.Router();
appleWebhookRouter.post(
  '/webhook',
  validateRequest(SubscriptionValidation.webhook),
  SubscriptionController.webhook,
);

export const SubscriptionRoutes = router;
export const AppleWebhookRoutes = appleWebhookRouter;
