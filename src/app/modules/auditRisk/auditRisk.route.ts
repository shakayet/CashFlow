import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { AuditRiskController } from './auditRisk.controller';
import subscriptionGuard from '../../middlewares/subscriptionGuard';
import { SUBSCRIPTION_PLAN } from '../subscription/subscription.interface';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  subscriptionGuard(SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE),
  (req: Request, res: Response, next: NextFunction) => {
    return AuditRiskController.getAuditRiskCount(req, res, next);
  },
);

export const AuditRiskRoutes = router;
