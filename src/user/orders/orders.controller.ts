import { Controller, Get, Post, Body, Param, HttpCode, UsePipes, ValidationPipe , Req} from '@nestjs/common';
import { OrdersService } from 'src/services/orders.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CreateOrderDTO, GetQueryUserDto, CancelOrderDto } from 'src/dto/order-dto';
import { SuccessResponse } from '../../common/interfaces/response';
import { Request } from 'express';
import { getCustomerAuthInfo, getAuthUserInfo } from '../../common/utils/jwt.helper';

@Controller('user/orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @ApiOperation({ summary: 'Add Order' })
  @ApiResponse({ status: 200, description: 'Success', type: OrdersService })
  @ApiBadRequestResponse({ description: 'Invalid Order' })
  @ApiForbiddenResponse({ description: 'Your email is not verified! Please verify your email address.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post()
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  protected async createOrder(@Req() req: Request, @Body() createOrderDTO: CreateOrderDTO ): Promise<any> {
    const authInfo = await getAuthUserInfo(req.headers)
    createOrderDTO.createdBy = authInfo._id
    return await this.orderService.createNewOrder(createOrderDTO);
  }

  @ApiOperation({ summary: 'Get all order' })
  @ApiResponse({ status: 200, description: 'Mobile number is available', type: OrdersService })
  @ApiBadRequestResponse({ description: 'Invalid order id' })
  @Get()
  protected async getAllOrder(@Req() req: Request): Promise<SuccessResponse<any>> {
    const data = await this.orderService.getAllOrder();
    return { data };
  }

  @ApiOperation({ summary: 'Get paticular order details' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiBadRequestResponse({ description: 'Invalid order id' })
  @ApiResponse({ status: 200, description: 'Success', type: OrdersService })
  @Get('/:id')
  protected async getOrderInfo(@Param('id') id: string) : Promise<SuccessResponse<any>> {
    const data = await this.orderService.getOrderInfo(id);
    return { data };
  }
  
  @ApiOperation({ summary: 'get Cart Items' })
  @ApiResponse({ status: 200, description: 'Success', type: OrdersService })
  @ApiBadRequestResponse({ description: 'Invalid Cart Items' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('getCartItems')
  @HttpCode(200)
  protected async GetCartItems(@Req() req: Request, @Body() getQueryUserDTO: GetQueryUserDto ): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    getQueryUserDTO.customerid = authInfo._id
      const data = await this.orderService.getCartItems(getQueryUserDTO);
      return { data };
  }

  @ApiOperation({ summary: 'Cancel Order' })
  @ApiResponse({ status: 200, description: 'Success', type: OrdersService })
  @ApiBadRequestResponse({ description: 'Invalid Order' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('cancelled')
  @HttpCode(200)
  protected async cancelledOrder(@Req() req: Request, @Body() cancelOrderDto: CancelOrderDto ): Promise<SuccessResponse<any>> {
    const authInfo = await getCustomerAuthInfo(req.headers)
    cancelOrderDto.customerid = authInfo._id
    const data = await this.orderService.cancelledOrder(cancelOrderDto);
    return { data };
  }
}
