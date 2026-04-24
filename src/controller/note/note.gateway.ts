import { RoomService } from 'src/service/room.service';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type RoomLookupPayload = {
  roomName?: string;
};

type UpdateNotePayload = RoomLookupPayload & {
  content?: string;
  noteContent?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NoteGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomService: RoomService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    client.emit('connected', {
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    client.emit('disconnected', {
      socketId: client.id,
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(client: Socket, payload: RoomLookupPayload) {
    const room = await this.resolveRoom(payload);

    await client.join(room.data.id);

    return {
      status: 'success',
      message: `Joined room ${room.data.id}`,
      data: room,
    };
  }

  @SubscribeMessage('update_note')
  async handleUpdateNote(client: Socket, payload: UpdateNotePayload) {
    const room = await this.resolveRoom(payload);
    const content = payload.content ?? payload.noteContent;

    if (!content) {
      throw new WsException('content is required');
    }

    this.server.to(room.data.id).emit('note_updated', {
      roomId: room.data.id,
      content,
    });

    return {
      status: 'success',
      message: `Note updated in room ${room.data.id}`,
    };
  }

  private async resolveRoom(payload: RoomLookupPayload) {
    if (payload.roomName) {
      return await this.roomService.get_room_by_name(payload.roomName);
    }

    throw new WsException('roomId or roomName is required');
  }
}
