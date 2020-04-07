import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Interval } from '@nestjs/schedule'
import { MessagePattern } from '@nestjs/microservices';
import config from '@cmls/config'

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) {}

  @Get()
  ping(): string {
    return 'pong';
  }

  @MessagePattern({ cmd: 'getDayProduction' })
  getDayProduction(): bigint {
    return this.appService.dayProduction
  }

  @MessagePattern({ cmd: 'getCurrentProduction' })
  getCurrentProduction(): number {
    return this.appService.currentProduction
  }
}