-- 清空所有业务表（危险操作，仅用于开发/重置环境）
-- 用法: npm run mysql:drop -- --confirm

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS wx_debug;
DROP TABLE IF EXISTS wx_resource_maps;
DROP TABLE IF EXISTS wx_resources;
DROP TABLE IF EXISTS wx_assets;
DROP TABLE IF EXISTS wx_comment_replies;
DROP TABLE IF EXISTS wx_comments;
DROP TABLE IF EXISTS wx_metadata;
DROP TABLE IF EXISTS wx_html;
DROP TABLE IF EXISTS wx_articles;
DROP TABLE IF EXISTS wx_accounts;

SET FOREIGN_KEY_CHECKS = 1;
