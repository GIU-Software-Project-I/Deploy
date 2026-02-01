import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PositionStatus } from '../enums/organization-structure.enums';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  jobKey: string;

  @IsString()
  @IsNotEmpty()
  payGrade: string;

  @IsString()
  @IsNotEmpty()
  costCenter: string;

  //@IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsMongoId()
  @IsOptional()
  reportsToPositionId?: string;

  @IsEnum(PositionStatus)
  @IsOptional()
  status?: PositionStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) { }
