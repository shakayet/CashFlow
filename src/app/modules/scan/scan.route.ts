import express from 'express';
import auth from '../../middlewares/auth';
import { ScanController } from './scan.controller';
import validateRequest from '../../middlewares/validateRequest';
// import { ENUM_USER_ROLES } from '../../../enums/user';
import { upload } from '../../../helpers/multer';
import { ScanValidation } from './scan.validation';
import { USER_ROLES } from '../../../enums/user';
import subscriptionGuard from '../../middlewares/subscriptionGuard';
import { SUBSCRIPTION_PLAN } from '../subscription/subscription.interface';

const router = express.Router();

router.post(
  '/extract-review',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  subscriptionGuard(
    SUBSCRIPTION_PLAN.BASIC_GROWTH,
    SUBSCRIPTION_PLAN.PRO_PROFESSIONAL,
    SUBSCRIPTION_PLAN.ELITE_POWER_USER,
    SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE,
  ),
  upload.single('file'), // 'file' is the field name for the uploaded image
  ScanController.extractAndCreateExpense,
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  validateRequest(ScanValidation.updateExpenseZodSchema),
  ScanController.updateExpense,
);

export const ScanRoutes = router;
