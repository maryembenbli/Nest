import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/order.entity';
import {
  DeliveryIntegration,
  DeliveryIntegrationDocument,
} from './delivery-integration.entity';
import {
  DELIVERY_PROVIDER_DEFINITIONS,
  getDeliveryProviderDefinition,
} from './delivery.providers';
import { TestDeliveryIntegrationDto } from './dto/test-delivery-integration.dto';
import { UpdateDeliveryIntegrationDto } from './dto/update-delivery-integration.dto';
import { CreateDeliveryTicketDto } from './dto/create-delivery-ticket.dto';
import { ColisExpressProvider } from './providers/colis-express.provider';
import { DeliveryProviderClient } from './providers/delivery-provider.interface';

type DeliveryOrderTracking = {
  _id: Types.ObjectId | string;
  customerName: string;
  phone: string;
  city?: string;
  total: number;
  status: string;
  deliveryCompany?: string;
  deliveryProvider?: string;
  deliveryTrackingCode?: string;
  deliveryStatus?: string;
  deliveryStatusLabel?: string;
  deliverySyncedAt?: Date;
  createdAt?: Date;
};

@Injectable()
export class DeliveryService {
  private readonly providerClients: Record<string, DeliveryProviderClient>;

  constructor(
    @InjectModel(DeliveryIntegration.name)
    private readonly deliveryIntegrationModel: Model<DeliveryIntegrationDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly colisExpressProvider: ColisExpressProvider,
  ) {
    this.providerClients = {
      'colis-express': this.colisExpressProvider,
    };
  }

