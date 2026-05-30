'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */
type Screen = 'create' | 'participants' | 'showcase'

interface Participant {
  id: string
  projectName: string
  creator: string
  mediaUrl: string
  votes: number
}

interface ContestData {
  name: string
  description: string
  durationMinutes: number
}

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */
function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function classifyMedia(url: string): 'youtube' | 'video' | 'audio' | 'image' | 'other' {
  if (!url) return 'other'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return 'video'
  if (/\.(mp3|wav|ogg|flac|aac)(\?|$)/i.test(url)) return 'audio'
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?|$)/i.test(url)) return 'image'
  return 'other'
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /* ── Navigation ── */
  const [currentScreen, setCurrentScreen] = useState<Screen>('create')

  /* ── Contest Data ── */
  const [contest, setContest] = useState<ContestData>({ name: '', description: '', durationMinutes: 2 })
  const [pin] = useState(generatePin)

  /* ── Participants ── */
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProject, setNewProject] = useState('')
  const [newCreator, setNewCreator] = useState('')
  const [newMediaUrl, setNewMediaUrl] = useState('')

  /* ── Showcase / Voting ── */
  const [deadline, setDeadline] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState({ m: 0, s: 0, ms: 0 })
  const [hasVoted, setHasVoted] = useState(false)
  const [votingFor, setVotingFor] = useState<string | null>(null)
  const [competitionEnded, setCompetitionEnded] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Simulated wallet ── */
  const simulatedWallet = '0x7a3F…dE91'
  const totalPool = participants.reduce((a, p) => a + p.votes, 0) * 0.1

  /* ── Countdown logic ── */
  const endCompetition = useCallback(() => {
    setCompetitionEnded(true)
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => setShowReveal(true), 800)
  }, [])

  useEffect(() => {
    if (!deadline) return
    timerRef.current = setInterval(() => {
      const diff = deadline - Date.now()
      if (diff <= 0) {
        setTimeLeft({ m: 0, s: 0, ms: 0 })
        endCompetition()
        return
      }
      setTimeLeft({
        m: Math.floor(diff / 60000),
        s: Math.floor((diff % 60000) / 1000),
        ms: Math.floor((diff % 1000) / 10),
      })
    }, 37)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [deadline, endCompetition])

  /* ── Handlers ── */
  const handleCreateContest = () => {
    if (!contest.name.trim()) return
    setCurrentScreen('participants')
  }

  const handleAddParticipant = () => {
    if (!newProject.trim() || !newCreator.trim()) return
    setParticipants(prev => [...prev, {
      id: crypto.randomUUID(),
      projectName: newProject.trim(),
      creator: newCreator.trim(),
      mediaUrl: newMediaUrl.trim(),
      votes: 0,
    }])
    setNewProject('')
    setNewCreator('')
    setNewMediaUrl('')
    setShowAddForm(false)
  }

  const handleRemoveParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  const handleLaunchCompetition = () => {
    if (participants.length < 2) return
    setDeadline(Date.now() + contest.durationMinutes * 60 * 1000)
    setCurrentScreen('showcase')
  }

  const handleVote = (id: string) => {
    if (hasVoted || competitionEnded) return
    setVotingFor(id)
    setTimeout(() => {
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, votes: p.votes + 1 } : p))
      setHasVoted(true)
      setVotingFor(null)
    }, 400)
  }

  const handleSimulateEnd = () => {
    endCompetition()
  }

  /* ── Computed: sorted results ── */
  const sortedByVotes = [...participants].sort((a, b) => b.votes - a.votes)
  const totalVotes = participants.reduce((a, p) => a + p.votes, 0)

  if (!mounted) return null

  /* ─────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: '#0B0B0F' }}>
      {/* ════════════ GLOBAL HEADER ════════════ */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60" style={{ background: 'rgba(11,11,15,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #836EFD 0%, #00F0FF 100%)' }}>
              <span className="text-sm font-black text-white">OP</span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 animate-pulse" style={{ borderColor: '#0B0B0F', background: '#22c55e' }} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                OpenPod<span style={{ color: '#836EFD' }}>.io</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>Demo Mode • Hackathon</p>
            </div>
          </div>

          {/* Navigation pills */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(30,30,40,0.6)' }}>
            {(['create', 'participants', 'showcase'] as Screen[]).map((s, i) => (
              <button
                key={s}
                disabled={
                  (s === 'participants' && !contest.name.trim()) ||
                  (s === 'showcase' && !deadline)
                }
                onClick={() => {
                  if (s === 'showcase' && !deadline) return
                  if (s === 'participants' && !contest.name.trim()) return
                  setCurrentScreen(s)
                }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: currentScreen === s ? '#836EFD' : 'transparent',
                  color: currentScreen === s ? '#fff' : '#94a3b8',
                }}
              >
                {i + 1}. {s === 'create' ? 'Crear' : s === 'participants' ? 'Participantes' : 'Showcase'}
              </button>
            ))}
          </div>

          {/* Simulated wallet */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: '#64748b' }}>Mozi Wallet</p>
              <p className="text-[11px] font-bold text-slate-300" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>{simulatedWallet}</p>
            </div>
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #836EFD, #00F0FF)' }}>
              <span className="text-[10px] font-black text-white">M</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">

        {/* ════════════════════════════════════════
            SCREEN A: CREATE CONTEST
           ════════════════════════════════════════ */}
        {currentScreen === 'create' && (
          <section className="animate-in fade-in">
            {/* Hero */}
            <div className="text-center mb-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(131,110,253,0.12)', color: '#836EFD', border: '1px solid rgba(131,110,253,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#836EFD' }} />
                Modo Demo Activo
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Crea tu <span style={{ color: '#836EFD' }}>Concurso</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Configura una competencia multimedia descentralizada. Todos los estados se simulan localmente.
              </p>
            </div>

            {/* Form Card */}
            <div className="max-w-lg mx-auto rounded-3xl border p-6 sm:p-8 space-y-6" style={{ background: 'rgba(15,15,22,0.8)', borderColor: 'rgba(51,51,68,0.5)' }}>
              {/* PIN Badge */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(131,110,253,0.08)', border: '1px solid rgba(131,110,253,0.2)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>PIN</span>
                  <span className="text-2xl font-black tracking-[0.25em]" style={{ color: '#836EFD', fontFamily: 'var(--font-geist-mono, monospace)' }}>{pin}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Nombre del Concurso</label>
                <input
                  type="text"
                  placeholder="Ej. Battle of the Beats Vol.3"
                  value={contest.name}
                  onChange={e => setContest(c => ({ ...c, name: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
                  style={{ background: '#0B0B0F', border: '1px solid rgba(51,51,68,0.6)', }}
                  onFocus={e => e.target.style.borderColor = '#836EFD'}
                  onBlur={e => e.target.style.borderColor = 'rgba(51,51,68,0.6)'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Describe las reglas y premios del concurso…"
                  value={contest.description}
                  onChange={e => setContest(c => ({ ...c, description: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all resize-none"
                  style={{ background: '#0B0B0F', border: '1px solid rgba(51,51,68,0.6)' }}
                  onFocus={e => e.target.style.borderColor = '#836EFD'}
                  onBlur={e => e.target.style.borderColor = 'rgba(51,51,68,0.6)'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Duración de la Competencia</label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 5].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setContest(c => ({ ...c, durationMinutes: min }))}
                      className="rounded-xl py-3 text-sm font-bold transition-all"
                      style={{
                        background: contest.durationMinutes === min ? '#836EFD' : 'rgba(15,15,22,0.9)',
                        color: contest.durationMinutes === min ? '#fff' : '#94a3b8',
                        border: `1px solid ${contest.durationMinutes === min ? '#836EFD' : 'rgba(51,51,68,0.6)'}`,
                        boxShadow: contest.durationMinutes === min ? '0 4px 20px rgba(131,110,253,0.3)' : 'none',
                      }}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateContest}
                disabled={!contest.name.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-black text-white uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #836EFD 0%, #6C5CE7 50%, #836EFD 100%)',
                  boxShadow: contest.name.trim() ? '0 6px 30px rgba(131,110,253,0.35)' : 'none',
                }}
              >
                Inicializar Concurso →
              </button>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            SCREEN B: MANAGE PARTICIPANTS
           ════════════════════════════════════════ */}
        {currentScreen === 'participants' && (
          <section className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(131,110,253,0.15)' }}>
                    <svg className="w-4 h-4" style={{ color: '#836EFD' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Participantes</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
                      {contest.name} • PIN: {pin} • {participants.length} registrados
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95"
                style={{
                  background: showAddForm ? 'rgba(239,68,68,0.1)' : '#836EFD',
                  color: showAddForm ? '#f87171' : '#fff',
                  border: showAddForm ? '1px solid rgba(239,68,68,0.3)' : 'none',
                  boxShadow: showAddForm ? 'none' : '0 4px 20px rgba(131,110,253,0.3)',
                }}
              >
                <svg className="w-4 h-4 transition-transform" style={{ transform: showAddForm ? 'rotate(45deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {showAddForm ? 'Cancelar' : '+ Agregar Nuevo'}
              </button>
            </div>

            {/* Add Form (collapsible) */}
            <div className="overflow-hidden transition-all" style={{ maxHeight: showAddForm ? '500px' : '0', opacity: showAddForm ? 1 : 0, transitionDuration: '400ms' }}>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(131,110,253,0.05)', border: '1px solid rgba(131,110,253,0.2)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#836EFD', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Nuevo Participante
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>Nombre del Proyecto</label>
                    <input
                      type="text"
                      placeholder="Ej. Echoes of Silence"
                      value={newProject}
                      onChange={e => setNewProject(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none transition"
                      style={{ background: '#0B0B0F', border: '1px solid rgba(51,51,68,0.6)' }}
                      onFocus={e => e.target.style.borderColor = '#836EFD'}
                      onBlur={e => e.target.style.borderColor = 'rgba(51,51,68,0.6)'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>Creador / Autor</label>
                    <input
                      type="text"
                      placeholder="Ej. DJ Monadist"
                      value={newCreator}
                      onChange={e => setNewCreator(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none transition"
                      style={{ background: '#0B0B0F', border: '1px solid rgba(51,51,68,0.6)' }}
                      onFocus={e => e.target.style.borderColor = '#836EFD'}
                      onBlur={e => e.target.style.borderColor = 'rgba(51,51,68,0.6)'}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>URL Multimedia (YouTube, .mp3, .mp4, imagen…)</label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newMediaUrl}
                    onChange={e => setNewMediaUrl(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none transition"
                    style={{ background: '#0B0B0F', border: '1px solid rgba(51,51,68,0.6)' }}
                    onFocus={e => e.target.style.borderColor = '#836EFD'}
                    onBlur={e => e.target.style.borderColor = 'rgba(51,51,68,0.6)'}
                  />
                </div>

                <button
                  onClick={handleAddParticipant}
                  disabled={!newProject.trim() || !newCreator.trim()}
                  className="w-full rounded-xl py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: '#836EFD', boxShadow: '0 4px 16px rgba(131,110,253,0.25)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Agregar Participante
                </button>
              </div>
            </div>

            {/* Participant List */}
            {participants.length > 0 ? (
              <div className="space-y-2">
                {participants.map((p, i) => (
                  <div key={p.id} className="group flex items-center gap-3 rounded-2xl p-3 sm:p-4 transition-all" style={{ background: 'rgba(15,15,22,0.6)', border: '1px solid rgba(51,51,68,0.4)' }}>
                    {/* Position */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(131,110,253,0.15)' }}>
                      <span className="text-xs font-black" style={{ color: '#836EFD', fontFamily: 'var(--font-geist-mono, monospace)' }}>{i + 1}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.projectName}</p>
                      <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                        <span style={{ color: '#64748b' }}>por</span> {p.creator}
                        {p.mediaUrl && <span className="ml-2" style={{ color: '#475569' }}>• {classifyMedia(p.mediaUrl).toUpperCase()}</span>}
                      </p>
                    </div>

                    {/* Media badge */}
                    {(() => {
                      const type = classifyMedia(p.mediaUrl)
                      const colors: Record<string, { bg: string; border: string; text: string }> = {
                        youtube: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#f87171' },
                        audio:   { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
                        video:   { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', text: '#22d3ee' },
                        image:   { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#4ade80' },
                        other:   { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#94a3b8' },
                      }
                      const c = colors[type] || colors.other
                      return (
                        <span className="hidden sm:inline-block text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                          {type === 'youtube' ? 'YT' : type}
                        </span>
                      )
                    })()}

                    {/* Remove */}
                    <button onClick={() => handleRemoveParticipant(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl p-12 text-center" style={{ border: '1px solid rgba(51,51,68,0.3)', background: 'rgba(15,15,22,0.4)' }}>
                <svg className="w-12 h-12 mx-auto mb-3" style={{ color: '#334155' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aún no hay participantes.</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>Usa el botón &quot;+ Agregar Nuevo&quot; de arriba.</p>
              </div>
            )}

            {/* Launch Button */}
            <button
              onClick={handleLaunchCompetition}
              disabled={participants.length < 2}
              className="w-full rounded-2xl py-4 text-sm font-black text-white uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: participants.length >= 2 ? 'linear-gradient(135deg, #836EFD 0%, #00F0FF 100%)' : 'rgba(51,51,68,0.3)',
                boxShadow: participants.length >= 2 ? '0 8px 40px rgba(131,110,253,0.3)' : 'none',
              }}
            >
              {participants.length < 2
                ? `Necesitas al menos 2 participantes (${participants.length}/2)`
                : `🚀 Lanzar Competencia (${participants.length} participantes)`}
            </button>
          </section>
        )}

        {/* ════════════════════════════════════════
            SCREEN C: LIVE SHOWCASE & VOTING
           ════════════════════════════════════════ */}
        {currentScreen === 'showcase' && (
          <section className="space-y-8 animate-in fade-in">

            {/* ── Countdown Banner ── */}
            <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, rgba(131,110,253,0.08) 0%, rgba(0,240,255,0.04) 100%)', border: '1px solid rgba(131,110,253,0.2)' }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #836EFD 0%, transparent 60%), radial-gradient(circle at 80% 50%, #00F0FF 0%, transparent 60%)' }} />
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Contest Info */}
                <div className="text-center sm:text-left space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
                    {competitionEnded ? '🏁 COMPETENCIA FINALIZADA' : '🔴 EN VIVO'}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{contest.name}</h2>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>PIN: <span style={{ color: '#836EFD' }}>{pin}</span> • {participants.length} competidores</p>
                </div>

                {/* Timer */}
                <div className="text-center flex-shrink-0">
                  {!competitionEnded && (
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Tiempo Restante</p>
                  )}
                  <div className="flex items-baseline gap-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                    <span className="text-4xl sm:text-5xl font-black" style={{ color: competitionEnded ? '#22c55e' : '#fff' }}>
                      {competitionEnded ? '00' : String(timeLeft.m).padStart(2, '0')}
                    </span>
                    <span className="text-2xl font-black" style={{ color: '#836EFD' }}>:</span>
                    <span className="text-4xl sm:text-5xl font-black" style={{ color: competitionEnded ? '#22c55e' : '#fff' }}>
                      {competitionEnded ? '00' : String(timeLeft.s).padStart(2, '0')}
                    </span>
                    <span className="text-2xl font-black" style={{ color: '#836EFD' }}>.</span>
                    <span className="text-2xl font-black" style={{ color: competitionEnded ? '#4ade80' : '#94a3b8' }}>
                      {competitionEnded ? '00' : String(timeLeft.ms).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Pool + Simulate */}
                <div className="text-center sm:text-right space-y-2 flex-shrink-0">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>Total Pool</p>
                    <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#836EFD', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                      {totalPool.toFixed(1)} MONAD
                    </p>
                  </div>
                  {!competitionEnded && (
                    <button
                      onClick={handleSimulateEnd}
                      className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      ⚡ Simular Cierre
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Competitor Cards Grid ── */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#94a3b8', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                // Proyectos en Competencia
              </h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((p) => {
                  const media = classifyMedia(p.mediaUrl)
                  const ytId = media === 'youtube' ? extractYouTubeId(p.mediaUrl) : null
                  const odds = totalVotes > 0 ? ((totalPool * 0.8) / (p.votes * 0.1 || 0.1)).toFixed(1) : '—'
                  const isWinner = competitionEnded && showReveal && sortedByVotes[0]?.id === p.id
                  const isVotingThis = votingFor === p.id

                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl overflow-hidden transition-all duration-500"
                      style={{
                        background: 'rgba(15,15,22,0.9)',
                        border: `1px solid ${isWinner ? '#22c55e' : competitionEnded ? 'rgba(51,51,68,0.3)' : 'rgba(51,51,68,0.5)'}`,
                        boxShadow: isWinner ? '0 0 40px rgba(34,197,94,0.2)' : 'none',
                        opacity: competitionEnded && !showReveal ? 0.5 : 1,
                        transform: isWinner ? 'scale(1.02)' : 'none',
                      }}
                    >
                      {/* Media Area */}
                      <div className="relative aspect-video w-full overflow-hidden" style={{ background: '#0B0B0F' }}>
                        {media === 'youtube' && ytId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={p.projectName}
                          />
                        ) : media === 'video' ? (
                          <video src={p.mediaUrl} controls className="absolute inset-0 w-full h-full object-cover" />
                        ) : media === 'audio' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 space-y-3">
                            <div className="flex items-center gap-1">
                              {[...Array(24)].map((_, i) => (
                                <div key={i} className="w-[3px] rounded-full animate-pulse" style={{
                                  background: `linear-gradient(to top, #836EFD, #00F0FF)`,
                                  height: `${12 + Math.random() * 28}px`,
                                  animationDelay: `${i * 80}ms`,
                                  animationDuration: `${600 + Math.random() * 600}ms`,
                                }} />
                              ))}
                            </div>
                            <audio src={p.mediaUrl} controls className="w-full max-w-[200px]" style={{ filter: 'invert(1) hue-rotate(180deg)', opacity: 0.7 }} />
                          </div>
                        ) : media === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.mediaUrl} alt={p.projectName} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          /* Cyberpunk placeholder */
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(131,110,253,0.1)', border: '1px solid rgba(131,110,253,0.3)' }}>
                                <svg className="w-7 h-7" style={{ color: '#836EFD' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full animate-pulse" style={{ background: '#836EFD', boxShadow: '0 0 10px #836EFD' }} />
                            </div>
                            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest" style={{ color: '#475569' }}>Contenido Multimedia</p>
                          </div>
                        )}

                        {/* Winner badge overlay */}
                        {isWinner && (
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider animate-bounce" style={{ background: '#22c55e', color: '#0B0B0F' }}>
                            🏆 Ganador
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-white truncate">{p.projectName}</h4>
                          <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                            <span style={{ color: '#64748b' }}>por</span> {p.creator}
                          </p>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                          <span>{p.votes} voto{p.votes !== 1 ? 's' : ''}</span>
                          <span style={{ color: '#836EFD' }}>x{odds}</span>
                          <span>{(p.votes * 0.1).toFixed(1)} MON</span>
                        </div>

                        {/* Vote button */}
                        {!competitionEnded ? (
                          <button
                            onClick={() => handleVote(p.id)}
                            disabled={hasVoted || !!votingFor}
                            className="w-full rounded-xl py-2.5 text-xs font-black transition-all active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{
                              background: hasVoted
                                ? 'rgba(34,197,94,0.1)'
                                : isVotingThis
                                  ? 'rgba(131,110,253,0.3)'
                                  : '#836EFD',
                              color: hasVoted ? '#4ade80' : '#fff',
                              border: hasVoted ? '1px solid rgba(34,197,94,0.3)' : 'none',
                              boxShadow: !hasVoted && !votingFor ? '0 4px 16px rgba(131,110,253,0.25)' : 'none',
                              opacity: hasVoted ? 0.8 : votingFor && !isVotingThis ? 0.4 : 1,
                            }}
                          >
                            {isVotingThis ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full" style={{ border: '2px solid #fff', borderTopColor: 'transparent' }} />
                                <span>Conectando Mozi…</span>
                              </>
                            ) : hasVoted ? (
                              <span>✓ Voto Registrado</span>
                            ) : (
                              <span>Predict &amp; Vote (0.1 MONAD)</span>
                            )}
                          </button>
                        ) : (
                          <div className="w-full rounded-xl py-2.5 text-xs font-bold text-center" style={{ background: 'rgba(51,51,68,0.2)', color: '#64748b', border: '1px solid rgba(51,51,68,0.3)' }}>
                            Votación Cerrada
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── PODIO REVEAL HUD ── */}
            <div className="rounded-3xl overflow-hidden relative" style={{ background: 'rgba(15,15,22,0.6)', border: '1px solid rgba(51,51,68,0.4)' }}>
              <div className="absolute bottom-0 left-0 h-[1px] w-[30%]" style={{ background: 'linear-gradient(to right, transparent, rgba(131,110,253,0.4), transparent)' }} />

              {/* Header */}
              <div className="p-5 sm:p-6 border-b" style={{ borderColor: 'rgba(51,51,68,0.3)' }}>
                <div className="flex items-center gap-2">
                  {!competitionEnded ? (
                    <svg className="w-4 h-4 animate-spin" style={{ color: '#00F0FF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ) : (
                    <svg className="w-4 h-4 animate-bounce" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  )}
                  <h3 className="text-sm font-black text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                    OpenPodio Reveal HUD
                  </h3>
                </div>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                  {!competitionEnded
                    ? 'Podio protegido por Voto Ciego. Se revelará al finalizar la cuenta regresiva.'
                    : 'Competencia finalizada. Resultados revelados on-chain.'}
                </p>
              </div>

              {/* Podium Cards */}
              <div className="grid gap-4 sm:grid-cols-3 p-5 sm:p-6">
                {[
                  { rank: '1° Puesto', emoji: '🏆', poolPct: 0.8, label: 'Ganador — 80% del Pozo' },
                  { rank: '2° Puesto', emoji: '🥈', poolPct: 0.12, label: '12% Pozo Votantes' },
                  { rank: '3° Puesto', emoji: '🥉', poolPct: 0.08, label: '8% Pozo Votantes' },
                ].map((pod, i) => {
                  const winner = sortedByVotes[i]
                  const reward = (totalPool * pod.poolPct).toFixed(1)
                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-4 sm:p-5 transition-all duration-700 relative overflow-hidden"
                      style={{
                        background: showReveal && winner
                          ? i === 0
                            ? 'rgba(34,197,94,0.08)'
                            : 'rgba(131,110,253,0.05)'
                          : 'rgba(15,15,22,0.8)',
                        border: `1px solid ${showReveal && winner && i === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(51,51,68,0.4)'}`,
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                        {pod.rank}
                      </p>

                      {/* Locked / Revealed states */}
                      <div className="relative h-12">
                        {/* Locked */}
                        <div className="absolute inset-0 flex flex-col justify-center transition-all duration-700" style={{ opacity: showReveal ? 0 : 1, transform: showReveal ? 'scale(0.9)' : 'scale(1)' }}>
                          <p className="text-xs font-bold text-slate-300 leading-snug">
                            [ ? ] RECOMPENSA: {reward} MONAD
                          </p>
                        </div>
                        {/* Revealed */}
                        <div className="absolute inset-0 flex flex-col justify-center transition-all duration-700" style={{ opacity: showReveal ? 1 : 0, transform: showReveal ? 'scale(1)' : 'scale(1.1)' }}>
                          {winner ? (
                            <p className="text-xs font-extrabold leading-snug" style={{ color: i === 0 ? '#4ade80' : '#836EFD' }}>
                              {pod.emoji} {winner.projectName} ({reward} MONAD)
                            </p>
                          ) : (
                            <p className="text-xs font-bold" style={{ color: '#64748b' }}>Sin participante</p>
                          )}
                        </div>
                      </div>

                      <p className="text-[9px] mt-1" style={{ color: '#475569', fontFamily: 'var(--font-geist-mono, monospace)' }}>{pod.label}</p>

                      {/* Lock/Unlock icon */}
                      <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: showReveal ? 'rgba(34,197,94,0.15)' : 'rgba(131,110,253,0.1)', border: `1px solid ${showReveal ? 'rgba(34,197,94,0.3)' : 'rgba(131,110,253,0.2)'}` }}>
                        {!showReveal ? (
                          <>
                            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(131,110,253,0.15)' }} />
                            <svg className="w-3.5 h-3.5 relative z-10" style={{ color: '#836EFD' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </>
                        ) : (
                          <>
                            <span className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'rgba(34,197,94,0.12)' }} />
                            <svg className="w-3.5 h-3.5 relative z-10" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Claim Button */}
              {showReveal && (
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <button
                    onClick={() => alert('🎉 ¡Demo! En producción, esto ejecutaría claimReward() on-chain via Mozi Wallet.')}
                    className="w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      boxShadow: '0 6px 30px rgba(34,197,94,0.3)',
                    }}
                  >
                    💰 Claim My Winnings
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="mt-auto border-t py-6 text-center" style={{ borderColor: 'rgba(51,51,68,0.3)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
          OpenPod.io • Built on Monad Testnet • Hackathon Demo Mode
        </p>
      </footer>
    </div>
  )
}
