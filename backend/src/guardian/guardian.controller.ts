import {
  Controller, Post, Get, Body, Param, Query,
  BadRequestException, UnauthorizedException, Headers,
} from '@nestjs/common';
import { GuardianService } from './guardian.service';

@Controller('guardian')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  /**
   * A. 전번+이름 로그인 → JWT 발급
   * 보호자가 평소에 대시보드 접근할 때 사용
   */
  @Post('login')
  async login(@Body() body: { phone: string; name: string }) {
    if (!body.phone || !body.name) {
      throw new BadRequestException('phone과 name을 입력해주세요');
    }
    const result = await this.guardianService.loginByPhoneAndName(body.phone, body.name);
    if (!result) {
      throw new UnauthorizedException('등록된 보호자 정보를 찾을 수 없습니다');
    }
    return result;
  }

  /**
   * B. SMS 긴급 링크 토큰 검증 → 임시 세션 발급
   * 위급 시 SMS에 포함된 일회성 토큰으로 즉시 접근
   */
  @Get('emergency-access')
  async emergencyAccess(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('token이 필요합니다');
    }
    const result = await this.guardianService.verifyEmergencyToken(token);
    if (!result) {
      throw new UnauthorizedException('유효하지 않거나 만료된 링크입니다');
    }
    return result;
  }

  /**
   * 내 어르신 목록 조회 (보호자 로그인 후)
   */
  @Get('my-users')
  async getMyUsers(@Headers('authorization') authHeader: string) {
    const token = this.extractToken(authHeader);
    return this.guardianService.getLinkedUsers(token);
  }

  /**
   * 내 어르신 상세 상태 조회 (보호자 로그인 후)
   */
  @Get('my-users/:userId')
  async getUserStatus(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ) {
    const token = this.extractToken(authHeader);
    return this.guardianService.getUserStatus(token, userId);
  }

  /**
   * 내 어르신 알림 이력 조회
   */
  @Get('my-users/:userId/alerts')
  async getUserAlerts(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ) {
    const token = this.extractToken(authHeader);
    return this.guardianService.getUserAlerts(token, userId);
  }

  private extractToken(authHeader: string): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }
    return authHeader.slice(7);
  }
}
