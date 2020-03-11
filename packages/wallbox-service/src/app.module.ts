import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemoryService } from './memory/memory.service';
import { UdpService } from './udp/udp.service';
import {ConfigModule} from '@nestjs/config'
import {ScheduleModule} from '@nestjs/schedule'
import { ConfigService } from './config/config.service';
import { MqttService } from './mqtt/mqtt.service';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }),
  ScheduleModule.forRoot()
],
  controllers: [AppController],
  providers: [AppService, MemoryService, UdpService, ConfigService, MqttService],
})
export class AppModule {}
