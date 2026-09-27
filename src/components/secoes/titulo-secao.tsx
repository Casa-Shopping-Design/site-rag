export default function TituloSecao({
  rotulo,
  titulo,
  texto,
  principal = false,
}: {
  rotulo: string
  titulo: string
  texto?: string
  // Nas paginas internas o titulo da secao e o titulo da pagina (h1)
  principal?: boolean
}) {
  const Titulo = principal ? 'h1' : 'h2'

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-destaque">{rotulo}</p>
      <Titulo className="mt-2 text-3xl text-primaria sm:text-4xl">{titulo}</Titulo>
      {texto && <p className="mt-3 text-texto-suave">{texto}</p>}
    </div>
  )
}
