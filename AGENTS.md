# Instruções para agentes

Este repositório mantém a infraestrutura central de observabilidade da UFAL Campus Arapiraca. A instrumentação, bibliotecas e configuração da aplicação pertencem aos repositórios de cada serviço, como `ud-nest`.

- Mantenha os serviços da stack na rede privada padrão criada pelo Compose. Não conecte aplicações externas à rede da stack quando a coleta usar URL institucional/pública.
- Em `prometheus.yml`, use `job_name` único e alvo por DNS/URL alcançável pelo coletor. Para serviços externos ao Docker, não dependa de DNS de container; o alvo atual da UD Nest é `sistemas.arap:3333` em `/metrics`.
- Adicione coleta no `metricbeat.yml` apenas quando houver necessidade de enviar métricas ao Elasticsearch. Evite duplicar módulos e mantenha labels de projeto/serviço identificáveis.
- Não inclua senhas, tokens, certificados privados, dados persistidos ou arquivos `.env` no Git. Documente variáveis em `.env.example` com valores vazios. Não substitua segredos por valores reais em exemplos.
- Mantenha nomes de serviços e endpoints estáveis (`prometheus`, `esud01`, `kibanaud`, `apm-server`) enquanto aplicações os consumirem. Mudanças de DNS, portas ou nomes exigem atualização coordenada nos projetos clientes.
- Faça alterações de versão de imagem de forma deliberada e considere a compatibilidade entre Elasticsearch, Kibana, APM Server e Metricbeat. Não atualize uma peça isolada sem avaliar as demais.
- Limite as mudanças aqui ao Compose, provisionamento, configuração dos coletores e documentação operacional. Modifique instrumentação e dependências dentro do repositório da aplicação.
- Antes de expor novos endpoints ou portas, avalie o escopo de acesso na rede e no host. Preserve o ignore de `grafana/`, `es01/` e `.env`.
