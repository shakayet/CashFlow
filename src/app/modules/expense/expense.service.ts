import { JwtPayload } from 'jsonwebtoken';
import { IExpense } from './expense.interface';
import { Expense } from './expense.model';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { Types } from 'mongoose';

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

const getExpenseFromDB = async (
  user: JwtPayload,
  query: { month?: string; year?: string },
) => {
  const userId = user.id;
  let monthParam = query.month;
  let yearParam = query.year;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-');
    yearParam = y;
    monthParam = String(Number(m));
  }
  if (monthParam && yearParam) {
    const m = Number(monthParam);
    const y = Number(yearParam);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    const docs = await Expense.find({
      user: userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });
    return { mode: 'detailed', data: docs };
  }
  const summary = await Expense.aggregate([
    { $match: { user: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: { y: { $year: '$date' }, m: { $month: '$date' } },
        total: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.y',
        month: '$_id.m',
        total: 1,
      },
    },
    { $sort: { year: -1, month: -1 } },
  ]);
  return { mode: 'summary', data: summary };
};

const updateExpenseToDB = async (
  user: JwtPayload,
  id: string,
  payload: Partial<IExpense>,
) => {
  const doc = await Expense.findOne({ _id: id, user: user.id });
  if (!doc) {
    return null;
  }
  if (
    payload.fileUrl &&
    payload.fileKey &&
    doc.fileKey &&
    doc.fileKey !== payload.fileKey
  ) {
    try {
      await s3Uploader.deleteByKey(doc.fileKey);
    } catch {}
  }
  if (payload.amount !== undefined) doc.amount = payload.amount;
  if (payload.category !== undefined) doc.category = payload.category;
  if (payload.date !== undefined) doc.date = payload.date as any;
  if (payload.description !== undefined) doc.description = payload.description;
  if (payload.fileUrl !== undefined) doc.fileUrl = payload.fileUrl;
  if (payload.fileKey !== undefined) doc.fileKey = payload.fileKey;
  await doc.save();
  return doc;
};

const deleteExpenseFromDB = async (user: JwtPayload, id: string) => {
  const doc = await Expense.findOne({ _id: id, user: user.id });
  if (!doc) {
    return null;
  }
  if (doc.fileKey) {
    try {
      await s3Uploader.deleteByKey(doc.fileKey);
    } catch {}
  }
  await Expense.deleteOne({ _id: id, user: user.id });
  return { id };
};

const getExpenseHistoryFromDB = async (user: JwtPayload) => {
  const userId = user.id;
  const docs = await Expense.find({ user: userId }).sort({ date: -1 });
  return docs;
};

export const ExpenseService = {
  createExpenseToDB,
  getExpenseFromDB,
  updateExpenseToDB,
  deleteExpenseFromDB,
  getExpenseHistoryFromDB,
};
