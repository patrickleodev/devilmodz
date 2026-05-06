"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="w-full border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent hover:opacity-80 transition"
          >
            <img
              src="/simple_logo_transparent.png"
              alt="DEVIL MODZ"
              className="h-16 w-16 shrink-0 object-contain"
            />
            DEVIL MODZ
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/cart"
              className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Carrinho</span>
            </Link>

            {/* User Menu */}
            {session?.user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-white">
                    {session.user.name}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 transition"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 transition"
              >
                Entrar
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden rounded-lg p-2 hover:bg-white/5 transition"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-slate-900 md:hidden">
            <div className="flex flex-col gap-3 px-4 py-4">
              <Link
                href="/cart"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                onClick={() => setMenuOpen(false)}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>Carrinho</span>
              </Link>

              {session?.user ? (
                <>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Conectado como
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {session.user.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 transition"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    signIn("discord");
                    setMenuOpen(false);
                  }}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 transition"
                >
                  Entrar com Discord
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
