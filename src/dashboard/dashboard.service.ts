import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/order.entity';
import { Product, ProductDocument } from '../products/product.entity';
import { User, UserDocument } from '../users/user.entity';

type DashboardProductRef = {
  _id?: Types.ObjectId | string;
  name?: string;
  title?: string;
};

type DashboardOrderItem = {
  product?: Types.ObjectId | string | DashboardProductRef;
  quantity?: number;
  price?: number;
  deliveryFee?: number;
};

type DashboardOrder = {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  status?: string;
  total?: number;
  city?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  isAbandoned?: boolean;
  items?: DashboardOrderItem[];
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private isSameDay(left: Date, right: Date) {
    return left.toDateString() === right.toDateString();
  }

  private isSameMonth(left: Date, right: Date) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  private startOfWeek(date: Date) {
    const clone = new Date(date);
    const day = clone.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    clone.setDate(clone.getDate() + diff);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private startOfDay(date: Date) {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private startOfMonth(date: Date) {
    const clone = new Date(date);
    clone.setDate(1);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private endOfMonth(date: Date) {
    const clone = new Date(date);
    clone.setMonth(clone.getMonth() + 1, 0);
    clone.setHours(23, 59, 59, 999);
    return clone;
  }

  private addMonths(date: Date, offset: number) {
    const clone = new Date(date);
    clone.setMonth(clone.getMonth() + offset);
    return clone;
  }

  private formatShortDate(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatMonthLabel(date: Date) {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  private toDate(value?: Date | string) {
    return value ? new Date(value) : new Date();
  }

  async summary(monthOffset = 0) {
    const [orders, products, usersCount] = await Promise.all([
      this.orderModel.find().populate('items.product').sort({ createdAt: -1 }).lean().exec() as Promise<DashboardOrder[]>,
      this.productModel.find().lean().exec(),
      this.userModel.countDocuments().exec(),
    ]);

    const now = new Date();
    const targetMonthDate = this.addMonths(now, monthOffset);
    const targetMonthStart = this.startOfMonth(targetMonthDate);
    const targetMonthEnd = this.endOfMonth(targetMonthDate);
    const weekStart = this.startOfWeek(now);

    const visibleOrders = orders.filter((order) => !order.isDeleted);
    const businessOrders = visibleOrders.filter((order) => !order.isAbandoned);
    const abandonedOrders = visibleOrders.filter((order) => !!order.isAbandoned);
    const archivedOrders = businessOrders.filter((order) => !!order.isArchived);

    const todayLeads = visibleOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), now));
    const todayOrders = businessOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), now));
    const todayAbandoned = abandonedOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), now));

    const weekLeads = visibleOrders.filter((order) => this.toDate(order.createdAt) >= weekStart);
    const weekOrders = businessOrders.filter((order) => this.toDate(order.createdAt) >= weekStart);
    const weekAbandoned = abandonedOrders.filter((order) => this.toDate(order.createdAt) >= weekStart);

    const monthLeads = visibleOrders.filter((order) => this.isSameMonth(this.toDate(order.createdAt), targetMonthDate));
    const monthOrders = businessOrders.filter((order) => this.isSameMonth(this.toDate(order.createdAt), targetMonthDate));
    const monthAbandoned = abandonedOrders.filter((order) => this.isSameMonth(this.toDate(order.createdAt), targetMonthDate));

    const revenueToday = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const revenueWeek = weekOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const revenueMonth = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const revenueTotal = businessOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const pendingCount = businessOrders.filter((order) => order.status === 'en_attente').length;
    const attemptCount = businessOrders.filter((order) => order.status === 'tentative1').length;
    const confirmedCount = businessOrders.filter((order) => order.status === 'confirmee').length;
    const packedCount = businessOrders.filter((order) => order.status === 'emballee').length;
    const deliveredCount = businessOrders.filter((order) => order.status === 'livree').length;
    const rejectedCount = businessOrders.filter((order) => order.status === 'rejetee').length;
    const returnedCount = businessOrders.filter((order) => order.status === 'retournee').length;

    const convertedCount = businessOrders.filter((order) => ['confirmee', 'emballee', 'livree'].includes(order.status || '')).length;

    const totalLeads = visibleOrders.length;
    const conversionRate = totalLeads ? Math.round((businessOrders.length / totalLeads) * 100) : 0;
    const abandonmentRate = totalLeads ? Math.round((abandonedOrders.length / totalLeads) * 100) : 0;
    const deliveredPercent = businessOrders.length ? Math.round((deliveredCount / businessOrders.length) * 100) : 0;
    const returnedPercent = businessOrders.length ? Math.round((returnedCount / businessOrders.length) * 100) : 0;
    const confirmedPercent = totalLeads ? Math.round((convertedCount / totalLeads) * 100) : 0;
    const abandonedPercent = totalLeads ? Math.round((abandonedOrders.length / totalLeads) * 100) : 0;

    const daysInTargetMonth = targetMonthEnd.getDate();
    const dailySeries = Array.from({ length: daysInTargetMonth }, (_, index) => {
      const date = this.startOfDay(new Date(targetMonthStart));
      date.setDate(targetMonthStart.getDate() + index);

      const dayLeads = visibleOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), date));
      const dayOrders = businessOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), date));
      const dayAbandoned = abandonedOrders.filter((order) => this.isSameDay(this.toDate(order.createdAt), date));

      return {
        label: this.formatShortDate(date),
        leads: dayLeads.length,
        orders: dayOrders.length,
        abandoned: dayAbandoned.length,
        revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      };
    });

    const productMap = new Map<string, { name: string; orders: number; revenue: number }>();
    for (const order of monthOrders) {
      for (const item of order.items || []) {
        const product = item.product;
        const id = typeof product === 'string' || product instanceof Types.ObjectId
          ? String(product)
          : String(product?._id || product?.name || 'unknown');
        const name = typeof product === 'string' || product instanceof Types.ObjectId
          ? String(product)
          : product?.name || product?.title || 'Produit';
        const current = productMap.get(id) || { name, orders: 0, revenue: 0 };
        current.orders += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0) + Number(item.deliveryFee || 0);
        productMap.set(id, current);
      }
    }

    const topProducts = [...productMap.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5);

    const cityMap = new Map<string, { leads: number; orders: number; revenue: number }>();
    for (const order of visibleOrders) {
      const city = String(order.city || 'Non renseignee').trim() || 'Non renseignee';
      const current = cityMap.get(city) || { leads: 0, orders: 0, revenue: 0 };
      current.leads += 1;
      if (!order.isAbandoned) {
        current.orders += 1;
        current.revenue += Number(order.total || 0);
      }
      cityMap.set(city, current);
    }
    const topCities = [...cityMap.entries()]
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((left, right) => right.revenue - left.revenue || right.leads - left.leads)
      .slice(0, 5);

    const categoryMap = new Map<string, number>();
    for (const product of products) {
      const productCategories = Array.isArray(product.categories) && product.categories.length
        ? product.categories
        : ['Sans categorie'];
      for (const category of productCategories) {
        const key = String(category || 'Sans categorie').trim() || 'Sans categorie';
        categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
      }
    }
    const categoryDistribution = [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      today: {
        leadsCount: todayLeads.length,
        ordersCount: todayOrders.length,
        abandonedCount: todayAbandoned.length,
        revenue: revenueToday,
      },
      week: {
        leadsCount: weekLeads.length,
        ordersCount: weekOrders.length,
        abandonedCount: weekAbandoned.length,
        revenue: revenueWeek,
      },
      month: {
        leadsCount: monthLeads.length,
        ordersCount: monthOrders.length,
        abandonedCount: monthAbandoned.length,
        revenue: revenueMonth,
        label: this.formatMonthLabel(targetMonthDate),
        offset: monthOffset,
      },
      totals: {
        leads: totalLeads,
        orders: businessOrders.length,
        products: products.length,
        users: usersCount,
        revenue: revenueTotal,
        archived: archivedOrders.length,
        deleted: orders.filter((order) => order.isDeleted).length,
      },
      pipeline: {
        conversionRate,
        abandonmentRate,
        totalLeads,
        realOrders: businessOrders.length,
        abandonedLeads: abandonedOrders.length,
      },
      tracking: {
        deliveredPercent,
        returnedPercent,
        confirmedPercent,
        abandonedPercent,
      },
      traffic: {
        confirmedCount: convertedCount,
        abandonedCount: abandonedOrders.length,
        confirmedPercent,
        abandonedPercent,
      },
      statuses: {
        pending: pendingCount,
        attempt1: attemptCount,
        confirmed: confirmedCount,
        packed: packedCount,
        delivered: deliveredCount,
        rejected: rejectedCount,
        returned: returnedCount,
      },
      callStats: {
        pendingCalls: pendingCount,
        followUps: attemptCount,
        answeredRate: businessOrders.length ? Math.round((convertedCount / businessOrders.length) * 100) : 0,
        rejectedAfterCall: rejectedCount,
      },
      productTests: {
        testedProducts: topProducts.length,
        topProducts,
      },
      topCities,
      categoryDistribution,
      dailySeries,
    };
  }
}
