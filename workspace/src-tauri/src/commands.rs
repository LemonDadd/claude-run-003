use crate::models::*;
use chrono::Local;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use tauri::State;

type CmdResult<T> = Result<T, String>;

const PIN_SALT: &str = "kidmath::pin::v1";

pub fn hash_pin(pin: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(PIN_SALT.as_bytes());
    hasher.update(pin.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pin_hash_is_salted_and_stable() {
        assert_eq!(hash_pin("0000"), hash_pin("0000"));
        assert_ne!(hash_pin("0000"), hash_pin("1234"));
        // 加盐后不能等于裸 sha256("0000")
        let mut h = Sha256::new();
        h.update(b"0000");
        assert_ne!(hash_pin("0000"), hex::encode(h.finalize()));
        assert_eq!(hash_pin("0000").len(), 64); // sha256 hex 长度
        assert_ne!(hash_pin("0000"), "0000"); // 绝不存明文
    }
}

fn today() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

/* ------------------------------ 儿童档案 ------------------------------ */

#[tauri::command]
pub async fn list_profiles(state: State<'_, SqlitePool>) -> CmdResult<Vec<Profile>> {
    sqlx::query_as::<_, Profile>("SELECT * FROM Profile ORDER BY id")
        .fetch_all(state.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_profile(
    state: State<'_, SqlitePool>,
    input: ProfileInput,
) -> CmdResult<Profile> {
    let res = sqlx::query(
        "INSERT INTO Profile (nickname, birthday, avatar) VALUES (?1, ?2, ?3)",
    )
    .bind(&input.nickname)
    .bind(&input.birthday)
    .bind(&input.avatar)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = res.last_insert_rowid();
    sqlx::query_as::<_, Profile>("SELECT * FROM Profile WHERE id = ?1")
        .bind(id)
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_profile(
    state: State<'_, SqlitePool>,
    id: i64,
    input: ProfileInput,
) -> CmdResult<()> {
    let r = sqlx::query("UPDATE Profile SET nickname=?1, birthday=?2, avatar=?3 WHERE id=?4")
        .bind(&input.nickname)
        .bind(&input.birthday)
        .bind(&input.avatar)
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    if r.rows_affected() == 0 {
        return Err("档案不存在".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_profile(
    state: State<'_, SqlitePool>,
    id: i64,
    pin: String,
) -> CmdResult<()> {
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    if s.pin_hash != hash_pin(&pin) {
        return Err("PIN 错误".into());
    }
    sqlx::query("DELETE FROM Profile WHERE id = ?1")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 家长重置孩子进度：清空记录/成就/饰品并归零星星与装扮（需 PIN）
#[tauri::command]
pub async fn reset_progress(
    state: State<'_, SqlitePool>,
    profile_id: i64,
    pin: String,
) -> CmdResult<()> {
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    if s.pin_hash != hash_pin(&pin) {
        return Err("PIN 错误，无法重置".into());
    }
    let mut tx = state.begin().await.map_err(|e| e.to_string())?;
    for table in ["GameRecord", "Achievement", "UnlockedItem", "DailyUsage"] {
        let sql = format!("DELETE FROM {table} WHERE profile_id = ?1");
        sqlx::query(&sql)
            .bind(profile_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    sqlx::query(
        "UPDATE Profile SET stars_total = 0, level_override = NULL,
         outfit_hat = NULL, outfit_glasses = NULL, outfit_background = NULL, outfit_pet = NULL
         WHERE id = ?1",
    )
    .bind(profile_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

/// 家长手动调整 Level；None 表示恢复按年龄自动
#[tauri::command]
pub async fn set_level_override(
    state: State<'_, SqlitePool>,
    id: i64,
    level: Option<i64>,
) -> CmdResult<()> {
    let level = level.map(|v| v.clamp(1, 5));
    sqlx::query("UPDATE Profile SET level_override = ?1 WHERE id = ?2")
        .bind(level)
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/* ------------------------------ 游戏记录 ------------------------------ */

#[tauri::command]
pub async fn save_game_result(
    state: State<'_, SqlitePool>,
    input: GameResultInput,
) -> CmdResult<SaveResultOutput> {
    let total = input.total.max(1) as f64;
    let accuracy = ((input.correct as f64 / total) * 1000.0).round() / 1000.0;

    let mut tx = state.begin().await.map_err(|e| e.to_string())?;

    let res = sqlx::query(
        "INSERT INTO GameRecord (profile_id, game_type, level, correct, total, accuracy, stars_earned)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(input.profile_id)
    .bind(&input.game_type)
    .bind(input.level)
    .bind(input.correct)
    .bind(input.total)
    .bind(accuracy)
    .bind(input.stars_earned)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    let record_id = res.last_insert_rowid();

    sqlx::query("UPDATE Profile SET stars_total = stars_total + ?1 WHERE id = ?2")
        .bind(input.stars_earned)
        .bind(input.profile_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let row: (i64,) = sqlx::query_as("SELECT stars_total FROM Profile WHERE id = ?1")
        .bind(input.profile_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(SaveResultOutput {
        record_id,
        stars_total: row.0,
    })
}

#[tauri::command]
pub async fn list_records(
    state: State<'_, SqlitePool>,
    profile_id: i64,
    limit: i64,
) -> CmdResult<Vec<GameRecord>> {
    sqlx::query_as::<_, GameRecord>(
        "SELECT * FROM GameRecord WHERE profile_id = ?1 ORDER BY id DESC LIMIT ?2",
    )
    .bind(profile_id)
    .bind(limit.max(1).min(500))
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_stats(state: State<'_, SqlitePool>, profile_id: i64) -> CmdResult<Stats> {
    // 仅统计完整回合（每回合 5-10 题）；到限中断的部分回合不计入成就类统计。
    // multiply 为乘除法占位试玩版，不计入「玩遍六种游戏」played_games。
    sqlx::query_as::<_, Stats>(
        "SELECT COUNT(*) AS rounds,
                COALESCE(SUM(correct), 0) AS total_correct,
                COALESCE(SUM(total), 0)   AS total_answered,
                COUNT(DISTINCT CASE WHEN game_type <> 'multiply' THEN game_type END) AS played_games
         FROM GameRecord WHERE profile_id = ?1 AND total BETWEEN 5 AND 10",
    )
    .bind(profile_id)
    .fetch_one(state.inner())
    .await
    .map_err(|e| e.to_string())
}

/* ------------------------------- 成就 -------------------------------- */

#[tauri::command]
pub async fn list_achievements(
    state: State<'_, SqlitePool>,
    profile_id: i64,
) -> CmdResult<Vec<Achievement>> {
    sqlx::query_as::<_, Achievement>(
        "SELECT * FROM Achievement WHERE profile_id = ?1 ORDER BY id",
    )
    .bind(profile_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())
}

/// 幂等解锁；返回是否为本次新解锁
#[tauri::command]
pub async fn unlock_achievement(
    state: State<'_, SqlitePool>,
    profile_id: i64,
    code: String,
) -> CmdResult<bool> {
    let res = sqlx::query(
        "INSERT OR IGNORE INTO Achievement (profile_id, code) VALUES (?1, ?2)",
    )
    .bind(profile_id)
    .bind(&code)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(res.rows_affected() > 0)
}

/* ------------------------------- 饰品 -------------------------------- */

#[derive(serde::Serialize)]
pub struct ItemState {
    pub unlocked: Vec<UnlockedItemRow>,
    pub outfit: OutfitSlots,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
pub struct OutfitSlots {
    pub hat: Option<String>,
    pub glasses: Option<String>,
    pub background: Option<String>,
    pub pet: Option<String>,
}

#[tauri::command]
pub async fn list_items(
    state: State<'_, SqlitePool>,
    profile_id: i64,
) -> CmdResult<ItemState> {
    let unlocked = sqlx::query_as::<_, UnlockedItemRow>(
        "SELECT id, item_code, unlocked_at FROM UnlockedItem WHERE profile_id = ?1 ORDER BY id",
    )
    .bind(profile_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row: (Option<String>, Option<String>, Option<String>, Option<String>) =
        sqlx::query_as(
            "SELECT outfit_hat, outfit_glasses, outfit_background, outfit_pet
             FROM Profile WHERE id = ?1",
        )
        .bind(profile_id)
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(ItemState {
        unlocked,
        outfit: OutfitSlots {
            hat: row.0,
            glasses: row.1,
            background: row.2,
            pet: row.3,
        },
    })
}

/// 前端按累计星星规则计算应得饰品后，同步入库；返回本次新解锁的 code
#[tauri::command]
pub async fn sync_unlocked_items(
    state: State<'_, SqlitePool>,
    input: ItemSyncInput,
) -> CmdResult<Vec<String>> {
    let mut newly = Vec::new();
    for code in input.item_codes {
        let res = sqlx::query(
            "INSERT OR IGNORE INTO UnlockedItem (profile_id, item_code) VALUES (?1, ?2)",
        )
        .bind(input.profile_id)
        .bind(&code)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
        if res.rows_affected() > 0 {
            newly.push(code);
        }
    }
    Ok(newly)
}

#[tauri::command]
pub async fn set_outfit(state: State<'_, SqlitePool>, input: OutfitInput) -> CmdResult<()> {
    sqlx::query(
        "UPDATE Profile SET outfit_hat=?1, outfit_glasses=?2, outfit_background=?3, outfit_pet=?4
         WHERE id=?5",
    )
    .bind(&input.hat)
    .bind(&input.glasses)
    .bind(&input.background)
    .bind(&input.pet)
    .bind(input.profile_id)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/* ----------------------------- 家长设置 ------------------------------ */

#[derive(serde::Serialize)]
pub struct SettingsView {
    pub daily_limit_minutes: i64,
    pub pin_is_default: bool,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, SqlitePool>) -> CmdResult<SettingsView> {
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(SettingsView {
        daily_limit_minutes: s.daily_limit_minutes,
        pin_is_default: s.pin_hash == hash_pin("0000"),
    })
}

#[tauri::command]
pub async fn verify_pin(state: State<'_, SqlitePool>, pin: String) -> CmdResult<bool> {
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(s.pin_hash == hash_pin(&pin))
}

#[tauri::command]
pub async fn change_pin(
    state: State<'_, SqlitePool>,
    old_pin: String,
    new_pin: String,
) -> CmdResult<bool> {
    if new_pin.chars().count() != 4 || !new_pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("新 PIN 必须是 4 位数字".into());
    }
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    if s.pin_hash != hash_pin(&old_pin) {
        return Ok(false);
    }
    sqlx::query(
        "UPDATE ParentSettings SET pin_hash=?1, pin_updated_at=datetime('now','localtime') WHERE id=1",
    )
    .bind(hash_pin(&new_pin))
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn set_daily_limit(
    state: State<'_, SqlitePool>,
    minutes: i64,
    pin: String,
) -> CmdResult<()> {
    let s = sqlx::query_as::<_, ParentSettings>("SELECT * FROM ParentSettings WHERE id = 1")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    if s.pin_hash != hash_pin(&pin) {
        return Err("PIN 错误，无法修改设置".into());
    }
    let minutes = minutes.clamp(10, 60);
    sqlx::query("UPDATE ParentSettings SET daily_limit_minutes = ?1 WHERE id = 1")
        .bind(minutes)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/* ----------------------------- 每日时长 ------------------------------ */

/// 累加游玩秒数（UPSERT）
#[tauri::command]
pub async fn add_play_seconds(
    state: State<'_, SqlitePool>,
    profile_id: i64,
    seconds: i64,
) -> CmdResult<()> {
    let date = today();
    sqlx::query(
        "INSERT INTO DailyUsage (profile_id, date, used_seconds) VALUES (?1, ?2, ?3)
         ON CONFLICT(profile_id, date) DO UPDATE SET used_seconds = used_seconds + ?3",
    )
    .bind(profile_id)
    .bind(&date)
    .bind(seconds.max(0))
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_today_usage(
    state: State<'_, SqlitePool>,
    profile_id: i64,
) -> CmdResult<i64> {
    let date = today();
    let row: Option<(i64,)> =
        sqlx::query_as("SELECT used_seconds FROM DailyUsage WHERE profile_id = ?1 AND date = ?2")
            .bind(profile_id)
            .bind(&date)
            .fetch_optional(state.inner())
            .await
            .map_err(|e| e.to_string())?;
    Ok(row.map(|r| r.0).unwrap_or(0))
}

/* --------------------------- 今日报告 / 导出 --------------------------- */

/// 查询某孩子今日各游戏汇总（含部分回合，家长可看到中断记录）
#[tauri::command]
pub async fn get_daily_report(
    state: State<'_, SqlitePool>,
    profile_id: i64,
) -> CmdResult<Vec<DailyReportRow>> {
    let date = today();
    sqlx::query_as::<_, DailyReportRow>(
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
    .bind(profile_id)
    .bind(&date)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())
}

fn game_display_name(code: &str) -> &'static str {
    match code {
        "fishing" => "数数捕鱼",
        "compare" => "比较大小",
        "orchard" => "加减法果园",
        "shapes" => "图形配对",
        "patterns" => "规律排序",
        "clock" => "认时钟",
        "multiply" => "乘除法·分苹果（试玩）",
        _ => "未知游戏",
    }
}

/// 生成今日 Markdown 报告并写入本地下载目录，返回文件路径（全程离线）
#[tauri::command]
pub async fn export_daily_report<R: tauri::Runtime>(
    app: AppHandle<R>,
    state: State<'_, SqlitePool>,
    profile_id: i64,
) -> CmdResult<String> {
    let date = today();
    let profile: Profile = sqlx::query_as("SELECT * FROM Profile WHERE id = ?1")
        .bind(profile_id)
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;

    let rows: Vec<DailyReportRow> =
        sqlx::query_as(
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
        .bind(profile_id)
        .bind(&date)
        .fetch_all(state.inner())
        .await
        .map_err(|e| e.to_string())?;

    let used_seconds: i64 = {
        let row: Option<(i64,)> = sqlx::query_as(
            "SELECT used_seconds FROM DailyUsage WHERE profile_id = ?1 AND date = ?2",
        )
        .bind(profile_id)
        .bind(&date)
        .fetch_optional(state.inner())
        .await
        .map_err(|e| e.to_string())?;
        row.map(|r| r.0).unwrap_or(0)
    };

    let total_rounds: i64 = rows.iter().map(|r| r.rounds).sum();
    let total_correct: i64 = rows.iter().map(|r| r.correct).sum();
    let total_questions: i64 = rows.iter().map(|r| r.total).sum();
    let total_stars: i64 = rows.iter().map(|r| r.stars).sum();
    let accuracy = if total_questions > 0 {
        (total_correct as f64 * 1000.0 / total_questions as f64).round() / 10.0
    } else {
        0.0
    };
    let minutes = used_seconds / 60;
    let seconds = used_seconds % 60;

    let mut md = String::new();
    md.push_str(&format!("# KidMath 今日报告\n\n"));
    md.push_str(&format!(
        "- 小玩家：**{}**\n- 日期：{}\n- 今日游玩：{} 分 {} 秒\n- 总回合：{}　总星星：⭐{}\n- 综合正确率：{}%（一次答对 {}/{} 题）\n\n",
        profile.nickname,
        date,
        minutes,
        seconds,
        total_rounds,
        total_stars,
        accuracy,
        total_correct,
        total_questions
    ));
    if rows.is_empty() {
        md.push_str("今天还没有游戏记录。\n");
    } else {
        md.push_str("| 游戏 | 回合数 | 答对题数 | 总题数 | 正确率 | 星星 |\n");
        md.push_str("| --- | ---: | ---: | ---: | ---: | ---: |\n");
        for r in &rows {
            let acc = if r.total > 0 {
                format!("{:.0}%", r.correct as f64 * 100.0 / r.total as f64)
            } else {
                "—".to_string()
            };
            md.push_str(&format!(
                "| {} | {} | {} | {} | {} | ⭐{} |\n",
                game_display_name(&r.game_type),
                r.rounds,
                r.correct,
                r.total,
                acc,
                r.stars
            ));
        }
    }
    md.push_str(&format!(
        "\n---\n由 KidMath 自动生成，累计星星 ⭐{}。\n",
        profile.stars_total
    ));

    let download_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|e| format!("无法获取导出目录: {e}"))?;
    std::fs::create_dir_all(&download_dir)
        .map_err(|e| format!("无法创建导出目录: {e}"))?;
    let safe_name: String = profile
        .nickname
        .chars()
        .map(|c| if "\\/:*?\"<>|".contains(c) { '_' } else { c })
        .collect();
    let path = download_dir.join(format!("KidMath-{}-{}.md", safe_name, date));
    std::fs::write(&path, md.as_bytes()).map_err(|e| format!("写入报告失败: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}
