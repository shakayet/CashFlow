/* eslint-disable no-undef */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envResult = dotenv.config({ path: envPath });
  if (envResult.error) {
    throw new Error(`Unable to load environment file: ${envPath}`);
  }
}

const commaSeparated = (value?: string) =>
  value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) || [];

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not configured in the process environment or ${envPath}`,
    );
  }
  return value;
};

export default {
  ip_address: requiredEnv('IP_ADDRESS'),
  database_url: requiredEnv('DATABASE_URL'),
  node_env: requiredEnv('NODE_ENV'),
  port: requiredEnv('PORT'),
  database_server_selection_timeout_ms: requiredEnv(
    'DATABASE_SERVER_SELECTION_TIMEOUT_MS',
  ),
  cors_origins: commaSeparated(requiredEnv('CORS_ORIGINS')),
  socket_ping_timeout_ms: requiredEnv('SOCKET_PING_TIMEOUT_MS'),
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  brand: {
    logo_url: process.env.BRAND_LOGO_URL,
  },
  storage: {
    s3: {
      bucket: process.env.AWS_BUCKET,
      region: process.env.AWS_REGION,
    },
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
  },
  super_admin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
  oauth: {
    google: {
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      callbackURL: requiredEnv('GOOGLE_OAUTH_CALLBACK_URL'),
    },
    sessionSecret: requiredEnv('SESSION_SECRET'),
    sessionMaxAgeMs: requiredEnv('SESSION_MAX_AGE_MS'),
  },
  apple: {
    issuerId: process.env.APPLE_ISSUER_ID,
    keyId: process.env.APPLE_KEY_ID,
    bundleId: process.env.APPLE_BUNDLE_ID,
    appAppleId: process.env.APPLE_APP_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH,
    rootCertificatePaths: process.env.APPLE_ROOT_CERTIFICATE_PATHS,
    productMap: process.env.APPLE_PRODUCT_MAP,
    statusCacheMs: process.env.APPLE_STATUS_CACHE_MS || '60000',
  },
};
