import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ClientsModule, Transport} from '@nestjs/microservices'

@Module({
  imports: [
    ClientsModule.register([
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3001}, name: 'WALLBOX_SERVICE'},
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3002}, name: 'SOALR_SERVICE'},
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3003}, name: 'USER_SERVICE'},
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3004}, name: 'LOGGER_SERVICE'},
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
