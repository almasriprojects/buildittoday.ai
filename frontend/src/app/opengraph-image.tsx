import { ImageResponse } from "next/og";
import { ENTRY, money } from "@/lib/pricing";

export const alt = "BuildItToday.ai — custom websites for Florida small businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card shown when a link to this site is pasted into email, WhatsApp,
 * LinkedIn or iMessage. Without it every share rendered as a blank grey box —
 * which is what most of the outreach links would have looked like.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0F172A",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#14B8A6",
              color: "#04201C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            B
          </div>
          {/* Satori requires an explicit display on any element with more than
              one child, and this one holds a text node plus a span. */}
          <div style={{ display: "flex", color: "#fff", fontSize: 27, fontWeight: 600 }}>
            <span>BuildItToday</span>
            <span style={{ color: "#14B8A6" }}>.ai</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#fff",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            Websites that work
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            as hard as you do.
          </div>
          <div style={{ color: "#94A3B8", fontSize: 29, marginTop: 24 }}>
            Custom sites for Florida small businesses · live in one week
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              background: "#14B8A6",
              color: "#04201C",
              fontSize: 25,
              fontWeight: 700,
              padding: "12px 26px",
              borderRadius: 999,
              display: "flex",
            }}
          >
            From {money(ENTRY.setup)}
          </div>
          <div style={{ color: "#64748B", fontSize: 23, display: "flex" }}>
            You own the code · No contract
          </div>
        </div>
      </div>
    ),
    size
  );
}
