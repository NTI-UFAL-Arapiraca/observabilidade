# Revisão de conflitos e decisões de integração

Data da revisão: 2026-11-05  
Branch local: `main` (`3e18d65`, alinhada à referência local `origin/main`)

## Estado do merge

No checkout revisado não há merge em andamento, arquivos com marcadores de conflito ou alterações locais pendentes. O histórico local disponível é linear, sem commit de merge. A consulta ao remoto não foi possível porque o ambiente não conseguiu resolver `github.com`; portanto, esta revisão cobre o histórico e as referências que já estavam disponíveis localmente. Não foi possível confirmar se há outra branch ou PR remoto aguardando integração.

## Decisões registradas

| Tema | Decisão | Motivo e efeito |
| --- | --- | --- |
| Rede Docker | Os serviços da stack usam a rede padrão privada do Compose, nomeada `observabilidade`, com subnet `10.202.0.0/24`. | A coleta da UD Nest usa endereço institucional acessível ao coletor. Não é necessário conectar aplicações externas à rede da stack nem exigir a rede externa compartilhada `gti`. |
| Alvo da UD Nest | Prometheus e Metricbeat apontam para `sistemas.arap:3333`, rota `/metrics`. | O alvo usa DNS institucional alcançável pelo coletor, sem depender de alias de container ou de rede Docker compartilhada. `job_name` permanece único como `ud_nest_api`. |
| Metricbeat | Mantém-se a coleta Prometheus no Metricbeat, com label `job: ud_nest_api`. | As métricas também precisam ser enviadas ao Elasticsearch; Prometheus continua coletando para seu próprio armazenamento. |
| Dados do Grafana | O armazenamento passa a ser o volume nomeado `grafana-data`. | Separa os dados persistidos do diretório de provisionamento versionado e mantém o diretório `grafana/` ignorado. O diretório de dados do Elasticsearch `es01/` também permanece ignorado. |
| Nomes consumidos | Mantidos `prometheus`, `esud01`, `kibanaud` e `apm-server`, além das portas configuradas. | Evita quebrar configurações dos projetos clientes. |
| Versões de imagem | Nenhuma versão foi alterada nesta sequência. | Evita atualizar componentes Elastic isoladamente. A diferença existente entre Metricbeat 8.12.0 e os componentes Elastic 7.17.0 continua documentada como ponto operacional a avaliar. |
| Credenciais | Senhas continuam exigidas por variáveis de ambiente e não são gravadas neste artefato. | Preserva a regra de não versionar segredos nem dados persistidos. |

## Histórico local relacionado

- `3dd2fa1` — troca dos alvos de coleta do alias `ud-nest-api` para `sistemas.arap` e atualização das orientações de rede.
- `d67a839` — movimentação de `SERVICOS.md` para `docs/SERVICOS.md`.
- `0cd53fd` — remoção da dependência da rede externa `gti` e adoção do volume nomeado do Grafana.
- `3e18d65` — nome e subnet explícitos para a rede padrão do Compose, com documentação correspondente.

Esses commits já estão na linha local de `main`; não havia hunks conflitantes para resolver nesta cópia. Este documento registra a revisão e as decisões observáveis no resultado integrado, mas não afirma que uma branch remota desconhecida foi mesclada.
