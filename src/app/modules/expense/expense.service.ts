import { JwtPayload } from 'jsonwebtoken';
import { IExpense } from './expense.interface';
import { Expense } from './expense.model';

const createExpenseToDB = async (
  user: JwtPayload,
  payload: Omit<IExpense, 'user'>,
) => {
  const doc = await Expense.create({
    user: user.id,
    amount: payload.amount,
    category: payload.category,
    date: payload.date,
    description: payload.description,
    fileUrl: payload.fileUrl,
    fileKey: payload.fileKey,
  });
  return doc;
};

export const ExpenseService = {
  createExpenseToDB,
};
