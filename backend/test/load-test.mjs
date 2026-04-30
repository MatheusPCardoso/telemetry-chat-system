import autocannon from 'autocannon';

const url = process.env.API_URL || 'http://localhost:3000';
const testEmail = process.env.TEST_EMAIL || 'test@example.com';
const testPassword = process.env.TEST_PASSWORD || 'Test123!@#';

console.log(`🚀 Starting load test on ${url}`);
console.log('⏱️  Duration: 30 seconds');
console.log('👥 Connections: 100');
console.log('📊 Pipelining: 1 (required for POST with body)');
console.log('🎯 Target: POST /collect (Telemetry Events)\n');

// Função para obter o token JWT
async function getAuthToken() {
    console.log('🔐 Authenticating...');

    try {
        const response = await fetch(`${url}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
            }),
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Authentication successful\n');
        return data.accessToken;
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        console.log('\n💡 Tip: Make sure the server is running and the test user exists.');
        console.log(`   You can create it by running: POST ${url}/auth/signup`);
        console.log(`   Body: { "email": "${testEmail}", "password": "${testPassword}" }\n`);
        process.exit(1);
    }
}

// Evento de telemetria padrão
function createTelemetryEvent() {
    return {
        sessionId: `load-test-session-${Math.random().toString(36).substring(7)}`,
        eventType: 'message_sent', // Corrigido: minúsculas com underscore
        timestamp: new Date().toISOString(),
        metadata: {
            messageLength: 42,
            responseTime: 150,
            source: 'load-test',
            testRun: true,
        },
    };
}

// Inicia o teste
getAuthToken().then((token) => {
    console.log('🔥 Starting load test...\n');

    // Primeiro, vamos fazer uma requisição de teste para ver se funciona
    console.log('🧪 Testing single request first...');

    fetch(`${url}/collect`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            events: [createTelemetryEvent()],
        }),
    })
        .then(async (testResponse) => {
            console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
            const testBody = await testResponse.text();
            console.log(`   Response: ${testBody.substring(0, 200)}\n`);

            if (!testResponse.ok) {
                console.log('❌ Single test request failed! Aborting load test.');
                console.log('   Fix the issue above before running the load test.\n');
                process.exit(1);
            }

            console.log('✅ Single test request successful! Starting full load test...\n');

            // Cria o body do request
            const requestBody = JSON.stringify({
                events: [createTelemetryEvent()],
            });

            const instance = autocannon({
                url: `${url}/collect`,
                connections: 100,
                pipelining: 1, // Precisa ser 1 quando usamos body customizado
                duration: 30,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: requestBody,
            });

            autocannon.track(instance, { renderProgressBar: true });

            instance.on('done', (results) => {
                console.log('\n📈 Load Test Results:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`Total Requests: ${results.requests.total}`);
                console.log(`Requests/sec: ${results.requests.average}`);
                console.log(`Latency (avg): ${results.latency.mean.toFixed(2)}ms`);
                console.log(`Latency (p50): ${results.latency.p50}ms`);
                console.log(`Latency (p99): ${results.latency.p99}ms`);
                console.log(`Latency (max): ${results.latency.max}ms`);
                console.log(`Throughput: ${(results.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
                console.log(`Errors: ${results.errors}`);
                console.log(`Timeouts: ${results.timeouts}`);
                console.log(`2xx responses: ${results['2xx']}`);
                console.log(`Non-2xx responses: ${results.non2xx}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                // Estatísticas adicionais
                const totalEvents = results.requests.total;
                const eventsPerSecond = results.requests.average;
                console.log('📊 Telemetry Statistics:');
                console.log(`Total Events Sent: ${totalEvents}`);
                console.log(`Events/sec: ${eventsPerSecond.toFixed(0)}`);
                console.log(`Events/min: ${(eventsPerSecond * 60).toFixed(0)}`);
                console.log(`Events/hour: ${(eventsPerSecond * 3600).toFixed(0)}\n`);

                if (results.errors > 0 || results.non2xx > 0) {
                    console.log('❌ Test completed with errors');
                    process.exit(1);
                } else {
                    console.log('✅ Test completed successfully');
                    process.exit(0);
                }
            });

            instance.on('error', (err) => {
                console.error('❌ Load test error:', err);
                process.exit(1);
            });
        })
        .catch((error) => {
            console.error('❌ Test request failed:', error.message);
            process.exit(1);
        });
});