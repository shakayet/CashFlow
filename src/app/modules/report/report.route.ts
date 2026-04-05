import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ReportController } from './report.controller';
import subscriptionGuard from '../../middlewares/subscriptionGuard';
import { SUBSCRIPTION_PLAN } from '../subscription/subscription.interface';

const router = express.Router();

router.get(
  '/pdf',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  subscriptionGuard(
    SUBSCRIPTION_PLAN.PRO_PROFESSIONAL,
    SUBSCRIPTION_PLAN.ELITE_POWER_USER,
    SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE,
  ),
  ReportController.generatePDF,
);

router.get(
  '/excel',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  subscriptionGuard(
    SUBSCRIPTION_PLAN.ELITE_POWER_USER,
    SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE,
  ),
  ReportController.generateExcel,
);

router.get(
  '/csv',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  subscriptionGuard(
    SUBSCRIPTION_PLAN.ELITE_POWER_USER,
    SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE,
  ),
  ReportController.generateCSV,
);

export const ReportRoutes = router;
