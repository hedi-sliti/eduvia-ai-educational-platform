import { IsObject, IsOptional, IsBoolean, IsNumber, IsString } from 'class-validator';

export class CreateAssessmentDto {
  @IsObject()
  answers: Record<string, any>;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