  private ensureValidOrderId(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Identifiant de commande invalide.');
    }
  }

  private ensureSuperAdmin(isSuperAdmin?: boolean) {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Seul le super admin peut gerer les integrations livraison.',
      );
    }
  }

  private normalizeConfig(
    providerKey: string,
    integration?: DeliveryIntegrationDocument | null,
  ) {
    const provider = getDeliveryProviderDefinition(providerKey);
    if (!provider) {
      throw new NotFoundException('Fournisseur de livraison introuvable.');
    }

    return {
      provider,
      config: {
        enabled: integration?.enabled || false,
        apiCode: integration?.credentials?.apiCode || '',
        apiKey: integration?.credentials?.apiKey || '',
        username: integration?.credentials?.username || '',
        password: integration?.credentials?.password || '',
        shippingCost: String(integration?.settings?.shippingCost || ''),
        returnCost: String(integration?.settings?.returnCost || ''),
        storeName: String(integration?.settings?.storeName || ''),
        storePhone: String(integration?.settings?.storePhone || ''),
        storeAddress: String(integration?.settings?.storeAddress || ''),
        taxId: String(integration?.settings?.taxId || ''),
        defaultPieceSize: String(integration?.settings?.defaultPieceSize || '1'),
        serviceType: String(integration?.settings?.serviceType || 'Livraison'),
        testedAt: integration?.testedAt || null,
        lastTestResult: integration?.lastTestResult || null,
      },
    };
  }

  private resolveProviderClient(providerKey: string) {
    const client = this.providerClients[providerKey];
    if (!client) {
      throw new BadRequestException(
        `Le provider ${providerKey} n est pas encore implemente dans NOVIKA.`,
      );
    }
    return client;
  }

  private resolveProviderKeyFromOrder(order: OrderDocument) {
    const currentValue = String(order.deliveryProvider || order.deliveryCompany || '')
      .trim()
      .toLowerCase();

    if (!currentValue) {
      throw new BadRequestException(
        'Aucune societe de livraison n est selectionnee pour cette commande.',
      );
    }

    const byId = DELIVERY_PROVIDER_DEFINITIONS.find(
      (item) => item.id.toLowerCase() === currentValue,
    );
    if (byId) {
      return byId.id;
    }

    const byName = DELIVERY_PROVIDER_DEFINITIONS.find(
      (item) => item.name.toLowerCase() === currentValue,
    );
    if (byName) {
      return byName.id;
    }

    throw new BadRequestException(
      'La societe de livraison selectionnee n est pas supportee.',
    );
  }

  private async getEnabledIntegration(providerKey: string) {
    const integration = await this.deliveryIntegrationModel.findOne({
      providerKey,
      enabled: true,
    });

    if (!integration) {
      throw new BadRequestException(
        'Cette integration livraison n est pas encore active.',
      );
    }

    return integration;
  }

  async listProviders() {
    const integrations = await this.deliveryIntegrationModel.find().lean().exec();
    const configMap = new Map(
      integrations.map((item) => [item.providerKey, item]),
    );

    return DELIVERY_PROVIDER_DEFINITIONS.map((provider) =>
      this.normalizeConfig(provider.id, configMap.get(provider.id) as
        | DeliveryIntegrationDocument
        | null
        | undefined),
    );
  }

  async getProviderConfig(providerKey: string) {
    const integration = await this.deliveryIntegrationModel.findOne({ providerKey });
    return this.normalizeConfig(providerKey, integration);
  }

  async saveProviderConfig(
    providerKey: string,
    dto: UpdateDeliveryIntegrationDto,
    updatedBy: string,
    isSuperAdmin?: boolean,
  ) {
    this.ensureSuperAdmin(isSuperAdmin);
    const provider = getDeliveryProviderDefinition(providerKey);

    if (!provider) {
      throw new NotFoundException('Fournisseur de livraison introuvable.');
    }

    const hasCoreCredentials = Boolean(
      String(dto.apiCode || '').trim() && String(dto.apiKey || '').trim(),
    );
    const normalizedEnabled =
      Boolean(dto.enabled) || hasCoreCredentials;

    const integration = await this.deliveryIntegrationModel.findOneAndUpdate(
      { providerKey },
      {
        $set: {
          providerKey,
          displayName: provider.name,
          enabled: normalizedEnabled,
          updatedBy,
          credentials: {
            apiCode: dto.apiCode || '',
            apiKey: dto.apiKey || '',
            username: dto.username || '',
            password: dto.password || '',
          },
          settings: {
            shippingCost: dto.shippingCost || '',
            returnCost: dto.returnCost || '',
            storeName: dto.storeName || '',
            storePhone: dto.storePhone || '',
            storeAddress: dto.storeAddress || '',
            taxId: dto.taxId || '',
            defaultPieceSize: dto.defaultPieceSize || '1',
            serviceType: dto.serviceType || 'Livraison',
            ...(dto.settings || {}),
          },
        },
      },
      { new: true, upsert: true },
    );

    return this.normalizeConfig(providerKey, integration);
  }

  async testProviderConfig(
    providerKey: string,
    dto: TestDeliveryIntegrationDto,
    isSuperAdmin?: boolean,
  ) {
    this.ensureSuperAdmin(isSuperAdmin);
    const integration = await this.deliveryIntegrationModel.findOne({ providerKey });

    if (!integration) {
      throw new NotFoundException(
        'Configurez d abord cette societe de livraison.',
      );
    }

    const client = this.resolveProviderClient(providerKey);
    const result = await client.testConnection(
      {
        providerKey,
        enabled: integration.enabled,
        credentials: integration.credentials || {},
        settings: integration.settings || {},
      },
      dto.trackingCode,
    );

    integration.testedAt = new Date();
    integration.lastTestResult = result;
    await integration.save();

    return {
      success: true,
      providerKey,
      testedAt: integration.testedAt,
      result,
    };
  }

  async shipOrder(orderId: string, changedBy: string) {
    this.ensureValidOrderId(orderId);

    const order = await this.orderModel.findById(orderId).populate('items.product');
    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    const providerKey = this.resolveProviderKeyFromOrder(order);
    const integration = await this.getEnabledIntegration(providerKey);
    const provider = getDeliveryProviderDefinition(providerKey);
    const client = this.resolveProviderClient(providerKey);

    const shipment = await client.createShipment(order, {
      providerKey,
      enabled: integration.enabled,
      credentials: integration.credentials || {},
      settings: integration.settings || {},
    });

    order.deliveryProvider = providerKey;
    order.deliveryCompany = provider?.name || order.deliveryCompany;
    order.deliveryTrackingCode = shipment.trackingCode;
    order.deliveryStatus = shipment.status;
    order.deliveryStatusLabel = shipment.statusLabel;
    order.deliveryPayload = shipment.payload;
    order.deliverySyncedAt = new Date();
    order.shippedAt = new Date();
    if (order.status === OrderStatus.CONFIRMED) {
      order.status = OrderStatus.DOWNLOADED;
    }
    order.history.push({
      status: order.status,
      changedBy,
      note: `Colis envoye vers ${provider?.name || providerKey}${shipment.trackingCode ? ` (${shipment.trackingCode})` : ''}`,
      date: new Date(),
    } as never);

    const saved = await order.save();
    return saved.populate('items.product');
  }


  async bulkShipOrders(orderIds: string[], providerKey: string, changedBy: string) {
    const uniqueOrderIds = [...new Set((orderIds || []).filter(Boolean))];
    if (!uniqueOrderIds.length) {
      throw new BadRequestException('Aucune commande selectionnee.');
    }

    const provider = getDeliveryProviderDefinition(providerKey);
    if (!provider) {
      throw new NotFoundException('Fournisseur de livraison introuvable.');
    }

    const integration = await this.getEnabledIntegration(providerKey);
    const client = this.resolveProviderClient(providerKey);

    const results: Array<{
      orderId: string;
      success: boolean;
      trackingCode?: string;
      message?: string;
    }> = [];

    for (const orderId of uniqueOrderIds) {
      if (!Types.ObjectId.isValid(orderId)) {
        results.push({ orderId, success: false, message: 'Identifiant de commande invalide.' });
        continue;
      }

      const order = await this.orderModel.findById(orderId).populate('items.product');
      if (!order) {
        results.push({ orderId, success: false, message: 'Commande introuvable.' });
        continue;
      }

      if (order.isDeleted || order.isArchived || order.isAbandoned) {
        results.push({ orderId, success: false, message: 'Commande non eligible pour un envoi transporteur.' });
        continue;
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        results.push({ orderId, success: false, message: 'Seules les commandes confirmees peuvent etre telechargees.' });
        continue;
      }

      try {
        order.deliveryProvider = providerKey;
        order.deliveryCompany = provider.name;

        const shipment = await client.createShipment(order, {
          providerKey,
          enabled: integration.enabled,
          credentials: integration.credentials || {},
          settings: integration.settings || {},
        });

        order.deliveryTrackingCode = shipment.trackingCode;
        order.deliveryStatus = shipment.status;
        order.deliveryStatusLabel = shipment.statusLabel;
        order.deliveryPayload = shipment.payload;
        order.deliverySyncedAt = new Date();
        order.shippedAt = new Date();
        order.status = OrderStatus.DOWNLOADED;
        order.history.push({
          status: OrderStatus.DOWNLOADED,
          changedBy,
          note: `Commande telechargee vers ${provider.name}${shipment.trackingCode ? ` (${shipment.trackingCode})` : ''}`,
          date: new Date(),
        } as never);

        await order.save();
        results.push({ orderId, success: true, trackingCode: shipment.trackingCode, message: shipment.statusLabel });
      } catch (error) {
        order.deliveryProvider = providerKey;
        order.deliveryCompany = provider.name;
        order.history.push({
          status: order.status,
          changedBy,
          note: `Echec du telechargement vers ${provider.name}: ${error instanceof Error ? error.message : 'Erreur transporteur'}`,
          date: new Date(),
        } as never);
        await order.save();
        results.push({
          orderId,
          success: false,
          message: error instanceof Error ? error.message : 'Impossible d envoyer cette commande au transporteur.',
        });
      }
    }

    return {
      providerKey,
      providerName: provider.name,
      total: uniqueOrderIds.length,
      successCount: results.filter((item) => item.success).length,
      failureCount: results.filter((item) => !item.success).length,
      results,
    };
  }

  async refreshShipment(orderId: string, changedBy: string) {
    this.ensureValidOrderId(orderId);

    const order = await this.orderModel.findById(orderId).populate('items.product');
    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    if (!order.deliveryTrackingCode) {
      throw new BadRequestException(
        'Cette commande n a pas encore de code de suivi.',
      );
    }

    const providerKey = this.resolveProviderKeyFromOrder(order);
    const integration = await this.getEnabledIntegration(providerKey);
    const client = this.resolveProviderClient(providerKey);
    const tracking = await client.readShipment(order.deliveryTrackingCode, {
      providerKey,
      enabled: integration.enabled,
      credentials: integration.credentials || {},
      settings: integration.settings || {},
    });

    order.deliveryStatus = tracking.status;
    order.deliveryStatusLabel = tracking.statusLabel;
    order.deliveryPayload = tracking.payload;
    order.deliverySyncedAt = new Date();
    order.history.push({
      status: order.status,
      changedBy,
      note: `Suivi ${order.deliveryCompany || providerKey} synchronise: ${tracking.statusLabel}`,
      date: new Date(),
    } as never);

    const saved = await order.save();
    return saved.populate('items.product');
  }

  async listShipments(providerKey?: string) {
    const query: Record<string, unknown> = {
      isDeleted: false,
      deliveryTrackingCode: { $exists: true, $ne: '' },
    };

    if (providerKey) {
      query.deliveryProvider = providerKey;
    }

    const orders = (await this.orderModel
      .find(query)
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as DeliveryOrderTracking[];

    return orders.map((order) => ({
      orderId: String(order._id),
      customerName: order.customerName,
      phone: order.phone,
      city: order.city || '',
      total: order.total || 0,
      orderStatus: order.status,
      providerKey: order.deliveryProvider || '',
      providerName: order.deliveryCompany || '',
      trackingCode: order.deliveryTrackingCode || '',
      shippingStatus: order.deliveryStatus || '',
      shippingStatusLabel: order.deliveryStatusLabel || order.deliveryStatus || '',
      syncedAt: order.deliverySyncedAt || null,
      createdAt: order.createdAt || null,
    }));
  }

  async requestPickupForOrder(orderId: string, changedBy: string) {
    this.ensureValidOrderId(orderId);
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    if (!order.deliveryTrackingCode) {
      throw new BadRequestException(
        'Cette commande n a pas encore de code barre transport.',
      );
    }

    const providerKey = this.resolveProviderKeyFromOrder(order);
    const integration = await this.getEnabledIntegration(providerKey);
    const client = this.resolveProviderClient(providerKey);
    const result = await client.requestPickup([order.deliveryTrackingCode], {
      providerKey,
      enabled: integration.enabled,
      credentials: integration.credentials || {},
      settings: integration.settings || {},
    });

    order.history.push({
      status: order.status,
      changedBy,
      note: `Demande de pickup envoyee au transporteur ${order.deliveryCompany || providerKey}`,
      date: new Date(),
    } as never);
    await order.save();

    return {
      success: true,
      orderId,
      trackingCode: order.deliveryTrackingCode,
      result,
    };
  }

  async createTicketForOrder(
    orderId: string,
    dto: CreateDeliveryTicketDto,
    changedBy: string,
  ) {
    this.ensureValidOrderId(orderId);
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    if (!order.deliveryTrackingCode) {
      throw new BadRequestException(
        'Cette commande n a pas encore de code barre transport.',
      );
    }

    const providerKey = this.resolveProviderKeyFromOrder(order);
    const integration = await this.getEnabledIntegration(providerKey);
    const client = this.resolveProviderClient(providerKey);
    const result = await client.createTicket(
      order.deliveryTrackingCode,
      dto,
      {
        providerKey,
        enabled: integration.enabled,
        credentials: integration.credentials || {},
        settings: integration.settings || {},
      },
    );

    order.history.push({
      status: order.status,
      changedBy,
      note: `Ticket transport cree: ${dto.motif}`,
      date: new Date(),
    } as never);
    await order.save();

    return {
      success: true,
      orderId,
      trackingCode: order.deliveryTrackingCode,
      result,
    };
  }
}
