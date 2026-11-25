import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// A wallet a person has used here: the address only, never a key
@Entity('wallets')
export class Wallet {
  @PrimaryColumn('uuid', { name: 'user_id' }) userId: string;
  @PrimaryColumn('integer', { name: 'chain_id' }) chainId: number;
  @PrimaryColumn('text') address: string;
  @CreateDateColumn({ name: 'linked_at', type: 'timestamptz' }) linkedAt: Date;
}
