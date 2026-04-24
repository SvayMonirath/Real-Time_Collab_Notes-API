import { Test, TestingModule } from '@nestjs/testing';
import { NoteGateway } from './note.gateway';
import { RoomService } from 'src/service/room.service';

describe('NoteGateway', () => {
  let gateway: NoteGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteGateway,
        {
          provide: RoomService,
          useValue: {
            get_room_by_name: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<NoteGateway>(NoteGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
