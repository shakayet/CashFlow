import colors from 'colors';
import { Server as HttpServer } from 'http';
import mongoose from 'mongoose';
import process from 'process';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import { seedSuperAdmin } from './DB/seedAdmin';
import { socketHelper } from './helpers/socketHelper';
import { shutdownOCRWorkers } from './helpers/ocr';
import { errorLogger, logger } from './shared/logger';

let server: HttpServer | undefined;
let io: Server | undefined;
let shuttingDown = false;

const gracefulShutdown = async (signal: string, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received; draining connections`);
  const deadline = setTimeout(() => {
    errorLogger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  deadline.unref();

  try {
    if (io) {
      await new Promise<void>(resolve => io!.close(() => resolve()));
      io = undefined;
      globalThis.io = undefined;
    }
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => (error ? reject(error) : resolve()));
      });
    }
    await shutdownOCRWorkers();
    await mongoose.disconnect();
    clearTimeout(deadline);
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(deadline);
    errorLogger.error('Graceful shutdown failed', error);
    process.exit(1);
  }
};

process.on('uncaughtException', error => {
  errorLogger.error('UncaughtException detected', error);
  void gracefulShutdown('uncaughtException', 1);
});

process.on('unhandledRejection', error => {
  errorLogger.error('UnhandledRejection detected', error);
  void gracefulShutdown('unhandledRejection', 1);
});

async function main() {
  const databaseTimeout = Number(config.database_server_selection_timeout_ms);
  if (!Number.isInteger(databaseTimeout) || databaseTimeout <= 0) {
    throw new Error(
      'DATABASE_SERVER_SELECTION_TIMEOUT_MS must be a positive integer',
    );
  }

  await mongoose.connect(config.database_url, {
    serverSelectionTimeoutMS: databaseTimeout,
  });
  logger.info(colors.green('Database connected successfully'));

  await seedSuperAdmin();

  const port = Number(config.port);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
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
  logger.info(colors.yellow(`Application listening on port:${port}`));

  io = new Server(server, {
    pingTimeout: socketPingTimeout,
    cors: {
      origin: config.cors_origins.includes('*') ? '*' : config.cors_origins,
    },
  });
  socketHelper.socket(io);
  globalThis.io = io;
}

main().catch(error => {
  errorLogger.error(colors.red('Failed to start application'), error);
  void gracefulShutdown('startupFailure', 1);
});

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
