import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { ZodPipe } from '@/core/pipes/zod.pipe';
import { SandwormSession } from '@/features/auth/sandworm/sandworm-session.service';
import { StocksService } from '@/features/market/stocks.service';
import { activityOf } from '@/features/activity/strategy-activity';
import { appOrigin } from '@/features/auth/core/request';
import { signReportShare } from '@/features/auth/core/token';
import { rulesSchema } from '@/features/strategies/rules/spec';
import { rulesView } from '@/features/strategies/rules/rules-view';
import { BRIEF_MAX_LENGTH, StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';
import { brief, isInResearch, listed, report } from '@/features/strategies/lifecycle/strategy-view';
import { changeFunds, fundsSchema, sellSchema, sellStocks } from '@/features/strategies/trading/money';
import { startTrading, Trade, tradeSchema } from '@/features/strategies/trading/start';

import { StrategyEngine } from './strategy-engine.service';

const createSchema = z.object({ brief: z.string().min(1).max(BRIEF_MAX_LENGTH) });
const renameSchema = z.object({ name: z.string().min(1).max(200) });
const editSchema = z.object({ rules: rulesSchema });
// `result` is checked in full by the strategy steps, which say what is wrong with it; here it is only required to be there
const handBackSchema = z.object({ result: z.unknown() });

// Everything a person, or their agent, does with their strategies. Each step checks that the strategy is theirs and is at the point the step
// belongs to.
@ApiTags('Strategies')
@ForPeople()
@Controller('strategies')
export class StrategiesController {
  constructor(
    private readonly engine: StrategyEngine,
    private readonly stocks: StocksService,
    private readonly sandworm: SandwormSession,
  ) {}

  // Everything this person has made, newest first
  @Get()
  async list(@Asking() { ownerId }: Caller) {
    const records = await this.engine.steps.list(ownerId);
    return records.map(listed);
  }

  @Post()
  async create(@Asking() { ownerId }: Caller, @Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const { id } = await this.engine.steps.create(ownerId, body.brief);
    return { id };
  }

  @Get('research')
  async researching(@Asking() { ownerId }: Caller) {
    const records = await this.engine.steps.list(ownerId);
    const strategies = records.filter(isInResearch).map(({ id, name, stage }) => ({ id, name, stage }));
    return { strategies };
  }

  // Strategies whose rules are confirmed and that are waiting for someone to do the research and hand it back
  @Get('waiting')
  async waiting(@Asking() { ownerId }: Caller) {
    const records = await this.engine.steps.waitingForResearch(ownerId);
    return records.map(brief);
  }

  @Get(':id')
  async one(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    return report(await this.engine.steps.owned(ownerId, id));
  }

  @Patch(':id')
  async rename(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(renameSchema)) body: z.infer<typeof renameSchema>) {
    const { name } = await this.engine.steps.rename(ownerId, id, body.name);
    return { name };
  }

  @Get(':id/activity')
  async activity(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    return activityOf(record).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }

  // What was asked for and the rules it was turned into, with how the report should come out: what research is built to
  @Get(':id/brief')
  async brief(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    return brief(await this.engine.steps.owned(ownerId, id));
  }

  @Get(':id/rules')
  async rules(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    // Only a trading strategy has anything to be measured against today's prices
    const stocks = record.status === 'live' ? await this.stocks.source.getStocks() : [];
    return rulesView(record, stocks);
  }

  // Replaces the rules of a strategy that is still being looked over. Once they are confirmed they can't be changed.
  @Put(':id/rules')
  async editRules(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(editSchema)) body: z.infer<typeof editSchema>) {
    const record = await this.engine.steps.editRules(ownerId, id, body.rules);
    return rulesView(record, []);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@Asking() caller: Caller, @Param('id') id: string, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.beginResearch('confirmRules', caller, id, request, reply);
  }

  // Starts research that has stopped over again
  @Post(':id/retry')
  @HttpCode(200)
  async retry(@Asking() caller: Caller, @Param('id') id: string, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.beginResearch('retryResearch', caller, id, request, reply);
  }

  @Post(':id/ready')
  @HttpCode(200)
  async ready(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const { stage, research } = await this.engine.steps.finishResearch(ownerId, id);
    return { stage, error: research?.error, progress: research?.progress };
  }

  // The research for a strategy that is waiting for it, handed back by whoever did it. Once per strategy, and only while it is waiting.
  @Post(':id/research')
  @HttpCode(200)
  async handBack(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(handBackSchema)) body: z.infer<typeof handBackSchema>) {
    const { stage } = await this.engine.steps.completeResearch(ownerId, id, body.result);
    return { ok: true, stage };
  }

  // A link anyone can open to read this strategy's report. Only for a strategy that has one, and only its owner can make it.
  @Post(':id/share')
  @HttpCode(200)
  async share(@Asking() { ownerId }: Caller, @Param('id') id: string, @Req() request: FastifyRequest) {
    const { research } = await this.engine.steps.owned(ownerId, id);
    if (!research?.result) throw new StrategyError('There is no report to share yet', 409);

    const token = await signReportShare(id);
    return { url: `${appOrigin(request.headers)}/share/${token}` };
  }

  @Post(':id/trade')
  @HttpCode(200)
  async trade(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(tradeSchema)) trade: Trade) {
    await startTrading(this.engine.steps, ownerId, id, trade);
    return { id };
  }

  // Puts money into a strategy, or takes cash out of it
  @Post(':id/funds')
  @HttpCode(200)
  funds(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(fundsSchema)) body: z.infer<typeof fundsSchema>) {
    return changeFunds(this.engine.steps, ownerId, id, body);
  }

  @Post(':id/sell')
  @HttpCode(200)
  sell(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(sellSchema)) body: z.infer<typeof sellSchema>) {
    return sellStocks(this.engine.steps, ownerId, id, body);
  }

  private async beginResearch(step: 'confirmRules' | 'retryResearch', { ownerId, isAgent }: Caller, id: string, request: FastifyRequest, reply: FastifyReply) {
    // An agent does the research itself and hands it back, so there is no Sandworm login of the person's to use and nothing to start here
    if (isAgent) {
      const { stage } = await this.engine.steps[step](ownerId, id, { submittedByAgent: true });
      return { stage };
    }
    const sandwormToken = await this.sandworm.tokenOf(request, reply);
    const { stage } = await this.engine.steps[step](ownerId, id, { sandwormToken });
    this.engine.startResearch(ownerId, id, { sandwormToken });
    return { stage };
  }
}
