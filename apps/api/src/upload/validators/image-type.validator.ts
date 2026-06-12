import { FileValidator } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export class ImageTypeValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;
    return ALLOWED_MIME_TYPES.includes(file.mimetype);
  }

  buildErrorMessage(): string {
    return `Only image files are allowed (${ALLOWED_MIME_TYPES.join(', ')})`;
  }
}
