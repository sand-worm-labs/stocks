// The internet, stood in for: each request is answered by the function given, and what was asked for is kept so a test can look at it
export type Answer = Response | undefined;

export function fakeFetch(answer: (url: string) => Answer) {
  const calls: string[] = [];
  const send = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    return answer(url) ?? new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { send, calls };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// A Yahoo chart answer: closes oldest first, with the days they are for
export const chart = (closes: (number | null)[], options: { price?: number; name?: string; exchange?: string; start?: number } = {}) =>
  json({
    chart: {
      result: [
        {
          meta: { regularMarketPrice: options.price ?? closes.at(-1) ?? 0, longName: options.name, exchangeName: options.exchange ?? 'NMS' },
          timestamp: closes.map((_, i) => (options.start ?? 1_700_000_000) + i * 86_400),
          indicators: { quote: [{ close: closes }] },
        },
      ],
    },
  });
