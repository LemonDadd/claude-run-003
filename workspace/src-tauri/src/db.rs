use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tauri::Manager;

/// 初始化数据库：位于系统应用数据目录（macOS: ~/Library/Application Support；
/// Windows: %APPDATA%），全程本地，无网络。
pub async fn init<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<SqlitePool, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("无法创建数据目录: {e}"))?;
    let db_path = data_dir.join("kidmath.db");

    let options = SqliteConnectOptions::from_str(&format!(
        "sqlite://{}",
        db_path.to_string_lossy()
    ))
    .map_err(|e| e.to_string())?
    .create_if_missing(true)
    .foreign_keys(true)
    .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| format!("数据库连接失败: {e}"))?;

    migrate(&pool).await?;
    seed_defaults(&pool).await?;
    Ok(pool)
}

/// 集成测试入口：在给定连接池上建表并写入默认设置
pub async fn open_for_tests(pool: &SqlitePool) -> Result<(), String> {
    migrate(pool).await?;
    seed_defaults(pool).await?;
    Ok(())
}

async fn migrate(pool: &SqlitePool) -> Result<(), String> {
    // raw_sql 允许一次执行多条 SQLite 语句（无绑定参数）
    sqlx::raw_sql(
        r#"
        CREATE TABLE IF NOT EXISTS Profile (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname        TEXT NOT NULL,
            birthday        TEXT NOT NULL,
            avatar          TEXT NOT NULL DEFAULT 'cat',
            level_override  INTEGER,
            stars_total     INTEGER NOT NULL DEFAULT 0,
            outfit_hat      TEXT,
            outfit_glasses  TEXT,
            outfit_background TEXT,
            outfit_pet      TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS GameRecord (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id   INTEGER NOT NULL REFERENCES Profile(id) ON DELETE CASCADE,
            game_type    TEXT NOT NULL,
            level        INTEGER NOT NULL,
            correct      INTEGER NOT NULL,
            total        INTEGER NOT NULL,
            accuracy     REAL NOT NULL,
            stars_earned INTEGER NOT NULL DEFAULT 0,
            played_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS Achievement (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id  INTEGER NOT NULL REFERENCES Profile(id) ON DELETE CASCADE,
            code        TEXT NOT NULL,
            unlocked_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(profile_id, code)
        );

        CREATE TABLE IF NOT EXISTS ParentSettings (
            id                  INTEGER PRIMARY KEY CHECK (id = 1),
            pin_hash            TEXT NOT NULL,
            daily_limit_minutes INTEGER NOT NULL DEFAULT 25,
            pin_updated_at      TEXT
        );

        CREATE TABLE IF NOT EXISTS DailyUsage (
            profile_id  INTEGER NOT NULL REFERENCES Profile(id) ON DELETE CASCADE,
            date        TEXT NOT NULL,
            used_seconds INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (profile_id, date)
        );

        CREATE TABLE IF NOT EXISTS UnlockedItem (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id  INTEGER NOT NULL REFERENCES Profile(id) ON DELETE CASCADE,
            item_code   TEXT NOT NULL,
            unlocked_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(profile_id, item_code)
        );

        CREATE INDEX IF NOT EXISTS idx_record_profile ON GameRecord(profile_id);
        CREATE INDEX IF NOT EXISTS idx_record_game ON GameRecord(profile_id, game_type);
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| format!("建表失败: {e}"))?;
    Ok(())
}

/// 默认 PIN 0000（sha256 + 固定盐），首次启动后家长面板会提示修改
async fn seed_defaults(pool: &SqlitePool) -> Result<(), String> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM ParentSettings")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    if count.0 == 0 {
        let hash = crate::commands::hash_pin("0000");
        sqlx::query("INSERT INTO ParentSettings (id, pin_hash, daily_limit_minutes) VALUES (1, ?1, 25)")
            .bind(hash)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
