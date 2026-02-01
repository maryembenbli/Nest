import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeliveryModule } from './delivery/delivery.module';
import { UsersService } from './users/user.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/ecommerce_db'),
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    OrdersModule,
    DashboardModule,
    DeliveryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    const email = 'super@admin.com';
    const exists = await this.usersService.findByEmail(email);
    if (!exists) {
      await this.usersService.createSuperAdmin(email, 'SuperSecret123');
    }
  }
}
