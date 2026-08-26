import { model, Schema } from 'mongoose';

export type IAppleNotification = {
  notificationUUID: string;
  notificationType?: string;
  subtype?: string;
  signedDate?: Date;
  transactionId?: string;
  originalTransactionId?: string;
  processedAt?: Date | null;
};

const appleNotificationSchema = new Schema<IAppleNotification>(
  {
    notificationUUID: { type: String, required: true, unique: true },
    notificationType: String,
    subtype: String,
    signedDate: Date,
    transactionId: String,
    originalTransactionId: String,
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const AppleNotification = model<IAppleNotification>(
  'AppleNotification',
  appleNotificationSchema,
);
