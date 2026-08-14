import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

const product = {
  id: 'b0759b92-e576-4f01-80fa-927b905fab2e',
  name: 'Sparkling Water 500ml',
  sku: 'SKU-500',
  category: 'Beverages',
  distributeur: 'Sample Distributor',
  famille: 'Boissons',
  sous_famille: 'Sodas',
  format: '500ml',
  created_at: new Date('2026-01-01T00:00:00Z'),
};

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('update delegates to the service and returns the updated product', async () => {
    const dto = { name: 'Updated' };
    service.update.mockResolvedValue({ ...product, ...dto });

    await expect(controller.update(product.id, dto)).resolves.toMatchObject(dto);
    expect(service.update).toHaveBeenCalledWith(product.id, dto);
  });

  it('remove delegates to the service', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(product.id)).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(product.id);
  });
});
