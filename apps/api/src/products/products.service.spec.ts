import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

const product = {
  id: 'b0759b92-e576-4f01-80fa-927b905fab2e',
  name: 'Coca Cola 500ml',
  sku: 'CC-500',
  category: 'Beverages',
  distributeur: 'Coca-Cola Company',
  famille: 'Boissons',
  sous_famille: 'Sodas',
  format: '500ml',
  created_at: new Date('2026-01-01T00:00:00Z'),
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('updates an existing product', async () => {
      const dto = { name: 'Coca Cola Zero 500ml', category: 'Sodas' };
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, ...dto });

      const result = await service.update(product.id, dto);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: product.id },
        data: dto,
      });
      expect(result.name).toBe('Coca Cola Zero 500ml');
    });

    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new SKU belongs to another product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.findFirst.mockResolvedValue({ ...product, id: 'other-id' });

      await expect(service.update(product.id, { sku: 'TAKEN-1' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'TAKEN-1', NOT: { id: product.id } },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('allows resubmitting the product own SKU unchanged', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue(product);

      await expect(service.update(product.id, { sku: product.sku })).resolves.toEqual(
        product,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.delete.mockResolvedValue(product);

      await service.remove(product.id);

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: product.id } });
    });

    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rejects a duplicate SKU', async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(
        service.create({ ...product, sku: product.sku } as never),
      ).rejects.toThrow(ConflictException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });
});
