import { JwtPayload } from 'jsonwebtoken';
import { IIncome } from './income.interface';
import { Income } from './income.model';

const createIncomeToDB = async (
  user: JwtPayload,
  payload: Omit<IIncome, 'user'>,
) => {
  const doc = await Income.create({
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

export const IncomeService = {
  createIncomeToDB,
};
