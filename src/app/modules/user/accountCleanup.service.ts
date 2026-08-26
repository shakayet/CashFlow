import mongoose, { Types } from 'mongoose';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { errorLogger } from '../../../shared/logger';
import { BankTransaction } from '../bankTransaction/bankTransaction.model';
import { ChatMessage } from '../chat/chatMessage.model';
import { ChatRoom } from '../chat/chatRoom.model';
import { Expense } from '../expense/expense.model';
import { Income } from '../income/income.model';
import { ResetToken } from '../resetToken/resetToken.model';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionOwnership } from '../subscription/subscriptionOwnership.model';
import { User } from './user.model';

type StoredFile = { fileKey?: string | null };

export const deleteUserAccountData = async (userId: string) => {
  const user = await User.findById(userId).select('+imageKey');
  if (!user) return null;

  const objectId = new Types.ObjectId(userId);
  const [incomes, expenses, rooms, messages] = await Promise.all([
    Income.find({ user: objectId }).select('fileKey').lean(),
    Expense.find({ user: objectId }).select('fileKey').lean(),
    ChatRoom.find({ participants: objectId }).select('_id').lean(),
    ChatMessage.find({ sender: objectId }).select('fileKey').lean(),
  ]);
  const roomIds = rooms.map(room => room._id);
  const roomMessages = roomIds.length
    ? await ChatMessage.find({ chatRoom: { $in: roomIds } })
        .select('fileKey')
        .lean()
    : [];

  const fileKeys = new Set<string>();
  const addFileKey = (item: StoredFile) => {
    if (item.fileKey) fileKeys.add(item.fileKey);
  };
  [...incomes, ...expenses, ...messages, ...roomMessages].forEach(item =>
    addFileKey(item as StoredFile),
  );
  if (user.imageKey) fileKeys.add(user.imageKey);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all([
        Subscription.deleteMany({ user: objectId }, { session }),
        SubscriptionOwnership.deleteMany({ user: objectId }, { session }),
        Income.deleteMany({ user: objectId }, { session }),
        Expense.deleteMany({ user: objectId }, { session }),
        BankTransaction.deleteMany({ user: objectId }, { session }),
        ResetToken.deleteMany({ user: objectId }, { session }),
        ChatMessage.deleteMany(
          {
            $or: [
              { sender: objectId },
              ...(roomIds.length ? [{ chatRoom: { $in: roomIds } }] : []),
            ],
          },
          { session },
        ),
        ChatRoom.deleteMany({ participants: objectId }, { session }),
        User.deleteOne({ _id: objectId }, { session }),
      ]);
    });
  } finally {
    await session.endSession();
  }

  const cleanup = await Promise.allSettled(
    [...fileKeys].map(key => s3Uploader.deleteByKey(key)),
  );
  const failedCleanup = cleanup.filter(result => result.status === 'rejected');
  if (failedCleanup.length) {
    errorLogger.error(
      `Failed to delete ${failedCleanup.length} object(s) while cleaning account ${userId}`,
    );
  }

  return user;
};
