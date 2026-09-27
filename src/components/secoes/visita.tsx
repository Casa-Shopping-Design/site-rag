import Container from '@/components/layout/container'
import TituloSecao from '@/components/secoes/titulo-secao'
import { enderecoCompleto, preenchido, site } from '@/lib/conteudo'

export default function Visita() {
  const horarios = site.horarios.filter((h) => preenchido(h.horario))

  return (
    <section className="py-20">
      <Container className="grid gap-10 lg:grid-cols-2">
        <div>
          <TituloSecao rotulo="Visite" titulo="Como chegar" />
          <dl className="mt-6 space-y-5 text-sm">
            {enderecoCompleto() && (
              <div>
                <dt className="font-medium text-primaria">Endereço</dt>
                <dd className="text-texto-suave">{enderecoCompleto()}</dd>
              </div>
            )}
            {horarios.length > 0 && (
              <div>
                <dt className="font-medium text-primaria">Horário</dt>
                {horarios.map((h) => (
                  <dd key={h.dias} className="text-texto-suave">
                    {h.dias}: {h.horario}
                  </dd>
                ))}
              </div>
            )}
            {preenchido(site.observacaoHorario) && horarios.length > 0 && (
              <dd className="-mt-4 text-xs text-texto-suave">{site.observacaoHorario}</dd>
            )}
            {preenchido(site.contato.telefone) && (
              <div>
                <dt className="font-medium text-primaria">Telefone</dt>
                <dd>
                  <a href={`tel:+55${site.contato.telefone.replace(/\D/g, '')}`} className="text-texto-suave hover:text-destaque">
                    {site.contato.telefone}
                  </a>
                </dd>
              </div>
            )}
            {preenchido(site.estacionamento) && (
              <div>
                <dt className="font-medium text-primaria">Estacionamento</dt>
                <dd className="text-texto-suave">{site.estacionamento}</dd>
              </div>
            )}
          </dl>
          {site.linkMapa && (
            <a
              href={site.linkMapa}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sm text-destaque hover:underline"
            >
              Abrir no Google Maps
            </a>
          )}
        </div>
        {site.mapaEmbedUrl ? (
          <iframe
            src={site.mapaEmbedUrl}
            title={`Mapa do ${site.nome}`}
            loading="lazy"
            className="h-80 w-full rounded-padrao border border-borda"
          />
        ) : (
          <div className="flex h-80 items-center justify-center rounded-padrao border border-dashed border-borda text-sm text-texto-suave">
            Mapa entra aqui quando o endereço estiver confirmado.
          </div>
        )}
      </Container>
    </section>
  )
}
