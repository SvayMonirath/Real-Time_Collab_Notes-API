import { Module } from '@nestjs/common';
import { RoomService } from '../../service/room.service';
import { RoomController } from '../../controller/room.controller';
import { RoomRepository } from 'src/repository/room.repository';
import { NoteGateway } from 'src/controller/note/note.gateway';
import { NoteService } from 'src/service/note.service';
import { NoteRepository } from 'src/repository/note.repository';
import { SocketAuthMiddleware } from 'src/middleware/socket-auth.middleware';

@Module({
  providers: [
    RoomService,
    RoomRepository,
    NoteGateway,
    NoteService,
    NoteRepository,
    SocketAuthMiddleware,
  ],
  controllers: [RoomController],
})
export class RoomModule {}
