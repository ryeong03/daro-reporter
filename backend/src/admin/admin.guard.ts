import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_API_TOKEN')?.trim();
    if (!expected) {
      throw new UnauthorizedException('ADMIN_API_TOKEN is not configured on server');
    }

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token || token !== expected) {
      throw new UnauthorizedException('Admin authentication required');
    }

    return true;
  }
}
