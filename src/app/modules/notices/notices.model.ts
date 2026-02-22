import { model, Schema } from 'mongoose';
import { INotice } from './notices.interface';

const noticeSchema = new Schema<INotice>(
  {
    type: {
      type: String,
      enum: ['IRS Notice', 'Case Status'],
      required: true,
    },
    document: {
      type: String,
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

export const Notice = model<INotice>('Notice', noticeSchema);
