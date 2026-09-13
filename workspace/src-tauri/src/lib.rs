pub mod commands;
pub mod db;
pub mod models;

use commands::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            // 初始化本地 SQLite（应用数据目录），纯离线，无任何网络
            let pool = tauri::async_runtime::block_on(db::init(&handle))
                .expect("初始化数据库失败");
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 儿童档案
            list_profiles,
            create_profile,
            update_profile,
            delete_profile,
            reset_progress,
            set_level_override,
            // 游戏记录
            save_game_result,
            list_records,
            get_stats,
            // 成就
            list_achievements,
            unlock_achievement,
            // 饰品
            list_items,
            sync_unlocked_items,
            set_outfit,
            // 家长设置
            get_settings,
            verify_pin,
            change_pin,
            set_daily_limit,
            // 每日时长
            add_play_seconds,
            get_today_usage,
        ])
        .run(tauri::generate_context!())
        .expect("启动 KidMath 失败");
}
