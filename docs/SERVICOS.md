# Para que serve cada serviço

Este documento apresenta os serviços definidos em `docker-compose.yaml` e como eles se relacionam na stack de observabilidade.

## Fluxo geral

Prometheus e Metricbeat coletam métricas da UD Nest pela URL pública `sistemas.arap:3333/metrics`: Prometheus as mantém para consulta e Grafana as apresenta em painéis; Metricbeat também as encaminha ao Elasticsearch. Assim, a coleta da aplicação não depende de alias DNS de container na rede Docker. O APM Server recebe eventos de desempenho das aplicações e os armazena no Elasticsearch. Kibana oferece telas para explorar os dados armazenados.

## Serviços

### Prometheus

Coleta e armazena séries temporais de métricas. A configuração atual busca `/metrics` no alvo público `sistemas.arap:3333` a cada 15 segundos. Grafana usa Prometheus como fonte de dados. Interface: porta `9090`.

### Grafana

Cria painéis e gráficos consultando o Prometheus. A configuração provisionada fica em `grafana-provisioning/` e os dashboards versionados ficam em `grafana-dashboards/`. O estado local do Grafana fica no volume `grafana-data`. A interface usa a porta `3000` e a senha administrativa vem de `GF_SECURITY_ADMIN_PASSWORD` no `.env`. Veja o [fluxo de edição e publicação de dashboards](#dashboards-do-grafana).

### Elasticsearch (`esud01`)

Banco de busca e armazenamento da stack Elastic. Recebe métricas encaminhadas pelo Metricbeat e dados de desempenho recebidos pelo APM Server; pode também armazenar logs quando as aplicações forem configuradas para enviá-los. É um nó único nesta configuração. API HTTP: porta `9200`; comunicação interna do cluster: `9300`. Os dados persistem no volume `elasticsearch-data-v9`. A senha do usuário `elastic` vem de `ELASTIC_PASSWORD`.

### Kibana (`kibanaud`)

Interface web para pesquisar, visualizar e administrar os dados no Elasticsearch. Também é usada pelo APM Server para configurar recursos de APM. O serviço `kibana-setup` configura o usuário interno `kibana_system` antes de iniciar o Kibana. Defina `KIBANA_SYSTEM_PASSWORD` para uma senha separada. No ambiente local, se esse campo estiver vazio, o valor vem de `ELASTIC_PASSWORD`. O acesso pela interface usa uma conta do Elasticsearch. Interface na porta `5601`.

### Metricbeat

Agente leve da Elastic que coleta e envia métricas ao Elasticsearch. Neste Compose, usa o módulo Prometheus para ler `sistemas.arap:3333/metrics` a cada 10 segundos. O acesso somente leitura ao socket Docker permite coletar informações do ambiente de containers conforme os módulos habilitados. Credencial: `ELASTIC_PASSWORD`. Não tem porta publicada.

No Kibana, filtre por `service.name: "ud_nest_api"` para ver as métricas da API ou por `fields.project: "ud_nest"` para reunir as métricas do projeto. Para coletar outro serviço que exponha métricas no formato Prometheus e precise enviá-las ao Elasticsearch, adicione uma entrada à lista `metricbeat.modules` com `module: prometheus`, o endereço do serviço e seus identificadores.

### APM Server (`apm-server`)

Recebe dados de Application Performance Monitoring (APM), como transações, erros e tempos de resposta, enviados por agentes instalados e configurados nas aplicações. Encaminha os eventos ao Elasticsearch e integra-se ao Kibana. A porta de ingestão publicada é `8200`. A instrumentação e os agentes pertencem aos repositórios das aplicações; este serviço sozinho não gera dados APM.

## Como os serviços se conectam

Os serviços da stack usam a rede privada `observabilidade` criada pelo Compose. Os nomes de serviço usados como DNS interno da stack incluem `esud01`, `kibanaud` e `apm-server`. A coleta das métricas da UD Nest usa a URL pública `sistemas.arap`.

Prometheus e Metricbeat coletam o endpoint de métricas da aplicação de forma independente. Prometheus armazena as métricas consultadas pelo Grafana, e Metricbeat envia métricas ao Elasticsearch para consulta no Kibana.

No modo local, ambos coletam em `host.docker.internal:3333/metrics` por padrão. Para usar outro endereço, ajuste o `ud-nest.yml` no diretório indicado por `PROMETHEUS_LOCAL_TARGETS_DIR` para o Prometheus e defina `METRICBEAT_LOCAL_UD_NEST_HOST` no `.env` com o mesmo `host:porta` para o Metricbeat. Aplique o override novamente com o [comando do modo local](../README.md#modo-local).

## Credenciais e dados

As senhas são fornecidas pelo arquivo local `.env` por meio de `ELASTIC_PASSWORD`, `KIBANA_SYSTEM_PASSWORD` e `GF_SECURITY_ADMIN_PASSWORD`. Mantenha o `.env`, os diretórios ignorados `grafana/` e `es01/` e os volumes de dados fora do Git.

## Dashboards do Grafana

O Git guarda os dashboards em `grafana-dashboards/`, com um JSON por dashboard e uma pasta por projeto. O Compose monta esse diretório em modo somente leitura e o [provisionamento](../grafana-provisioning/dashboards/ufal.yml) usa os nomes das subpastas para organizar os dashboards no Grafana.

Os dashboards da UD Nest usam o job `ud_nest_api`:

- [Coleta de métricas](../grafana-dashboards/UD%20Nest/coleta.json) acompanha o resultado de cada coleta pelo Prometheus.
- [Tráfego HTTP](../grafana-dashboards/UD%20Nest/http.json) mostra requisições por segundo e por método, respostas por código, taxas de 4xx e 5xx, proporção de 5xx e percentis de latência, incluindo p95 por rota.
- [Processo Node.js](../grafana-dashboards/UD%20Nest/nodejs.json) acompanha CPU, memória, heap, atraso do event loop, coletas de lixo e tempo desde o início do processo.

O dashboard HTTP depende do histograma `http_request_duration_seconds` da versão atual da UD Nest. Os painéis usam `_count` para volume e proporção de erros e `_bucket` para latência. Gere requisições à API e aguarde o Prometheus coletar amostras suficientes para calcular as taxas. Para investigar dependências como PostgreSQL, GLPI e S3, use os traces no Kibana quando o Elastic APM estiver ativo na aplicação.

1. Crie e teste os painéis no Grafana. Para alterar um dashboard provisionado, use uma cópia de trabalho na interface ou edite o JSON no repositório.
2. Na interface, use **Export → Export as code**, escolha **Classic** e baixe o JSON. Se houver a opção de compartilhar com outra instância, deixe-a desativada para evitar referências que exigem importação manual.
3. Salve o arquivo na pasta do projeto em `grafana-dashboards/`. Remova o campo `id` se estiver presente e preserve o `uid` do arquivo original nas atualizações, inclusive quando o JSON vier de uma cópia de trabalho. Para novos dashboards, use um `uid` único. Para painéis e consultas que usam o Prometheus padrão, você pode omitir o campo `datasource`, como no dashboard da UD Nest, para evitar depender do UID gerado em uma instalação.
4. Revise o JSON antes de abrir o PR no GitHub. Ele contém a definição dos painéis, incluindo consultas, variáveis e links. Confira se o arquivo contém credenciais, URLs sensíveis ou informações internas antes de publicá-lo.
5. Na primeira implantação desta configuração, rode `docker compose up -d grafana` para aplicar a montagem. Nas próximas implantações, atualize os arquivos no host que roda o Compose. O Grafana verifica a pasta a cada 30 segundos. Se um JSON provisionado for removido, o dashboard correspondente será removido da interface.

O Grafana bloqueia o salvamento pela interface dos dashboards provisionados. Rascunhos salvos na interface e outros dados internos do Grafana ficam no volume `grafana-data`. As séries consultadas pelos painéis ficam no Prometheus. Veja a [documentação de provisionamento do Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/).

## Dashboards do Kibana

O painel **UD Nest - Logs da API** usa `logs-ud-api` e `@timestamp`. O arquivo de objetos salvos fica em [`kibana-provisioning/ud-nest-logs.ndjson`](../kibana-provisioning/ud-nest-logs.ndjson) e contém o dashboard, seus painéis e o padrão de índice.

No deploy, execute `docker compose run --rm kibana-import` para importar no espaço padrão. O serviço aguarda o Kibana e retorna erro se a API rejeitar algum objeto. Para aplicar uma atualização versionada, acrescente `--overwrite`. Essa opção substitui os objetos com os mesmos IDs, inclusive suas edições na interface.

Use `KIBANA_IMPORT_USERNAME` e `KIBANA_IMPORT_PASSWORD` no ambiente de implantação para uma conta autorizada a importar os objetos. A configuração local pode usar `elastic` com `ELASTIC_PASSWORD`. Para publicar uma edição, exporte o dashboard em **Stack Management → Saved Objects** com os objetos relacionados e atualize o NDJSON no Git.

## Versões e migração

As imagens estão fixadas no Compose. Elasticsearch, Kibana, APM Server e Metricbeat usam `9.5.6`, Prometheus usa `3.16.0` e Grafana usa `13.3.1`.

Em desenvolvimento, o Elasticsearch 9 inicia com o volume `elasticsearch-data-v9`. Para aproveitar dados e objetos salvos da versão 7.17, faça backup e siga o caminho suportado `7.17 → 8.19 → 9.5`. Os dashboards versionados podem ser importados na instância nova com `kibana-import`. [Caminhos de atualização da Elastic](https://www.elastic.co/docs/deploy-manage/upgrade)

## Notas operacionais

- Se o Kibana falhar ao migrar objetos salvos e o Elasticsearch registrar `disk usage exceeded flood-stage watermark`, confira o espaço com `docker compose exec esud01 df -h /usr/share/elasticsearch/data`. Libere espaço ou aumente a capacidade do filesystem do volume. O Elasticsearch remove o bloqueio automaticamente quando o uso cai abaixo do limite. Depois de liberar espaço, confira se ainda há bloqueio:

  ```bash
  curl --user elastic 'http://localhost:9200/.kibana*/_settings?filter_path=*.settings.index.blocks.read_only_allow_delete&expand_wildcards=all'
  ```

  O `curl` solicitará a senha de `elastic`. Quando a resposta não mostrar `read_only_allow_delete`, reinicie o Kibana com `docker compose restart kibanaud`. Remova índices de dados apenas conforme a política de retenção e após avaliar a necessidade de backup.
- As portas 3000, 5601, 8200, 9090, 9200 e 9300 estão publicadas no host, como na stack de origem. Restrinja o acesso por firewall ou remova publicações desnecessárias no ambiente de implantação.
- A senha `ELASTIC_PASSWORD` é interpolada no Compose e pode ser visível a operadores com acesso ao Docker ou à configuração renderizada. Trate o host Docker e o arquivo `.env` como sensíveis.
