import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { OAuthRoutes } from '../app/modules/passport/oauth.route';
import { IncomeRoutes } from '../app/modules/income/income.route';
import { ExpenseRoutes } from '../app/modules/expense/expense.route';
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
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
