/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import { ChatRoom } from './chatRoom.model';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { ChatMessage } from './chatMessage.model';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { compressImage, compressPdf } from '../../../helpers/fileProcessor';

const createChatRoom = async (user: JwtPayload) => {
  const userId = user.id;

  // Find an admin to assign to the chat room
  const adminUser = await User.findOne({ role: USER_ROLES.ADMIN });

  if (!adminUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'No admin available to assign to chat room',
    );
  }

  const newChatRoom = await ChatRoom.create({
    participants: [userId, adminUser._id],
    admin: adminUser._id,
    user: userId,
  });

  return newChatRoom;
};

const sendMessage = async (
  sender: JwtPayload,
  chatRoomId: string,
  messagePayload: {
    messageType: 'text' | 'image' | 'pdf';
    content?: string;
    file?: Express.Multer.File;
  },
) => {
  const { messageType, content, file } = messagePayload;
  const senderId = sender.id;
  const senderRole = sender.role;

  const chatRoom = await ChatRoom.findById(chatRoomId);

  if (!chatRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat room not found');
  }

  // Ensure sender is a participant of the chat room
  if (!chatRoom.participants.includes(senderId)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You are not a participant of this chat room',
    );
  }

  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let fileSize: number | undefined;

  if (file) {
    let processedBuffer = file.buffer;

    // Compress file based on type
    if (file.mimetype.startsWith('image/')) {
      processedBuffer = await compressImage(file.buffer);
    } else if (file.mimetype === 'application/pdf') {
      processedBuffer = await compressPdf(file.buffer);
    }

    // Upload to S3
    const uploadResult = await s3Uploader.uploadBufferToS3(
      processedBuffer,
      file.originalname,
      file.mimetype,
      'chat-attachments',
    );

    if (!uploadResult || !uploadResult.url) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to upload attachment to S3',
      );
    }

    fileUrl = uploadResult.url;
    fileName = file.originalname;
    fileSize = processedBuffer.length; // Size of the compressed file
  }

  const newMessage = await ChatMessage.create({
    chatRoom: chatRoomId,
    sender: senderId,
    senderRole: senderRole,
    messageType,
    content: messageType === 'text' ? content : undefined,
    fileUrl,
    fileName,
    fileSize,
    readBy: [senderId], // Sender has read their own message
  });

  // Update last message in chat room
  chatRoom.lastMessage = newMessage._id;
  await chatRoom.save();

  return newMessage;
};

const getChatMessages = async (
  user: JwtPayload,
  chatRoomId: string,
  paginationOptions: { page?: number; limit?: number },
) => {
  const { page = 1, limit = 10 } = paginationOptions;
  const skip = (page - 1) * limit;

  const chatRoom = await ChatRoom.findById(chatRoomId);

  if (!chatRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat room not found');
  }

  // Ensure user is a participant of the chat room
  if (!chatRoom.participants.includes(user.id)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You are not a participant of this chat room',
    );
  }

  const messages = await ChatMessage.find({ chatRoom: chatRoomId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name profileImage'); // Populate sender details

  const total = await ChatMessage.countDocuments({ chatRoom: chatRoomId });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: messages,
  };
};

const markMessagesAsRead = async (user: JwtPayload, chatRoomId: string) => {
  const userId = user.id;

  const chatRoom = await ChatRoom.findById(chatRoomId);

  if (!chatRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat room not found');
  }

  // Ensure user is a participant of the chat room
  if (!chatRoom.participants.includes(userId)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You are not a participant of this chat room',
    );
  }

  // Update messages to mark them as read by the user
  await ChatMessage.updateMany(
    {
      chatRoom: chatRoomId,
      sender: { $ne: userId }, // Don't mark messages sent by the user themselves
      readBy: { $ne: userId }, // Only update if not already read by this user
    },
    {
      $addToSet: { readBy: userId }, // Add user to readBy array
    },
  );

  return {
    message: 'Messages marked as read successfully',
  };
};

export const ChatService = {
  createChatRoom,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
};
