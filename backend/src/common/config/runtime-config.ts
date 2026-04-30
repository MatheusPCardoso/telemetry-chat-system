/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
const DOCKER_REDIS_HOST = 'redis';
const DOCKER_MONGODB_HOST = 'mongodb';
const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isRunningInDocker(): boolean {
  return process.platform === 'linux' && require('node:fs').existsSync('/.dockerenv');
}

function normalizeHost(host: string, dockerHost: string): string {
  if (!host) {
    return isRunningInDocker() ? dockerHost : 'localhost';
  }

  if (isRunningInDocker() && LOCALHOST_NAMES.has(host)) {
    return dockerHost;
  }

  if (!isRunningInDocker() && host === dockerHost) {
    return 'localhost';
  }

  return host;
}

export function resolveRedisHost(host?: string): string {
  return normalizeHost(host ?? '', DOCKER_REDIS_HOST);
}

export function resolveDatabaseUrl(databaseUrl?: string): string {
  const fallbackUrl = `mongodb://${normalizeHost('', DOCKER_MONGODB_HOST)}:27017/chatbot`;

  if (!databaseUrl) {
    return fallbackUrl;
  }

  const url = new URL(databaseUrl);
  url.hostname = normalizeHost(url.hostname, DOCKER_MONGODB_HOST);

  if (LOCALHOST_NAMES.has(url.hostname) && !url.searchParams.has('directConnection')) {
    url.searchParams.set('directConnection', 'true');
  }

  return url.toString();
}
