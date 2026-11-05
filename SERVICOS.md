# Para que serve cada serviço

Este documento apresenta os serviços definidos em `docker-compose.yaml` e como eles se relacionam na stack de observabilidade.

## Fluxo geral

Prometheus e Metricbeat coletam métricas da UD Nest pela URL pública `sistemas.arap:3333/metrics`: Prometheus as mantém para consulta e Grafana as apresenta em painéis; Metricbeat também as encaminha ao Elasticsearch. Assim, a coleta da aplicação não depende de alias DNS de container na rede Docker. O APM Server recebe eventos de desempenho das aplicações e os armazena no Elasticsearch. Kibana oferece telas para explorar os dados armazenados.

## Serviços

### Prometheus

Coleta e armazena séries temporais de métricas. A configuração atual busca `/metrics` no alvo público `sistemas.arap:3333` a cada 15 segundos. Grafana usa Prometheus como fonte de dados. Interface: porta `9090`.

### Grafana

Cria painéis e gráficos consultando fontes de dados, neste projeto o Prometheus. A configuração provisionada fica em `grafana-provisioning/`; os dados locais da aplicação ficam em `grafana/`. Interface: porta `3000`. A senha administrativa vem de `GF_SECURITY_ADMIN_PASSWORD` no `.env`.

### Elasticsearch (`esud01`)

Banco de busca e armazenamento da stack Elastic. Recebe métricas encaminhadas pelo Metricbeat e dados de desempenho recebidos pelo APM Server; pode também armazenar logs quando as aplicações forem configuradas para enviá-los. É um nó único nesta configuração. API HTTP: porta `9200`; comunicação interna do cluster: `9300`. Os dados persistem em `es01/`, fora do Git. A senha do usuário `elastic` vem de `ELASTIC_PASSWORD`.

### Kibana (`kibanaud`)

Interface web para pesquisar, visualizar e administrar os dados no Elasticsearch. Também é usada pelo APM Server para configurar recursos de APM. A conexão configurada aponta para `esud01:9200`. Interface: porta `5601`.

### Metricbeat

Agente leve da Elastic que coleta e envia métricas ao Elasticsearch. Neste Compose, usa o módulo Prometheus para ler `sistemas.arap:3333/metrics` a cada 10 segundos. O acesso somente leitura ao socket Docker permite coletar informações do ambiente de containers conforme os módulos habilitados. Credencial: `ELASTIC_PASSWORD`. Não tem porta publicada.

### APM Server (`apm-server`)

Recebe dados de Application Performance Monitoring (APM), como transações, erros e tempos de resposta, enviados por agentes instalados e configurados nas aplicações. Encaminha os eventos ao Elasticsearch e integra-se ao Kibana. A porta de ingestão publicada é `8200`. A instrumentação e os agentes pertencem aos repositórios das aplicações; este serviço sozinho não gera dados APM.

## Como os serviços se conectam

Todos os serviços participam da rede externa `gti`. Os nomes de serviço usados como DNS interno da stack incluem `esud01`, `kibanaud` e `apm-server`. A coleta das métricas da UD Nest usa a URL pública `sistemas.arap`.

Prometheus e Metricbeat coletam o endpoint de métricas da aplicação de forma independente. Prometheus atende consulta de métricas e dashboards no Grafana; Metricbeat envia métricas ao Elasticsearch para exploração no Kibana. Portanto, a coleta atual está duplicada de propósito para destinos e usos diferentes.

## Credenciais e dados

As senhas são fornecidas pelo arquivo local `.env` por meio de `ELASTIC_PASSWORD` e `GF_SECURITY_ADMIN_PASSWORD`. Não versione esse arquivo. Os diretórios `grafana/` e `es01/` contêm estado e dados persistidos e também devem permanecer fora do Git.
