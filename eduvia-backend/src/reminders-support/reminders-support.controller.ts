import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { RemindersSupportService } from './reminders-support.service';

@Controller('support')
@UseGuards(AuthGuard, RolesGuard)
export class RemindersSupportController {
  constructor(private readonly remindersSupportService: RemindersSupportService) {}

  @Post('reminders')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createReminder(@Request() req, @Body() createReminderDto: CreateReminderDto) {
    return this.remindersSupportService.createReminder(
      req.user.userId,
      req.user.role,
      createReminderDto,
    );
  }

  @Get('reminders/my')
  @Roles(UserRole.STUDENT)
  listMyReminders(@Request() req) {
    return this.remindersSupportService.listMyReminders(req.user.userId);
  }

  @Get('reminders/sent')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  listSentReminders(@Request() req) {
    return this.remindersSupportService.listSentReminders(req.user.userId);
  }

  @Patch('reminders/:id/read')
  @Roles(UserRole.STUDENT)
  markReminderAsRead(@Param('id') id: string, @Request() req) {
    return this.remindersSupportService.markReminderAsRead(id, req.user.userId);
  }

  @Post('messages')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createSupportMessage(
    @Request() req,
    @Body() createSupportMessageDto: CreateSupportMessageDto,
  ) {
    return this.remindersSupportService.createSupportMessage(
      req.user.userId,
      req.user.role,
      createSupportMessageDto,
    );
  }

  @Get('messages/my')
  @Roles(UserRole.STUDENT)
  listMySupportMessages(@Request() req) {
    return this.remindersSupportService.listMySupportMessages(req.user.userId);
  }

  @Get('messages/sent')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  listSentSupportMessages(@Request() req) {
    return this.remindersSupportService.listSentSupportMessages(req.user.userId);
  }

  @Patch('messages/:id/read')
  @Roles(UserRole.STUDENT)
  markSupportMessageAsRead(@Param('id') id: string, @Request() req) {
    return this.remindersSupportService.markSupportMessageAsRead(
      id,
      req.user.userId,
    );
  }
}
