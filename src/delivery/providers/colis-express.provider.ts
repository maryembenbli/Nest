import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderDocument } from '../../orders/order.entity';
import {
  DeliveryConfigShape,
  DeliveryProviderClient,
  DeliveryShipmentResult,
  DeliveryTrackingResult,
} from './delivery-provider.interface';

@Injectable()
export class ColisExpressProvider implements DeliveryProviderClient {
  providerKey = 'colis-express';
  private readonly baseUrl = 'https://api.coliexpres.com/v2';

  private ensureCredentials(config: DeliveryConfigShape) {
    const codeApi = String(config.credentials.apiCode || '').trim();
    const apiKey = String(config.credentials.apiKey || '').trim();

    if (!codeApi || !apiKey) {
      throw new BadRequestException(
        'Code API et cle API Colis Express requis.',
      );
    }

    return { codeApi, apiKey };
  }

  private async request<T>(
    path: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let payload: unknown = text;

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      const details =
        typeof payload === 'object' && payload !== null
          ? String(
              (payload as Record<string, unknown>).message ||
                (payload as Record<string, unknown>).error ||
                (payload as Record<string, unknown>).libelle ||
                (payload as Record<string, unknown>).raw ||
                '',
            ).trim()
          : '';
      throw new BadRequestException(
        details
          ? `Colis Express API error (${response.status}): ${details}`
          : `Colis Express API error (${response.status})`,
      );
    }

    return payload as T;
  }

  private validateOrderForShipment(order: OrderDocument) {
    if (!String(order.phone || '').trim()) {
      throw new BadRequestException('Numero de telephone client requis pour Colis Express.');
    }
    if (!String(order.customerName || '').trim()) {
      throw new BadRequestException('Nom client requis pour Colis Express.');
    }
    if (!String(order.city || '').trim()) {
      throw new BadRequestException('Ville requise pour Colis Express.');
    }
    if (!String(order.address || '').trim()) {
      throw new BadRequestException('Adresse requise pour Colis Express.');
    }
  }

  private extractTrackingCode(payload: Record<string, unknown>) {
    const candidates = [
      payload.code_barre,
      payload.codeBarre,
      payload.reference,
      payload.barcode,
      payload.trackingCode,
      payload.id,
    ];

    const code = candidates.find(
      (value) => value !== undefined && value !== null && String(value).trim(),
    );

    return code ? String(code) : '';
  }

  private normalizeStatus(payload: Record<string, unknown>) {
    const candidates = [
      payload.status,
      payload.etat,
      payload.statut,
      payload.libelle,
      payload.message,
    ];

    const raw = candidates.find(
      (value) => value !== undefined && value !== null && String(value).trim(),
    );

    const label = raw ? String(raw) : 'Colis cree';
    const normalized = label
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

    return { normalized, label };
  }

  async testConnection(
    config: DeliveryConfigShape,
    trackingCode?: string,
  ): Promise<Record<string, unknown>> {
    const { codeApi, apiKey } = this.ensureCredentials(config);

    if (!trackingCode) {
      return {
        success: true,
        provider: this.providerKey,
        message:
          'Configuration enregistree. Ajoutez un code barre si vous voulez tester la lecture d un colis.',
      };
    }

    const query = new URLSearchParams({
      code_api: codeApi,
      cle_api: apiKey,
      code_barre: trackingCode,
    });

    const payload = await this.request<Record<string, unknown>>(
      `/read?${query.toString()}`,
      { method: 'GET' },
    );

    return {
      success: true,
      provider: this.providerKey,
      trackingCode,
      payload,
    };
  }

  async createShipment(
    order: OrderDocument,
    config: DeliveryConfigShape,
  ): Promise<DeliveryShipmentResult> {
    const { codeApi, apiKey } = this.ensureCredentials(config);
    this.validateOrderForShipment(order);
    const firstItem = order.items?.[0];
    const payload = await this.request<Record<string, unknown>>('/create', {
      method: 'POST',
      body: JSON.stringify({
        code_api: codeApi,
        cle_api: apiKey,
        tel: order.phone,
        nom_prenom: order.customerName || 'Client NOVIKA',
        ville: order.city || '',
        delegation: order.city || '',
        cod: String(order.total || 0),
        libelle:
          firstItem && typeof firstItem.product !== 'string'
            ? (firstItem.product as unknown as { name?: string; title?: string })
                ?.name ||
              (firstItem.product as unknown as { name?: string; title?: string })
                ?.title ||
              'Commande NOVIKA'
            : 'Commande NOVIKA',
        nb_piece: String(config.settings.defaultPieceSize || '1'),
        adresse: order.address || '',
        remarque: order.customerNote || '',
        tel_2: '',
        service: order.exchange
          ? 'Echange'
          : String(config.settings.serviceType || 'Livraison'),
      }),
    });

    const trackingCode = this.extractTrackingCode(payload);
    const status = this.normalizeStatus(payload);

    return {
      trackingCode,
      status: status.normalized,
      statusLabel: status.label,
      payload,
    };
  }

  async readShipment(
    trackingCode: string,
    config: DeliveryConfigShape,
  ): Promise<DeliveryTrackingResult> {
    const { codeApi, apiKey } = this.ensureCredentials(config);
    const query = new URLSearchParams({
      code_api: codeApi,
      cle_api: apiKey,
      code_barre: trackingCode,
    });

    const payload = await this.request<Record<string, unknown>>(
      `/read?${query.toString()}`,
      { method: 'GET' },
    );
    const status = this.normalizeStatus(payload);

    return {
      trackingCode: trackingCode || this.extractTrackingCode(payload),
      status: status.normalized,
      statusLabel: status.label,
      payload,
    };
  }

  async requestPickup(
    trackingCodes: string[],
    config: DeliveryConfigShape,
  ): Promise<Record<string, unknown>> {
    const { codeApi, apiKey } = this.ensureCredentials(config);

    return this.request<Record<string, unknown>>('/pickup', {
      method: 'POST',
      body: JSON.stringify({
        code_api: codeApi,
        cle_api: apiKey,
        references: trackingCodes.map((item) => Number(item) || item),
      }),
    });
  }

  async createTicket(
    trackingCode: string,
    payload: { motif: string; title: string; description?: string },
    config: DeliveryConfigShape,
  ): Promise<Record<string, unknown>> {
    const { codeApi, apiKey } = this.ensureCredentials(config);

    return this.request<Record<string, unknown>>('/ticket', {
      method: 'POST',
      body: JSON.stringify({
        code_api: codeApi,
        cle_api: apiKey,
        reference: trackingCode,
        motif: payload.motif,
        title: payload.title,
        description: payload.description || '',
      }),
    });
  }
}

