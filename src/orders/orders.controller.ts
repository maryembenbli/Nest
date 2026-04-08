import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import type { RequestWithUser } from '../auth/request-with-user.interface';
import { CreateAbandonedOrderDto } from './dto/create-abandoned-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.ordersService.create(body);
  }

  @Post('abandoned')
  createAbandoned(@Body() body: CreateAbandonedOrderDto) {
    return this.ordersService.createAbandoned(body);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateOrderDto,
    @Req() req: RequestWithUser,
  ) {
    const changedBy = req.user?.isSuperAdmin
      ? `Super Admin (${req.user.email})`
      : req.user?.email || req.user?.sub || 'dashboard-admin';

    return this.ordersService.update(id, body, changedBy);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Patch(':id/archive')
  archive(@Param('id') id: string, @Req() req: RequestWithUser) {
    const changedBy = req.user?.isSuperAdmin
      ? `Super Admin (${req.user.email})`
      : req.user?.email || req.user?.sub || 'dashboard-admin';

    return this.ordersService.archive(id, changedBy);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'update')
  @Patch(':id/restore')
  restore(@Param('id') id: string, @Req() req: RequestWithUser) {
    const changedBy = req.user?.isSuperAdmin
      ? `Super Admin (${req.user.email})`
      : req.user?.email || req.user?.sub || 'dashboard-admin';

    return this.ordersService.restore(id, changedBy);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
