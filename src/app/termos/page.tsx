export default function Page() {
  const sections = [
    {
      title: "1. Antes de comprar",
      content:
        "Ao fazer uma compra na Devil Modz, voce confirma que leu e aceitou estas regras. Se tiver qualquer duvida, fale com o suporte antes de pagar.",
    },
    {
      title: "2. Como funciona o servico",
      content:
        "Trabalhamos com pacotes, planos e pedidos personalizados para GTA. O cliente deve conferir valor, quantidade e detalhes do pedido antes de finalizar a compra.",
    },
    {
      title: "3. Limite de 30M por dia",
      content:
        "Por seguranca da conta no GTA, entregamos no maximo 30M por dia. Se o pedido for maior, a entrega pode ser dividida em varios dias.",
    },
    {
      title: "4. Prazos",
      content:
        "Os prazos sao estimativas. Podem acontecer atrasos por fila, manutencao, instabilidade do GTA, demora no pagamento, falta de resposta do cliente ou outros problemas fora do nosso controle.",
    },
    {
      title: "5. Responsabilidade do cliente",
      content:
        "O cliente precisa enviar as informacoes corretas, responder o suporte quando necessario e evitar alterar a conta enquanto o pedido estiver em andamento.",
    },
    {
      title: "6. Uso da conta",
      content:
        "Nao nos responsabilizamos por problemas causados por uso inadequado da conta antes ou depois do servico, como uso de outros menus, glitches, exploits, compartilhamento com terceiros, compras suspeitas, punicoes, rollback ou bloqueios.",
    },
    {
      title: "7. Reembolso",
      content:
        "Pedidos que ainda nao foram iniciados podem ser analisados para cancelamento. Depois que a entrega comecar, o reembolso pode ser parcial ou recusado, dependendo do andamento do pedido.",
    },
    {
      title: "8. Suporte",
      content:
        "O atendimento acontece pelos canais oficiais, como site, painel ou Discord. Acompanhe as mensagens para evitar atrasos na entrega.",
    },
    {
      title: "9. Mudancas nos termos",
      content:
        "Estes termos podem ser atualizados quando necessario. A versao publicada nesta pagina vale para novas compras.",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
      <section className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Devil Modz</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Termos e Condicoes</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          Leia antes de comprar. Aqui explicamos os principais cuidados, prazos e responsabilidades do
          cliente durante o atendimento.
        </p>
      </section>

      <section className="grid gap-4">
        {sections.map((section) => (
          <article key={section.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{section.content}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
        Em caso de duvida, chame o suporte antes de finalizar a compra.
      </section>
    </main>
  );
}
