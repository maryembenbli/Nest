import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { RequestWithUser } from '../auth/request-with-user.interface';
import { DeliveryService } from './delivery.service';
import { BulkShipOrdersDto } from './dto/bulk-ship-orders.dto';
import { CreateDeliveryTicketDto } from './dto/create-delivery-ticket.dto';
import { TestDeliveryIntegrationDto } from './dto/test-delivery-integration.dto';
import { UpdateDeliveryIntegrationDto } from './dto/update-delivery-integration.dto';

@Controller('delivery')
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('providers')
  getProviders() {
    return this.deliveryService.listProviders();
  }

  @Get('providers/:providerKey/config')
  getProviderConfig(@Param('providerKey') providerKey: string) {
    return this.deliveryService.getProviderConfig(providerKey);
  }

  @Patch('providers/:providerKey/config')
  updateProviderConfig(
    @Param('providerKey') providerKey: string,
    @Body() body: UpdateDeliveryIntegrationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.deliveryService.saveProviderConfig(
      providerKey,
      body,
      req.user?.email || req.user?.sub || 'dashboard-admin',
      req.user?.isSuperAdmin,
    );
  }

  @Post('providers/:providerKey/test')
  testProviderConfig(
    @Param('providerKey') providerKey: string,
    @Body() body: TestDeliveryIntegrationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.deliveryService.testProviderConfig(
      providerKey,
      body,
      req.user?.isSuperAdmin,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Post('orders/:orderId/ship')
  shipOrder(@Param('orderId') orderId: string, @Req() req: RequestWithUser) {
    return this.deliveryService.shipOrder(
      orderId,
      req.user?.email || req.user?.sub || 'dashboard-admin',
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Post('orders/bulk-ship')
  bulkShipOrders(
    @Body() body: BulkShipOrdersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.deliveryService.bulkShipOrders(
      body.orderIds,
      body.providerKey,
      req.user?.email || req.user?.sub || 'dashboard-admin',
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Post('orders/:orderId/refresh')
  refreshOrder(@Param('orderId') orderId: string, @Req() req: RequestWithUser) {
    return this.deliveryService.refreshShipment(
      orderId,
      req.user?.email || req.user?.sub || 'dashboard-admin',
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'read')
  @Get('shipments')
  getShipments(@Query('providerKey') providerKey?: string) {
    return this.deliveryService.listShipments(providerKey);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Post('orders/:orderId/pickup')
  requestPickup(@Param('orderId') orderId: string, @Req() req: RequestWithUser) {
    return this.deliveryService.requestPickupForOrder(
      orderId,
      req.user?.email || req.user?.sub || 'dashboard-admin',
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Post('orders/:orderId/ticket')
  createTicket(
    @Param('orderId') orderId: string,
    @Body() body: CreateDeliveryTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.deliveryService.createTicketForOrder(
      orderId,
      body,
      req.user?.email || req.user?.sub || 'dashboard-admin',
    );
  }
}
