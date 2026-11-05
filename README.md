# Observabilidade UFAL

Stack central de métricas, logs e rastreamento para projetos da Universidade Federal de Alagoas (UFAL). O Compose reúne Prometheus, Grafana, Elasticsearch, Kibana, Metricbeat e APM Server. O código de instrumentação permanece em cada aplicação.

## Iniciar

```bash
docker network create gti  # apenas se a rede ainda não existir
cp .env.example .env
# Preencha ELASTIC_PASSWORD e GF_SECURITY_ADMIN_PASSWORD com senhas fortes no .env
docker compose up -d
```

O Compose exige as duas senhas, não fornece valores padrão e lê os arquivos de configuração da raiz deste repositório. O `.env` e os diretórios de dados `grafana/` e `es01/` não são versionados. Não copie dados persistidos ou credenciais entre ambientes sem um procedimento próprio de migração segura.

O Prometheus coleta `http://ud-nest-api:3333/metrics` da aplicação UD Nest pelo alias exclusivo na rede `gti`. Se a API não estiver ativa, esse alvo aparece como indisponível; os demais serviços continuam independentes. O Metricbeat coleta o mesmo endpoint para enviar métricas ao Elasticsearch. Há redundância intencional entre os dois coletores.

## Conectar um projeto UFAL

1. Exponha métricas em uma rota HTTP acessível aos coletores, por exemplo `/metrics`. Mantenha a instrumentação e as dependências no repositório da aplicação.
2. Conecte o serviço da aplicação à rede Docker externa `gti`, mantendo bancos e serviços internos em uma rede privada do próprio projeto:

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

Aliases DNS devem ser exclusivos na rede `gti`. A UD Nest publica `ud-nest-api`; mantenha esse alias enquanto os coletores o utilizarem. Para serviços hospedados fora do mesmo Docker host, será necessária conectividade e configuração de rede adicionais; a rede bridge `gti` cobre apenas containers no mesmo host.

## Notas operacionais

- As portas 3000, 5601, 8200, 9090, 9200 e 9300 estão publicadas no host, como na stack de origem. Restrinja o acesso por firewall ou remova publicações desnecessárias no ambiente de implantação.
- `metricbeat:8.12.0` e os componentes Elastic `7.17.0` têm versões maiores diferentes, herdadas da stack original. Verifique compatibilidade antes de operar em produção; esta migração não altera versões.
- As imagens `prom/prometheus` e `grafana/grafana:latest` mantêm as referências originais, sem pinagem. Planeje pinagem de versões em uma mudança própria.
- A senha `ELASTIC_PASSWORD` é interpolada no Compose e pode ser visível a operadores com acesso ao Docker ou à configuração renderizada. Trate o host Docker e o arquivo `.env` como sensíveis.
