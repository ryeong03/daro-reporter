import { Controller, Get, Post, Body, Query, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { TwilioWebhookService } from './twilio-webhook.service';

@Controller('twilio')
export class TwilioWebhookController {
  constructor(private readonly webhookService: TwilioWebhookService) {}

  @Get('voice-response')
  @Post('voice-response')
  async voiceResponse(@Query('userId') userId: string, @Res() res: Response) {
    const twiml = await this.webhookService.generateVoiceResponse(userId);
    res.type('text/xml');
    res.send(twiml);
  }

  @Post('voice-status')
  @HttpCode(200)
  async voiceStatus(@Body() body: any) {
    await this.webhookService.handleVoiceStatus(body.CallSid, body.CallStatus);
  }

  @Post('recording')
  async recording(@Body() body: any, @Res() res: Response) {
    const twiml = await this.webhookService.handleRecording(
      body.CallSid,
      body.RecordingUrl,
      body.RecordingSid,
    );
    res.type('text/xml');
    res.send(twiml);
  }
}
