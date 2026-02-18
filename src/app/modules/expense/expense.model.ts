import { model, Schema } from 'mongoose';
import { IExpense, ExpenseModel } from './expense.interface';

const expenseSchema = new Schema<IExpense, ExpenseModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: false, // Made optional
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Expense = model<IExpense, ExpenseModel>('Expense', expenseSchema);
