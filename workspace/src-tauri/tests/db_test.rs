// 数据库与核心规则集成测试（不启动 Tauri 窗口，直接操作临时 SQLite 文件）
use kidmath_lib::db::open_for_tests;
use kidmath_lib::{commands::hash_pin, models::*};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(0);


async fn insert_profile(pool: &sqlx::SqlitePool, nickname: &str, birthday: &str, avatar: &str) -> Profile {
    let res = sqlx::query("INSERT INTO Profile (nickname, birthday, avatar) VALUES (?1, ?2, ?3)")
        .bind(nickname)
        .bind(birthday)
        .bind(avatar)
        .execute(pool)
        .await
        .unwrap();
    let id = res.last_insert_rowid();
    sqlx::query_as::<_, Profile>("SELECT * FROM Profile WHERE id = ?1")
        .bind(id)
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn temp_pool() -> sqlx::SqlitePool {
    let dir = std::env::temp_dir().join(format!(
        "kidmath-test-{}-{}",
        std::process::id(),
        SEQ.fetch_add(1, Ordering::SeqCst)
    ));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("test.db");
    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", path.to_string_lossy()))
        .unwrap()
        .create_if_missing(true)
        .foreign_keys(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap();
    open_for_tests(&pool).await.unwrap();
    pool
}

#[tokio::test]
async fn schema_and_default_pin() {
    let pool = temp_pool().await;

    // 默认家长设置：PIN 0000，时长 25 分钟
    let s: ParentSettings =
        sqlx::query_as("SELECT * FROM ParentSettings WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(s.daily_limit_minutes, 25);
    assert_eq!(s.pin_hash, hash_pin("0000"));
    assert_ne!(s.pin_hash, "0000"); // 不能是明文
}

#[tokio::test]
async fn profiles_are_isolated() {
    let pool = temp_pool().await;

    let p1 = insert_profile(&pool, "甲", "2020-01-01", "cat").await;
    let p2 = insert_profile(&pool, "乙", "2019-06-01", "bear").await;

    sqlx::query("INSERT INTO GameRecord (profile_id, game_type, level, correct, total, accuracy, stars_earned)
                 VALUES (?1, 'fishing', 1, 5, 5, 1.0, 2)")
        .bind(p1.id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO GameRecord (profile_id, game_type, level, correct, total, accuracy, stars_earned)
                 VALUES (?1, 'clock', 3, 4, 6, 0.667, 0)")
        .bind(p2.id)
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query("UPDATE Profile SET stars_total = stars_total + 2 WHERE id = ?1")
        .bind(p1.id)
        .execute(&pool)
        .await
        .unwrap();

    let r1: (i64, i64) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(stars_earned),0) FROM GameRecord WHERE profile_id = ?1",
    )
    .bind(p1.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let r2: (i64, i64) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(stars_earned),0) FROM GameRecord WHERE profile_id = ?1",
    )
    .bind(p2.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(r1, (1, 2));
    assert_eq!(r2, (1, 0));

    let s1: Profile = sqlx::query_as("SELECT * FROM Profile WHERE id = ?1")
        .bind(p1.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let s2: Profile = sqlx::query_as("SELECT * FROM Profile WHERE id = ?1")
        .bind(p2.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(s1.stars_total, 2);
    assert_eq!(s2.stars_total, 0);

    // 删除一个档案不影响另一个（级联只删自己的记录）
    sqlx::query("DELETE FROM Profile WHERE id = ?1")
        .bind(p1.id)
        .execute(&pool)
        .await
        .unwrap();
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM Profile")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count.0, 1);
    let rec: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM GameRecord WHERE profile_id = ?1",
    )
    .bind(p2.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(rec.0, 1);
}

#[tokio::test]
async fn achievements_and_items_are_idempotent() {
    let pool = temp_pool().await;
    let p = insert_profile(&pool, "丙", "2021-03-03", "fox").await;

    for _ in 0..3 {
        sqlx::query(
            "INSERT OR IGNORE INTO Achievement (profile_id, code) VALUES (?1, 'first_round')",
        )
        .bind(p.id)
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            "INSERT OR IGNORE INTO UnlockedItem (profile_id, item_code) VALUES (?1, 'crown')",
        )
        .bind(p.id)
        .execute(&pool)
        .await
        .unwrap();
    }
    let a: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM Achievement WHERE profile_id = ?1 AND code = 'first_round'",
    )
    .bind(p.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let it: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM UnlockedItem WHERE profile_id = ?1 AND item_code = 'crown'",
    )
    .bind(p.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(a.0, 1);
    assert_eq!(it.0, 1);
}

#[tokio::test]
async fn daily_usage_upsert() {
    let pool = temp_pool().await;
    let p = insert_profile(&pool, "丁", "2020-09-09", "frog").await;
    let date = "2026-09-12";
    for secs in [600, 300, 100] {
        sqlx::query(
            "INSERT INTO DailyUsage (profile_id, date, used_seconds) VALUES (?1, ?2, ?3)
             ON CONFLICT(profile_id, date) DO UPDATE SET used_seconds = used_seconds + ?3",
        )
        .bind(p.id)
        .bind(date)
        .bind(secs)
        .execute(&pool)
        .await
        .unwrap();
    }
    let used: (i64,) =
        sqlx::query_as("SELECT used_seconds FROM DailyUsage WHERE profile_id = ?1 AND date = ?2")
            .bind(p.id)
            .bind(date)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(used.0, 1000);
}

/// 验证家长设置命令使用的查询能映射到 SettingsView 所需字段
#[tokio::test]
async fn settings_and_stats_queries() {
    let pool = temp_pool().await;
    let p = insert_profile(&pool, "戊", "2020-05-05", "panda").await;

    // 与 get_settings 一致
    let s: ParentSettings =
        sqlx::query_as("SELECT * FROM ParentSettings WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(s.daily_limit_minutes, 25);

    // 与 get_stats 一致的列别名（FromRow 映射）
    sqlx::query(
        "INSERT INTO GameRecord (profile_id, game_type, level, correct, total, accuracy, stars_earned)
         VALUES (?1,'fishing',1,4,5,0.8,1), (?1,'clock',2,5,5,1.0,2), (?1,'fishing',1,3,5,0.6,0)",
    )
    .bind(p.id)
    .execute(&pool)
    .await
    .unwrap();

    let stats: Stats = sqlx::query_as(
        "SELECT COUNT(*) AS rounds,
                COALESCE(SUM(correct), 0) AS total_correct,
                COALESCE(SUM(total), 0)   AS total_answered,
                COUNT(DISTINCT game_type) AS played_games
         FROM GameRecord WHERE profile_id = ?1",
    )
    .bind(p.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stats.rounds, 3);
    assert_eq!(stats.total_correct, 12);
    assert_eq!(stats.total_answered, 15);
    assert_eq!(stats.played_games, 2);

    // 到限中断的部分回合（题数 <5）保留在记录表，但不进入成就类统计
    sqlx::query(
        "INSERT INTO GameRecord (profile_id, game_type, level, correct, total, accuracy, stars_earned)
         VALUES (?1,'fishing',1,2,3,0.667,0)",
    )
    .bind(p.id)
    .execute(&pool)
    .await
    .unwrap();
    let stats2: Stats = sqlx::query_as(
        "SELECT COUNT(*) AS rounds,
                COALESCE(SUM(correct), 0) AS total_correct,
                COALESCE(SUM(total), 0)   AS total_answered,
                COUNT(DISTINCT game_type) AS played_games
         FROM GameRecord WHERE profile_id = ?1 AND total BETWEEN 5 AND 10",
    )
    .bind(p.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stats2.rounds, 3);
    assert_eq!(stats2.total_answered, 15);
    // 但记录仍可在家长查看的完整列表中看到
    let all: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM GameRecord WHERE profile_id = ?1")
        .bind(p.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(all.0, 4);

    // list_items 风格查询：装扮字段默认空
    let row: (Option<String>, Option<String>, Option<String>, Option<String>) =
        sqlx::query_as(
            "SELECT outfit_hat, outfit_glasses, outfit_background, outfit_pet
             FROM Profile WHERE id = ?1",
        )
        .bind(p.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row, (None, None, None, None));
}

/// 今日报告聚合 + 乘除法占位游戏不计入「玩遍六种游戏」
#[tokio::test]
async fn daily_report_and_multiply_exclusion() {
    let pool = temp_pool().await;
    let p = insert_profile(&pool, "己", "2021-06-06", "rabbit").await;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let old = "2000-01-01 10:00:00";

    // 今天：fishing 两回合、multiply 一回合（占位，含部分回合也应出现在报告里）
    sqlx::query(
        "INSERT INTO GameRecord
           (profile_id, game_type, level, correct, total, accuracy, stars_earned, played_at)
         VALUES (?1,'fishing',1,5,5,1.0,2, datetime('now','localtime')),
                (?1,'fishing',2,4,5,0.8,1, datetime('now','localtime')),
                (?1,'multiply',1,2,3,0.667,0, datetime('now','localtime')),
                (?1,'clock',1,5,5,1.0,2, ?2)",
    )
    .bind(p.id)
    .bind(old)
    .execute(&pool)
    .await
    .unwrap();

    // 与 get_daily_report 相同的查询
    let report: Vec<DailyReportRow> = sqlx::query_as(
        "SELECT game_type,
                COUNT(*) AS rounds,
                COALESCE(SUM(correct), 0) AS correct,
                COALESCE(SUM(total), 0) AS total,
                COALESCE(SUM(stars_earned), 0) AS stars
         FROM GameRecord
         WHERE profile_id = ?1 AND substr(played_at, 1, 10) = ?2
         GROUP BY game_type
         ORDER BY rounds DESC",
    )
    .bind(p.id)
    .bind(&today)
    .fetch_all(&pool)
    .await
    .unwrap();

    // 今天只有 fishing 与 multiply 两个分组（昨天的 clock 不算）
    assert_eq!(report.len(), 2);
    let fishing = report.iter().find(|r| r.game_type == "fishing").unwrap();
    assert_eq!((fishing.rounds, fishing.correct, fishing.total, fishing.stars), (2, 9, 10, 3));
    let multiply = report.iter().find(|r| r.game_type == "multiply").unwrap();
    assert_eq!((multiply.rounds, multiply.total), (1, 3));

    // get_stats：multiply 不计入 played_games；部分回合(total=3)不计入成就统计
    let stats: Stats = sqlx::query_as(
        "SELECT COUNT(*) AS rounds,
                COALESCE(SUM(correct), 0) AS total_correct,
                COALESCE(SUM(total), 0)   AS total_answered,
                COUNT(DISTINCT CASE WHEN game_type <> 'multiply' THEN game_type END) AS played_games
         FROM GameRecord WHERE profile_id = ?1 AND total BETWEEN 5 AND 10",
    )
    .bind(p.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    // 完整回合：fishing×2 + clock×1 = 3；multiply 的 3 题部分回合排除
    assert_eq!(stats.rounds, 3);
    // 主游戏种类只统计 fishing（昨天的 clock 仍算玩过，played_games 不限日期）
    assert_eq!(stats.played_games, 2);
}
