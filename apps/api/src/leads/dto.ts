import { IsEnum, IsOptional, IsString, Length, Matches, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @IsString() @Length(1, 100) name: string;
  @IsString() @Length(10, 15) @Matches(/^\d+$/, { message: 'mobile must be digits only' }) mobile: string;
  @IsOptional() @IsString() @Length(10, 15) alternateMobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() sourceName?: string;
  @IsOptional() @IsString() sourceId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() vehicleId?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsString() @Length(10, 15) mobile?: string;
  @IsOptional() @IsString() alternateMobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() sourceId?: string;
}

export class ChangeStatusDto {
  @IsString() status: string;
  @IsOptional() @IsString() note?: string;
}

export class AssignLeadDto {
  @IsString() executiveId: string;
}

export class AddActivityDto {
  @IsString() type: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() gpsLat?: number;
  @IsOptional() gpsLng?: number;
}

export class CreateFollowUpLeadDto {
  @IsString() leadId: string;
  @IsString() type: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() note?: string;
}
