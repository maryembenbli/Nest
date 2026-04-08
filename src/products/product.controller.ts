/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post('description-image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('products', 'update')
  @UseInterceptors(FileInterceptor('image'))
  uploadDescriptionImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image is required');
    }

    const path = `/uploads/${file.filename}`;
    const publicApiUrl = process.env.PUBLIC_API_URL || 'http://127.0.0.1:3000';

    return {
      path,
      url: `${publicApiUrl.replace(/\/$/, '')}${path}`,
    };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10))
  create(
    @Body() body: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('Images are required');
    }

    const imagePaths = files.map((file) => `/uploads/${file.filename}`);
    return this.productsService.create({ ...(body as any), images: imagePaths });
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10))
  update(
    @Param('id') id: string,
    @Body() body: Partial<CreateProductDto>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imagePaths = files?.map((file) => `/uploads/${file.filename}`);
    return this.productsService.update(id, body, imagePaths);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
