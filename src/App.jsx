import { useState, useEffect, useRef, useCallback } from 'react'

const MODES = {
  pomodoro:   { label: 'Focus',       defaultMins: 25, color: '#e8673a', bg: 'rgba(232,103,58,0.08)'  },
  shortBreak: { label: 'Short break', defaultMins: 5,  color: '#3ab89e', bg: 'rgba(58,184,158,0.08)'  },
  longBreak:  { label: 'Long break',  defaultMins: 15, color: '#8b7cf8', bg: 'rgba(139,124,248,0.08)' },
}

function beep(ctx, freq = 880, duration = 0.18, vol = 0.25) {
  if (!ctx) return
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function chime(ctx) {
  if (!ctx) return
  [880, 1108, 1318].forEach((f, i) =>
    setTimeout(() => beep(ctx, f, 0.3, 0.2), i * 160)
  )
}

export default function PomodoroTimer() {
  const [mode, setMode]           = useState('pomodoro')
  const [settings, setSettings]   = useState({ pomodoro: 25, shortBreak: 5, longBreak: 15 })
  const [remaining, setRemaining] = useState(25 * 60)
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [running, setRunning]     = useState(false)
  const [sessions, setSessions]   = useState(0)
  const [minsTotal, setMinsTotal] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [flash, setFlash]         = useState(false)

  const intervalRef = useRef(null)
  const audioCtx    = useRef(null)

  const currentMode = MODES[mode]
  const progress    = remaining / totalSecs

  const R    = 96
  const CIRC = 2 * Math.PI * R
  const dash = CIRC * progress

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  const switchMode = useCallback((m) => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setMode(m)
    const secs = settings[m] * 60
    setTotalSecs(secs)
    setRemaining(secs)
  }, [settings])

  const reset = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(totalSecs)
  }

  const toggleTimer = () => {
    initAudio()
    setRunning(r => !r)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        toggleTimer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          chime(audioCtx.current)
          setFlash(true)
          setTimeout(() => setFlash(false), 1000)
          if (mode === 'pomodoro') {
            setSessions(s => s + 1)
            setMinsTotal(m => m + settings.pomodoro)
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, mode, settings.pomodoro])

  useEffect(() => {
    document.title = running ? `${fmt(remaining)} · ${currentMode.label}` : 'Pomodoro'
  }, [remaining, running])

  const sessionDots = Array.from({ length: Math.max(sessions, 4) }, (_, i) => i < sessions)

  const styles = {
    root: {
      minHeight: '100vh',
      background: '#0f0e13',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Sora', 'DM Sans', sans-serif",
      padding: '1.5rem',
      transition: 'background 0.6s ease',
    },
    card: {
      width: '100%',
      maxWidth: '360px',
      background: '#19171f',
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '2rem 1.75rem',
      position: 'relative',
      overflow: 'hidden',
    },
    glow: {
      position: 'absolute',
      top: '-80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '280px',
      height: '280px',
      borderRadius: '50%',
      background: currentMode.color,
      opacity: running ? 0.06 : 0.03,
      filter: 'blur(60px)',
      transition: 'opacity 0.8s ease, background 0.6s ease',
      pointerEvents: 'none',
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '12px',
      padding: '4px',
      marginBottom: '2rem',
    },
    tab: (active, m) => ({
      flex: 1,
      padding: '7px 4px',
      fontSize: '11.5px',
      fontWeight: active ? 600 : 400,
      letterSpacing: active ? '0.01em' : '0',
      color: active ? currentMode.color : 'rgba(255,255,255,0.35)',
      background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
      border: 'none',
      borderRadius: '9px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
    }),
    timerWrap: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '1.75rem',
      cursor: 'pointer',
      userSelect: 'none',
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '1.75rem',
    },
    btnPrimary: {
      padding: '11px 36px',
      borderRadius: '12px',
      background: currentMode.color,
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: '13px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      border: 'none',
      cursor: 'pointer',
      transition: 'opacity 0.15s ease, transform 0.1s ease',
    },
    btnIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: 'rgba(255,255,255,0.45)',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      fontFamily: 'inherit',
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '1.5rem',
    },
    stat: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '14px',
      padding: '14px 16px',
      textAlign: 'center',
    },
    statVal: {
      fontSize: '26px',
      fontWeight: 700,
      color: '#f0eeff',
      letterSpacing: '-0.02em',
      lineHeight: 1,
      marginBottom: '4px',
      fontFamily: "'DM Mono', monospace",
    },
    statLabel: {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    dots: {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '1.5rem',
    },
    dot: (filled) => ({
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: filled ? currentMode.color : 'rgba(255,255,255,0.1)',
      transition: 'background 0.4s ease',
    }),
    settingsToggle: {
      width: '100%',
      padding: '10px',
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      color: 'rgba(255,255,255,0.3)',
      fontSize: '11px',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
    },
    settingsPanel: {
      marginTop: '14px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '14px',
      padding: '16px',
      display: settingsOpen ? 'block' : 'none',
    },
    sliderRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '12px',
    },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .timer-ring-track  { transition: stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1); }
        .timer-display     { font-family: 'DM Mono', monospace; }

        .btn-main:hover  { opacity: 0.88; transform: scale(0.98); }
        .btn-main:active { opacity: 0.75; transform: scale(0.96); }
        .btn-icon:hover  { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important; }

        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          outline: none;
          flex: 1;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
          transition: transform 0.15s ease;
        }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }

        @keyframes flash { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .flash-anim { animation: flash 0.35s ease 3; }
      `}</style>

      <div style={styles.root}>
        <div style={styles.card}>
          <div style={styles.glow} />

          {/* Mode tabs */}
          <div style={styles.tabs}>
            {Object.entries(MODES).map(([key, val]) => (
              <button key={key} style={styles.tab(mode === key, key)} onClick={() => switchMode(key)}>
                {val.label}
              </button>
            ))}
          </div>

          {/* Timer ring */}
          <div
            style={styles.timerWrap}
            onClick={toggleTimer}
            title="Click or press Space"
          >
            <svg
              width="228"
              height="228"
              viewBox="0 0 228 228"
              className={flash ? 'flash-anim' : ''}
            >
              <defs>
                <filter id="softglow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Track */}
              <circle
                cx="114" cy="114" r={R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
              />

              {/* Progress arc */}
              <circle
                cx="114" cy="114" r={R}
                fill="none"
                stroke={currentMode.color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${CIRC}`}
                strokeDashoffset="0"
                transform="rotate(-90 114 114)"
                className="timer-ring-track"
                filter="url(#softglow)"
                style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
              />

              {/* Time display */}
              <text
                x="114" y="107"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="46"
                fontWeight="500"
                fill="#f0eeff"
                className="timer-display"
                style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '-1px' }}
              >
                {fmt(remaining)}
              </text>

              {/* Status text */}
              <text
                x="114" y="148"
                textAnchor="middle"
                fontSize="12"
                fontWeight="400"
                fill={running ? currentMode.color : 'rgba(255,255,255,0.22)'}
                style={{ fontFamily: "'Sora', sans-serif", transition: 'fill 0.3s ease', letterSpacing: '0.06em' }}
              >
                {running ? currentMode.label.toUpperCase() : remaining < totalSecs ? 'PAUSED' : 'READY'}
              </text>
            </svg>
          </div>

          {/* Buttons */}
          <div style={styles.controls}>
            <button
              style={styles.btnIcon}
              className="btn-icon"
              onClick={reset}
              title="Reset"
            >
              ↺
            </button>
            <button
              style={styles.btnPrimary}
              className="btn-main"
              onClick={toggleTimer}
            >
              {running ? 'PAUSE' : remaining < totalSecs ? 'RESUME' : 'START'}
            </button>
            <button
              style={styles.btnIcon}
              className="btn-icon"
              onClick={() => {
                initAudio()
                beep(audioCtx.current, 660, 0.15)
                setSettingsOpen(o => !o)
              }}
              title="Settings"
            >
              ⚙
            </button>
          </div>

          {/* Session dots */}
          <div style={styles.dots}>
            {sessionDots.map((filled, i) => (
              <div key={i} style={styles.dot(filled)} />
            ))}
          </div>

          {/* Stats */}
          <div style={styles.stats}>
            {[
              ['Sessions', sessions],
              ['Min focused', Math.round(minsTotal)],
            ].map(([label, value]) => (
              <div key={label} style={styles.stat}>
                <div style={styles.statVal}>{value}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>

          {/* Settings toggle */}
          <button
            style={styles.settingsToggle}
            onClick={() => setSettingsOpen(o => !o)}
          >
            {settingsOpen ? '▲ Hide settings' : '▼ Adjust timers'}
          </button>

          {/* Settings panel */}
          <div style={styles.settingsPanel}>
            {[
              { key: 'pomodoro',   label: 'Focus',       min: 5,  max: 60, step: 5  },
              { key: 'shortBreak', label: 'Short break',  min: 1,  max: 15, step: 1  },
              { key: 'longBreak',  label: 'Long break',   min: 5,  max: 30, step: 5  },
            ].map(({ key, label, min, max, step }) => (
              <div key={key} style={{ ...styles.sliderRow, '--accent': MODES[key].color }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', width: '80px', flexShrink: 0 }}>
                  {label}
                </span>
                <input
                  type="range"
                  min={min} max={max} step={step}
                  value={settings[key]}
                  style={{ '--accent': MODES[key].color }}
                  onChange={e => {
                    const val = Number(e.target.value)
                    setSettings(s => ({ ...s, [key]: val }))
                    if (mode === key && !running) {
                      const secs = val * 60
                      setTotalSecs(secs)
                      setRemaining(secs)
                    }
                  }}
                />
                <span style={{
                  fontSize: '12px',
                  fontFamily: "'DM Mono', monospace",
                  color: MODES[key].color,
                  width: '28px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {settings[key]}
                </span>
              </div>
            ))}
            <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.18)', marginTop: '4px', letterSpacing: '0.03em' }}>
              Space bar · start / pause
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
