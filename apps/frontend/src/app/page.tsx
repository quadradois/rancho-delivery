export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-5xl font-bold text-primary-600">
          Sabor Express
        </h1>
        <p className="text-xl text-gray-600">
          Sistema de delivery em construção
        </p>
        <div className="space-y-4 text-left bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800">
            Fase 1 - Setup Inicial
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Estrutura do projeto criada
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Backend configurado
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Frontend configurado
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              Implementação do cardápio
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              Sistema de pedidos
            </li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Versão 0.1.0 - Em desenvolvimento
        </p>
      </div>
    </main>
  )
}
