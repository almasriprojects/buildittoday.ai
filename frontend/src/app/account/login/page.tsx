import type { Metadata } from "next";
import { AccountLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your BuildItToday.ai account.",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  expired: "That link has expired or has already been used. Enter your email for a fresh one.",
  missing: "That link was incomplete. Enter your email and we'll send another.",
  noaccount: "We couldn't find an account for that address. If you've just paid, give it a minute — or call us.",
  unknown: "Something went wrong signing you in. Try again, or call us on (305) 505-0153.",
};

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? MESSAGES[error] ?? MESSAGES.unknown : null;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-md px-6 py-20 sm:py-28">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-neutral-600">
          Enter the email address on your account and we&rsquo;ll send you a link. No password to
          remember.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {message}
          </p>
        )}

        <AccountLoginForm />

        <p className="mt-10 border-t pt-6 text-sm text-neutral-500">
          Need a hand?{" "}
          <a href="tel:+13055050153" className="font-medium text-neutral-900 hover:underline">
            (305) 505-0153
          </a>{" "}
          or{" "}
          <a
            href="mailto:contact@buildittoday.ai"
            className="font-medium text-neutral-900 hover:underline"
          >
            contact@buildittoday.ai
          </a>
        </p>
      </div>
    </main>
  );
}
