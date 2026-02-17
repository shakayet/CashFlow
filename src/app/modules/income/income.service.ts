/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
import { JwtPayload } from 'jsonwebtoken';
import { IIncome } from './income.interface';
import { Income } from './income.model';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { Types } from 'mongoose';

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

const getIncomeFromDB = async (
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
    const docs = await Income.find({
      user: userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });
    return { mode: 'detailed', data: docs };
  }
  const summary = await Income.aggregate([
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

const updateIncomeToDB = async (
  user: JwtPayload,
  id: string,
  payload: Partial<IIncome>,
) => {
  const doc = await Income.findOne({ _id: id, user: user.id });
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

const deleteIncomeFromDB = async (user: JwtPayload, id: string) => {
  const doc = await Income.findOne({ _id: id, user: user.id });
  if (!doc) {
    return null;
  }
  if (doc.fileKey) {
    try {
      await s3Uploader.deleteByKey(doc.fileKey);
    } catch {}
  }
  await Income.deleteOne({ _id: id, user: user.id });
  return { id };
};

const getIncomeHistoryFromDB = async (user: JwtPayload) => {
  const userId = user.id;
  const docs = await Income.find({ user: userId }).sort({ date: -1 });
  return docs;
};

export const IncomeService = {
  createIncomeToDB,
  getIncomeFromDB,
  updateIncomeToDB,
  deleteIncomeFromDB,
  getIncomeHistoryFromDB,
};
