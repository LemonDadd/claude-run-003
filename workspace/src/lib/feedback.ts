/**
 * 反馈系统：
 * - TTS：优先 Web Speech API 中文读题/朗读（zh-CN），不可用时静默降级
 * - 音效：优先本地打包的 wav，解码失败时用 Web Audio 合成兜底
 * 全程不发起任何网络请求。
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickZhVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === "zh-CN") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ||
    null;
  return cachedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickZhVoice();
  };
}

export function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.95;
    u.pitch = 1.2;
    const v = pickZhVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* 无语音环境：静默降级，不影响游戏 */
  }
}

export function stopSpeak() {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    /* ignore */
  }
}

/* ------------------------------- 音效 ------------------------------- */

let audioCtx: AudioContext | null = null;

/** 优先播放本地打包 wav；失败时回退到 Web Audio 合成（再失败则静默） */
function playFileOrSynth(name: string, synth: () => void) {
  try {
    const url = new URL(`sounds/${name}.wav`, document.baseURI).toString();
    const audio = new Audio(url);
    audio.onplay = () => {};
    audio.onerror = () => synth();
    void audio.play().catch(synth);
  } catch {
    synth();
  }
}

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function blip(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.18) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

/** 答对：清脆上行音 C5-E5-G5 */
export function playCorrect() {
  playFileOrSynth("correct", () => {
    try {
      blip(523.25, 0, 0.16, "sine");
      blip(659.25, 0.09, 0.16, "sine");
      blip(783.99, 0.18, 0.28, "sine", 0.2);
    } catch {
      /* ignore */
    }
  });
}

/** 答错：温和柔和的下行音（不刺耳） */
export function playWrong() {
  playFileOrSynth("wrong", () => {
    try {
      blip(392, 0, 0.22, "sine", 0.12);
      blip(329.63, 0.16, 0.3, "sine", 0.12);
    } catch {
      /* ignore */
    }
  });
}

/** 回合结束小礼花 */
export function playFanfare() {
  playFileOrSynth("fanfare", () => {
    try {
      [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) =>
        blip(f, i * 0.12, 0.25, "triangle", 0.16)
      );
    } catch {
      /* ignore */
    }
  });
}

/** 星星 */
export function playStar() {
  playFileOrSynth("star", () => {
    try {
      blip(1046.5, 0, 0.12, "sine", 0.15);
      blip(1567.98, 0.08, 0.2, "sine", 0.12);
    } catch {
      /* ignore */
    }
  });
}

/** 按钮点按 */
export function playClick() {
  playFileOrSynth("click", () => {
    try {
      blip(660, 0, 0.07, "triangle", 0.1);
    } catch {
      /* ignore */
    }
  });
}
