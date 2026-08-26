import { JwtPayload } from 'jsonwebtoken';
import type { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;

  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
