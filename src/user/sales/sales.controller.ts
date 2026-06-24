import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesService } from 'src/services/sales.service';

@Controller('user/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}


}
