import { removerMarcador } from './marcador'

export type MensagemRecebida = { papel: 'usuario' | 'assistente'; texto: string }

const mensagensNoContexto = 6

// Ultimas mensagens da conversa, como o navegador mandou, sem o marcador de
// contato. O historico pode ser forjado; o que protege os dados e a RLS, e o
// prompt diz que o perfil nao muda pela conversa.
export function historicoDaConversa(mensagens: MensagemRecebida[]) {
  return mensagens
    .slice(-mensagensNoContexto)
    .map((mensagem) => ({ papel: mensagem.papel, texto: removerMarcador(mensagem.texto).trim() }))
    .filter((mensagem) => mensagem.texto)
}
