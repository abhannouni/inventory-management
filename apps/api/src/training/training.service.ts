import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  QuizAnswerMode,
  User,
  UserRole,
} from '@prisma/client';
import * as XLSX from 'xlsx';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import {
  MIN_QUIZ_QUESTIONS,
  ParsedQuizQuestion,
  parseQuizRow,
} from './quiz-import.util';

export interface QuizImportRowError {
  /** Spreadsheet row number; 0 for a whole-file problem. */
  row: number;
  message: string;
}

export type AssignmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'missed';

/**
 * Answers saved this long after the timer ends are still accepted, so a slow
 * mobile connection on the last question doesn't lose it.
 */
const GRACE_MS = 30_000;

const QUESTIONS_INCLUDE = {
  questions: {
    orderBy: { position: 'asc' as const },
    include: { options: { orderBy: { position: 'asc' as const } } },
  },
};

const USER_SELECT = { id: true, full_name: true, email: true, role: true };

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function expiresAt(startedAt: Date, durationMinutes: number) {
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}

function statusOf(
  a: { started_at: Date | null; submitted_at: Date | null },
  deadline: Date,
  now = new Date(),
): AssignmentStatus {
  if (a.submitted_at) return 'completed';
  if (a.started_at) return 'in_progress';
  return deadline < now ? 'missed' : 'not_started';
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Super Admin: quizzes ────────────────────────────────────────────────

  async importQuiz(buffer: Buffer, dto: CreateQuizDto, user: User) {
    if (new Date(dto.deadline) <= new Date()) {
      throw new BadRequestException('The deadline must be in the future');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
      throw new BadRequestException('The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: '' },
    );

    const errors: QuizImportRowError[] = [];
    const questions: ParsedQuizQuestion[] = [];
    rows.forEach((row, i) => {
      const { data, error, skip } = parseQuizRow(row, dto.answer_mode);
      if (skip) return;
      if (error)
        errors.push({ row: i + 2, message: error }); // header occupies row 1
      else questions.push(data!);
    });

    if (!errors.length && questions.length < MIN_QUIZ_QUESTIONS) {
      errors.push({
        row: 0,
        message: `A quiz needs at least ${MIN_QUIZ_QUESTIONS} questions (found ${questions.length})`,
      });
    }
    // All-or-nothing: a half-imported quiz would be worse than none.
    if (errors.length)
      return { quiz: null, question_count: questions.length, errors };

    const quiz = await this.prisma.trainingQuiz.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        deadline: new Date(dto.deadline),
        answer_mode: dto.answer_mode,
        duration_minutes: dto.duration_minutes,
        created_by_id: user.id,
        questions: {
          create: questions.map((q, i) => ({
            position: i + 1,
            text: q.text,
            options: { create: q.options },
          })),
        },
      },
    });

    return { quiz, question_count: questions.length, errors };
  }

  async listQuizzes() {
    await this.finalizeExpired({});
    const now = new Date();
    const quizzes = await this.prisma.trainingQuiz.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { questions: true } },
        assignments: { select: { started_at: true, submitted_at: true } },
      },
    });

    return quizzes.map(({ assignments, _count, ...quiz }) => ({
      ...quiz,
      question_count: _count.questions,
      assigned_count: assignments.length,
      completed_count: assignments.filter(
        (a) => statusOf(a, quiz.deadline, now) === 'completed',
      ).length,
    }));
  }

  /** Everything the results screen needs: questions, headline numbers, per-question and per-user results. */
  async getQuizDetail(id: string) {
    await this.finalizeExpired({ quiz_id: id });
    const quiz = await this.prisma.trainingQuiz.findUnique({
      where: { id },
      include: QUESTIONS_INCLUDE,
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { quiz_id: id },
      // The per-user shuffle (question_order / option_order) isn't needed here.
      omit: { question_order: true, option_order: true },
      include: { user: { select: USER_SELECT } },
      orderBy: { assigned_at: 'asc' },
    });
    const answers = await this.prisma.trainingAnswer.findMany({
      where: { assignment: { quiz_id: id, submitted_at: { not: null } } },
      select: { question_id: true, is_correct: true },
    });

    const now = new Date();
    const total = quiz.questions.length;
    const rows = assignments.map((a) => ({
      ...a,
      status: statusOf(a, quiz.deadline, now),
      total,
      duration_seconds:
        a.started_at && a.submitted_at
          ? Math.round(
              (a.submitted_at.getTime() - a.started_at.getTime()) / 1000,
            )
          : null,
    }));

    const completed = rows.filter((r) => r.status === 'completed');
    const averageScorePct =
      completed.length && total
        ? Math.round(
            (completed.reduce((sum, r) => sum + (r.score ?? 0), 0) /
              (completed.length * total)) *
              100,
          )
        : null;

    const questionStats = quiz.questions.map((q) => {
      const forQ = answers.filter((a) => a.question_id === q.id);
      return {
        question_id: q.id,
        correct_count: forQ.filter((a) => a.is_correct).length,
        // Unanswered questions (ran out of time) count as wrong.
        respondent_count: completed.length,
      };
    });

    return {
      quiz,
      stats: {
        assigned: rows.length,
        completed: completed.length,
        in_progress: rows.filter((r) => r.status === 'in_progress').length,
        not_started: rows.filter((r) => r.status === 'not_started').length,
        missed: rows.filter((r) => r.status === 'missed').length,
        average_score_pct: averageScorePct,
      },
      question_stats: questionStats,
      assignments: rows,
    };
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    await this.findQuizOrFail(id);
    return this.prisma.trainingQuiz.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.deadline !== undefined
          ? { deadline: new Date(dto.deadline) }
          : {}),
        ...(dto.duration_minutes !== undefined
          ? { duration_minutes: dto.duration_minutes }
          : {}),
      },
    });
  }

  async removeQuiz(id: string) {
    await this.findQuizOrFail(id);
    await this.prisma.trainingQuiz.delete({ where: { id } });
  }

  // ─── Super Admin: assignments ────────────────────────────────────────────

  /** Every active user except Super Admins — they build quizzes, they don't take them. */
  listAssignableUsers() {
    return this.prisma.user.findMany({
      where: { is_active: true, role: { not: UserRole.super_admin } },
      select: USER_SELECT,
      orderBy: { full_name: 'asc' },
    });
  }

  async assign(quizId: string, userIds: string[]) {
    const quiz = await this.findQuizOrFail(quizId);

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        is_active: true,
        role: { not: UserRole.super_admin },
      },
      select: { id: true },
    });
    const existing = await this.prisma.trainingAssignment.findMany({
      where: { quiz_id: quizId, user_id: { in: users.map((u) => u.id) } },
      select: { user_id: true },
    });
    const already = new Set(existing.map((e) => e.user_id));
    const newIds = users.map((u) => u.id).filter((id) => !already.has(id));

    if (newIds.length) {
      await this.prisma.trainingAssignment.createMany({
        data: newIds.map((user_id) => ({ quiz_id: quizId, user_id })),
        skipDuplicates: true,
      });
      await this.notifications.createForUsers(newIds, {
        type: NotificationType.training_quiz_assigned,
        title: 'New questionnaire assigned',
        body: `"${quiz.title}" has been assigned to you.`,
        link: '/training',
        metadata: { quizTitle: quiz.title },
      });
    }

    return { assigned: newIds.length, skipped: userIds.length - newIds.length };
  }

  /** Only an untouched assignment can be withdrawn — once started, the attempt is kept. */
  async unassign(assignmentId: string) {
    const a = await this.prisma.trainingAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    if (a.started_at)
      throw new BadRequestException('This user has already started the quiz');
    await this.prisma.trainingAssignment.delete({
      where: { id: assignmentId },
    });
  }

  /**
   * Full results of one or more quizzes for the Excel export: questions (with
   * the right answers) and, per assigned user, status, score and every answer.
   */
  async exportResults(quizIds: string[]) {
    const ids = Array.from(new Set(quizIds));
    await this.finalizeExpired({ quiz_id: { in: ids } });
    const quizzes = await this.prisma.trainingQuiz.findMany({
      where: { id: { in: ids } },
      include: {
        ...QUESTIONS_INCLUDE,
        assignments: {
          omit: { question_order: true, option_order: true },
          include: { user: { select: USER_SELECT }, answers: true },
          orderBy: { assigned_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!quizzes.length) throw new NotFoundException('Quiz not found');

    const now = new Date();
    return quizzes.map(({ assignments, ...quiz }) => ({
      ...quiz,
      assignments: assignments.map(({ answers, ...a }) => ({
        ...a,
        status: statusOf(a, quiz.deadline, now),
        total: quiz.questions.length,
        duration_seconds:
          a.started_at && a.submitted_at
            ? Math.round(
                (a.submitted_at.getTime() - a.started_at.getTime()) / 1000,
              )
            : null,
        answers: Object.fromEntries(
          answers.map((ans) => [
            ans.question_id,
            { option_ids: ans.option_ids, is_correct: ans.is_correct },
          ]),
        ),
      })),
    }));
  }

  /** One user's answers, question by question, in the authored order. */
  async reviewAssignment(assignmentId: string) {
    const a = await this.prisma.trainingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: { select: USER_SELECT },
        answers: true,
        quiz: { include: QUESTIONS_INCLUDE },
      },
    });
    if (!a) throw new NotFoundException('Assignment not found');

    const byQuestion = new Map(a.answers.map((ans) => [ans.question_id, ans]));
    return {
      id: a.id,
      user: a.user,
      status: statusOf(a, a.quiz.deadline),
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      score: a.score,
      total: a.quiz.questions.length,
      leave_count: a.leave_count,
      questions: a.quiz.questions.map((q) => {
        const ans = byQuestion.get(q.id);
        const picked = new Set(ans?.option_ids ?? []);
        return {
          id: q.id,
          position: q.position,
          text: q.text,
          answered: !!ans,
          is_correct: ans?.is_correct ?? false,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            is_correct: o.is_correct,
            selected: picked.has(o.id),
          })),
        };
      }),
    };
  }

  // ─── Taking a quiz (any assigned user) ───────────────────────────────────

  async listMine(user: User) {
    await this.finalizeExpired({ user_id: user.id });
    const now = new Date();
    const rows = await this.prisma.trainingAssignment.findMany({
      where: { user_id: user.id },
      include: {
        quiz: { include: { _count: { select: { questions: true } } } },
      },
    });

    const order: Record<AssignmentStatus, number> = {
      in_progress: 0,
      not_started: 1,
      completed: 2,
      missed: 3,
    };
    return rows
      .map((a) => ({
        id: a.id,
        status: statusOf(a, a.quiz.deadline, now),
        assigned_at: a.assigned_at,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        quiz: {
          id: a.quiz.id,
          title: a.quiz.title,
          description: a.quiz.description,
          deadline: a.quiz.deadline,
          answer_mode: a.quiz.answer_mode,
          duration_minutes: a.quiz.duration_minutes,
          question_count: a.quiz._count.questions,
        },
      }))
      .sort(
        (x, y) =>
          order[x.status] - order[y.status] ||
          x.quiz.deadline.getTime() - y.quiz.deadline.getTime(),
      );
  }

  /**
   * Starts the attempt (first call) or resumes it (any later call). The
   * shuffle is drawn once, at start, and stored — so each user gets their own
   * order, and a reload shows the same one. Correct answers are never sent.
   */
  async startOrResume(assignmentId: string, user: User) {
    let a = await this.findOwnAssignment(assignmentId, user);
    const quiz = await this.prisma.trainingQuiz.findUniqueOrThrow({
      where: { id: a.quiz_id },
      include: QUESTIONS_INCLUDE,
    });

    if (a.submitted_at) return { finished: true as const };

    if (!a.started_at) {
      if (quiz.deadline < new Date())
        throw new BadRequestException(
          'The deadline for this questionnaire has passed',
        );
      const questionOrder = shuffle(quiz.questions.map((q) => q.id));
      const optionOrder = Object.fromEntries(
        quiz.questions.map((q) => [q.id, shuffle(q.options.map((o) => o.id))]),
      );
      // Conditional update: two taps on "Start" can't draw two different shuffles.
      await this.prisma.trainingAssignment.updateMany({
        where: { id: a.id, started_at: null },
        data: {
          started_at: new Date(),
          question_order: questionOrder,
          option_order: optionOrder,
        },
      });
      a = await this.findOwnAssignment(assignmentId, user);
    }

    const ends = expiresAt(a.started_at!, quiz.duration_minutes);
    if (Date.now() > ends.getTime() + GRACE_MS) {
      await this.finalize(a.id, ends);
      return { finished: true as const };
    }

    const questionOrder = a.question_order as string[];
    const optionOrder = a.option_order as Record<string, string[]>;
    const byId = new Map(quiz.questions.map((q) => [q.id, q]));
    const answers = await this.prisma.trainingAnswer.findMany({
      where: { assignment_id: a.id },
    });

    return {
      finished: false as const,
      assignment_id: a.id,
      title: quiz.title,
      answer_mode: quiz.answer_mode,
      duration_minutes: quiz.duration_minutes,
      started_at: a.started_at,
      expires_at: ends,
      server_now: new Date(),
      questions: questionOrder
        .map((qid) => byId.get(qid))
        .filter((q): q is NonNullable<typeof q> => !!q)
        .map((q) => {
          const optsById = new Map(q.options.map((o) => [o.id, o]));
          return {
            id: q.id,
            text: q.text,
            options: (optionOrder[q.id] ?? q.options.map((o) => o.id))
              .map((oid) => optsById.get(oid))
              .filter((o): o is NonNullable<typeof o> => !!o)
              .map((o) => ({ id: o.id, text: o.text })),
          };
        }),
      answers: Object.fromEntries(
        answers.map((ans) => [ans.question_id, ans.option_ids]),
      ),
    };
  }

  async saveAnswer(assignmentId: string, user: User, dto: SaveAnswerDto) {
    const a = await this.findOwnAssignment(assignmentId, user);
    const quiz = await this.prisma.trainingQuiz.findUniqueOrThrow({
      where: { id: a.quiz_id },
    });
    this.assertRunning(a, quiz.duration_minutes);

    const question = await this.prisma.trainingQuestion.findFirst({
      where: { id: dto.question_id, quiz_id: a.quiz_id },
      include: { options: true },
    });
    if (!question)
      throw new BadRequestException('Question does not belong to this quiz');

    const picked = Array.from(new Set(dto.option_ids));
    const validIds = new Set(question.options.map((o) => o.id));
    if (picked.some((id) => !validIds.has(id)))
      throw new BadRequestException('Unknown answer option');
    if (quiz.answer_mode === QuizAnswerMode.single && picked.length !== 1) {
      throw new BadRequestException('Choose exactly one answer');
    }

    // Right only when the picked set is exactly the correct set.
    const correct = question.options
      .filter((o) => o.is_correct)
      .map((o) => o.id);
    const isCorrect =
      correct.length === picked.length &&
      correct.every((id) => picked.includes(id));

    await this.prisma.trainingAnswer.upsert({
      where: {
        assignment_id_question_id: {
          assignment_id: a.id,
          question_id: question.id,
        },
      },
      update: { option_ids: picked, is_correct: isCorrect },
      create: {
        assignment_id: a.id,
        question_id: question.id,
        option_ids: picked,
        is_correct: isCorrect,
      },
    });
    return { saved: true };
  }

  async submit(assignmentId: string, user: User, dto: SubmitQuizDto) {
    const a = await this.findOwnAssignment(assignmentId, user);
    if (!a.started_at)
      throw new BadRequestException('This questionnaire has not been started');
    if (!a.submitted_at) {
      const quiz = await this.prisma.trainingQuiz.findUniqueOrThrow({
        where: { id: a.quiz_id },
      });
      const ends = expiresAt(a.started_at, quiz.duration_minutes);
      await this.finalize(
        a.id,
        new Date(Math.min(Date.now(), ends.getTime())),
        dto.leave_count,
      );
    }
    return { submitted: true };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private assertRunning(
    a: { started_at: Date | null; submitted_at: Date | null },
    durationMinutes: number,
  ) {
    if (!a.started_at)
      throw new BadRequestException('This questionnaire has not been started');
    if (a.submitted_at)
      throw new BadRequestException(
        'This questionnaire has already been submitted',
      );
    if (
      Date.now() >
      expiresAt(a.started_at, durationMinutes).getTime() + GRACE_MS
    ) {
      throw new BadRequestException('Time is up for this questionnaire');
    }
  }

  /** Scores the attempt from its saved answers and closes it. No-op if already closed. */
  private async finalize(
    assignmentId: string,
    submittedAt: Date,
    leaveCount?: number,
  ) {
    const score = await this.prisma.trainingAnswer.count({
      where: { assignment_id: assignmentId, is_correct: true },
    });
    await this.prisma.trainingAssignment.updateMany({
      where: { id: assignmentId, submitted_at: null },
      data: {
        submitted_at: submittedAt,
        score,
        ...(leaveCount !== undefined ? { leave_count: leaveCount } : {}),
      },
    });
  }

  /**
   * Closes attempts whose timer ran out without a submit (phone locked, app
   * closed…). Done lazily on read rather than by a scheduler.
   */
  private async finalizeExpired(where: Prisma.TrainingAssignmentWhereInput) {
    const open = await this.prisma.trainingAssignment.findMany({
      where: { ...where, started_at: { not: null }, submitted_at: null },
      select: {
        id: true,
        started_at: true,
        quiz: { select: { duration_minutes: true } },
      },
    });
    const now = Date.now();
    for (const a of open) {
      const ends = expiresAt(a.started_at!, a.quiz.duration_minutes);
      if (now > ends.getTime() + GRACE_MS) await this.finalize(a.id, ends);
    }
  }

  private async findOwnAssignment(id: string, user: User) {
    const a = await this.prisma.trainingAssignment.findUnique({
      where: { id },
    });
    if (!a) throw new NotFoundException('Questionnaire not found');
    if (a.user_id !== user.id)
      throw new ForbiddenException('This questionnaire is not assigned to you');
    return a;
  }

  private async findQuizOrFail(id: string) {
    const quiz = await this.prisma.trainingQuiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }
}
