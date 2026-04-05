import mongoose from 'mongoose';
import { User } from '../src/app/modules/user/user.model';
import { ChatService } from '../src/app/modules/chat/chat.service';
import { ChatRoom } from '../src/app/modules/chat/chatRoom.model';
import { ChatMessage } from '../src/app/modules/chat/chatMessage.model';
import { USER_ROLES } from '../src/enums/user';
import { SUBSCRIPTION_PLAN } from '../src/app/modules/subscription/subscription.interface';

describe('Chat Module', () => {
  let userId: string;
  let adminId: string;
  let userPayload: any;
  let adminPayload: any;

  beforeEach(async () => {
    // Create a regular user
    const user = await User.create({
      name: 'Test User',
      email: `user-${Date.now()}@example.com`,
      password: 'password123',
      role: USER_ROLES.USER,
      plan: SUBSCRIPTION_PLAN.FREE,
      verified: true,
    });
    userId = (user._id as mongoose.Types.ObjectId).toString();
    userPayload = { id: userId, email: user.email, role: user.role };

    // Create an admin user
    const admin = await User.create({
      name: 'Admin User',
      email: `admin-${Date.now()}@example.com`,
      password: 'password123',
      role: USER_ROLES.ADMIN,
      plan: SUBSCRIPTION_PLAN.FREE,
      verified: true,
    });
    adminId = (admin._id as mongoose.Types.ObjectId).toString();
    adminPayload = { id: adminId, email: admin.email, role: admin.role };
  });

  it('should create a chat room between user and an admin', async () => {
    const chatRoom = await ChatService.createChatRoom(userPayload);

    expect(chatRoom.user.toString()).toBe(userId);
    expect(chatRoom.admin.toString()).toBe(adminId);
    expect(chatRoom.participants.map((p: any) => p.toString())).toContain(
      userId,
    );
    expect(chatRoom.participants.map((p: any) => p.toString())).toContain(
      adminId,
    );
  });

  it('should not create a new room if user already has one', async () => {
    const firstRoom = await ChatService.createChatRoom(userPayload);
    const secondRoom = await ChatService.createChatRoom(userPayload);

    expect(firstRoom._id.toString()).toBe(secondRoom._id.toString());
    const count = await ChatRoom.countDocuments({ user: userId });
    expect(count).toBe(1);
  });

  it('should get user chat rooms', async () => {
    await ChatService.createChatRoom(userPayload);
    const result = await ChatService.getMyChatRooms(userPayload, {});

    expect(result.result.length).toBe(1);
    expect(result.result[0].user._id.toString()).toBe(userId);
  });

  it('should send a text message in a chat room', async () => {
    const chatRoom = await ChatService.createChatRoom(userPayload);
    const messagePayload = {
      messageType: 'text' as const,
      content: 'Hello Admin',
    };

    const message = await ChatService.sendMessage(
      userPayload,
      chatRoom._id.toString(),
      messagePayload,
    );

    expect(message.content).toBe('Hello Admin');
    expect(message.sender.toString()).toBe(userId);
    expect(message.chatRoom.toString()).toBe(chatRoom._id.toString());

    // Check if lastMessage was updated in ChatRoom
    const updatedChatRoom = await ChatRoom.findById(chatRoom._id);
    expect(updatedChatRoom?.lastMessage?.toString()).toBe(
      message._id.toString(),
    );
  });

  it('should get chat messages in a room', async () => {
    const chatRoom = await ChatRoom.create({
      participants: [userId, adminId],
      admin: adminId,
      user: userId,
    });

    await ChatMessage.create({
      chatRoom: chatRoom._id,
      sender: userId,
      senderRole: USER_ROLES.USER,
      messageType: 'text',
      content: 'Message 1',
      readBy: [userId],
    });

    await ChatMessage.create({
      chatRoom: chatRoom._id,
      sender: adminId,
      senderRole: USER_ROLES.ADMIN,
      messageType: 'text',
      content: 'Message 2',
      readBy: [adminId],
    });

    const messages = await ChatService.getChatMessages(
      userPayload,
      chatRoom._id.toString(),
      {},
    );
    expect(messages.result.length).toBe(2);
    expect(messages.result[0].content).toBe('Message 1');
    expect(messages.result[1].content).toBe('Message 2');
  });

  it('should mark messages as read', async () => {
    const chatRoom = await ChatRoom.create({
      participants: [userId, adminId],
      admin: adminId,
      user: userId,
    });

    // Admin sends a message
    const msg = await ChatMessage.create({
      chatRoom: chatRoom._id,
      sender: adminId,
      senderRole: USER_ROLES.ADMIN,
      messageType: 'text',
      content: 'Admin message',
      readBy: [adminId],
    });

    await ChatService.markMessagesAsRead(userPayload, chatRoom._id.toString());

    const updatedMsg = await ChatMessage.findById(msg._id);
    expect(updatedMsg?.readBy.map((id: any) => id.toString())).toContain(
      userId,
    );
  });

  it('should throw error if non-participant tries to send message', async () => {
    const chatRoom = await ChatRoom.create({
      participants: [userId, adminId],
      admin: adminId,
      user: userId,
    });

    const intruder = {
      id: new mongoose.Types.ObjectId().toString(),
      role: USER_ROLES.USER,
    };

    await expect(
      ChatService.sendMessage(intruder as any, chatRoom._id.toString(), {
        messageType: 'text',
        content: 'Intruder message',
      }),
    ).rejects.toThrow('You are not a participant of this chat room');
  });
});
