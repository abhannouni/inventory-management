import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Visit } from '../../visit/entities/visit.entity';
import { Product } from '../../product/entities/product.entity';

export enum AuditItemStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}

@Entity('audit_items')
export class AuditItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Visit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit: Visit;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int' })
  qty_found: number;

  // Snapshot of ProductStore.expected_qty at audit time so historical variance stays accurate
  @Column({ type: 'int' })
  expected_qty: number;

  @Column({ type: 'int', default: 0 })
  variance: number;

  @Column({ type: 'enum', enum: AuditItemStatus })
  status: AuditItemStatus;

  @Column({ nullable: true })
  photo_url: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @BeforeInsert()
  @BeforeUpdate()
  computeVariance() {
    this.variance = this.qty_found - this.expected_qty;
  }
}
