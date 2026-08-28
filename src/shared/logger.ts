import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createLogger, format, transports } from 'winston';
const { combine, errors, json, timestamp, label, printf } = format;

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const isTest = environment === 'test';

const myFormat = printf(info => {
  const date = new Date(String(info.timestamp));
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${String(info.label)}] ${info.level}: ${String(info.message)}`;
});

const logFormat = isProduction
  ? combine(timestamp(), errors({ stack: true }), json())
  : combine(label({ label: 'CASHFLOW-API' }), timestamp(), myFormat);

const applicationTransports: import('winston').transport[] = [
  new transports.Console({ silent: isTest }),
];
const errorTransports: import('winston').transport[] = [
  new transports.Console({ silent: isTest }),
];

if (!isProduction && !isTest) {
  applicationTransports.push(
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'success',
        '%DATE%-success.log',
      ),
      datePattern: 'DD-MM-YYYY-HH',
      maxSize: '20m',
      maxFiles: '1d',
    }),
  );
  errorTransports.push(
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'error',
        '%DATE%-error.log',
      ),
      datePattern: 'DD-MM-YYYY-HH',
      maxSize: '20m',
      maxFiles: '1d',
    }),
  );
}

const logger = createLogger({
  level: 'info',
  format: logFormat,
  transports: applicationTransports,
});

const errorLogger = createLogger({
  level: 'error',
  format: logFormat,
  transports: errorTransports,
});

const errorContext = (error: unknown) => ({
  error:
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : String(error),
});

export { errorContext, errorLogger, logger };
