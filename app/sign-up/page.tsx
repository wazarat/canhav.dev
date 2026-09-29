import type { Metadata } from "next";

import { SignUpCard } from "@/components/studio/SignUpCard";
import { AUTH_COPY } from "@/content/auth";

export const metadata: Metadata = {
  title: AUTH_COPY.signUp,
  description: AUTH_COPY.signUpLead,
};

export default function SignUpPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{AUTH_COPY.signUpKicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {AUTH_COPY.signUpTitle}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">{AUTH_COPY.signUpLead}</p>
      </div>
      <div className="mt-10 md:mt-12">
        <SignUpCard />
      </div>
    </div>
  );
}
