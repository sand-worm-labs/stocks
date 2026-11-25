import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Profile } from './entities/profile.entity';
import { Wallet } from './entities/wallet.entity';

@Injectable()
export class AccountsService {
  constructor(private readonly dataSource: DataSource) {}

  // Makes the account the first time a person signs in, and notes any wallet of theirs it has not seen. Safe to run on every sign-in:
  // what exists is left alone. Only addresses are kept, never a key.
  async ensure(userId: string, addresses: string[], chainId: number) {
    await this.dataSource.transaction(async (tx) => {
      await tx.createQueryBuilder().insert().into(Profile).values({ userId }).orIgnore().execute();
      if (addresses.length === 0) return;
      await tx
        .createQueryBuilder()
        .insert()
        .into(Wallet)
        .values(
          addresses.map((address) => ({
            userId,
            address: address.toLowerCase(),
            chainId,
          })),
        )
        .orIgnore()
        .execute();
    });
  }
}
