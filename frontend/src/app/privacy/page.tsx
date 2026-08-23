import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What BuildItToday.ai collects, where it comes from, how it is used, and how to have it removed.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "23 August 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This policy explains what we collect, where it came from, and what you can ask us to do
        with it. It is written to be read rather than to be survived, and it describes what we
        actually do.
      </p>

      <LegalSection title="Who we are">
        <p>
          BuildItToday.ai builds and hosts websites for small businesses in Florida. You can reach
          us at <a href="mailto:contact@buildittoday.ai">contact@buildittoday.ai</a> or
          (305) 505-0153. Our postal address appears at the bottom of every email we send.
        </p>
      </LegalSection>

      <LegalSection title="Information about businesses we contact">
        <p>
          If you received an email or postcard from us before ever visiting this site, this is the
          section that concerns you.
        </p>
        <p>
          Florida requires new business registrations to be filed publicly with the Division of
          Corporations (SunBiz). We read those public filings — business name, registration number,
          filing date, registered address, and the officer names listed on the filing. We then use
          third-party data providers to look for a business contact email or phone number
          associated with that record.
        </p>
        <p>
          We use this to build a sample website for the business and to make contact once about it.
          We do not sell, rent, or share these records with anyone.
        </p>
        <p>
          <strong>To be removed:</strong> use the unsubscribe link in any email, or write to{" "}
          <a href="mailto:contact@buildittoday.ai">contact@buildittoday.ai</a>. Unsubscribing stops
          all further contact immediately. Ask us to delete the record entirely and we will, and
          we keep the email address on a suppression list purely to make sure we never contact you
          again by mistake.
        </p>
      </LegalSection>

      <LegalSection title="Information you give us">
        <ul>
          <li>
            <strong>Booking a call:</strong> name, email, phone, and the time you chose.
          </li>
          <li>
            <strong>Claiming a site:</strong> business name and email, so we know what to build and
            where to send it.
          </li>
          <li>
            <strong>Becoming a customer:</strong> the contact and address details needed to
            register a domain and run the site.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Payments are processed by Stripe. Card details are entered on Stripe&rsquo;s systems and
          never reach ours — we receive only the amount, the outcome, and the last four digits.
          Stripe&rsquo;s handling is governed by its own privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="Email and website measurement">
        <p>
          Our emails record whether a message was delivered, whether it bounced, and whether a link
          in it was clicked. We use this to stop emailing addresses that do not work and to know
          whether anyone looked at the site we built. On this website we record which pages are
          viewed and where visitors arrived from.
        </p>
        <p>
          We do not run advertising trackers, we do not build profiles across other websites, and
          we do not sell any of it.
        </p>
      </LegalSection>

      <LegalSection title="Who else sees your data">
        <p>Only the services needed to run the business:</p>
        <ul>
          <li><strong>Supabase</strong> — database and file hosting</li>
          <li><strong>Vercel</strong> — website hosting</li>
          <li><strong>Resend</strong> — sending email</li>
          <li><strong>Stripe</strong> — payments</li>
          <li><strong>Cloudflare</strong> — domains and email routing</li>
        </ul>
        <p>
          Each receives only what it needs to do its job. We do not sell personal information, and
          we have never done so.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep things">
        <p>
          A sample site built for a business that never responds is deleted, along with the record
          behind it, within twelve months. Customer records are kept for as long as you are a
          customer and then for seven years, which is what tax and accounting rules require.
          Suppression list entries are kept indefinitely, because their only purpose is to prevent
          contact.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can ask us for a copy of what we hold about you, ask us to correct it, ask us to
          delete it, or tell us to stop contacting you. Email{" "}
          <a href="mailto:contact@buildittoday.ai">contact@buildittoday.ai</a> and we will act
          within 30 days. You never have to explain why.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          This is a service for businesses. It is not directed at anyone under 18 and we do not
          knowingly collect information about children.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes we will update the date at the top. Material changes affecting
          existing customers will be sent by email rather than quietly published.
        </p>
      </LegalSection>

      <p className="text-sm">
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
