import { RoomService } from 'src/service/room.service';
import { NoteService } from 'src/service/note.service';
import { SocketAuthMiddleware } from 'src/middleware/socket-auth.middleware';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
  clientVersion?: number;
};

type GetNoteSnapshotPayload = RoomLookupPayload;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NoteGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly roomService: RoomService,
    private readonly noteService: NoteService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
  ) {}

  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    server.use((socket, next) => {
      const token = socket.handshake.query.token as string;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const payload = this.socketAuthMiddleware.validateToken(token);
        (socket.data as any).userId = payload.userId;
        next();
      } catch (error) {
        next(error as Error);
      }
    });
  }

  handleConnection(client: Socket) {
    client.emit('connected', {
      socketId: client.id,
      userId: (client.data as any).userId,
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

  @SubscribeMessage('get_note_snapshot')
  async handleGetNoteSnapshot(client: Socket, payload: GetNoteSnapshotPayload) {
    const note = await this.noteService.getNoteSnapshot(payload.roomName!);

    return {
      status: 'success',
      data: note,
    };
  }

  @SubscribeMessage('update_note')
  async handleUpdateNote(client: Socket, payload: UpdateNotePayload) {
    const room = await this.resolveRoom(payload);
    const content = payload.content ?? payload.noteContent;

    if (!content) {
      throw new WsException('content is required');
    }

    const clientVersion = payload.clientVersion ?? 0;
    const result = await this.noteService.updateNote(
      payload.roomName!,
      content,
      clientVersion,
    );

    if (!result.versionMatched) {
      // Broadcast conflict event to all clients in room
      this.server.to(room.data.id).emit('note_conflict', {
        roomId: room.data.id,
        latestVersion: result.note.version,
        latestContent: result.note.content,
        message: 'Version mismatch - your edit was rejected',
      });

      return {
        status: 'conflict',
        message: 'Version mismatch',
        data: result.note,
      };
    }

    // Broadcast successful update to all clients in room
    this.server.to(room.data.id).emit('note_updated', {
      roomId: room.data.id,
      content: result.note.content,
      version: result.note.version,
    });

    return {
      status: 'success',
      message: `Note updated in room ${room.data.id}`,
      data: result.note,
    };
  }

  private async resolveRoom(payload: RoomLookupPayload) {
    if (payload.roomName) {
      return await this.roomService.get_room_by_name(payload.roomName);
    }

    throw new WsException('roomId or roomName is required');
  }
}
