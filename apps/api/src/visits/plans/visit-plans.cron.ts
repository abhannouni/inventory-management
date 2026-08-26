import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, UserRole, VisitPlanStatus } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VisitPlansCron {
  private readonly logger = new Logger(VisitPlansCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDaily() {
    await this.sendUpcomingMonthReminders();
    await this.sendMissingPlanAlerts();
  }

  /**
   * Once 3 or fewer days remain in the current month, nudge every supervisor who
   * hasn't submitted next month's plan yet. Dedupe via `reminder_sent_at` on that
   * (as-yet-empty) target-month row, created on first touch here.
   *
   * Supervisors only: a merchandiser's month is filled in by a reviewer, so
   * there is nothing to nudge them about — the reviewer gets told instead, by
   * `sendMissingPlanAlerts` below.
   */
  private async sendUpcomingMonthReminders() {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - today.getDate() + 1;
    if (daysLeft > 3) return;

    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = next.getFullYear();
    const month = next.getMonth() + 1;

    const supervisors = await this.prisma.user.findMany({
      where: { role: UserRole.supervisor, is_active: true },
      select: { id: true },
    });

    for (const supervisor of supervisors) {
      const plan = await this.prisma.visitPlan.upsert({
        where: { user_id_year_month: { user_id: supervisor.id, year, month } },
        update: {},
        create: { user_id: supervisor.id, year, month },
      });
      if (plan.submitted_at || plan.reminder_sent_at) continue;

      await this.notifications.createForUsers([supervisor.id], {
        type: NotificationType.visit_plan_reminder,
        title: `Only a few days left to plan your visits for ${month}/${year}`,
        link: '/visit-planning',
        metadata: { year, month },
      });
      await this.prisma.visitPlan.update({ where: { id: plan.id }, data: { reminder_sent_at: new Date() } });
    }

    this.logger.log(`Upcoming-month reminder pass done for ${month}/${year}`);
  }

  /**
   * Once the month has started, alert every reviewer about the field users whose
   * month is still empty — supervisors who haven't submitted one, and
   * merchandisers nobody has planned for. Dedupe via `missing_alert_sent_at`.
   */
  private async sendMissingPlanAlerts() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const reviewers = await this.prisma.user.findMany({
      where: { custom_role: { permissions: { some: { permission: { code: 'visit_plans.review' } } } } },
      select: { id: true },
    });
    if (!reviewers.length) return;

    const fieldUsers = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.supervisor, UserRole.merchandiser] }, is_active: true },
      select: { id: true, full_name: true, role: true },
    });

    for (const fieldUser of fieldUsers) {
      const plan = await this.prisma.visitPlan.upsert({
        where: { user_id_year_month: { user_id: fieldUser.id, year, month } },
        update: {},
        create: { user_id: fieldUser.id, year, month },
      });
      // An approved merchandiser month was never "submitted" — check both.
      if (plan.submitted_at || plan.status === VisitPlanStatus.approved || plan.missing_alert_sent_at) continue;

      const title =
        fieldUser.role === UserRole.merchandiser
          ? `Nobody has planned ${fieldUser.full_name}'s visits for ${month}/${year} yet`
          : `${fieldUser.full_name} hasn't planned their visits for ${month}/${year} yet`;

      await this.notifications.createForUsers(
        reviewers.map((r) => r.id),
        {
          type: NotificationType.visit_plan_missing,
          title,
          link: `/visit-planning?tab=review&userId=${fieldUser.id}`,
          metadata: { year, month, actorName: fieldUser.full_name, userId: fieldUser.id, role: fieldUser.role },
        },
      );
      await this.prisma.visitPlan.update({ where: { id: plan.id }, data: { missing_alert_sent_at: new Date() } });
    }

    this.logger.log(`Missing-plan alert pass done for ${month}/${year}`);
  }
}
