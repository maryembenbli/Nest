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
import { PermissionsModule } from './permissions/permissions.module';
import { CategoryModule } from './categories/category.module';
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_db',
    ),
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    DashboardModule,
    DeliveryModule,
    PermissionsModule,
    CategoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    const email = process.env.SUPER_ADMIN_EMAIL || 'super@admin.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecret123';
    const exists = await this.usersService.findByEmail(email);
    if (!exists) {
      await this.usersService.createSuperAdmin(email, password);
      console.log(' Super admin created');
    }
  }
}
