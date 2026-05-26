import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { HealthService } from './health.service';
import { healthPayloadSchema } from './health.schema';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Post()
  async receiveHealthData(@Body() body: unknown) {
    const parsed = healthPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid payload', details: parsed.error.issues });
    }

    return this.healthService.processIncoming(parsed.data);
  }
}
