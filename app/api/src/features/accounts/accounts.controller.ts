import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AccountsService } from './accounts.service';
import { EnsureAccountDto } from './dto/ensure-account.dto';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @HttpCode(204)
  async ensure(@Body() { userId, wallets, chainId }: EnsureAccountDto) {
    await this.accounts.ensure(userId, wallets, chainId);
  }
}
