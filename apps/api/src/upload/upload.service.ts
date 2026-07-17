import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join, resolve } from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    // In production this should point at a mounted persistent volume
    // (e.g. a Railway volume) — plain container disk is wiped on every deploy.
    this.uploadDir = resolve(this.config.get<string>('UPLOAD_DIR') || './uploads');
    // Only set this when the app that serves /uploads is on a different origin
    // than the frontend (e.g. separate Railway services) — set it to the API's
    // own public URL. Leave unset when one process serves both (local dev
    // through the Vite proxy, or a single combined Railway service): a relative
    // path then correctly resolves against whichever origin served the page.
    this.baseUrl = (this.config.get<string>('APP_URL') || '').replace(/\/+$/, '');
  }

  async onModuleInit() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const filename = `${randomUUID()}${extname(file.originalname) || '.jpg'}`;
    await fs.writeFile(join(this.uploadDir, filename), file.buffer);
    const path = `/uploads/${filename}`;
    return { url: this.baseUrl ? `${this.baseUrl}${path}` : path };
  }
}
