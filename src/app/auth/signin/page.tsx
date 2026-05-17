const errorMessages: Record<string, string> = {
  AccessDenied: "Seu acesso foi negado durante a autenticação.",
  Callback: "Houve um problema ao concluir o retorno do Discord.",
  OAuthCallback: "O Discord não concluiu o login corretamente.",
  OAuthAccountNotLinked: "Esta conta do Discord já está associada a outro login.",
  Configuration: "A configuração de autenticação precisa ser revisada.",
  Default: "Não foi possível entrar no momento.",
};

import SignInClient from "./sign-in-client";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
    error?: string | string[];
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = Array.isArray(searchParams?.callbackUrl)
    ? searchParams.callbackUrl[0]
    : searchParams?.callbackUrl || "/";
  const error = Array.isArray(searchParams?.error) ? searchParams.error[0] : searchParams?.error || "";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/90 p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">DEVIL MODZ</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Entrar na conta</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>

        <SignInClient callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
