import type { SignOptions } from 'jsonwebtoken';

export const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'CHANGE_ME_IN_ENV',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
};
