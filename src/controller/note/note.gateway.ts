import { RoomService } from 'src/service/room.service';
import { SocketAuthMiddleware } from 'src/middleware/socket-auth.middleware';
import { NoteRepository } from 'src/repository/note.repository';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Note } from 'generated/prisma/client';
import { Server, Socket } from 'socket.io';

type RoomLookupPayload = {
  roomName?: string;
};

type SocketData = {
  userId?: string;
};

type ConnectedUser = {
  socketId: string;
  userId?: string;
};

type RoomResponse = {
  data: {
    id: string;
    name: string;
  };
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
  private readonly roomMembers = new Map<string, ConnectedUser[]>();

  constructor(
    private readonly roomService: RoomService,
    private readonly noteRepository: NoteRepository,
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
        const socketData = socket.data as SocketData;
        socketData.userId = payload.userId;
        next();
      } catch (error) {
        next(error as Error);
      }
    });
  }

  handleConnection(client: Socket) {
    const socketData = client.data as SocketData;
    client.emit('connected', {
      socketId: client.id,
      userId: socketData.userId,
    });
  }

  handleDisconnect(client: Socket) {
    for (const [roomId, members] of this.roomMembers.entries()) {
      const nextMembers = members.filter(
        (member) => member.socketId !== client.id,
      );

      if (nextMembers.length === members.length) {
        continue;
      }

      if (nextMembers.length === 0) {
        this.roomMembers.delete(roomId);
      } else {
        this.roomMembers.set(roomId, nextMembers);
      }

      this.server.to(roomId).emit('room_presence', {
        roomId,
        members: nextMembers,
      });
    }

    client.emit('disconnected', {
      socketId: client.id,
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(client: Socket, payload: RoomLookupPayload) {
    const room = await this.resolveRoom(payload);

    await client.join(room.data.id);

    const currentMembers = this.roomMembers.get(room.data.id) ?? [];
    const filteredMembers = currentMembers.filter(
      (member) => member.socketId !== client.id,
    );
    const updatedMembers = [
      ...filteredMembers,
      {
        socketId: client.id,
        userId: (client.data as SocketData).userId,
      },
    ];

    this.roomMembers.set(room.data.id, updatedMembers);

    this.server.to(room.data.id).emit('room_presence', {
      roomId: room.data.id,
      members: updatedMembers,
    });

    return {
      status: 'success',
      message: `Joined room ${room.data.id}`,
      data: room,
    };
  }

  @SubscribeMessage('get_note_snapshot')
  async handleGetNoteSnapshot(
    client: Socket,
    payload: GetNoteSnapshotPayload,
  ): Promise<{ status: string; data: Note }> {
    const room = await this.resolveRoom(payload);
    const note = await this.noteRepository.createOrGetNote(room.data.id);

    return {
      status: 'success',
      data: note,
    };
  }

  @SubscribeMessage('update_note')
  async handleUpdateNote(
    client: Socket,
    payload: UpdateNotePayload,
  ): Promise<{
    status: string;
    message: string;
    data: Note;
  }> {
    const room = await this.resolveRoom(payload);
    const content = payload.content ?? payload.noteContent;

    if (content === undefined || content === null) {
      throw new WsException('content is required');
    }

    const clientVersion = payload.clientVersion ?? 0;
    const result = await this.noteRepository.updateNote(
      room.data.id,
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
    if (!payload.roomName) {
      throw new WsException('roomName is required');
    }

    try {
      return (await this.roomService.get_room_by_name(
        payload.roomName,
      )) as RoomResponse;
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Unable to resolve room',
      );
    }
  }
}
