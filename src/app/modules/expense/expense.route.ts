import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { USER_ROLES } from '../../../enums/user';
import { ExpenseController } from './expense.controller';
const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.USER),
    fileUploadHandler(),
    (req: Request, res: Response, next: NextFunction) => {
      return ExpenseController.createExpense(req, res, next);
    },
  );

export const ExpenseRoutes = router;
