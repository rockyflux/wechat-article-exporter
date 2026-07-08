-- 微信公众号文章导出工具 - MySQL 建表脚本
-- 用法:
--   1. 在 MySQL 客户端中: source /path/to/schema.sql
--   2. 或执行: npm run mysql:init

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 公众号账号缓存
CREATE TABLE IF NOT EXISTS wx_accounts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章列表缓存
CREATE TABLE IF NOT EXISTS wx_articles (
  id VARCHAR(128) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  aid VARCHAR(64) NOT NULL,
  link VARCHAR(767) NOT NULL,
  title VARCHAR(512) NOT NULL DEFAULT '',
  publish_time BIGINT NOT NULL,
  create_time BIGINT NOT NULL,
  data JSON NOT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(64) NOT NULL DEFAULT '',
  is_single TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_fakeid_create_time (fakeid, create_time),
  INDEX idx_link (link(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章 HTML 内容
CREATE TABLE IF NOT EXISTS wx_html (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL DEFAULT '',
  comment_id VARCHAR(64) NULL,
  file LONGBLOB NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章阅读量等元数据
CREATE TABLE IF NOT EXISTS wx_metadata (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  data JSON NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章留言
CREATE TABLE IF NOT EXISTS wx_comments (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL DEFAULT '',
  data JSON NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 留言回复
CREATE TABLE IF NOT EXISTS wx_comment_replies (
  url VARCHAR(767) NOT NULL,
  fakeid VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL DEFAULT '',
  content_id VARCHAR(128) NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (url(639), content_id),
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章内嵌资源
CREATE TABLE IF NOT EXISTS wx_assets (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  file LONGBLOB NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 导出用资源文件
CREATE TABLE IF NOT EXISTS wx_resources (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  file LONGBLOB NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源 URL 映射
CREATE TABLE IF NOT EXISTS wx_resource_maps (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  resources JSON NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 调试缓存
CREATE TABLE IF NOT EXISTS wx_debug (
  url VARCHAR(767) PRIMARY KEY,
  fakeid VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(512) NOT NULL DEFAULT '',
  file LONGBLOB NOT NULL,
  INDEX idx_fakeid (fakeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
