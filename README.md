# Observabilidade UFAL

Stack central de métricas, logs e rastreamento para projetos da Universidade Federal de Alagoas (UFAL). O Compose reúne Prometheus, Grafana, Elasticsearch, Kibana, Metricbeat e APM Server. O código de instrumentação permanece em cada aplicação.

## Iniciar

```bash
cp .env.example .env
# Preencha ELASTIC_PASSWORD e GF_SECURITY_ADMIN_PASSWORD com senhas fortes no .env
docker compose up -d
```

O Compose exige as duas senhas, não fornece valores padrão e lê os arquivos de configuração da raiz deste repositório. O `.env` e os diretórios de dados `grafana/` e `es01/` não são versionados. Não copie dados persistidos ou credenciais entre ambientes sem um procedimento próprio de migração segura.

Prometheus e Metricbeat coletam `http://sistemas.arap:3333/metrics` da aplicação UD Nest pela URL pública. Se a API não estiver ativa ou acessível a partir do host Docker, o alvo aparece como indisponível; os demais serviços continuam independentes. O Metricbeat envia as métricas ao Elasticsearch.

## Conectar um projeto UFAL

1. Exponha métricas em uma rota HTTP acessível aos coletores, por exemplo `/metrics`. Mantenha a instrumentação e as dependências no repositório da aplicação.
2. Garanta que o container do coletor tenha rota e DNS para alcançar o endpoint. A aplicação não precisa participar da rede Docker da stack quando a coleta usa uma URL institucional/pública.

   ```yaml
   services:
     meu-servico:
       networks:
         rede_privada: {}
         gti:
           aliases:
             - meu-projeto-api

   networks:
     rede_privada:
     gti:
       external: true
   ```

3. Adicione um `job_name` único em `prometheus.yml` e use um alias DNS exclusivo e a porta interna do serviço, por exemplo `meu-projeto-api:8080`. Configure o alias em `networks.gti.aliases` no Compose da aplicação. Se o projeto também precisar enviar métricas ao Elasticsearch, adicione um módulo correspondente em `metricbeat.yml`.
4. Configure logs e APM na própria aplicação com `http://esud01:9200` e `http://apm-server:8200`, respectivamente, quando esses recursos forem necessários. Use credenciais próprias do ambiente e não as registre no Git.

Os serviços da stack usam a rede privada padrão criada pelo Compose, nomeada `observabilidade` (em vez de `observabilidade_default`). A coleta atual da UD Nest usa a URL institucional `sistemas.arap`, sem depender da rede Docker da aplicação.

## Notas operacionais

- Se o Kibana falhar ao migrar objetos salvos e o Elasticsearch registrar `disk usage exceeded flood-stage watermark`, confira o espaço no filesystem que contém `es01` com `df -h ./es01`. Libere espaço nesse filesystem ou aumente sua capacidade até ficar abaixo do high watermark do Elasticsearch (90% por padrão); o Compose monta `./es01` diretamente como armazenamento persistente, portanto não remova esse diretório nem use `docker compose down -v` para tentar corrigir o problema. O Elasticsearch remove o bloqueio automaticamente quando o uso cai abaixo desse limite. Depois de liberar espaço, confira se ainda há bloqueio:

  ```bash
  curl --user elastic 'http://localhost:9200/.kibana*/_settings?filter_path=*.settings.index.blocks.read_only_allow_delete&expand_wildcards=all'
  ```

  O `curl` solicitará a senha de `elastic`. Quando a resposta não mostrar `read_only_allow_delete`, reinicie o Kibana com `docker compose restart kibanaud`. Remova índices de dados apenas conforme a política de retenção e após avaliar a necessidade de backup.
- As portas 3000, 5601, 8200, 9090, 9200 e 9300 estão publicadas no host, como na stack de origem. Restrinja o acesso por firewall ou remova publicações desnecessárias no ambiente de implantação.
- `metricbeat:8.12.0` e os componentes Elastic `7.17.0` têm versões maiores diferentes, herdadas da stack original. Verifique compatibilidade antes de operar em produção; esta migração não altera versões.
- As imagens `prom/prometheus` e `grafana/grafana:latest` mantêm as referências originais, sem pinagem. Planeje pinagem de versões em uma mudança própria.
- A senha `ELASTIC_PASSWORD` é interpolada no Compose e pode ser visível a operadores com acesso ao Docker ou à configuração renderizada. Trate o host Docker e o arquivo `.env` como sensíveis.
