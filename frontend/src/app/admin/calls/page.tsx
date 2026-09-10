import { CallsClient } from "./calls-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calls · BuildItToday.ai",
};

/**
 * The call list.
 *
 * Email has produced 0 sales from 47 sends, and because the buy button was
 * broken for most of that window there is no way to read that as a verdict on
 * the price, the pitch or the market. A call is the only channel that returns
 * an actual sentence — what they said, and what they would pay — and it is the
 * one that has never been tried.
 */
export default function CallsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calls</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every business with an approved site and a phone number. Open one to get a script
          written from that business&rsquo;s own copy, ring them, then record what they said.
          The notes are the point — they are the only record of why someone said no.
        </p>
      </div>
      <CallsClient />
    </div>
  );
}
