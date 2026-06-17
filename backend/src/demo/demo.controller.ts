import { Controller, Get, Post } from '@nestjs/common';
import { DemoService } from './demo.service';

@Controller('demo')
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
