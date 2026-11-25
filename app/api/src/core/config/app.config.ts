import { registerAs } from '@nestjs/config';

export type AppConfig = { port: number };

export default registerAs<AppConfig>('app', () => ({
  port: Number(process.env.PORT ?? 4000),
}));
