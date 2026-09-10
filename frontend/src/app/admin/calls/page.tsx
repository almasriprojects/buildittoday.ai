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
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-1">
          Every business with an approved site and a phone number. Open one for a script written
          from their own copy, then record what they said.
        </p>
      </div>
      <CallsClient />
    </div>
  );
}
