import { OrderDocument } from '../../orders/order.entity';

export type DeliveryShipmentResult = {
  trackingCode: string;
  status: string;
  statusLabel: string;
  payload: Record<string, unknown>;
};

export type DeliveryTrackingResult = {
  trackingCode: string;
  status: string;
  statusLabel: string;
  payload: Record<string, unknown>;
};

export type DeliveryConfigShape = {
  providerKey: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, string | number | boolean>;
};

export interface DeliveryProviderClient {
  providerKey: string;
  testConnection(config: DeliveryConfigShape, trackingCode?: string): Promise<Record<string, unknown>>;
  createShipment(order: OrderDocument, config: DeliveryConfigShape): Promise<DeliveryShipmentResult>;
  readShipment(trackingCode: string, config: DeliveryConfigShape): Promise<DeliveryTrackingResult>;
  requestPickup(trackingCodes: string[], config: DeliveryConfigShape): Promise<Record<string, unknown>>;
  createTicket(
    trackingCode: string,
    payload: { motif: string; title: string; description?: string },
    config: DeliveryConfigShape,
  ): Promise<Record<string, unknown>>;
}
