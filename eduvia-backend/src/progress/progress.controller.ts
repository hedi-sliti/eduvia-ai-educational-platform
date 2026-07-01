import {
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(AuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('my')
  @Roles(UserRole.STUDENT)
  getMyProgress(@Request() req) {
    return this.progressService.getMyProgress(req.user.userId);
  }

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getStudentProgress(@Param('studentId') studentId: string) {
    return this.progressService.getStudentProgress(studentId);
  }

  @Get('at-risk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  listAtRiskStudents(
    @Query('threshold', new ParseFloatPipe({ optional: true })) threshold?: number,
  ) {
    return this.progressService.listAtRiskStudents(threshold ?? 60);
  }
}
