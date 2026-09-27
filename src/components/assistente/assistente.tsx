'use client'

import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import FormularioLead from '@/components/formularios/formulario-lead'
import { MARCADOR_CONTATO } from '@/lib/assistente/marcador'

type Mensagem = { papel: 'usuario' | 'assistente'; texto: string; pedirContato?: boolean }

const boasVindas: Mensagem = {
  papel: 'assistente',
  texto: 'Olá! Posso ajudar com horários, lojistas, estacionamento ou locação de salas, lojas e auditório. O que você procura?',
}

export default function Assistente({ avisoLgpd }: { avisoLgpd: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([boasVindas])
  const [texto, setTexto] = useState('')
  const [respondendo, setRespondendo] = useState(false)
  const fimDaLista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function perguntar(evento: React.FormEvent) {
    evento.preventDefault()
    const pergunta = texto.trim()
    if (!pergunta || respondendo) return

    const conversa = [...mensagens, { papel: 'usuario' as const, texto: pergunta }]
    setMensagens([...conversa, { papel: 'assistente', texto: '' }])
    setTexto('')
    setRespondendo(true)

    try {
      const resposta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A boas-vindas e fixa da tela, nao vai para o modelo
        body: JSON.stringify({
          mensagens: conversa.slice(1).map(({ papel, texto }) => ({ papel, texto })),
        }),
      })
      if (!resposta.body) throw new Error('sem corpo')

      const leitor = resposta.body.getReader()
      const decodificador = new TextDecoder()
      let acumulado = ''

      while (true) {
        const { done, value } = await leitor.read()
        if (done) break
        acumulado += decodificador.decode(value, { stream: true })
        const visivel = acumulado.replace(MARCADOR_CONTATO, '').trimEnd()
        setMensagens((atual) => [...atual.slice(0, -1), { papel: 'assistente', texto: visivel }])
      }

      setMensagens((atual) => [
        ...atual.slice(0, -1),
        {
          papel: 'assistente',
          texto: acumulado.replace(MARCADOR_CONTATO, '').trim(),
          pedirContato: acumulado.includes(MARCADOR_CONTATO),
        },
      ])
    } catch {
      setMensagens((atual) => [
        ...atual.slice(0, -1),
        { papel: 'assistente', texto: 'Não consegui responder agora. Tente de novo em instantes.' },
      ])
    } finally {
      setRespondendo(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls="painel-assistente"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primaria px-5 py-3 text-sm font-medium text-fundo shadow-lg"
      >
        {aberto ? <X size={18} aria-hidden /> : <MessageCircle size={18} aria-hidden />}
        {aberto ? 'Fechar' : 'Tire sua dúvida'}
      </button>

      {aberto && (
        <section
          id="painel-assistente"
          aria-label="Assistente do Casa Shopping Design"
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-padrao border border-borda bg-superficie shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[400px]"
        >
          <header className="border-b border-borda px-4 py-3">
            <p className="font-medium text-primaria">Assistente do Casa Design</p>
            <p className="text-xs text-texto-suave">Responde com base nos documentos da administração.</p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            {mensagens.map((mensagem, posicao) => (
              <div key={posicao} className={mensagem.papel === 'usuario' ? 'flex justify-end' : ''}>
                <div
                  className={
                    mensagem.papel === 'usuario'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primaria px-3 py-2 text-fundo'
                      : 'max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-fundo px-3 py-2 text-texto'
                  }
                >
                  {mensagem.texto || <span className="text-texto-suave">Pensando...</span>}
                </div>
                {mensagem.pedirContato && (
                  <div className="mt-3 rounded-padrao border border-borda p-3">
                    <FormularioLead origem="assistente" aviso={avisoLgpd} compacto />
                  </div>
                )}
              </div>
            ))}
            <div ref={fimDaLista} />
          </div>

          <form onSubmit={perguntar} className="flex gap-2 border-t border-borda p-3">
            <label htmlFor="pergunta" className="sr-only">
              Sua pergunta
            </label>
            <input
              id="pergunta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={1500}
              placeholder="Escreva sua pergunta"
              className="flex-1 rounded-full border border-borda bg-fundo px-4 py-2 text-sm outline-none focus:border-destaque"
            />
            <button
              type="submit"
              disabled={respondendo || !texto.trim()}
              aria-label="Enviar pergunta"
              className="rounded-full bg-destaque p-2.5 text-white disabled:opacity-50"
            >
              <Send size={16} aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
