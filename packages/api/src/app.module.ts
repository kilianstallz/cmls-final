import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ClientsModule, Transport} from '@nestjs/microservices'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3001}, name: 'WALLBOX_SERVICE'},
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3002}, name: 'SOALR_SERVICE'},
      {transport: Transport.TCP, options: {host: '127.0.0.1', port: 3004}, name: 'LOGGER_SERVICE'},
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
