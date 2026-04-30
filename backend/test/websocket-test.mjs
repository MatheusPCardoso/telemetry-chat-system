import { io } from 'socket.io-client';

// Validate arguments
const token = process.argv[2];
const message = process.argv[3] || 'oi';

if (token === undefined) {
    console.error('Usage: node test/websocket-test.mjs <accessToken> [message]');
    process.exit(1);
}

// Create socket connection
const socket = io('http://localhost:3000', {
    auth: {
        token,
        sessionId: 'test-session-' + Date.now(),
    },
});

// Connection handler
socket.on('connect', () => {
    console.log('Connected:', socket.id);
    socket.emit('chat_message', { message });
});

// Bot response handler
socket.on('bot_response', (data) => {
    console.log('Bot response:', JSON.stringify(data, null, 2));
    socket.disconnect();
});

// Error handler
socket.on('error', (err) => {
    console.error('Error:', err);
    socket.disconnect();
});

// Connection error handler
socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
});
