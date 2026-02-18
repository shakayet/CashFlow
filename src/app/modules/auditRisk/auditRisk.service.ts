import { JwtPayload } from 'jsonwebtoken';
import { Income } from '../income/income.model';
import { Expense } from '../expense/expense.model';

const getAuditRiskCountFromDB = async (user: JwtPayload) => {
  const userId = user.id;

  const incomeRiskyRecords = await Income.countDocuments({
    user: userId,
    $or: [{ fileUrl: { $exists: false } }, { fileUrl: null }, { fileUrl: '' }],
  });

  const expenseRiskyRecords = await Expense.countDocuments({
    user: userId,
    $or: [{ fileUrl: { $exists: false } }, { fileUrl: null }, { fileUrl: '' }],
  });

  const totalRiskyRecords = incomeRiskyRecords + expenseRiskyRecords;

  return { count: totalRiskyRecords };
};

export const AuditRiskService = {
  getAuditRiskCountFromDB,
};
