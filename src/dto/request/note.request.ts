import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateNoteRequest {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @IsOptional()
  clientVersion?: number;
}

export class GetNoteSnapshotRequest {
  @IsString()
  @IsNotEmpty()
  roomName: string;
}
