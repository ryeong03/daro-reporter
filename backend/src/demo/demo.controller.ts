import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DemoService } from './demo.service';
import { AdminAuthGuard } from '../admin/admin.guard';

@Controller('demo')
@UseGuards(AdminAuthGuard)
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get()
  getInfo() {
    return this.demoService.getDemoInfo();
  }

  @Post('fall')
  triggerFall() {
    return this.demoService.triggerFallDemo();
  }

  @Post('reset')
  reset() {
    return this.demoService.resetDemo();
  }
}
