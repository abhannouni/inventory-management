import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, User, UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignProductsDto } from './dto/assign-products.dto';
import { FindAssignmentsDto } from './dto/find-assignments.dto';
import { FindSubmissionsDto } from './dto/find-submissions.dto';
import { GetDraftDto } from './dto/get-draft.dto';
import { SaveSubmissionDto } from './dto/save-submission.dto';
import { isValidSyntheseSlot } from './synthese-structure';

const DRAFT_INCLUDE = {
  items: { include: { product: true }, orderBy: { product: { name: 'asc' as const } } },
  notes: true,
} satisfies Prisma.PriceSurveySubmissionInclude;

@Injectable()
export class PriceSurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Draft (filling user) ───────────────────────────────────────────────

  async getDraft(dto: GetDraftDto, caller: User) {
    const targetUserId = dto.user_id ?? caller.id;
    this.assertCanView(targetUserId, caller);

    const assignment = await this.prisma.userStore.findFirst({
      where: { user_id: targetUserId, store_id: dto.store_id },
    });
    if (!assignment) throw new NotFoundException('This store is not assigned to that user');

    return this.findOrCreateDraft(targetUserId, dto.store_id);
  }

  async saveSubmission(id: string, dto: SaveSubmissionDto, caller: User) {
    const submission = await this.findSubmissionOrFail(id);
    this.assertCanEdit(submission, caller);
    if (submission.submitted_at) throw new BadRequestException('This round has already been submitted');

    const validItemIds = new Set(submission.items.map((i) => i.id));
    for (const item of dto.items) {
      if (!validItemIds.has(item.id)) {
        throw new BadRequestException(`Item ${item.id} does not belong to this submission`);
      }
    }
    for (const note of dto.notes) {
      if (!isValidSyntheseSlot(note.section, note.sub_area)) {
        throw new BadRequestException(`Invalid Synthèse slot: ${note.section} / ${note.sub_area}`);
      }
    }

    await this.prisma.$transaction([
      ...dto.items.map((item) =>
        this.prisma.priceSurveyItem.update({
          where: { id: item.id },
          data: {
            price_normal: item.price_normal,
            price_promo: item.price_promo,
            etat: item.etat,
            competitor_name: item.competitor_name,
            competitor_cl: item.competitor_cl,
            competitor_price_normal: item.competitor_price_normal,
            competitor_price_promo: item.competitor_price_promo,
            competitor_etat: item.competitor_etat,
          },
        }),
      ),
      ...dto.notes.map((note) =>
        this.prisma.priceSurveyNote.upsert({
          where: {
            submission_id_section_sub_area_side: {
              submission_id: id,
              section: note.section,
              sub_area: note.sub_area,
              side: note.side,
            },
          },
          update: { text: note.text },
          create: {
            submission_id: id,
            section: note.section,
            sub_area: note.sub_area,
            side: note.side,
            text: note.text,
          },
        }),
      ),
    ]);

    return this.prisma.priceSurveySubmission.findUniqueOrThrow({ where: { id }, include: DRAFT_INCLUDE });
  }

  async newRound(id: string, caller: User) {
    const submission = await this.findSubmissionOrFail(id);
    this.assertCanEdit(submission, caller);
    if (submission.submitted_at) throw new BadRequestException('This round has already been submitted');

    await this.prisma.priceSurveySubmission.update({ where: { id }, data: { submitted_at: new Date() } });
    return this.findOrCreateDraft(submission.user_id, submission.store_id);
  }

  // ─── History (manage tier) ───────────────────────────────────────────────

  async listSubmissions(query: FindSubmissionsDto) {
    const where: Prisma.PriceSurveySubmissionWhereInput = { submitted_at: { not: null } };
    if (query.user_id) where.user_id = query.user_id;
    if (query.store_id) where.store_id = query.store_id;
    if (query.from || query.to) {
      where.submitted_at = {
        not: null,
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.priceSurveySubmission.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
      include: {
        user: { select: { id: true, full_name: true } },
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.priceSurveySubmission.findUnique({
      where: { id },
      include: DRAFT_INCLUDE,
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  // ─── Assignments (manage tier) ───────────────────────────────────────────

  async getAssignments(query: FindAssignmentsDto) {
    return this.prisma.priceSurveyAssignment.findMany({
      where: { user_id: query.user_id, store_id: query.store_id },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async setAssignments(dto: AssignProductsDto, caller: User) {
    await this.assertProductsExist(dto.product_ids);

    const existing = await this.prisma.priceSurveyAssignment.findMany({
      where: { user_id: dto.user_id, store_id: dto.store_id },
    });
    const existingByProduct = new Map(existing.map((e) => [e.product_id, e]));
    const desiredIds = new Set(dto.product_ids);

    await this.prisma.$transaction([
      ...existing
        .filter((e) => !desiredIds.has(e.product_id))
        .map((e) => this.prisma.priceSurveyAssignment.delete({ where: { id: e.id } })),
      ...dto.product_ids
        .filter((id) => !existingByProduct.has(id))
        .map((product_id) =>
          this.prisma.priceSurveyAssignment.create({
            data: { user_id: dto.user_id, store_id: dto.store_id, product_id },
          }),
        ),
    ]);

    if (dto.user_id !== caller.id) {
      await this.notifications.createForUsers([dto.user_id], {
        type: NotificationType.price_survey_products_assigned,
        title: 'Price survey products updated',
        body: 'Your product list for a price survey has been updated.',
        link: '/price-surveys',
      });
    }

    return this.prisma.priceSurveyAssignment.findMany({
      where: { user_id: dto.user_id, store_id: dto.store_id },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Get-or-create the live draft for (userId, storeId), then reconcile its
   * items against the current assignment list — this is how an admin
   * adding/removing products mid-round shows up the next time either side
   * loads the draft, without a separate sync step. Removing a product mid-
   * round drops its in-progress values from the open draft; already-
   * submitted rounds are untouched since they're separate, immutable rows.
   */
  private async findOrCreateDraft(userId: string, storeId: string) {
    let submission = await this.prisma.priceSurveySubmission.findFirst({
      where: { user_id: userId, store_id: storeId, submitted_at: null },
      include: DRAFT_INCLUDE,
    });

    const assignments = await this.prisma.priceSurveyAssignment.findMany({
      where: { user_id: userId, store_id: storeId },
    });

    if (!submission) {
      return this.prisma.priceSurveySubmission.create({
        data: {
          user_id: userId,
          store_id: storeId,
          items: { create: assignments.map((a) => ({ product_id: a.product_id })) },
        },
        include: DRAFT_INCLUDE,
      });
    }

    const assignedIds = new Set(assignments.map((a) => a.product_id));
    const existingIds = new Set(submission.items.map((i) => i.product_id));
    const toAdd = assignments.filter((a) => !existingIds.has(a.product_id));
    const toRemove = submission.items.filter((i) => !assignedIds.has(i.product_id));

    if (toAdd.length || toRemove.length) {
      await this.prisma.$transaction([
        ...(toRemove.length
          ? [this.prisma.priceSurveyItem.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } })]
          : []),
        ...(toAdd.length
          ? [
              this.prisma.priceSurveyItem.createMany({
                data: toAdd.map((a) => ({ submission_id: submission!.id, product_id: a.product_id })),
              }),
            ]
          : []),
      ]);
      submission = await this.prisma.priceSurveySubmission.findUniqueOrThrow({
        where: { id: submission.id },
        include: DRAFT_INCLUDE,
      });
    }

    return submission;
  }

  /** Manage-tier (super_admin/admin) may view anyone; everyone else only themselves. */
  private assertCanView(targetUserId: string, caller: User) {
    const isManage = caller.role === UserRole.super_admin || caller.role === UserRole.admin;
    if (!isManage && caller.id !== targetUserId) {
      throw new ForbiddenException('You may only access your own price survey');
    }
  }

  /**
   * Only super_admin may edit someone else's submission — admin manages
   * assignments/history but does not edit another user's filled-in values
   * or trigger their reset; that stays with the filling user.
   */
  private assertCanEdit(submission: { user_id: string }, caller: User) {
    if (caller.role === UserRole.super_admin) return;
    if (submission.user_id !== caller.id) {
      throw new ForbiddenException('You may only edit your own price survey');
    }
  }

  private async assertProductsExist(ids: string[]) {
    const unique = Array.from(new Set(ids));
    if (!unique.length) return;
    const count = await this.prisma.product.count({ where: { id: { in: unique } } });
    if (count !== unique.length) throw new BadRequestException('One or more products were not found');
  }

  private async findSubmissionOrFail(id: string) {
    const submission = await this.prisma.priceSurveySubmission.findUnique({
      where: { id },
      include: DRAFT_INCLUDE,
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }
}
