/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
import colors from 'colors';
import { Server, Socket } from 'socket.io';
import { logger } from '../shared/logger';
import jwt from 'jsonwebtoken';
import config from '../config';
import { ChatRoom } from '../app/modules/chat/chatRoom.model';
// import { ChatMessage } from '../app/modules/chat/chatMessage.model';
import { JwtPayload } from 'jsonwebtoken';
import { ChatService } from '../app/modules/chat/chat.service';

const socket = (io: Server) => {
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    try {
      const decoded = jwt.verify(
        token,
        config.jwt.jwt_secret as string,
      ) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', socket => {
    logger.info(colors.blue(`User connected: ${socket.data.user.id}`));

    socket.on('joinRoom', async (chatRoomId: string) => {
      const user = socket.data.user;
      const chatRoom = await ChatRoom.findById(chatRoomId);

      if (!chatRoom || !chatRoom.participants.includes(user.id)) {
        socket.emit('roomError', 'You are not authorized to join this room.');
        return;
      }

      socket.join(chatRoomId);
      logger.info(colors.green(`User ${user.id} joined room ${chatRoomId}`));
      socket.emit('joinedRoom', chatRoomId);
    });

    socket.on(
      'sendMessage',
      async (messagePayload: {
        chatRoomId: string;
        messageType: 'text' | 'image' | 'pdf';
        content?: string;
        file?: { buffer: Buffer; originalname: string; mimetype: string };
      }) => {
        const user = socket.data.user;
        const { chatRoomId, messageType, content, file } = messagePayload;

        try {
          const chatRoom = await ChatRoom.findById(chatRoomId);
          if (!chatRoom || !chatRoom.participants.includes(user.id)) {
            socket.emit(
              'messageError',
              'You are not authorized to send messages in this room.',
            );
            return;
          }

          // Convert file object for ChatService.sendMessage
          let fileForService: Express.Multer.File | undefined;
          if (file) {
            fileForService = {
              buffer: file.buffer,
              originalname: file.originalname,
              mimetype: file.mimetype,
              fieldname: 'file', // Required by Multer.File
              encoding: '7bit', // Required by Multer.File
              size: file.buffer.length, // Required by Multer.File
              destination: '', // Required by Multer.File
              filename: file.originalname, // Required by Multer.File
              path: '', // Required by Multer.File
              stream: require('stream').Readable.from(file.buffer), // Add dummy stream
            };
          }

          const newMessage = await ChatService.sendMessage(user, chatRoomId, {
            messageType,
            content,
            file: fileForService,
          });

          io.to(chatRoomId).emit('newMessage', newMessage);
        } catch (error: any) {
          logger.error(colors.red(`Error sending message: ${error.message}`));
          socket.emit('messageError', error.message);
        }
      },
    );

    socket.on('markMessagesAsRead', async (chatRoomId: string) => {
      const user = socket.data.user;
      try {
        await ChatService.markMessagesAsRead(user, chatRoomId);
        io.to(chatRoomId).emit('messagesRead', { chatRoomId, userId: user.id });
      } catch (error: any) {
        logger.error(
          colors.red(`Error marking messages as read: ${error.message}`),
        );
        socket.emit('readError', error.message);
      }
    });

    //disconnect
    socket.on('disconnect', () => {
      logger.info(colors.red(`User disconnected: ${socket.data.user.id}`));
    });
  });
};

export const socketHelper = { socket };
