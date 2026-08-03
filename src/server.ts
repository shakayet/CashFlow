import colors from 'colors';
import { Server as HttpServer } from 'http';
import mongoose from 'mongoose';
import process from 'process';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import { seedSuperAdmin } from './DB/seedAdmin';
import { socketHelper } from './helpers/socketHelper';
import { errorLogger, logger } from './shared/logger';

let server: HttpServer | undefined;

process.on('uncaughtException', error => {
  errorLogger.error('UncaughtException detected', error);
  process.exit(1);
});

process.on('unhandledRejection', error => {
  errorLogger.error('UnhandledRejection detected', error);
  if (server) {
    server.close(() => process.exit(1));
    return;
  }
  process.exit(1);
});

async function main() {
  if (!config.database_url) {
    throw new Error('DATABASE_URL is not configured');
  }

  const databaseTimeout = Number(config.database_server_selection_timeout_ms);
  if (!Number.isInteger(databaseTimeout) || databaseTimeout <= 0) {
    throw new Error(
      'DATABASE_SERVER_SELECTION_TIMEOUT_MS must be a positive integer',
    );
  }

  // Do not announce success or query models until MongoDB has selected a server.
  await mongoose.connect(config.database_url, {
    serverSelectionTimeoutMS: databaseTimeout,
  });
  logger.info(colors.green('🚀 Database connected successfully'));

  await seedSuperAdmin();

  const port = Number(config.port);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  if (!config.ip_address) {
    throw new Error('IP_ADDRESS is not configured');
  }
  if (!config.cors_origins.length) {
    throw new Error('CORS_ORIGINS is not configured');
  }
  const socketPingTimeout = Number(config.socket_ping_timeout_ms);
  if (!Number.isInteger(socketPingTimeout) || socketPingTimeout <= 0) {
    throw new Error('SOCKET_PING_TIMEOUT_MS must be a positive integer');
  }

  server = app.listen(port, config.ip_address);
  await new Promise<void>((resolve, reject) => {
    server!.once('listening', resolve);
    server!.once('error', reject);
  });
  logger.info(colors.yellow(`♻️ Application listening on port:${port}`));

  const io = new Server(server, {
    pingTimeout: socketPingTimeout,
    cors: {
      origin: config.cors_origins.includes('*') ? '*' : config.cors_origins,
    },
  });
  socketHelper.socket(io);
  // @ts-expect-error Socket.IO is intentionally exposed to application services.
  global.io = io;
}

main().catch(error => {
  errorLogger.error(colors.red('Failed to start application'), error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => void mongoose.disconnect());
  }
});
