# Observabilidade UFAL

Stack do Campus Arapiraca para centralizar métricas, logs e rastreamento de aplicações da UFAL. O Grafana mostra as métricas do Prometheus, e o Kibana permite explorar os dados armazenados no Elasticsearch.

## Como rodar

Na raiz do repositório, crie o `.env` a partir do [`.env.example`](.env.example) se ele ainda não existir. Preencha `ELASTIC_PASSWORD` e `GF_SECURITY_ADMIN_PASSWORD`.

### Modo institucional

Sobe a stack completa. Prometheus e Metricbeat coletam as métricas da UD Nest em `sistemas.arap:3333/metrics`.

```bash
docker compose -f docker-compose.yaml up -d
```

### Modo local

Inicie a UD Nest na porta `3333`, acessível ao Docker. O override aponta Prometheus e Metricbeat para `host.docker.internal:3333/metrics`.

```bash
docker compose -f docker-compose.yaml -f compose.local.yaml up -d prometheus grafana metricbeat kibanaud
```

Abra a pasta **UD Nest** no [Grafana](http://localhost:3000) ou filtre por `service.name: "ud_nest_api"` no [Kibana](http://localhost:5601). Para voltar ao alvo institucional, use o comando do modo institucional.

## Portas padrão

| Serviço | Porta no host |
| --- | --- |
| Prometheus | `9090` |
| Grafana | `3000` |
| Elasticsearch (`esud01`) | `9200` (API), `9300` (transporte) |
| Kibana (`kibanaud`) | `5601` |
| APM Server | `8200` |
| Metricbeat | Sem porta publicada |

## Dashboard de logs no Kibana

Para importar o dashboard **UD Nest - Logs da API** e o padrão `logs-ud-api`, execute:

```bash
docker compose run --rm kibana-import
```

Para atualizar os objetos já importados com a versão do Git, use `docker compose run --rm kibana-import --overwrite`. Os objetos ficam no espaço padrão do Kibana. [Detalhes da importação](docs/SERVICOS.md#dashboards-do-kibana)

[Documentação dos serviços e operação](docs/SERVICOS.md)
