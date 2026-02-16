import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.entity';
import { UsersService } from './user.service';
import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
