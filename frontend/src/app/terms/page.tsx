import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { TIERS, money } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "What you get, what it costs, what we each owe the other, and how to cancel.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "23 August 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These terms apply when you buy a website from BuildItToday.ai. They are meant to be clear
        about what you get, what it costs, and how to leave.
      </p>

      <LegalSection title="What we build">
        <p>
          A custom website for your business, launched on a domain you own. The tier you choose
          decides the scope:
        </p>
        <ul>
          {TIERS.map((t) => (
            <li key={t.key}>
              <strong>
                {t.name} — {money(t.setup)} once, then {money(t.monthly)}/month
              </strong>
              : {t.tagline}
            </li>
          ))}
        </ul>
        <p>
          Setup is charged once, before work begins. The monthly fee starts when the site goes
          live, not when you pay the setup fee.
        </p>
      </LegalSection>

      <LegalSection title="What the monthly fee covers">
        <p>
          Hosting, SSL, domain renewal, security updates, backups, and the content changes included
          in your tier. It is what keeps the site online and current. If it lapses, the site comes
          down — we will always email first.
        </p>
      </LegalSection>

      <LegalSection title="Cancelling">
        <p>
          There is no contract and no minimum term. Cancel whenever you like by emailing{" "}
          <a href="mailto:contact@buildittoday.ai">contact@buildittoday.ai</a>; the monthly fee
          stops at the end of the period you have already paid for, and we do not pro-rate part
          months.
        </p>
        <p>
          <strong>You keep the site.</strong> On request we hand over the code and help move it to
          any host you choose. The domain is registered in your name and stays yours. There is no
          exit fee and nothing is held hostage.
        </p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>
          If you cancel before we start design work, the setup fee is refunded in full. Once design
          work has begun it is non-refundable, because the work has been done. Monthly fees already
          charged are not refunded, but cancelling stops all future charges immediately.
        </p>
        <p>
          If we fail to deliver what this page describes, tell us — we would rather refund you than
          argue.
        </p>
      </LegalSection>

      <LegalSection title="Timelines">
        <p>
          We aim to have a site live within one week of receiving your content and approval. That
          clock depends on you: if we are waiting on photos, text, or a decision, it pauses. We
          will tell you plainly what we are waiting for.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep ownership of everything you give us — text, photos, logos, and your business
          name. By giving it to us you confirm you have the right to use it, and you allow us to
          put it on your site. If you send us something you do not have the rights to, that is on
          you rather than us.
        </p>
        <p>
          Unless you ask us not to, we may show your finished site as an example of our work.
        </p>
      </LegalSection>

      <LegalSection title="Sample sites">
        <p>
          We sometimes build a sample site for a business before it becomes a customer, using
          public registration records. A sample is a demonstration, not a claim of any
          relationship. It carries no ownership of your business name or brand, and it is taken
          down on request or automatically if nobody claims it.
        </p>
      </LegalSection>

      <LegalSection title="What we do not promise">
        <p>
          We build good websites. We cannot promise particular search rankings, a specific number
          of visitors, or a level of sales — nobody honestly can, and anyone who does is guessing.
          We host on reliable infrastructure but cannot guarantee uninterrupted uptime.
        </p>
        <p>
          Our liability is limited to what you have paid us in the previous twelve months. Nothing
          here limits liability for fraud or anything that cannot be limited by law.
        </p>
      </LegalSection>

      <LegalSection title="Ending it from our side">
        <p>
          We may decline or end work if payment fails, if the site would be used for anything
          illegal, or if conduct toward us is abusive. In each case we will say why, and you keep
          whatever has already been built and paid for.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of the State of Florida, and disputes belong to the
          courts of Miami-Dade County.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If these terms change we will update the date above. Changes affecting existing customers
          are emailed at least 30 days ahead, and continuing as a customer after that means you
          accept them.
        </p>
      </LegalSection>

      <p className="text-sm">
        See also our <Link href="/privacy">Privacy Policy</Link>. Questions:{" "}
        <a href="mailto:contact@buildittoday.ai">contact@buildittoday.ai</a>.
      </p>
    </LegalPage>
  );
}
