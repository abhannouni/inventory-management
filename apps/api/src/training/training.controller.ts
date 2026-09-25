import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ExcelTypeValidator } from '../products/validators/excel-type.validator';
import { AssignQuizDto } from './dto/assign-quiz.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ExportResultsDto } from './dto/export-results.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { TrainingService } from './training.service';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// `/training/my/*` has no permission gate: any authenticated user can take
// the quizzes assigned to them, and the service checks ownership. Everything
// else is `training.manage` (super_admin only).
@ApiTags('training')
@ApiBearerAuth()
@Controller('training')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ─── Taking a quiz ───────────────────────────────────────────────────────

  @Get('my')
  @ApiOperation({ summary: 'Questionnaires assigned to the current user' })
  listMine(@CurrentUser() user: User) {
    return this.trainingService.listMine(user);
  }

  @Post('my/:id/start')
  @ApiOperation({
    summary:
      'Start (or resume) an assigned questionnaire — returns this user’s shuffled questions',
  })
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.trainingService.startOrResume(id, user);
  }

  @Put('my/:id/answers')
  @ApiOperation({ summary: 'Save the answer to one question' })
  saveAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.trainingService.saveAnswer(id, user, dto);
  }

  @Post('my/:id/submit')
  @ApiOperation({ summary: 'Submit the questionnaire' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: User,
  ) {
    return this.trainingService.submit(id, user, dto);
  }

  // ─── Super Admin ─────────────────────────────────────────────────────────

  @Get('quizzes')
  @RequirePermissions('training.manage')
  @ApiOperation({ summary: 'Every quiz, newest first, with completion counts' })
  listQuizzes() {
    return this.trainingService.listQuizzes();
  }

  @Post('quizzes/import')
  @RequirePermissions('training.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Create a quiz: quiz fields + an Excel file of questions (all-or-nothing)',
  })
  importQuiz(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMPORT_FILE_SIZE }),
          new ExcelTypeValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: CreateQuizDto,
    @CurrentUser() user: User,
  ) {
    return this.trainingService.importQuiz(file.buffer, dto, user);
  }

  @Get('quizzes/export')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'Full results of one or more quizzes, for the Excel export',
  })
  exportResults(@Query() dto: ExportResultsDto) {
    return this.trainingService.exportResults(dto.quiz_ids);
  }

  @Get('assignable-users')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'Users a quiz can be assigned to (everyone but Super Admins)',
  })
  listAssignableUsers() {
    return this.trainingService.listAssignableUsers();
  }

  @Get('quizzes/:id')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'A quiz with its questions, stats and per-user results',
  })
  getQuiz(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.getQuizDetail(id);
  }

  @Patch('quizzes/:id')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'Edit the title, description, deadline or duration of a quiz',
  })
  updateQuiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.trainingService.updateQuiz(id, dto);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('training.manage')
  @ApiOperation({ summary: 'Delete a quiz and all its results' })
  @ApiNoContentResponse()
  removeQuiz(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.removeQuiz(id);
  }

  @Post('quizzes/:id/assign')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'Assign a quiz to users — each newly assigned user is notified',
  })
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignQuizDto) {
    return this.trainingService.assign(id, dto.user_ids);
  }

  @Get('assignments/:id')
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: "One user's answers to a quiz, question by question",
  })
  reviewAssignment(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.reviewAssignment(id);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('training.manage')
  @ApiOperation({
    summary: 'Withdraw an assignment the user has not started yet',
  })
  @ApiNoContentResponse()
  unassign(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.unassign(id);
  }
}
