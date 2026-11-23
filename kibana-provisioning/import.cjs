const { randomBytes } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const { KIBANA_URL, KIBANA_IMPORT_USERNAME, KIBANA_IMPORT_PASSWORD } = process.env;
const filename = 'ud-nest-logs.ndjson';

function request(endpoint, method = 'GET', headers = {}, body) {
    const url = new URL(endpoint, KIBANA_URL);
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = client.request(url, {
            method,
            auth: `${KIBANA_IMPORT_USERNAME}:${KIBANA_IMPORT_PASSWORD}`,
            headers,
            timeout: 10_000,
        }, (res) => {
            let content = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { content += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, content }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('Tempo limite da requisição')));
        req.end(body);
    });
}

async function waitForKibana() {
    const deadline = Date.now() + 120_000;
    let lastStatus = 'conexão indisponível';

    while (Date.now() < deadline) {
        const response = await request('/api/status').catch(() => undefined);
        if (response?.status === 200) return;
        if (response?.status === 401 || response?.status === 403) {
            throw new Error(`Acesso ao Kibana recusado (HTTP ${response.status})`);
        }
        if (response) lastStatus = `HTTP ${response.status}`;
        await delay(2_000);
    }

    throw new Error(`Kibana indisponível após 120 segundos (${lastStatus})`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--overwrite')) {
        throw new Error('O único argumento aceito é --overwrite');
    }
    if (!KIBANA_URL || !KIBANA_IMPORT_USERNAME || !KIBANA_IMPORT_PASSWORD) {
        throw new Error('Configure a URL e as credenciais de importação do Kibana');
    }

    const file = await readFile(path.join(__dirname, filename));
    const boundary = randomBytes(16).toString('hex');
    const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/x-ndjson\r\n\r\n`),
        file,
        Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    console.log('Aguardando o Kibana.');
    await waitForKibana();

    const endpoint = `/api/saved_objects/_import${args.length ? '?overwrite=true' : ''}`;
    const response = await request(endpoint, 'POST', {
        'kbn-xsrf': 'true',
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': body.length,
    }, body);

    if (response.status !== 200) {
        throw new Error(`Importação recusada (HTTP ${response.status})`);
    }

    const result = JSON.parse(response.content);
    if (!result.success || !result.successCount) {
        const errors = (result.errors ?? []).map(({ type, id, error }) =>
            `${type}/${id} (${error?.type ?? 'erro desconhecido'})`,
        );
        throw new Error(`Importação incompleta. ${errors.join(', ')}`);
    }

    console.log(`${result.successCount} objetos importados.`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
