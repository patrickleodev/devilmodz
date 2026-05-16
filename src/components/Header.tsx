"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const CartSidebar = dynamic(() => import("../components/CartSidebar"), { ssr: false });

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Listen for external requests to open the cart (e.g. from other pages/components)
  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener("open_cart", handler as EventListener);
    return () => window.removeEventListener("open_cart", handler as EventListener);
  }, []);

  return (
    <>
      <header className="w-full border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-10">
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
              href="/planos"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Planos
            </Link>

            {/* Cart button */}
            <button
              onClick={() => { setMenuOpen(false); setCartOpen(true); }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              aria-label="Abrir carrinho"
            >
              🛒
            </button>

            {/* User Menu */}
            {session?.user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 transition hover:border-cyan-400/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  aria-label="Abrir menu do perfil"
                  aria-expanded={profileMenuOpen}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "Perfil"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {(session.user.name || "D").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-3xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
                    <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Conectado como
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {session.user.name || "Usuário"}
                      </p>
                    </div>

                    <div className="mt-1.5 flex flex-col gap-1">
                      <Link
                        href="/account"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-200">
                          ⚙
                        </span>
                        Gerenciar conta
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-200">
                          ⎋
                        </span>
                        Sair
                      </button>
                    </div>
                  </div>
                ) : null}
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
                href="/planos"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-base">📋</span>
                <span>Planos</span>
              </Link>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setCartOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                <span className="text-base">🛒</span>
                <span>Carrinho</span>
              </button>

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
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                  >
                    <span className="text-base">⚙</span>
                    <span>Gerenciar conta</span>
                  </Link>
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
      {/* Cart Sidebar root - controlled via state */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

