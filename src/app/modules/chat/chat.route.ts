import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { ChatController } from './chat.controller';
import { ChatValidation } from './chat.validation';
import { upload } from '../../../helpers/multer';

const router = express.Router();

router.post(
  '/create-room',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  validateRequest(ChatValidation.createChatRoomZodSchema),
  ChatController.createChatRoom,
);

router.get(
  '/my-rooms',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  ChatController.getMyChatRooms,
);

router.post(
  '/send-message/:chatRoomId',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  upload.single('file'),
  (req, res, next) => {
    if (req.body.data) {
      req.body = ChatValidation.sendMessageZodSchema.parse(
        JSON.parse(req.body.data),
      );
    } else {
      validateRequest(ChatValidation.sendMessageZodSchema)(req, res, next);
    }
  },
  ChatController.sendChatMessage,
);

router.get(
  '/:chatRoomId/messages',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  ChatController.getChatMessages,
);

router.patch(
  '/:chatRoomId/mark-read',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  ChatController.markMessagesAsRead,
);

export const ChatRoutes = router;
