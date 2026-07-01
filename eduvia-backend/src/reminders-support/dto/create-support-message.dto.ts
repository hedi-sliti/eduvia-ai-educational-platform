import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateSupportMessageDto {
  @IsMongoId()
  studentId: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;
}
