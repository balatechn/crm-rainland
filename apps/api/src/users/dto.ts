import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';

const ROLES = ['ADMIN','CRM_MANAGER','CALL_CENTER','SALES_HEAD','BRANCH_MANAGER','SALES_EXECUTIVE','TEAM_LEADER'] as const;
type RoleStr = typeof ROLES[number];

export class CreateUserDto {
  @IsString() @Length(1, 100) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsIn(ROLES) role: RoleStr;
  @IsOptional() @IsString() branchId?: string | null;
  @IsOptional() @IsString() phone?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(ROLES) role?: RoleStr;
  @IsOptional() @IsString() branchId?: string | null;
}
