"use client";

import { signIn } from "next-auth/react";

type SignInClientProps = {
  callbackUrl: string;
};

export default function SignInClient({ callbackUrl }: SignInClientProps) {
  return (
    <button
      type="button"
      onClick={() => signIn("discord", { callbackUrl })}
      className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
    >
      Continuar com Discord
    </button>
  );
}