"""Envia documentos da galeria para a base do assistente.

Usa a biblioteca rag-ingestao do jeito que ela e; o que este script acrescenta
e a escolha do nivel de visibilidade no momento do envio, traduzida para a
audiencia que o banco entende (publico, inquilino, admin ou loja:<uuid>).

Exemplos:
    python ingestao/enviar.py docs/horarios.md --visibilidade publico
    python ingestao/enviar.py regimento.pdf --visibilidade inquilino --categoria regimento
    python ingestao/enviar.py contrato-loja12.pdf --loja "Loja Exemplo"
    python ingestao/enviar.py regimento-2027.pdf --visibilidade inquilino --substitui <uuid>

Roda na maquina da administracao, com DATABASE_URL de um papel que grava
direto no banco (postgres ou service_role). Nunca e chamado pelo chat.
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
from datetime import date
from pathlib import Path
from uuid import UUID

import psycopg
from dotenv import load_dotenv
from rag_ingestao import Config, MetadadosDocumento, montar_pipeline
from rag_ingestao.config import PerfilDominio
from rag_ingestao.erros import ErroIngestao

load_dotenv(Path(__file__).with_name(".env"))

NIVEIS = ("publico", "inquilino", "admin")

CATEGORIAS = [
    "institucional", "lojas", "locacao", "eventos", "regimento", "obras",
    "carga-descarga", "fornecedores", "comunicado", "contrato", "loja", "outros",
]


def perfil_galeria(audiencia: str) -> PerfilDominio:
    # A biblioteca valida a audiencia contra o perfil; a da loja entra na hora.
    return PerfilDominio(
        nome="galeria",
        categorias=CATEGORIAS,
        audiencias=["todos", *NIVEIS, audiencia],
    )


def id_da_galeria() -> UUID:
    valor = os.getenv("SCD_ID_GALERIA")
    if not valor:
        sys.exit("Defina SCD_ID_GALERIA no ingestao/.env (qualquer uuid fixo).")
    return UUID(valor)


def achar_loja(url_banco: str, busca: str) -> tuple[UUID, str]:
    """Aceita o uuid da loja ou parte do nome. Recusa se achar mais de uma."""
    with psycopg.connect(url_banco) as conexao:
        try:
            id_loja = UUID(busca)
            linha = conexao.execute(
                "select id, nome from lojas where id = %s", (id_loja,)
            ).fetchone()
            achadas = [linha] if linha else []
        except ValueError:
            achadas = conexao.execute(
                "select id, nome from lojas where nome ilike %s order by nome",
                (f"%{busca}%",),
            ).fetchall()

    if not achadas:
        sys.exit(f"Nenhuma loja encontrada para '{busca}'.")
    if len(achadas) > 1:
        nomes = ", ".join(nome for _, nome in achadas)
        sys.exit(f"Mais de uma loja para '{busca}': {nomes}. Use o uuid.")
    return achadas[0][0], achadas[0][1]


def documento_existente(url_banco: str, galeria: UUID, titulo: str) -> UUID | None:
    with psycopg.connect(url_banco) as conexao:
        linha = conexao.execute(
            """
            select id from documentos
             where id_proprietario = %s and titulo = %s and excluido_em is null
             order by criado_em desc
             limit 1
            """,
            (galeria, titulo),
        ).fetchone()
    return linha[0] if linha else None


def ajustar_audiencia(url_banco: str, id_documento: UUID, audiencia: str) -> bool:
    """Na nova versao a biblioteca mantem a audiencia antiga. Aqui vale a do envio."""
    with psycopg.connect(url_banco) as conexao:
        alterado = conexao.execute(
            """
            update documentos set audiencias = array[%s]
             where id = %s and audiencias <> array[%s]
            """,
            (audiencia, id_documento, audiencia),
        ).rowcount
    return alterado > 0


def tipo_do_arquivo(caminho: Path) -> str:
    if caminho.suffix.lower() == ".md":
        return "text/markdown"
    tipo, _ = mimetypes.guess_type(caminho.name)
    return tipo or "application/octet-stream"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("arquivos", nargs="+", type=Path)
    nivel = parser.add_mutually_exclusive_group(required=True)
    nivel.add_argument("--visibilidade", choices=NIVEIS)
    nivel.add_argument("--loja", help="nome (ou parte) ou uuid da loja dona do documento")
    parser.add_argument("--titulo", help="so vale quando for um arquivo")
    parser.add_argument("--categoria", default="outros", choices=CATEGORIAS)
    parser.add_argument("--substitui", type=UUID, help="uuid do documento que esta sendo atualizado")
    parser.add_argument(
        "--novo", action="store_true",
        help="cria documento novo mesmo que ja exista um com o mesmo titulo",
    )
    parser.add_argument("--valido-ate", type=date.fromisoformat, help="AAAA-MM-DD; sai da busca depois dessa data")
    parser.add_argument(
        "--sem-processar", action="store_true",
        help="so enfileira; o worker (rag-ingestao worker) processa depois",
    )
    args = parser.parse_args()

    if args.titulo and len(args.arquivos) > 1:
        sys.exit("--titulo so pode ser usado com um arquivo.")
    if args.substitui and len(args.arquivos) > 1:
        sys.exit("--substitui so pode ser usado com um arquivo.")

    url_banco = os.getenv("RAG_DB_URL") or os.getenv("DATABASE_URL")
    if not url_banco:
        sys.exit("Defina DATABASE_URL no ingestao/.env.")

    if args.loja:
        id_loja, nome_loja = achar_loja(url_banco, args.loja)
        audiencia = f"loja:{id_loja}"
        print(f"Documento restrito a loja {nome_loja} ({id_loja})")
    else:
        audiencia = args.visibilidade

    config = Config.do_ambiente(perfil=perfil_galeria(audiencia))

    pipeline = montar_pipeline(config)
    galeria = id_da_galeria()
    falhas = 0

    for caminho in args.arquivos:
        if not caminho.is_file():
            print(f"[ignorado] {caminho}: arquivo nao encontrado", file=sys.stderr)
            falhas += 1
            continue

        titulo = args.titulo or caminho.stem.replace("-", " ").replace("_", " ")
        # Reenviar um arquivo com o mesmo titulo gera nova versao do mesmo
        # documento; so os trechos que mudaram sao vetorizados de novo.
        substitui = args.substitui
        if substitui is None and not args.novo:
            substitui = documento_existente(url_banco, galeria, titulo)

        metadados = MetadadosDocumento(
            titulo=titulo,
            categoria=args.categoria,
            audiencias=(audiencia,),
            vigencia_fim=args.valido_ate,
            substitui_documento_id=substitui,
        )
        try:
            resultado = pipeline.receber_upload(
                id_proprietario=galeria,
                binario=caminho.read_bytes(),
                nome_arquivo=caminho.name,
                tipo_conteudo=tipo_do_arquivo(caminho),
                metadados=metadados,
                criado_por=galeria,
            )
        except ErroIngestao as erro:
            print(f"[recusado] {caminho.name}: {erro.mensagem_usuario}", file=sys.stderr)
            falhas += 1
            continue

        situacao = resultado.situacao.value
        print(f"[{situacao.lower()}] {caminho.name} -> documento {resultado.id_documento} "
              f"v{resultado.numero_versao}")
        if ajustar_audiencia(url_banco, resultado.id_documento, audiencia):
            print(f"           visibilidade do documento alterada para {audiencia}")

        if situacao == "PENDENTE" and not args.sem_processar:
            pipeline.processar_versao(resultado.id_versao)
            versao = pipeline.documentos.obter_versao(resultado.id_versao)
            if versao is not None:
                print(f"           {versao.situacao.value}: {versao.qtd_trechos} trechos, "
                      f"{versao.tokens_consumidos} tokens novos")

    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
