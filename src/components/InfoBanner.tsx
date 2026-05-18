export default function InfoBanner() {
  return (
    <section className="w-full my-6">
      <div className="mx-auto max-w-6xl rounded-lg border border-yellow-900/40 bg-gradient-to-b from-transparent to-black/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-800/20 text-yellow-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
              </svg>
            </div>
            <div>
              <h3 className="text-yellow-300 text-lg font-semibold">INFORMAÇÕES IMPORTANTES</h3>
              <p className="text-yellow-100/70 text-sm">Requisitos obrigatórios para garantir a segurança e a entrega do seu serviço.</p>
            </div>
          </div>

          <div className="ml-auto w-full md:w-1/2">
            <ul className="space-y-2 rounded-md border border-yellow-900/30 bg-black/40 p-4 text-sm">
              <li className="flex items-start gap-3 text-yellow-50">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-700 text-xs">i</span>
                <span>Limite diário do jogo: <strong>30 minutos por dia</strong> (todas as plataformas)</span>
              </li>
              <li className="flex items-start gap-3 text-yellow-50">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-700 text-xs">i</span>
                <span>É necessário entrar na conta para realizar o serviço</span>
              </li>
              <li className="flex items-start gap-3 text-yellow-50">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-700 text-xs">i</span>
                <span>Prazo máximo para iniciar o serviço: <strong>24 horas</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
