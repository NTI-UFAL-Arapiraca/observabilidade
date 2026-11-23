const { setTimeout: delay } = require('node:timers/promises');

const { ELASTIC_PASSWORD, KIBANA_SYSTEM_PASSWORD } = process.env;
const elasticsearch = 'http://esud01:9200';

async function main() {
    if (!ELASTIC_PASSWORD || !KIBANA_SYSTEM_PASSWORD) {
        throw new Error('Configure as senhas do Elasticsearch e do usuário kibana_system');
    }

    const headers = {
        authorization: `Basic ${Buffer.from(`elastic:${ELASTIC_PASSWORD}`).toString('base64')}`,
        'content-type': 'application/json',
    };
    const deadline = Date.now() + 120_000;

    while (Date.now() < deadline) {
        const response = await fetch(`${elasticsearch}/_security/_authenticate`, {
            headers,
            signal: AbortSignal.timeout(5_000),
        }).catch(() => undefined);
        if (response) {
            await response.body?.cancel();
            if (response.ok) break;
            if (response.status === 401 || response.status === 403) {
                throw new Error(`Elasticsearch recusou a credencial administrativa (HTTP ${response.status})`);
            }
        }
        await delay(2_000);
    }
    if (Date.now() >= deadline) throw new Error('Elasticsearch indisponível após 120 segundos');

    const response = await fetch(`${elasticsearch}/_security/user/kibana_system/_password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: KIBANA_SYSTEM_PASSWORD }),
        signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Falha ao configurar kibana_system (HTTP ${response.status})`);

    console.log('Usuário interno kibana_system configurado.');
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
