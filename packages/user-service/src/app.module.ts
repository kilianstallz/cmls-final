import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { MqttService } from './mqtt/mqtt.service';
import { ChargingSessionSchema } from './schema/session.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://meinStrom:pvStrom4060!!@docker.htl-wels.at:27017/strom',
    ),
    MongooseModule.forFeature([
      {
        name: 'ChargingSession',
        schema: ChargingSessionSchema,
      },
    ]),
    ClientsModule.register([
      {
        name: 'WALLBOX_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, MqttService],
})
export class AppModule {}
