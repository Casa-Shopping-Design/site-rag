export default function TituloSecao({ rotulo, titulo, texto }: { rotulo: string; titulo: string; texto?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-destaque">{rotulo}</p>
      <h2 className="mt-2 text-3xl text-primaria sm:text-4xl">{titulo}</h2>
      {texto && <p className="mt-3 text-texto-suave">{texto}</p>}
    </div>
  )
}
