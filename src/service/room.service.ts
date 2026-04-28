import { BadRequestException, Injectable } from '@nestjs/common';
import { Room } from 'generated/prisma/client';
import { CreateRoomRequest } from 'src/dto/request/room.request';
import { RoomRepository } from 'src/repository/room.repository';

@Injectable()
export class RoomService {
  constructor(private readonly roomRepository: RoomRepository) {}

  async create_room(dto: CreateRoomRequest): Promise<{ data: Room }> {
    if (await this.roomRepository.get_room_by_name(dto.name)) {
      throw new BadRequestException('Room name already exists');
    }

    const room: Room = await this.roomRepository.create_room(dto);
    return { data: room };
  }

  async get_room_by_name(name: string): Promise<{ data: Room }> {
    const room: Room | null = await this.roomRepository.get_room_by_name(name);

    if (!room) {
      throw new BadRequestException('Room not found');
    }

    return { data: room };
  }
}
