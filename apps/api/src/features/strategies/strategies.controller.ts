import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { ZodPipe } from '@/core/pipes/zod.pipe';
import { SandwormSession } from '@/features/auth/sandworm/sandworm-session.service';
import { StocksService } from '@/features/market/stocks.service';
import { activityOf } from '@/features/activity/strategy-activity';
import { coverageOf } from '@/features/strategies/brief/idea-coverage';
import { appOrigin } from '@/features/auth/core/request';
import { signReportShare } from '@/features/auth/core/token';
import { packForIdea } from '@/features/research/idea-pack';
import { isSandwormLink } from '@/features/research/sandworm-link';
import { MOST_TEXT, MOST_THINKING } from '@/features/research/types/research-chat.types';
import { rulesSchema } from '@/features/strategies/rules/spec';
import { rulesView } from '@/features/strategies/rules/rules-view';
import { BRIEF_MAX_LENGTH, StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';
import { brief, isInResearch, listed, report, trashed } from '@/features/strategies/lifecycle/strategy-view';
import { changeFunds, fundsSchema, sellSchema, sellStocks } from '@/features/strategies/trading/money';
import { startTrading, Trade, tradeSchema } from '@/features/strategies/trading/start';

import { ResearchChatLogService } from './research-chat-log.service';
import { StrategyEngine } from './strategy-engine.service';

const createSchema = z.object({ brief: z.string().min(1).max(BRIEF_MAX_LENGTH) });
const renameSchema = z.object({ name: z.string().min(1).max(200) });
const editSchema = z.object({ rules: rulesSchema });
const purgeSchema = z.object({ confirmName: z.string().min(1).max(200) });
// `result` is checked in full by the strategy steps, which say what is wrong with it; here it is only required to be there
const handBackSchema = z.object({ result: z.unknown() });

// What an agent tells of its work as it goes: each thing is bounded, as some of it is written by a model
const partSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('thinking'), text: z.string().trim().min(1).max(MOST_THINKING) }),
  z.object({ type: z.literal('action'), state: z.enum(['making', 'made', 'ran']), title: z.string().trim().min(1).max(120), blockType: z.string().max(30).optional() }),
  z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(MOST_TEXT) }),
  z.object({ type: z.literal('error'), message: z.string().trim().min(1).max(300) }),
]);
const logSchema = z.object({
  parts: z.array(partSchema).max(20),
  status: z.enum(['running', 'failed']).optional(),
  notebookUrl: z.string().url().max(500).optional(),
});

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
    private readonly chatLog: ResearchChatLogService,
  ) {}

  // Everything this person has made, newest first
  @Get()
  async list(@Asking() { ownerId }: Caller) {
    const records = await this.engine.steps.list(ownerId);
    return records.map(listed);
  }

  // What this person has deleted, which is kept for 30 days and can be put back
  @Get('trash')
  async trash(@Asking() { ownerId }: Caller) {
    const records = await this.engine.steps.listRemoved(ownerId);
    return records.map(trashed);
  }

  @Post()
  async create(@Asking() { ownerId }: Caller, @Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const record = await this.engine.steps.create(ownerId, body.brief);
    // What the idea turned into, so an agent can tell the person at once if what they asked for isn't on Base
    const market = await this.stocks.market();
    return { id: record.id, name: record.name, coverage: coverageOf(record, market) };
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
    const market = await this.stocks.market();
    return records.map((record) => ({ ...brief(record), coverage: coverageOf(record, market) }));
  }

  @Get(':id')
  async one(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    return report(await this.engine.steps.owned(ownerId, id));
  }

  // What the market on Base holds for the strategy's idea, found by what each stock is: for whoever researches it
  @Get(':id/market')
  async market(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    return packForIdea(record.brief, await this.stocks.market());
  }

  @Patch(':id')
  async rename(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(renameSchema)) body: z.infer<typeof renameSchema>) {
    const { name } = await this.engine.steps.rename(ownerId, id, body.name);
    return { name };
  }

  // Ends a trading strategy: everything is sold at today's prices and the cash is taken out. Only then can it be deleted.
  @Post(':id/close')
  @HttpCode(200)
  async close(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const { record, takenOut } = await this.engine.steps.close(ownerId, id);
    return { status: record.status, closedAt: record.closedAt, takenOut };
  }

  // Puts a strategy in the trash. One that is still trading is refused: it holds money, so it is closed first.
  @Delete(':id')
  async remove(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const { deletedAt } = await this.engine.steps.remove(ownerId, id);
    return { deletedAt };
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    await this.engine.steps.restore(ownerId, id);
    return { ok: true };
  }

  // Deletes what is in the trash for good, with its chat, activity and ledger. It needs the strategy's name, so it can't be done by a slip.
  @Post(':id/purge')
  @HttpCode(200)
  async purge(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(purgeSchema)) body: z.infer<typeof purgeSchema>) {
    await this.engine.steps.purge(ownerId, id, body.confirmName);
    return { ok: true };
  }

  @Get(':id/activity')
  async activity(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    return activityOf(record).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }

  // What was asked for and the rules it was turned into, with how the report should come out: what research is built to
  @Get(':id/brief')
  async brief(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    const market = await this.stocks.market();
    return { ...brief(record), coverage: coverageOf(record, market) };
  }

  @Get(':id/rules')
  async rules(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    const record = await this.engine.steps.owned(ownerId, id);
    const market = await this.stocks.market();
    // Only a trading strategy has anything to be measured against today's prices
    const stocks = record.status === 'live' ? market.stocks : [];
    return { ...rulesView(record, stocks), coverage: coverageOf(record, market) };
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
    return { stage, runner: research?.runner, error: research?.error, progress: research?.progress };
  }

  // The research for a strategy that is waiting for it, handed back by whoever did it. Once per strategy, and only while it is waiting.
  @Post(':id/research')
  @HttpCode(200)
  async handBack(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(handBackSchema)) body: z.infer<typeof handBackSchema>) {
    const { stage, research } = await this.engine.steps.completeResearch(ownerId, id, body.result);
    // What the agent told of its work is settled with the research: it is finished
    if (research) await this.chatLog.finish(id, research.startedAt, 'done');
    return { ok: true, stage };
  }

  // What an agent from outside is doing while it researches, told as it goes so the person can follow it from the strategy's own chat, as they
  // can in Sandworm. Added to the run's log; only while the strategy is waiting for research.
  @Post(':id/research/log')
  @HttpCode(200)
  async tellResearch(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(logSchema)) body: z.infer<typeof logSchema>) {
    const { research } = await this.engine.steps.owned(ownerId, id);
    if (research?.mode !== 'waiting' || research.result) throw new StrategyError("It isn't waiting for research", 409);
    if (body.notebookUrl && !isSandwormLink(body.notebookUrl)) throw new StrategyError('The notebook link has to lead to Sandworm', 422);

    await this.chatLog.append(ownerId, id, research.startedAt, { ...body, runner: research.runner });
    return { ok: true };
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
