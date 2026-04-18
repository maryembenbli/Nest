import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAbandonedOrderDto } from './dto/create-abandoned-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from './order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
  ) {}

  private ensureValidId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order id');
    }
  }

  private normalizePhone(phone: string) {
    return String(phone || '').trim();
  }

  private mapItems(items: Array<{ product: string; quantity: number; price: number; deliveryFee?: number }> = []) {
    return items.map((item) => ({
      ...item,
      deliveryFee: item.deliveryFee || 0,
    }));
  }

  private calculateTotal(items: Array<{ quantity: number; price: number; deliveryFee?: number }> = []) {
    return items.reduce(
      (sum, item) => sum + item.price * item.quantity + (item.deliveryFee || 0),
      0,
    );
  }

  private async findRecoverableAbandonedOrder(phone: string, firstProductId?: string) {
    const query: Record<string, unknown> = {
      phone,
      isAbandoned: true,
      isDeleted: false,
      isArchived: false,
    };

    if (firstProductId && Types.ObjectId.isValid(firstProductId)) {
      query['items.product'] = new Types.ObjectId(firstProductId);
    }

    return this.orderModel.findOne(query).sort({ updatedAt: -1 });
  }

  async create(data: CreateOrderDto) {
    const phone = this.normalizePhone(data.phone);
    const items = this.mapItems(data.items);
    const total = this.calculateTotal(items);
    const recoverableOrder = await this.findRecoverableAbandonedOrder(phone, items[0]?.product);

    if (recoverableOrder) {
      recoverableOrder.customerName = data.customerName.trim();
      recoverableOrder.phone = phone;
      recoverableOrder.city = data.city?.trim() || '';
      recoverableOrder.address = data.address?.trim() || '';
      recoverableOrder.email = data.email?.trim() || '';
      recoverableOrder.customerNote = data.customerNote?.trim() || '';
      recoverableOrder.deliveryCompany = data.deliveryCompany?.trim() || '';
      recoverableOrder.privateNote = data.privateNote?.trim() || recoverableOrder.privateNote || '';
      recoverableOrder.exchange = !!data.exchange;
      recoverableOrder.items = items as unknown as typeof recoverableOrder.items;
      recoverableOrder.total = total;
      recoverableOrder.status = OrderStatus.PENDING;
      recoverableOrder.isAbandoned = false;
      recoverableOrder.abandonedAt = undefined;
      recoverableOrder.history.push({
        status: OrderStatus.PENDING,
        changedBy: data.email || data.customerName,
        note: 'Commande finalisee apres abandon',
        date: new Date(),
      } as never);

      const savedRecovered = await recoverableOrder.save();
      return savedRecovered.populate('items.product');
    }

    return this.orderModel.create({
      ...data,
      phone,
      status: OrderStatus.PENDING,
      items,
      total,
      history: [
        {
          status: OrderStatus.PENDING,
          changedBy: data.email || data.customerName,
          note: 'Commande creee',
          date: new Date(),
        },
      ],
      isArchived: false,
      isDeleted: false,
      isAbandoned: false,
    });
  }

  async createAbandoned(data: CreateAbandonedOrderDto) {
    const phone = this.normalizePhone(data.phone);
    if (!phone) {
      throw new BadRequestException('Phone is required');
    }

    const items = this.mapItems(data.items || []);
    const total = this.calculateTotal(items);
    const existing = await this.findRecoverableAbandonedOrder(phone, items[0]?.product);

    if (existing) {
      existing.customerName = data.customerName?.trim() || existing.customerName || 'Client abandonne';
      existing.phone = phone;
      existing.city = data.city?.trim() || existing.city || '';
      existing.address = data.address?.trim() || existing.address || '';
      existing.email = data.email?.trim() || existing.email || '';
      existing.customerNote = data.customerNote?.trim() || existing.customerNote || '';
      existing.deliveryCompany = data.deliveryCompany?.trim() || existing.deliveryCompany || '';
      existing.exchange = typeof data.exchange === 'boolean' ? data.exchange : existing.exchange;
      if (items.length) {
        existing.items = items as unknown as typeof existing.items;
        existing.total = total;
      }
      existing.isAbandoned = true;
      existing.abandonedAt = new Date();
      existing.history.push({
        status: existing.status || OrderStatus.PENDING,
        changedBy: data.email || data.customerName || phone,
        note: `Commande abandonnee mise a jour automatiquement${data.source ? ` (${data.source})` : ''}`,
        date: new Date(),
      } as never);

      const savedExisting = await existing.save();
      return savedExisting.populate('items.product');
    }

    return this.orderModel.create({
      customerName: data.customerName?.trim() || 'Client abandonne',
      phone,
      city: data.city?.trim() || '',
      address: data.address?.trim() || '',
      email: data.email?.trim() || '',
      customerNote: data.customerNote?.trim() || '',
      deliveryCompany: data.deliveryCompany?.trim() || '',
      privateNote: '',
      exchange: !!data.exchange,
      status: OrderStatus.PENDING,
      items,
      total,
      history: [
        {
          status: OrderStatus.PENDING,
          changedBy: data.email || data.customerName || phone,
          note: `Commande abandonnee detectee automatiquement${data.source ? ` (${data.source})` : ''}`,
          date: new Date(),
        },
      ],
      isArchived: false,
      isDeleted: false,
      isAbandoned: true,
      abandonedAt: new Date(),
    });
  }

  findAll() {
    return this.orderModel
      .find()
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findOne(id: string) {
    this.ensureValidId(id);

    const order = await this.orderModel
      .findById(id)
      .populate('items.product')
      .lean()
      .exec();

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  async update(id: string, data: UpdateOrderDto, changedBy = 'dashboard-admin') {
    this.ensureValidId(id);

    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (data.items) {
      order.items = this.mapItems(data.items) as unknown as typeof order.items;
      order.total = this.calculateTotal(data.items);
    }

    if (data.status && data.status !== order.status) {
      order.history.push({
        status: data.status,
        changedBy,
        note: 'Statut modifie',
        date: new Date(),
      } as never);
      order.status = data.status;
    }

    Object.assign(order, {
      ...data,
      items: order.items,
      total: order.total,
      status: order.status,
      history: order.history,
    });

    const saved = await order.save();
    return saved.populate('items.product');
  }

  async remove(id: string, changedBy = 'dashboard-admin') {
    this.ensureValidId(id);
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    order.isDeleted = true;
    order.deletedAt = new Date();
    order.history.push({
      status: order.status,
      changedBy,
      note: 'Commande supprimee',
      date: new Date(),
    } as never);
    const saved = await order.save();

    return {
      message: 'Order deleted',
      order: await saved.populate('items.product'),
    };
  }

  async archive(id: string, changedBy = 'dashboard-admin') {
    this.ensureValidId(id);
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    order.isArchived = true;
    order.archivedAt = new Date();
    order.history.push({
      status: order.status,
      changedBy,
      note: 'Commande archivee',
      date: new Date(),
    } as never);

    const saved = await order.save();
    return saved.populate('items.product');
  }

  async restore(id: string, changedBy = 'dashboard-admin') {
    this.ensureValidId(id);
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    order.isArchived = false;
    order.archivedAt = undefined;
    order.isDeleted = false;
    order.deletedAt = undefined;
    order.history.push({
      status: order.status,
      changedBy,
      note: 'Commande restauree',
      date: new Date(),
    } as never);

    const saved = await order.save();
    return saved.populate('items.product');
  }
}

