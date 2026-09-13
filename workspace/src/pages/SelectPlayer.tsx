import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { AVATARS } from "../lib/items";
import { ageFromBirthday } from "../lib/gameConfig";
import { playClick } from "../lib/feedback";

export default function SelectPlayer() {
  const navigate = useNavigate();
  const profiles = useStore((s) => s.profiles);
  const activeProfileId = useStore((s) => s.activeProfileId);
  const selectProfile = useStore((s) => s.selectProfile);

  const enter = async (id: number) => {
    playClick();
    await selectProfile(id);
    navigate("/home");
  };

  return (
    <div className="player-wrap">
      <h1 className="player-title">选择小玩家 🧮</h1>

      <div className="player-grid">
        {profiles.map((p) => {
          const avatar = AVATARS.find((a) => a.id === p.avatar);
          return (
            <button
              key={p.id}
              className={`player-card ${activeProfileId === p.id ? "active" : ""}`}
              onClick={() => enter(p.id)}
            >
              <span className="avatar-face">{avatar?.emoji ?? "🧒"}</span>
              <span className="pname">{p.nickname}</span>
              <span className="pmeta">
                {ageFromBirthday(p.birthday)} 岁 · ⭐ {p.stars_total}
              </span>
            </button>
          );
        })}

        <button
          className="player-card add"
          onClick={() => {
            playClick();
            navigate("/create-profile");
          }}
        >
          <span className="plus">＋</span>
          <span className="pname">新建小玩家</span>
        </button>
      </div>

      <button
        className="parent-entry"
        onClick={() => {
          playClick();
          navigate("/parent");
        }}
      >
        👪 家长入口
      </button>
    </div>
  );
}
