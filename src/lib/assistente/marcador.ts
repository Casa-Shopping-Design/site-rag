// Marcador que o modelo usa para pedir o formulario de contato na tela.
export const MARCADOR_CONTATO = '[[CONTATO]]'

// Pega variacoes que alguem poderia digitar para o modelo repetir.
const variacoesDoMarcador = /\[\[\s*contato\s*\]\]/gi

// Repete ate nao sobrar nada: "[[CON[[CONTATO]]TATO]]" vira marcador depois
// da primeira troca.
export function removerMarcador(texto: string) {
  let limpo = texto
  let anterior
  do {
    anterior = limpo
    limpo = limpo.replace(variacoesDoMarcador, '')
  } while (limpo !== anterior)
  return limpo
}

// Tira o marcador da resposta em fluxo. Como ele pode chegar partido entre
// pedacos, ou montado por dentro, segura o texto a partir do primeiro "[["
// que ainda nao fechou. A resposta tem teto de tokens, entao o que fica
// segurado e pouco.
export function fluxoSemMarcador(origem: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decodificador = new TextDecoder()
  const codificador = new TextEncoder()
  let pendente = ''

  function separarSeguro(texto: string) {
    const limpo = removerMarcador(texto)
    const ultimoFechamento = limpo.lastIndexOf(']]')
    const inicio = limpo.indexOf('[[', ultimoFechamento === -1 ? 0 : ultimoFechamento + 2)
    if (inicio === -1) {
      const quebrado = limpo.endsWith('[') ? 1 : 0
      return { pronto: limpo.slice(0, limpo.length - quebrado), resto: limpo.slice(limpo.length - quebrado) }
    }
    return { pronto: limpo.slice(0, inicio), resto: limpo.slice(inicio) }
  }

  return origem.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(pedaco, controle) {
        pendente += decodificador.decode(pedaco, { stream: true })
        const { pronto, resto } = separarSeguro(pendente)
        pendente = resto
        if (pronto) controle.enqueue(codificador.encode(pronto))
      },
      flush(controle) {
        const final = removerMarcador(pendente + decodificador.decode())
        if (final) controle.enqueue(codificador.encode(final))
      },
    }),
  )
}
