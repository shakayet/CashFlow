import { z } from 'zod';

const createChatRoomZodSchema = z.object({
  body: z.object({
    userId: z.string({
      required_error: 'User ID is required',
    }),
  }),
});

const sendMessageZodSchema = z.object({
  body: z
    .object({
      content: z.string().optional(),
      messageType: z.enum(['text', 'image', 'pdf'], {
        required_error: 'Message type is required',
      }),
    })
    .refine(
      data => {
        if (data.messageType === 'text' && !data.content) {
          return false; // Text message must have content
        }
        if (
          (data.messageType === 'image' || data.messageType === 'pdf') &&
          data.content
        ) {
          return false; // File message should not have content in body
        }
        return true;
      },
      {
        message: 'Invalid message payload for the given message type',
      },
    ),
});

export const ChatValidation = {
  createChatRoomZodSchema,
  sendMessageZodSchema,
};
