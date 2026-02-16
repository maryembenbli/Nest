import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Permission, PermissionDocument } from './permissions.entity';
import { Model } from 'mongoose';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  // CREATE
  create(module: string, actions: Record<string, boolean>) {
    return this.permissionModel.create({ module, actions });
  }

  // READ
  findAll() {
    return this.permissionModel.find().lean().exec();
  }

  // UPDATE
  update(module: string, actions: Record<string, boolean>) {
    return this.permissionModel.findOneAndUpdate(
      { module },
      { actions },
      { new: true },
    );
  }

  // DELETE
  delete(module: string) {
    return this.permissionModel.findOneAndDelete({ module });
  }
}
