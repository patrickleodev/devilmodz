"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { isAdminRole } from "../lib/admin";

const CartSidebar = dynamic(() => import("../components/CartSidebar"), { ssr: false });

export default function Header() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { roles?: string[] } | undefined;
  const isAdmin = isAdminRole(sessionUser?.roles);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNotify, setCartNotify] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const cartNotifyTimeoutRef = useRef<number | null>(null);

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
    const openCartHandler = () => {
      setCartOpen(true);
      setCartNotify(false);
    };
    window.addEventListener("open_cart", openCartHandler as EventListener);
    return () => window.removeEventListener("open_cart", openCartHandler as EventListener);
  }, []);

  useEffect(() => {
    const refreshCartCount = async () => {
      if (!session?.user) {
        setCartCount(0);
        return;
      }

      try {
        const response = await fetch("/api/cart");
        const payload = (await response.json()) as { items?: Array<{ quantity?: number }> };
        if (!response.ok) return;
        setCartCount((payload.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0));
      } catch {
        /* ignore cart count refresh errors */
      }
    };

    void refreshCartCount();
  }, [session?.user]);

  useEffect(() => {
    const setCountFromPayload = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setCartCount(Math.max(0, detail.count));
      }
    };

    const notifyHandler = () => {
      if (cartNotifyTimeoutRef.current) {
        window.clearTimeout(cartNotifyTimeoutRef.current);
      }
      setCartNotify(true);
      cartNotifyTimeoutRef.current = window.setTimeout(() => setCartNotify(false), 1400);
    };

    window.addEventListener("cart_count_changed", setCountFromPayload as EventListener);
    window.addEventListener("cart_notify", notifyHandler as EventListener);
    return () => {
      window.removeEventListener("cart_count_changed", setCountFromPayload as EventListener);
      window.removeEventListener("cart_notify", notifyHandler as EventListener);
      if (cartNotifyTimeoutRef.current) {
        window.clearTimeout(cartNotifyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-slate-950/95">
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
          {/* Centered Navigation (desktop) */}
          <nav className="hidden md:flex md:flex-1 md:justify-center">
            <ul className="flex items-center gap-6">
              <li>
                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  href="/planos"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Planos
                </Link>
              </li>
              <li>
                <Link
                  href="/contas"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Contas
                </Link>
              </li>
              <li>
                <Link
                  href="/termos"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Termos
                </Link>
              </li>
            </ul>
          </nav>

          {/* Right side controls */}
          <div className="hidden items-center gap-6 md:flex">
            {/* Cart button */}
            <button
              onClick={() => { setMenuOpen(false); setCartOpen(true); setCartNotify(false); }}
              className="relative cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              aria-label="Abrir carrinho"
            >
              <span className="relative inline-flex">
                🛒
                <span className={`absolute -right-2 -top-2 inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[0.65rem] font-semibold text-slate-950 shadow-[0_0_0_4px_rgba(16,185,129,0.15)] ${cartNotify ? "animate-cart-notification" : ""}`}>
                  {cartCount}
                </span>
              </span>
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-black/40">
                    <div className="px-1 py-1">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Conectado como
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {session.user.name || "Usuário"}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <Link
                        href="/perfil"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-200">
                          ⚙
                        </span>
                        Gerenciar perfil
                      </Link>

                      {isAdmin ? (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200">
                            A
                          </span>
                          Painel admin
                        </Link>
                      ) : null}

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

              <Link
                href="/contas"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-base">🔒</span>
                <span>Contas</span>
              </Link>

              <Link
                href="/termos"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-base">📜</span>
                <span>Termos</span>
              </Link>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setCartOpen(true);
                  setCartNotify(false);
                }}
                className="relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                <span className="relative inline-flex">
                  🛒
                  <span className={`absolute -right-2 -top-2 inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[0.65rem] font-semibold text-slate-950 shadow-[0_0_0_4px_rgba(16,185,129,0.15)] ${cartNotify ? "animate-cart-notification" : ""}`}>
                    {cartCount}
                  </span>
                </span>
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
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
                  >
                    <span className="text-base">⚙</span>
                    <span>Gerenciar perfil</span>
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

