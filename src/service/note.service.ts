import { Injectable, BadRequestException } from '@nestjs/common';
import { RoomService } from 'src/service/room.service';
import { NoteRepository } from 'src/repository/note.repository';
import { Note } from 'generated/prisma/client';

@Injectable()
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly roomService: RoomService,
  ) {}

  async getNoteSnapshot(roomName: string): Promise<Note> {
    const room = await this.roomService.get_room_by_name(roomName);
    const createNote = this.noteRepository.createOrGetNote as (
      roomId: string,
    ) => Promise<Note>;
    const note = await createNote(room.data.id);

    return note;
  }

  async updateNote(
    roomName: string,
    content: string,
    clientVersion: number = 0,
  ): Promise<{
    success: boolean;
    note: Note;
    versionMatched: boolean;
  }> {
    const room = await this.roomService.get_room_by_name(roomName);

    const updateNoteMethod = this.noteRepository.updateNote as (
      roomId: string,
      content: string,
      expectedVersion: number,
    ) => Promise<{ note: Note; versionMatched: boolean }>;
    const { note, versionMatched } = await updateNoteMethod(
      room.data.id,
      content,
      clientVersion,
    );

    return {
      success: versionMatched,
      note,
      versionMatched,
    };
  }
}
