import { Module } from '@nestjs/common';
import { RoomModule } from './module/room/room.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RoomModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
