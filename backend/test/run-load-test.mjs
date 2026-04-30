import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'loadtest@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'LoadTest123!@#';

let serverProcess = null;

// Cores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// Função para verificar se o servidor está respondendo
async function waitForServer(maxAttempts = 30) {
    log('\n⏳ Waiting for server to be ready...', colors.yellow);

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${API_URL}/health`, {
                method: 'GET',
            });

            if (response.ok) {
                log('✅ Server is ready!\n', colors.green);
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }

        process.stdout.write(`${colors.cyan}Attempt ${i + 1}/${maxAttempts}...${colors.reset}\r`);
        await setTimeout(1000);
    }

    log('\n❌ Server did not start in time', colors.red);
    return false;
}

// Função para criar ou verificar usuário de teste
async function ensureTestUser() {
    log('👤 Checking test user...', colors.blue);

    try {
        // Tenta fazer login primeiro
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            }),
        });

        if (loginResponse.ok) {
            log('✅ Test user already exists\n', colors.green);
            return true;
        }

        // Se login falhou, tenta criar o usuário
        log('📝 Creating test user...', colors.yellow);
        const signupResponse = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            }),
        });

        if (signupResponse.ok) {
            log('✅ Test user created successfully\n', colors.green);
            return true;
        }

        const errorData = await signupResponse.json();
        log(`❌ Failed to create test user: ${JSON.stringify(errorData)}`, colors.red);
        return false;
    } catch (error) {
        log(`❌ Error ensuring test user: ${error.message}`, colors.red);
        return false;
    }
}

// Função para iniciar o servidor
async function startServer() {
    log('🚀 Starting server with cluster...', colors.blue);

    return new Promise((resolve, reject) => {
        // Usa ts-node para executar o cluster
        serverProcess = spawn('npx', ['ts-node', 'src/cluster.ts'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
        });

        let output = '';

        serverProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;

            // Mostra output do servidor
            if (text.includes('Primary') || text.includes('Worker') || text.includes('Forking')) {
                process.stdout.write(`${colors.cyan}[SERVER] ${text}${colors.reset}`);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const text = data.toString();
            // Ignora warnings comuns do NestJS
            if (!text.includes('ExperimentalWarning') && !text.includes('punycode')) {
                process.stderr.write(`${colors.yellow}[SERVER ERROR] ${text}${colors.reset}`);
            }
        });

        serverProcess.on('error', (error) => {
            log(`❌ Failed to start server: ${error.message}`, colors.red);
            reject(error);
        });

        // Aguarda um pouco para o servidor começar a iniciar
        setTimeout(2000).then(() => resolve());
    });
}

// Função para executar o teste de carga
async function runLoadTest() {
    log('🔥 Running load test...', colors.bright + colors.yellow);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.yellow);

    return new Promise((resolve, reject) => {
        const testProcess = spawn('node', ['test/load-test.mjs'], {
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                API_URL,
                TEST_EMAIL,
                TEST_PASSWORD,
            },
        });

        testProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Load test failed with code ${code}`));
            }
        });

        testProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Função para parar o servidor
function stopServer() {
    if (serverProcess) {
        log('\n🛑 Stopping server...', colors.yellow);

        // No Windows, precisamos matar a árvore de processos
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], {
                stdio: 'ignore',
            });
        } else {
            serverProcess.kill('SIGTERM');
        }

        log('✅ Server stopped\n', colors.green);
    }
}

// Função principal
async function main() {
    log('\n' + '='.repeat(50), colors.bright);
    log('🧪 AUTOMATED LOAD TEST RUNNER', colors.bright + colors.cyan);
    log('='.repeat(50) + '\n', colors.bright);

    try {
        // 1. Inicia o servidor
        await startServer();

        // 2. Aguarda o servidor ficar pronto
        const serverReady = await waitForServer();
        if (!serverReady) {
            throw new Error('Server failed to start');
        }

        // 3. Garante que o usuário de teste existe
        const userReady = await ensureTestUser();
        if (!userReady) {
            throw new Error('Failed to ensure test user');
        }

        // 4. Executa o teste de carga
        await runLoadTest();

        log('\n' + '='.repeat(50), colors.bright);
        log('✅ ALL TESTS COMPLETED SUCCESSFULLY!', colors.bright + colors.green);
        log('='.repeat(50) + '\n', colors.bright);

        process.exit(0);
    } catch (error) {
        log('\n' + '='.repeat(50), colors.bright);
        log(`❌ TEST FAILED: ${error.message}`, colors.bright + colors.red);
        log('='.repeat(50) + '\n', colors.bright);

        process.exit(1);
    } finally {
        stopServer();
    }
}

// Handlers para cleanup
process.on('SIGINT', () => {
    log('\n\n⚠️  Interrupted by user', colors.yellow);
    stopServer();
    process.exit(130);
});

process.on('SIGTERM', () => {
    stopServer();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log(`\n❌ Uncaught exception: ${error.message}`, colors.red);
    stopServer();
    process.exit(1);
});

// Executa
main();
