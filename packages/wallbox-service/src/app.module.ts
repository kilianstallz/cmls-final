import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemoryService } from './memory/memory.service';
import { UdpService } from './udp/udp.service';
import {ScheduleModule} from '@nestjs/schedule'
import { MqttService } from './mqtt/mqtt.service';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot()
],
  controllers: [AppController],
  providers: [AppService, MemoryService, UdpService, MqttService],
})
export class AppModule {}
