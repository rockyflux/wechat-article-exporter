import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');

export function loadEnvFile(filePath = envPath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

export function getMysqlConfig(env = loadEnvFile()) {
  const config = {
    host: env.MYSQL_HOST || '',
    port: Number(env.MYSQL_PORT || '3306'),
    database: env.MYSQL_DATABASE || '',
    user: env.MYSQL_USER || '',
    password: env.MYSQL_PASSWORD || '',
  };

  const missing = Object.entries({
    MYSQL_HOST: config.host,
    MYSQL_DATABASE: config.database,
    MYSQL_USER: config.user,
    MYSQL_PASSWORD: config.password,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`缺少 MySQL 配置: ${missing.join(', ')}，请检查 .env 文件`);
  }

  return config;
}

export { projectRoot };
