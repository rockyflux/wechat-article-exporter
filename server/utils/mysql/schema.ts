import type { RowDataPacket } from 'mysql2/promise';
import { getMysqlPool } from './pool';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS wx_accounts (
    fakeid VARCHAR(64) PRIMARY KEY,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    count INT NOT NULL DEFAULT 0,
    articles INT NOT NULL DEFAULT 0,
    nickname VARCHAR(255) NULL,
    round_head_img TEXT NULL,
    total_count INT NOT NULL DEFAULT 0,
    create_time BIGINT NULL,
    update_time BIGINT NULL,
    last_update_time BIGINT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_preferences (
    id INT PRIMARY KEY DEFAULT 1,
    data JSON NOT NULL,
    update_time BIGINT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_articles (
    id VARCHAR(128) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    aid VARCHAR(64) NOT NULL,
    link VARCHAR(767) NOT NULL,
    title VARCHAR(512) NOT NULL DEFAULT '',
    publish_time BIGINT NOT NULL,
    create_time BIGINT NOT NULL,
    db_time BIGINT NOT NULL DEFAULT 0,
    tag VARCHAR(255) NOT NULL DEFAULT '',
    data JSON NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(64) NOT NULL DEFAULT '',
    is_single TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_fakeid_create_time (fakeid, create_time),
    INDEX idx_link (link(191)),
    INDEX idx_publish_time (publish_time),
    INDEX idx_db_time (db_time),
    INDEX idx_tag (tag)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_html (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL DEFAULT '',
    comment_id VARCHAR(64) NULL,
    file LONGBLOB NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_metadata (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_comments (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL DEFAULT '',
    data JSON NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_comment_replies (
    url VARCHAR(767) NOT NULL,
    fakeid VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL DEFAULT '',
    content_id VARCHAR(128) NOT NULL,
    data JSON NOT NULL,
    PRIMARY KEY (url(639), content_id),
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_assets (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    file LONGBLOB NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_resources (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    file LONGBLOB NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_resource_maps (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    resources JSON NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_debug (
    url VARCHAR(767) PRIMARY KEY,
    fakeid VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT '',
    title VARCHAR(512) NOT NULL DEFAULT '',
    file LONGBLOB NOT NULL,
    INDEX idx_fakeid (fakeid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS wx_auth_keys (
    auth_key VARCHAR(64) PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    cookies JSON NOT NULL,
    create_time BIGINT NOT NULL,
    expire_time BIGINT NOT NULL,
    INDEX idx_expire_time (expire_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

let initPromise: Promise<void> | null = null;

export async function ensureMysqlSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = doEnsureSchema().catch(error => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

async function columnExists(pool: ReturnType<typeof getMysqlPool>, table: string, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function migrateWxArticles(pool: ReturnType<typeof getMysqlPool>): Promise<void> {
  if (!(await columnExists(pool, 'wx_articles', 'title'))) {
    await pool.query("ALTER TABLE wx_articles ADD COLUMN title VARCHAR(512) NOT NULL DEFAULT '' AFTER link");
    await pool.query(
      "UPDATE wx_articles SET title = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data, '$.title')), '') WHERE title = ''"
    );
  }

  if (!(await columnExists(pool, 'wx_articles', 'publish_time'))) {
    await pool.query('ALTER TABLE wx_articles ADD COLUMN publish_time BIGINT NOT NULL DEFAULT 0 AFTER title');
    await pool.query('UPDATE wx_articles SET publish_time = create_time WHERE publish_time = 0');
  }

  if (!(await columnExists(pool, 'wx_articles', 'db_time'))) {
    await pool.query('ALTER TABLE wx_articles ADD COLUMN db_time BIGINT NOT NULL DEFAULT 0 AFTER create_time');
    await pool.query('UPDATE wx_articles SET db_time = create_time WHERE db_time = 0');
  }

  if (!(await columnExists(pool, 'wx_articles', 'tag'))) {
    await pool.query("ALTER TABLE wx_articles ADD COLUMN tag VARCHAR(255) NOT NULL DEFAULT '' AFTER db_time");
  }
}

async function doEnsureSchema(): Promise<void> {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>('SHOW TABLES LIKE ?', ['wx_accounts']);
  if (rows.length === 0) {
    for (const sql of TABLES) {
      await pool.query(sql);
    }
    return;
  }

  await migrateWxArticles(pool);
}
