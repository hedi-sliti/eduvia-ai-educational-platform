import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ClubsEventsService } from './clubs-events.service';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('community')
@UseGuards(AuthGuard, RolesGuard)
export class ClubsEventsController {
  constructor(private readonly clubsEventsService: ClubsEventsService) {}

  @Post('clubs')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createClub(@Body() dto: CreateClubDto, @Request() req) {
    return this.clubsEventsService.createClub(dto, req.user.userId);
  }

  @Get('clubs')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  listClubs(@Request() req) {
    if (req.user.role === UserRole.STUDENT) {
      return this.clubsEventsService.listClubsForStudent();
    }
    return this.clubsEventsService.listAllClubsForStaff();
  }

  @Patch('clubs/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateClub(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsEventsService.updateClub(id, dto);
  }

  @Delete('clubs/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteClub(@Param('id') id: string) {
    return this.clubsEventsService.deleteClub(id);
  }

  @Post('events')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createEvent(@Body() dto: CreateEventDto, @Request() req) {
    return this.clubsEventsService.createEvent(dto, req.user.userId);
  }

  @Get('events')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  listEvents(@Request() req) {
    if (req.user.role === UserRole.STUDENT) {
      return this.clubsEventsService.listEventsForStudent();
    }
    return this.clubsEventsService.listAllEventsForStaff();
  }

  @Patch('events/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.clubsEventsService.updateEvent(id, dto);
  }

  @Delete('events/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.clubsEventsService.deleteEvent(id);
  }

  @Get('recommendations')
  @Roles(UserRole.STUDENT)
  getRecommendations(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 5;
    return this.clubsEventsService.getStudentRecommendations(parsed);
  }
}
