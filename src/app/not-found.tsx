export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-400">A página que você procura não foi encontrada.</p>
      </div>
    </main>
  );
}
