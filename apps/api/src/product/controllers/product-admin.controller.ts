import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  ListAdminProductsQueryDto,
  ProductAdminDetailResponseDto,
  ProductAdminListResponseDto,
  SyncAttributesDto,
  UpdateImageDto,
  UpdateProductDto,
  UpdateVariantDto,
} from '../dto';
import { ProductService } from '../services/product.service';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@Controller('admin/products')
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  // ─── Product CRUD ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List products (admin)' })
  @ApiOkResponse({ type: ProductAdminListResponseDto })
  @Get()
  findAll(@Query() query: ListAdminProductsQueryDto) {
    return this.productService.findAdminList(query);
  }

  @ApiOperation({ summary: 'Get product detail (admin)' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findAdminById(id);
  }

  @ApiOperation({ summary: 'Create a product with variants, images, and attributes' })
  @ApiCreatedResponse({ type: ProductAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Slug or SKU already taken' })
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @ApiOperation({ summary: 'Update product basic info' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'Slug already taken' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete a product and its variants' })
  @ApiNoContentResponse({ description: 'Product deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  @ApiOkResponse({ type: ProductAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.productService.restore(id);
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Add a variant to a product' })
  @ApiCreatedResponse({ description: 'Variant created' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'SKU or color+size combo already exists' })
  @Post(':id/variants')
  createVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVariantDto) {
    return this.productService.createVariant(id, dto);
  }

  @ApiOperation({ summary: 'Update a variant (price, stock, status)' })
  @ApiOkResponse({ description: 'Variant updated' })
  @ApiNotFoundResponse({ description: 'Product or variant not found' })
  @Put(':id/variants/:variantId')
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(id, variantId, dto);
  }

  @ApiOperation({ summary: 'Soft-delete a variant' })
  @ApiNoContentResponse({ description: 'Variant deleted' })
  @ApiNotFoundResponse({ description: 'Product or variant not found' })
  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ): Promise<void> {
    return this.productService.softDeleteVariant(id, variantId);
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Add an image to a product' })
  @ApiCreatedResponse({ description: 'Image created' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Post(':id/images')
  createImage(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateImageDto) {
    return this.productService.createImage(id, dto);
  }

  @ApiOperation({ summary: 'Update an image' })
  @ApiOkResponse({ description: 'Image updated' })
  @ApiNotFoundResponse({ description: 'Product or image not found' })
  @Put(':id/images/:imageId')
  updateImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateImageDto,
  ) {
    return this.productService.updateImage(id, imageId, dto);
  }

  @ApiOperation({ summary: 'Delete an image' })
  @ApiNoContentResponse({ description: 'Image deleted' })
  @ApiNotFoundResponse({ description: 'Product or image not found' })
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<void> {
    return this.productService.deleteImage(id, imageId);
  }

  // ─── Attributes ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Sync product attributes (replace all)' })
  @ApiNoContentResponse({ description: 'Attributes synced' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Put(':id/attributes')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncAttributes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncAttributesDto,
  ): Promise<void> {
    return this.productService.syncAttributes(id, dto);
  }
}
