import { Module } from '@nestjs/common';
import { RoomService } from '../../service/room.service';
import { RoomController } from '../../controller/room.controller';
import { RoomRepository } from 'src/repository/room.repository';
import { NoteGateway } from 'src/controller/note/note.gateway';

@Module({
  providers: [RoomService, RoomRepository, NoteGateway],
  controllers: [RoomController],
})
export class RoomModule {}
