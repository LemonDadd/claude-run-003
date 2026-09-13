use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Profile {
    pub id: i64,
    pub nickname: String,
    pub birthday: String, // YYYY-MM-DD
    pub avatar: String,
    pub level_override: Option<i64>,
    pub stars_total: i64,
    pub created_at: String,
    pub outfit_hat: Option<String>,
    pub outfit_glasses: Option<String>,
    pub outfit_background: Option<String>,
    pub outfit_pet: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameRecord {
    pub id: i64,
    pub profile_id: i64,
    pub game_type: String,
    pub level: i64,
    pub correct: i64,
    pub total: i64,
    pub accuracy: f64,
    pub stars_earned: i64,
    pub played_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Achievement {
    pub id: i64,
    pub profile_id: i64,
    pub code: String,
    pub unlocked_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ParentSettings {
    pub id: i64,
    pub pin_hash: String,
    pub daily_limit_minutes: i64,
    pub pin_updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailyUsageRow {
    pub date: String,
    pub used_seconds: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UnlockedItemRow {
    pub id: i64,
    pub item_code: String,
    pub unlocked_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Stats {
    pub rounds: i64,
    pub total_correct: i64,
    pub total_answered: i64,
    pub played_games: i64,
}

/// 今日报告中单个游戏的汇总
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailyReportRow {
    pub game_type: String,
    pub rounds: i64,
    pub correct: i64,
    pub total: i64,
    pub stars: i64,
}

/// 保存一回合游戏结果的入参
#[derive(Debug, Deserialize)]
pub struct GameResultInput {
    pub profile_id: i64,
    pub game_type: String,
    pub level: i64,
    pub correct: i64,
    pub total: i64,
    pub stars_earned: i64,
}

/// 前端同步饰品解锁的入参
#[derive(Debug, Deserialize)]
pub struct ItemSyncInput {
    pub profile_id: i64,
    pub item_codes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProfileInput {
    pub nickname: String,
    pub birthday: String,
    pub avatar: String,
}

#[derive(Debug, Deserialize)]
pub struct OutfitInput {
    pub profile_id: i64,
    pub hat: Option<String>,
    pub glasses: Option<String>,
    pub background: Option<String>,
    pub pet: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SaveResultOutput {
    pub record_id: i64,
    pub stars_total: i64,
}
