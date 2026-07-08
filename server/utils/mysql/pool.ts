import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function isMysqlEnabled(): boolean {
  const config = useRuntimeConfig();
  return config.storageDriver === 'mysql' && !!config.mysql.host;
}

export function getMysqlPool(): mysql.Pool {
  if (!isMysqlEnabled()) {
    throw new Error('MySQL storage is not enabled');
  }

  if (!pool) {
    const config = useRuntimeConfig();
    pool = mysql.createPool({
      host: config.mysql.host,
      port: Number(config.mysql.port),
      database: config.mysql.database,
      user: config.mysql.user,
      password: config.mysql.password,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 10_000,
      charset: 'utf8mb4',
    });
  }

  return pool;
}
