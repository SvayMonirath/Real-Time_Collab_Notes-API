import { IsString, IsNotEmpty } from "class-validator";

export class CreateRoomRequest {
  @IsString()
  @IsNotEmpty()
  name: string;
}
