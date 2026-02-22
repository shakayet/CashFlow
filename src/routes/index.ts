import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { OAuthRoutes } from '../app/modules/passport/oauth.route';
import { IncomeRoutes } from '../app/modules/income/income.route';
import { ExpenseRoutes } from '../app/modules/expense/expense.route';
import { AuditRiskRoutes } from '../app/modules/auditRisk/auditRisk.route';
import { ScanRoutes } from '../app/modules/scan/scan.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { TermsAndConditionsRoutes } from '../app/modules/termsAndConditions/termsAndConditions.route';
import { PrivacyPolicyRoutes } from '../app/modules/privacyPolicy/privacyPolicy.route';
import { NoticeRoutes } from '../app/modules/notices/notices.route';

const router = express.Router();

const apiRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/oauth',
    route: OAuthRoutes,
  },
  {
    path: '/income',
    route: IncomeRoutes,
  },
  {
    path: '/expense',
    route: ExpenseRoutes,
  },
  {
    path: '/audit-risk',
    route: AuditRiskRoutes,
  },
  {
    path: '/scan',
    route: ScanRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/terms-and-conditions',
    route: TermsAndConditionsRoutes,
  },
  {
    path: '/privacy-policy',
    route: PrivacyPolicyRoutes,
  },
  {
    path: '/notices',
    route: NoticeRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
