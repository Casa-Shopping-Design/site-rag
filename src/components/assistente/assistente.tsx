'use client'

import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import FormularioLead from '@/components/formularios/formulario-lead'
import { MARCADOR_CONTATO, removerMarcador } from '@/lib/assistente/marcador'

type Mensagem = { papel: 'usuario' | 'assistente'; texto: string; pedirContato?: boolean }

const boasVindas: Mensagem = {
  papel: 'assistente',
  texto: 'Olá! Posso ajudar com horários, lojistas, estacionamento ou locação de salas, lojas e auditório. O que você procura?',
}

const erroResposta = 'Não consegui responder agora. Tente de novo em instantes.'

export default function Assistente({ avisoLgpd }: { avisoLgpd: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([boasVindas])
  const [texto, setTexto] = useState('')
  const [respondendo, setRespondendo] = useState(false)
  // Texto lido pelo leitor de tela. Recebe a resposta inteira so no fim,
  // para nao anunciar cada pedaco do streaming.
  const [anuncio, setAnuncio] = useState('')
  const fimDaLista = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const jaAbriu = useRef(false)

  useEffect(() => {
    const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    fimDaLista.current?.scrollIntoView({ behavior: semAnimacao ? 'auto' : 'smooth', block: 'nearest' })
  }, [mensagens])

  useEffect(() => {
    if (aberto) {
      jaAbriu.current = true
      campo.current?.focus()
      const fecharComEsc = (evento: KeyboardEvent) => {
        if (evento.key === 'Escape') setAberto(false)
      }
      document.addEventListener('keydown', fecharComEsc)
      return () => document.removeEventListener('keydown', fecharComEsc)
    }
    // Ao fechar, o foco volta para o botao; no carregamento da pagina, nao.
    if (jaAbriu.current) botao.current?.focus()
  }, [aberto])

  async function perguntar(evento: React.FormEvent) {
    evento.preventDefault()
    const pergunta = texto.trim()
    if (!pergunta || respondendo) return

    const conversa = [...mensagens, { papel: 'usuario' as const, texto: pergunta }]
    setMensagens([...conversa, { papel: 'assistente', texto: '' }])
    setTexto('')
    setRespondendo(true)
    setAnuncio('Buscando a resposta.')

    try {
      const resposta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A boas-vindas e fixa da tela, nao vai para o modelo. O servidor so
        // usa as 6 ultimas e recusa mais de 20.
        body: JSON.stringify({
          mensagens: conversa
            .slice(1)
            .filter((mensagem) => mensagem.texto.trim())
            .slice(-6)
            .map(({ papel, texto }) => ({ papel, texto })),
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
        const visivel = removerMarcador(acumulado).trimEnd()
        setMensagens((atual) => [...atual.slice(0, -1), { papel: 'assistente', texto: visivel }])
      }

      const final = removerMarcador(acumulado).trim()
      const pedirContato = acumulado.includes(MARCADOR_CONTATO)
      setMensagens((atual) => [...atual.slice(0, -1), { papel: 'assistente', texto: final, pedirContato }])
      setAnuncio(
        `Assistente: ${final}` + (pedirContato ? ' Abaixo da resposta há um formulário para deixar seu contato.' : ''),
      )
    } catch {
      setMensagens((atual) => [...atual.slice(0, -1), { papel: 'assistente', texto: erroResposta }])
      setAnuncio(erroResposta)
    } finally {
      setRespondendo(false)
    }
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls="painel-assistente"
        className="fixed bottom-4 right-4 z-50 flex min-h-11 items-center gap-2 rounded-full bg-primaria px-5 py-3 text-sm font-medium text-fundo shadow-lg sm:bottom-5 sm:right-5"
      >
        {aberto ? <X size={18} aria-hidden /> : <MessageCircle size={18} aria-hidden />}
        {aberto ? 'Fechar assistente' : 'Tire sua dúvida'}
      </button>

      {aberto && (
        <section
          id="painel-assistente"
          role="dialog"
          aria-labelledby="titulo-assistente"
          aria-describedby="descricao-assistente"
          className="fixed inset-x-2 bottom-20 z-50 flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-padrao border border-borda bg-superficie shadow-2xl sm:inset-x-auto sm:right-5 sm:max-h-[75dvh] sm:w-[400px]"
        >
          <div className="border-b border-borda px-4 py-3">
            <h2 id="titulo-assistente" className="text-lg text-primaria">
              Assistente do Casa Design
            </h2>
            <p id="descricao-assistente" className="text-xs text-texto-suave">
              Responde com base nos documentos da administração. Tecle Esc para fechar.
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-busy={respondendo}>
            {mensagens.map((mensagem, posicao) => (
              <div key={posicao} className={mensagem.papel === 'usuario' ? 'flex justify-end' : ''}>
                <div
                  className={
                    mensagem.papel === 'usuario'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primaria px-3 py-2 text-fundo'
                      : 'max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-fundo px-3 py-2 text-texto'
                  }
                >
                  <span className="sr-only">{mensagem.papel === 'usuario' ? 'Você: ' : 'Assistente: '}</span>
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

          <p role="status" className="sr-only">
            {anuncio}
          </p>

          <form onSubmit={perguntar} className="flex gap-2 border-t border-borda p-3">
            <label htmlFor="pergunta" className="sr-only">
              Sua pergunta
            </label>
            <input
              ref={campo}
              id="pergunta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={1500}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Escreva sua pergunta"
              className="h-11 min-w-0 flex-1 rounded-full border border-borda-campo bg-fundo px-4 text-base text-texto placeholder:text-texto-suave focus:border-foco sm:text-sm"
            />
            <button
              type="submit"
              disabled={respondendo || !texto.trim()}
              aria-label={respondendo ? 'Aguarde a resposta' : 'Enviar pergunta'}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primaria text-fundo disabled:opacity-50"
            >
              <Send size={18} aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
