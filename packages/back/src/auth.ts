import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'sneap-secret-key-change-this-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'sneap-refresh-secret-change-this-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcryptjs.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

export interface TokenPayload {
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export class AuthService {
  static generateAccessToken(username: string): string {
    return jwt.sign(
      { username, type: 'access' } as TokenPayload,
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  static generateRefreshToken(username: string): string {
    return jwt.sign(
      { username, type: 'refresh' } as TokenPayload,
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (decoded.type !== 'access') return null;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, REFRESH_SECRET) as TokenPayload;
      if (decoded.type !== 'refresh') return null;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static async validateCredentials(username: string, password: string): Promise<boolean> {
    if (username !== ADMIN_USERNAME) return false;
    return bcryptjs.compare(password, ADMIN_PASSWORD_HASH);
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

export async function validateJWT(request: any, reply: any) {
  const token = AuthService.extractTokenFromHeader(request.headers.authorization);
  
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Token required'
    });
  }

  const payload = AuthService.verifyAccessToken(token);
  
  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  request.adminUser = { username: payload.username };
}