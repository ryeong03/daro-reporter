import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AlertModule } from './alert/alert.module';
import { UsersModule } from './users/users.module';
import { TwilioWebhookModule } from './twilio-webhook/twilio-webhook.module';
import { AiCallModule } from './ai-call/ai-call.module';
import { NotifyModule } from './notify/notify.module';
import { ExternalModule } from './external/external.module';
import { StateModule } from './state/state.module';
import { DetectionModule } from './detection/detection.module';
import { GuardianModule } from './guardian/guardian.module';
import { DemoModule } from './demo/demo.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    StateModule,
    ExternalModule,
    DetectionModule,
    AiCallModule,
    NotifyModule,
    GuardianModule,
    HealthModule,
    AlertModule,
    UsersModule,
    TwilioWebhookModule,
    DemoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
