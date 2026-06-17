import { Controller, Post, Get, Patch, Delete, Body, Param, BadRequestException, HttpCode, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { registerSchema, updateProfileSchema } from './users.schema';
import { AdminAuthGuard } from '../admin/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid payload', details: parsed.error.issues });
    }
    return this.usersService.register(parsed.data);
  }

  @Get('by-phone/:phone')
  async getUserByPhone(@Param('phone') phone: string) {
    return this.usersService.getUserByPhone(phone);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  async getUser(@Param('id') id: string) {
    return this.usersService.getUserDetail(id);
  }

  @Get(':id/baseline')
  @UseGuards(AdminAuthGuard)
  async getBaseline(@Param('id') id: string) {
    return this.usersService.getBaseline(id);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async listUsers() {
    return this.usersService.listUsersWithStatus();
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async updateProfile(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid payload', details: parsed.error.issues });
    }
    return this.usersService.updateProfile(id, parsed.data);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminAuthGuard)
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
  }
}
