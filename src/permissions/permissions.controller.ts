import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // CREATE
  @Post()
  create(@Body() body: any) {
    return this.permissionsService.create(body.module, body.actions);
  }

  // READ
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  // UPDATE
  @Patch(':module')
  update(@Param('module') module: string, @Body('actions') actions: any) {
    return this.permissionsService.update(module, actions);
  }

  // DELETE
  @Delete(':module')
  delete(@Param('module') module: string) {
    return this.permissionsService.delete(module);
  }
}
