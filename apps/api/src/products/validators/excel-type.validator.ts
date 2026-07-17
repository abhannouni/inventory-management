import { FileValidator } from '@nestjs/common';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

export class ExcelTypeValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;
    return (
      ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      /\.(xlsx|xls)$/i.test(file.originalname)
    );
  }

  buildErrorMessage(): string {
    return 'Only Excel files are allowed (.xlsx, .xls)';
  }
}
