import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

type AuthTokenPayload = {
  userId?: string;
  sub?: string;
  id?: string;
  user_id?: string;
};

@Injectable()
export class SocketAuthMiddleware {
  constructor(private configService: ConfigService) {}

  validateToken(token: string): { userId: string } {
    try {
      const secret = this.configService.get('JWT_SECRET') || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as AuthTokenPayload;
      const userId =
        decoded.userId ?? decoded.sub ?? decoded.id ?? decoded.user_id;

      if (!userId) {
        throw new Error(
          'user identifier not found in token (expected one of: userId, sub, id, user_id)',
        );
      }

      return { userId };
    } catch (error) {
      throw new Error(
        `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
