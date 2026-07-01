import {
  Body,
  Controller,
  Delete,
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
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
@UseGuards(AuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  findAll(@Request() req) {
    return this.quizzesService.findAll(req.user.role);
  }

  @Get('my/attempts')
  @Roles(UserRole.STUDENT)
  findMyAttempts(@Request() req) {
    return this.quizzesService.findMyAttempts(req.user.userId);
  }

  @Get('course/:courseId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  findByCourse(@Param('courseId') courseId: string, @Request() req) {
    return this.quizzesService.findByCourse(courseId, req.user.role);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  findOne(@Param('id') id: string, @Request() req) {
    return this.quizzesService.findOne(id, req.user.role);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }

  @Post(':id/attempts')
  @Roles(UserRole.STUDENT)
  submitAttempt(
    @Param('id') id: string,
    @Request() req,
    @Body() submitQuizAttemptDto: SubmitQuizAttemptDto,
  ) {
    return this.quizzesService.submitAttempt(
      id,
      req.user.userId,
      submitQuizAttemptDto,
    );
  }

  @Get(':id/attempts')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAttemptsByQuiz(@Param('id') id: string) {
    return this.quizzesService.findAttemptsByQuiz(id);
  }
}
