// Script para debugar o que está acontecendo com as requisições

const url = process.env.API_URL || 'http://localhost:3000';
const testEmail = process.env.TEST_EMAIL || 'test@example.com';
const testPassword = process.env.TEST_PASSWORD || 'Test123!@#';

console.log('🔍 Debugging telemetry request...\n');

// 1. Fazer login
console.log('1️⃣ Attempting login...');
const loginResponse = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        email: testEmail,
        password: testPassword,
    }),
});

console.log(`   Status: ${loginResponse.status} ${loginResponse.statusText}`);

if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    console.log(`   ❌ Login failed: ${errorText}`);
    process.exit(1);
}

const loginData = await loginResponse.json();
console.log(`   ✅ Login successful`);
console.log(`   Token: ${loginData.accessToken.substring(0, 20)}...\n`);

// 2. Criar evento de telemetria
const telemetryEvent = {
    sessionId: `debug-session-${Date.now()}`,
    eventType: 'message_sent', // Corrigido: minúsculas com underscore
    timestamp: new Date().toISOString(),
    metadata: {
        messageLength: 42,
        responseTime: 150,
        source: 'debug-test',
        testRun: true,
    },
};

const requestBody = {
    events: [telemetryEvent],
};

console.log('2️⃣ Sending telemetry event...');
console.log('   Request body:', JSON.stringify(requestBody, null, 2));

// 3. Enviar evento
const telemetryResponse = await fetch(`${url}/collect`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.accessToken}`,
    },
    body: JSON.stringify(requestBody),
});

console.log(`\n   Status: ${telemetryResponse.status} ${telemetryResponse.statusText}`);
console.log(`   Headers:`, Object.fromEntries(telemetryResponse.headers.entries()));

const responseText = await telemetryResponse.text();
console.log(`   Response body: ${responseText}\n`);

if (telemetryResponse.ok) {
    console.log('✅ Telemetry request successful!');
    console.log('   The load test should work now.\n');
} else {
    console.log('❌ Telemetry request failed!');
    console.log('   This is why the load test is failing.\n');

    try {
        const errorJson = JSON.parse(responseText);
        console.log('   Error details:', JSON.stringify(errorJson, null, 2));
    } catch (e) {
        console.log('   Raw error:', responseText);
    }
}
