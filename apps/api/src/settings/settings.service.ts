import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_FLAGS } from './feature-flags.registry';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllFlags() {
    const rows = await this.prisma.featureFlag.findMany();
    const enabledByKey = new Map(rows.map((r) => [r.key, r.enabled]));
    return FEATURE_FLAGS.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      enabled: enabledByKey.get(def.key) ?? def.default,
    }));
  }

  /** Used by other modules (e.g. visits) to branch behavior on a flag. */
  async isEnabled(key: string): Promise<boolean> {
    const def = this.requireDef(key);
    const row = await this.prisma.featureFlag.findUnique({ where: { key } });
    return row?.enabled ?? def.default;
  }

  async setEnabled(key: string, enabled: boolean) {
    const def = this.requireDef(key);
    await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });
    return { key, label: def.label, description: def.description, enabled };
  }

  private requireDef(key: string) {
    const def = FEATURE_FLAGS.find((f) => f.key === key);
    if (!def) throw new NotFoundException(`Unknown feature flag: ${key}`);
    return def;
  }
}
