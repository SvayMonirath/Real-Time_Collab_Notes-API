import { Controller, Body, Get, Post, Param } from '@nestjs/common';
import { CreateRoomRequest } from 'src/dto/request/room.request';
import { RoomService } from 'src/service/room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomRequest) {
    const result = await this.roomService.create_room(createRoomDto);

    return {
      status: 'success',
      message: `Room ${result.data.id} created successfully`,
    };
  }

  @Get(':name')
  async getRoomByName(@Param('name') name: string) {
    const room = await this.roomService.get_room_by_name(name);
    return {
      status: 'success',
      message: `Room ${room.data.id} retrieved successfully`,
      data: room,
    };
  }
}
