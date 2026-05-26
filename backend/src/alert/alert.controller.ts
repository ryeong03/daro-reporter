import { Controller, Post, Get, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AlertService } from './alert.service';
import { alertPayloadSchema } from './alert.schema';

@Controller('alert')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post()
  async receiveDeviceEvent(@Body() body: unknown) {
    const parsed = alertPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid payload', details: parsed.error.issues });
    }
    return this.alertService.handleDeviceEvent(parsed.data);
  }

  @Get()
  async listAlerts(
    @Query('user_id') userId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.alertService.listAlerts(userId, status, Number(limit) || 50, Number(offset) || 0);
  }

  @Get(':id')
  async getAlertDetail(@Param('id') id: string) {
    return this.alertService.getAlertDetail(id);
  }

  @Patch(':id')
  async updateAlertStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.alertService.updateStatus(id, status);
  }
}
