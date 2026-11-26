import { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';

/// A body checked against its schema: `@Body(new ZodPipe(schema)) body`
export class ZodPipe<S extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) throw new StrategyError('The request is missing something or has something wrong in it', 400);
    return parsed.data;
  }
}
