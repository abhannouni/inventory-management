import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join, resolve } from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    // In production this should point at a mounted persistent volume
    // (e.g. a Railway volume) — plain container disk is wiped on every deploy.
    this.uploadDir = resolve(this.config.get<string>('UPLOAD_DIR') || './uploads');
  }

  async onModuleInit() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const filename = `${randomUUID()}${extname(file.originalname) || '.jpg'}`;
    await fs.writeFile(join(this.uploadDir, filename), file.buffer);
    // Relative on purpose: an absolute URL (host + port) bypasses the Vite dev
    // proxy and any reverse proxy in front of the API, requiring every client
    // (including other devices on the LAN) to reach the API port directly —
    // which routers/firewalls commonly block even when the proxied port works
    // fine. A relative path always resolves against whatever origin actually
    // served the page, exactly like the existing `/api` calls already do.
    return { url: `/uploads/${filename}` };
  }
}
