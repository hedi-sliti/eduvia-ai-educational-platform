import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  getUsersAnalytics() {
    return this.analyticsService.getUsersAnalytics();
  }

  @Get('learning')
  getLearningAnalytics() {
    return this.analyticsService.getLearningAnalytics();
  }

  @Get('engagement')
  getEngagementAnalytics() {
    return this.analyticsService.getEngagementAnalytics();
  }
}
