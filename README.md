# Observabilidade UFAL

Stack do Campus Arapiraca para centralizar métricas, logs e rastreamento de aplicações da UFAL. O Grafana mostra as métricas do Prometheus, e o Kibana permite explorar os dados armazenados no Elasticsearch.

## Como rodar

Na raiz do repositório, crie o `.env` a partir do [`.env.example`](.env.example) se ele ainda não existir. Preencha `ELASTIC_PASSWORD` e `GF_SECURITY_ADMIN_PASSWORD`.

O Elasticsearch 9 usa um volume novo. Para aproveitar os dados da versão 7.17 em `es01/`, consulte as [instruções de migração](docs/SERVICOS.md#versões-e-migração).

### Modo institucional

Sobe a stack completa. Prometheus e Metricbeat coletam as métricas da UD Nest em `sistemas.arap:3333/metrics`.

```bash
docker compose -f compose.yaml up -d
```

### Modo local

Inicie a UD Nest na porta `3333`, acessível ao Docker. O override aponta Prometheus e Metricbeat para `host.docker.internal:3333/metrics`.

```bash
docker compose -f compose.yaml -f compose.local.yaml up -d nginx prometheus grafana metricbeat kibanaud
```

Abra a pasta **UD Nest** no [Grafana](http://localhost/grafana/) ou filtre por `service.name: "ud_nest_api"` no [Kibana](http://localhost/kibana/). Para voltar ao alvo institucional, use o comando do modo institucional.

## Proxy reverso (nginx)

O nginx expõe cada serviço em uma rota própria, na porta `80` do host (configurável com `NGINX_HTTP_PORT`). Configuração em [`nginx/nginx.conf`](nginx/nginx.conf).

| Rota | Serviço | Observação |
| --- | --- | --- |
| `/` | Página com links | Estática |
| `/grafana/` | Grafana | Subcaminho nativo (`GF_SERVER_SERVE_FROM_SUB_PATH`) |
| `/kibana/` | Kibana (`kibanaud`) | `server.basePath=/kibana` |
| `/prometheus/` | Prometheus | Prefixo removido pelo nginx; `--web.external-url` |
| `/elasticsearch/` | Elasticsearch (`esud01`) | API; exige autenticação do Elasticsearch |
| `/apm/` | APM Server | Ingestão; use `serverUrl` `http://<host>/apm` nos agentes |
| `/healthz` | nginx | Verificação de saúde |

Se acessar por outro host, porta ou HTTPS, defina `NGINX_PUBLIC_URL` no `.env` (ex.: `http://observabilidade.arap`), pois Grafana, Kibana e Prometheus usam essa URL para gerar links. O nginx é o único ponto de entrada: os demais serviços não publicam portas no host.

## Dashboard de logs no Kibana

Para importar o dashboard **UD Nest - Logs da API** e o padrão `logs-ud-api`, execute:

```bash
docker compose run --rm kibana-import
```

Para atualizar os objetos já importados com a versão do Git, use `docker compose run --rm kibana-import --overwrite`. Os objetos ficam no espaço padrão do Kibana. [Detalhes da importação](docs/SERVICOS.md#dashboards-do-kibana)

[Documentação dos serviços e operação](docs/SERVICOS.md)
