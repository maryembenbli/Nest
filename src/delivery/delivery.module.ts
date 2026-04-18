import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/order.entity';
import {
  DeliveryIntegration,
  DeliveryIntegrationSchema,
} from './delivery-integration.entity';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ColisExpressProvider } from './providers/colis-express.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryIntegration.name, schema: DeliveryIntegrationSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, ColisExpressProvider],
  exports: [DeliveryService],
})
export class DeliveryModule {}
