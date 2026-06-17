import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('admin')
export class AdminController {
  constructor(private readonly config: ConfigService) {}

  @Post('login')
  login(@Body('password') password: string) {
    const expectedPassword = this.config.get<string>('ADMIN_PASSWORD')?.trim();
    const token = this.config.get<string>('ADMIN_API_TOKEN')?.trim();

    if (!expectedPassword || !token) {
      throw new UnauthorizedException('Admin login is not configured on server');
    }

    if (password?.trim() !== expectedPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    return { token };
  }
}
