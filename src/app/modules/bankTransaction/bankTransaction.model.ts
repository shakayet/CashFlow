import { Schema, model } from 'mongoose';
import { IBankTransaction } from './bankTransaction.interface';

const bankTransactionSchema = new Schema<IBankTransaction>(
  {
    amount: {
      type: Number,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumberLast4Digits: {
      type: String,
      required: true,
    },
    refId: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const BankTransaction = model<IBankTransaction>(
  'BankTransaction',
  bankTransactionSchema,
);