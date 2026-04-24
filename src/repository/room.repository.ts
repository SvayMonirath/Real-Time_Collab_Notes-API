import { Injectable } from '@nestjs/common';
import { Room } from 'generated/prisma/client';
import { CreateRoomRequest } from 'src/dto/request/room.request';
import { PrismaService } from 'prisma/prisma/prisma.service';

@Injectable()
export class RoomRepository {
  constructor(private readonly db: PrismaService) {}
  async create_room(dto: CreateRoomRequest) {
    return await this.db.room.create({
      data: {
        name: dto.name,
      },
    });
  }

  async get_room_by_name(name: string): Promise<Room | null> {
    return await this.db.room.findFirst({
      where: {
        name: name,
      },
    });
  }
}
