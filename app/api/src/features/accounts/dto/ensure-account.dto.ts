import { ArrayMaxSize, IsArray, IsInt, IsString, IsUUID } from 'class-validator';

export class EnsureAccountDto {
  @IsUUID() userId: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) wallets: string[];
  @IsInt() chainId: number;
}
