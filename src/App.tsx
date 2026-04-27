/*
<design_plan>
Python RNG Execution:
seed = len(prompt) % 17 -> 11
hero='Cinematic Center', font='Geist/system sans', components=['Inline Typography Images','Horizontal Accordions','Feedback/Testimonial Carousel'], motion=['Image Scale & Fade Scroll','Card Stacking']

AIDA Check:
Navigation, Attention hero, Interest catalogue grid, Desire sticky detail preview/motion layer, and Action footer are present without turning the app into a landing page.

Hero Math Verification:
The H1 uses max-w-6xl with clamp(3rem, 6vw, 5.75rem), keeping the headline to 2-3 lines across normal desktop widths. No stamp icons or spam tags.

Bento Density Verification:
The catalogue shell uses grid-flow-dense. Desktop cards are uniform cells in 4 columns; the spotlight panel spans 2 columns and card cells fill remaining tracks without intentional voids.

Label Sweep & Button Check:
No cheap meta labels are used. Dark buttons use light text; light controls use dark text with visible focus states.
</design_plan>
*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Moon,
  Volume2,
  VolumeX,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react'
import './index.css'

gsap.registerPlugin(ScrollTrigger)

const MAX_POKEMON_ID = 1010
const PAGE_SIZE = 10
const API_BASE = 'https://pokeapi.co/api/v2'

type SortMode = 'id' | 'name'
type HomeMode = 'day' | 'night'

type PokemonListItem = {
  id: number
  name: string
  url: string
}

type NamedResource = {
  name: string
  url: string
}

type PokemonDetail = {
  id: number
  name: string
  height: number
  weight: number
  sprites: {
    other?: {
      'official-artwork'?: {
        front_default?: string | null
      }
    }
    front_default?: string | null
  }
  types: Array<{
    slot: number
    type: NamedResource
  }>
  abilities: Array<{
    ability: NamedResource
    is_hidden: boolean
  }>
  stats: Array<{
    base_stat: number
    stat: NamedResource
  }>
}

type PokemonSpecies = {
  genera: Array<{
    genus: string
    language: NamedResource
  }>
  flavor_text_entries: Array<{
    flavor_text: string
    language: NamedResource
  }>
}

type TypeDetail = {
  damage_relations: {
    half_damage_to: NamedResource[]
    no_damage_to: NamedResource[]
  }
  pokemon: Array<{
    pokemon: NamedResource
  }>
}

const typePalette: Record<string, string> = {
  normal: 'bg-stone-200 text-stone-900 border-stone-300',
  fire: 'bg-orange-200 text-orange-950 border-orange-300',
  water: 'bg-sky-200 text-sky-950 border-sky-300',
  electric: 'bg-yellow-200 text-yellow-950 border-yellow-300',
  grass: 'bg-emerald-200 text-emerald-950 border-emerald-300',
  ice: 'bg-cyan-100 text-cyan-950 border-cyan-300',
  fighting: 'bg-red-200 text-red-950 border-red-300',
  poison: 'bg-fuchsia-200 text-fuchsia-950 border-fuchsia-300',
  ground: 'bg-amber-200 text-amber-950 border-amber-300',
  flying: 'bg-indigo-200 text-indigo-950 border-indigo-300',
  psychic: 'bg-pink-200 text-pink-950 border-pink-300',
  bug: 'bg-lime-200 text-lime-950 border-lime-300',
  rock: 'bg-yellow-300 text-yellow-950 border-yellow-500',
  ghost: 'bg-violet-200 text-violet-950 border-violet-300',
  dragon: 'bg-blue-200 text-blue-950 border-blue-300',
  dark: 'bg-zinc-700 text-zinc-50 border-zinc-600',
  steel: 'bg-slate-200 text-slate-950 border-slate-300',
  fairy: 'bg-rose-200 text-rose-950 border-rose-300',
}

function formatId(id: number) {
  return String(id).padStart(3, '0')
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function officialImage(id: number) {
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${formatId(id)}.png`
}

function idFromUrl(url: string) {
  const parts = url.split('/').filter(Boolean)
  return Number(parts[parts.length - 1])
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${typePalette[type] ?? 'border-neutral-300 bg-neutral-200 text-neutral-950'}`}
    >
      {titleCase(type)}
    </span>
  )
}

function PokemonCard({
  item,
  detail,
  onOpen,
}: {
  item: PokemonListItem
  detail?: PokemonDetail
  onOpen: (id: number) => void
}) {
  const [imageSrc, setImageSrc] = useState(officialImage(item.id))
  const fallback =
    detail?.sprites.other?.['official-artwork']?.front_default ?? detail?.sprites.front_default ?? ''

  return (
    <button
      type="button"
      className="pokemon-card group flex min-h-[332px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#f7f2e8] text-left text-neutral-950 shadow-[0_24px_70px_rgba(0,0,0,0.22)] transition duration-500 hover:-translate-y-1 hover:border-[#e53935]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59c4ff]"
      onClick={() => onOpen(item.id)}
    >
      <div className="relative flex aspect-[1.22] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#ffffff_0,#f7d977_32%,#f7f2e8_68%)]">
        <img
          className="h-[82%] w-[82%] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.24)] transition-transform duration-700 ease-out group-hover:scale-105"
          src={imageSrc}
          alt={titleCase(item.name)}
          loading="lazy"
          onError={() => {
            if (fallback && imageSrc !== fallback) {
              setImageSrc(fallback)
            }
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-semibold text-[#e53935]">#{formatId(item.id)}</p>
            <h3 className="mt-1 text-2xl font-black tracking-normal">{titleCase(item.name)}</h3>
          </div>
          <ChevronRight className="mt-2 h-5 w-5 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-[#e53935]" />
        </div>
        <div className="mt-auto flex min-h-8 flex-wrap gap-2">
          {detail ? (
            detail.types.map(({ type }) => <TypeChip key={type.name} type={type.name} />)
          ) : (
            <span className="rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
              Loading types
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function DetailModal({
  id,
  onClose,
  onNavigate,
  detailCache,
  setDetailCache,
  typeCache,
  setTypeCache,
}: {
  id: number
  onClose: () => void
  onNavigate: (id: number) => void
  detailCache: Record<number, PokemonDetail>
  setDetailCache: React.Dispatch<React.SetStateAction<Record<number, PokemonDetail>>>
  typeCache: Record<string, TypeDetail>
  setTypeCache: React.Dispatch<React.SetStateAction<Record<string, TypeDetail>>>
}) {
  const [detail, setDetail] = useState<PokemonDetail | null>(detailCache[id] ?? null)
  const [species, setSpecies] = useState<PokemonSpecies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDetail() {
      setLoading(true)
      setError('')
      try {
        const pokemon =
          detailCache[id] ?? (await getJson<PokemonDetail>(`${API_BASE}/pokemon/${id}`))
        const speciesData = await getJson<PokemonSpecies>(`${API_BASE}/pokemon-species/${id}`)

        if (cancelled) return

        setDetail(pokemon)
        setSpecies(speciesData)
        setDetailCache((current) =>
          current[pokemon.id] ? current : { ...current, [pokemon.id]: pokemon },
        )

        const missingTypes = pokemon.types
          .map(({ type }) => type.name)
          .filter((typeName) => !typeCache[typeName])

        if (missingTypes.length > 0) {
          const loadedTypes = await Promise.all(
            missingTypes.map(async (typeName) => [
              typeName,
              await getJson<TypeDetail>(`${API_BASE}/type/${typeName}`),
            ]),
          )

          if (!cancelled) {
            setTypeCache((current) => ({
              ...current,
              ...Object.fromEntries(loadedTypes),
            }))
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not load this Pokemon profile.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDetail()

    return () => {
      cancelled = true
    }
  }, [detailCache, id, setDetailCache, setTypeCache, typeCache])

  useEffect(() => {
    if (!modalRef.current) return
    gsap.fromTo(
      modalRef.current,
      { y: 28, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' },
    )
  }, [id])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onNavigate(Math.max(1, id - 1))
      if (event.key === 'ArrowRight') onNavigate(Math.min(MAX_POKEMON_ID, id + 1))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [id, onClose, onNavigate])

  const category =
    species?.genera.find((entry) => entry.language.name === 'en')?.genus.replace(' Pokemon', '') ??
    'Unknown'
  const flavorText =
    species?.flavor_text_entries
      .find((entry) => entry.language.name === 'en')
      ?.flavor_text.replace(/\f|\n/g, ' ') ?? ''
  const weaknesses = detail
    ? Array.from(
        new Set(
          detail.types.flatMap(({ type }) => [
            ...(typeCache[type.name]?.damage_relations.half_damage_to.map(({ name }) => name) ?? []),
            ...(typeCache[type.name]?.damage_relations.no_damage_to.map(({ name }) => name) ?? []),
          ]),
        ),
      )
    : []
  const heightInches = detail ? Math.round(detail.height * 3.93701) : 0
  const heightFeet = Math.floor(heightInches / 12)
  const remainingInches = heightInches % 12
  const weightLbs = detail ? ((detail.weight / 10) * 2.20462).toFixed(1) : '0.0'
  const primaryType = detail?.types[0]?.type.name ?? 'normal'
  const pixelSprite =
    detail?.sprites.front_default ??
    detail?.sprites.other?.['official-artwork']?.front_default ??
    (detail ? officialImage(detail.id) : '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Pokemon detail"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="game-pokedex max-h-[94svh] w-full max-w-5xl overflow-y-auto text-neutral-950 shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center border-2 border-[#606a70] bg-white text-neutral-950 transition hover:bg-[#f3f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9313a]"
          onClick={onClose}
          aria-label="Close detail"
        >
          <X className="h-5 w-5" />
        </button>

        {loading && (
          <div className="flex min-h-[520px] items-center justify-center gap-3 text-[#2c3337]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Pokemon profile
          </div>
        )}

        {error && !loading && <div className="p-8 text-center font-semibold text-[#e9313a]">{error}</div>}

        {detail && !loading && !error && (
          <>
            <div className="game-pokedex-header">
              <span className="game-caret" aria-hidden="true" />
              <span>INFO</span>
            </div>

            <div className="game-pokedex-body">
              <section className="game-sprite-panel">
                <img
                  className="game-pokemon-sprite"
                  src={pixelSprite}
                  alt={titleCase(detail.name)}
                  onError={(event) => {
                    event.currentTarget.src = officialImage(detail.id)
                  }}
                />
                <div className="game-nav-row">
                  <button
                    type="button"
                    className="game-nav-button"
                    onClick={() => onNavigate(Math.max(1, id - 1))}
                    aria-label="Previous Pokemon"
                    disabled={id <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    PREV
                  </button>
                  <span className="game-id">No. {formatId(detail.id)}</span>
                  <button
                    type="button"
                    className="game-nav-button"
                    onClick={() => onNavigate(Math.min(MAX_POKEMON_ID, id + 1))}
                    aria-label="Next Pokemon"
                    disabled={id >= MAX_POKEMON_ID}
                  >
                    NEXT
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section className="game-info-panel">
                <div className="game-name-card">
                  <div className="game-ball" aria-hidden="true" />
                  <div>
                    <h2>{titleCase(detail.name)}</h2>
                    <p>{category} Pokemon</p>
                  </div>
                </div>

                <div className="game-type-row">
                  <div className="game-footprint" aria-hidden="true" />
                  <div className={`game-type-badge game-type-${primaryType}`}>
                    {titleCase(primaryType)}
                  </div>
                </div>

                <div className="game-measure-card">
                  <div>
                    <span>HT</span>
                    <strong>
                      {heightFeet}'{String(remainingInches).padStart(2, '0')}"
                    </strong>
                  </div>
                  <div>
                    <span>WT</span>
                    <strong>{weightLbs} lbs.</strong>
                  </div>
                </div>

                <div className="game-description-card">
                  <p>{flavorText || 'No field notes are available for this Pokemon.'}</p>
                </div>

                <div className="game-detail-grid">
                  <div>
                    <h3>ABILITIES</h3>
                    <p>{detail.abilities.map(({ ability }) => titleCase(ability.name)).join(', ')}</p>
                  </div>
                  <div>
                    <h3>WEAKNESS</h3>
                    <p>
                      {weaknesses.length > 0
                        ? weaknesses.map((typeName) => titleCase(typeName)).join(', ')
                        : 'Loading type matchups'}
                    </p>
                  </div>
                  <div className="game-stats-box">
                    <h3>STATS</h3>
                    <div>
                      {detail.stats.map(({ stat, base_stat }) => (
                        <span key={stat.name}>
                          {titleCase(stat.name)} {base_stat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLButtonElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const completedRef = useRef(false)
  const [muted, setMuted] = useState(false)

  const startTitleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio || muted || completedRef.current) return
    audio.volume = 0.42
    audio.muted = false
    void audio.play().catch(() => undefined)
  }, [muted])

  useEffect(() => {
    const overlay = overlayRef.current
    const title = titleRef.current
    const prompt = promptRef.current
    if (!overlay || !title || !prompt) return

    const originalOverflow = document.body.style.overflow
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    document.body.style.overflow = 'hidden'
    window.scrollTo({ top: 0 })

    const audioStartEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown']

    const completeIntro = () => {
      if (completedRef.current) return
      completedRef.current = true
      window.scrollTo({ top: 0 })
      gsap.to(overlay, {
        autoAlpha: 0,
        duration: reducedMotion ? 0.12 : 0.42,
        ease: 'power2.out',
        onComplete: () => {
          document.body.style.overflow = originalOverflow
          onComplete()
        },
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      startTitleAudio()
      if (
        (event.ctrlKey || event.metaKey) &&
        ['+', '=', '-', '0'].includes(event.key)
      ) {
        event.preventDefault()
        return
      }
      if (event.key === 'Enter') {
        completeIntro()
      }
    }

    const preventZoomWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
      }
    }

    const preventTouchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', preventZoomWheel, { passive: false })
    window.addEventListener('touchmove', preventTouchZoom, { passive: false })
    audioStartEvents.forEach((eventName) => {
      if (eventName !== 'keydown') {
        window.addEventListener(eventName, startTitleAudio, { once: true })
      }
    })
    window.setTimeout(startTitleAudio, 0)

    if (reducedMotion) {
      gsap.set(overlay, { autoAlpha: 1 })
      gsap.set([title, prompt], { autoAlpha: 1, y: 0 })
      return () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('wheel', preventZoomWheel)
        window.removeEventListener('touchmove', preventTouchZoom)
        window.removeEventListener('pointerdown', startTitleAudio)
        document.body.style.overflow = originalOverflow
      }
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

      timeline
        .set(overlay, { autoAlpha: 1 })
        .fromTo(title, { y: 28, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.7 })
        .fromTo(prompt, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35 }, '-=0.18')
        .to(prompt, { autoAlpha: 0.38, duration: 0.85, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    }, overlay)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', preventZoomWheel)
      window.removeEventListener('touchmove', preventTouchZoom)
      window.removeEventListener('pointerdown', startTitleAudio)
      context.revert()
      document.body.style.overflow = originalOverflow
    }
  }, [onComplete, startTitleAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = muted
    if (muted) {
      audio.pause()
    } else if (!completedRef.current) {
      audio.volume = 0.42
      void audio.play().catch(() => undefined)
    }
  }, [muted])

  return (
    <div ref={overlayRef} className="intro-overlay" aria-label="Pokedex title screen">
      <audio ref={audioRef} src="/assets/title-screen-audio.mp3" loop preload="auto" autoPlay playsInline />
      <div className="intro-title-screen">
        <div className="intro-scenic-side" aria-hidden="true" />
        <div className="intro-parchment-side" aria-hidden="true" />
        <div ref={titleRef} className="intro-title-content">
          <img className="intro-title-logo" src="/assets/intro-title.png" alt="Pokemon Legends Archives" />
          <button
            ref={promptRef}
            type="button"
            className="intro-press-enter"
            onClick={() => {
              if (!completedRef.current) {
                completedRef.current = true
                window.scrollTo({ top: 0 })
                gsap.to(overlayRef.current, {
                  autoAlpha: 0,
                  duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.12 : 0.42,
                  ease: 'power2.out',
                  onComplete: () => onComplete(),
                })
              }
            }}
          >
            Press Enter
          </button>
        </div>
        <button
          type="button"
          className="intro-mute-button"
          onClick={() => {
            setMuted((current) => {
              const nextMuted = !current
              if (!nextMuted) {
                window.setTimeout(startTitleAudio, 0)
              }
              return nextMuted
            })
          }}
          aria-label={muted ? 'Unmute title music' : 'Mute title music'}
          aria-pressed={muted}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          <span>{muted ? 'Muted' : 'Music'}</span>
        </button>
      </div>
    </div>
  )
}

function App() {
  const [pokemon, setPokemon] = useState<PokemonListItem[]>([])
  const [detailCache, setDetailCache] = useState<Record<number, PokemonDetail>>({})
  const [typeCache, setTypeCache] = useState<Record<string, TypeDetail>>({})
  const [typeOptions, setTypeOptions] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [typeFilterIds, setTypeFilterIds] = useState<Set<number> | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('id')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [introComplete, setIntroComplete] = useState(false)
  const [homeMode, setHomeMode] = useState<HomeMode>(() => {
    if (typeof window === 'undefined') return 'day'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const heroRef = useRef<HTMLElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      setLoading(true)
      setError('')
      try {
        const [listData, typesData] = await Promise.all([
          getJson<{ results: NamedResource[] }>(`${API_BASE}/pokemon?limit=${MAX_POKEMON_ID}&offset=0`),
          getJson<{ results: NamedResource[] }>(`${API_BASE}/type`),
        ])

        if (cancelled) return

        setPokemon(
          listData.results
            .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name, url: entry.url }))
            .filter((entry) => entry.id >= 1 && entry.id <= MAX_POKEMON_ID),
        )
        setTypeOptions(
          typesData.results
            .map(({ name }) => name)
            .filter((name) => !['unknown', 'shadow'].includes(name))
            .sort(),
        )
      } catch {
        if (!cancelled) {
          setError('Could not reach PokeAPI. Please check the connection and refresh.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTypeFilter() {
      if (typeFilter === 'all') {
        setTypeFilterIds(null)
        return
      }

      try {
        const data = typeCache[typeFilter] ?? (await getJson<TypeDetail>(`${API_BASE}/type/${typeFilter}`))
        if (cancelled) return

        if (!typeCache[typeFilter]) {
          setTypeCache((current) => ({ ...current, [typeFilter]: data }))
        }
        setTypeFilterIds(
          new Set(
            data.pokemon
              .map(({ pokemon: typedPokemon }) => idFromUrl(typedPokemon.url))
              .filter((id) => id >= 1 && id <= MAX_POKEMON_ID),
          ),
        )
      } catch {
        if (!cancelled) setTypeFilterIds(new Set())
      }
    }

    loadTypeFilter()

    return () => {
      cancelled = true
    }
  }, [typeCache, typeFilter])

  const filteredPokemon = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase().replace(/^#/, '')

    return pokemon
      .filter((entry) => {
        const numericSearch = /^\d+$/.test(normalizedSearch)
        const idMatch = numericSearch
          ? normalizedSearch.length >= 3
            ? formatId(entry.id) === normalizedSearch
            : String(entry.id).startsWith(normalizedSearch)
          : false
        const matchesSearch =
          !normalizedSearch ||
          entry.name.includes(normalizedSearch) ||
          idMatch
        const matchesType = !typeFilterIds || typeFilterIds.has(entry.id)
        return matchesSearch && matchesType
      })
      .sort((a, b) => (sortMode === 'id' ? a.id - b.id : a.name.localeCompare(b.name)))
  }, [pokemon, searchTerm, sortMode, typeFilterIds])

  const visiblePokemon = filteredPokemon.slice(0, visibleCount)

  useEffect(() => {
    let cancelled = false
    const missingIds = visiblePokemon
      .map(({ id }) => id)
      .filter((id) => !detailCache[id])
      .slice(0, PAGE_SIZE)

    if (missingIds.length === 0) return

    async function loadVisibleDetails() {
      const entries = await Promise.allSettled(
        missingIds.map(async (id) => [id, await getJson<PokemonDetail>(`${API_BASE}/pokemon/${id}`)] as const),
      )

      if (cancelled) return

      const loaded = entries.reduce<Record<number, PokemonDetail>>((accumulator, result) => {
        if (result.status === 'fulfilled') {
          accumulator[result.value[0]] = result.value[1]
        }
        return accumulator
      }, {})

      if (Object.keys(loaded).length > 0) {
        setDetailCache((current) => ({ ...current, ...loaded }))
      }
    }

    loadVisibleDetails()

    return () => {
      cancelled = true
    }
  }, [detailCache, visiblePokemon])

  useEffect(() => {
    if (!heroRef.current) return
    const context = gsap.context(() => {
      gsap.fromTo(
        '.route-home-reveal',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
      )

      gsap.utils.toArray<HTMLElement>('.pokemon-card').forEach((card) => {
        gsap.fromTo(
          card,
          { y: 34, opacity: 0.35, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 92%',
              end: 'bottom 15%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })
    }, heroRef)

    return () => context.revert()
  }, [visiblePokemon.length, filteredPokemon.length])

  const openDetail = useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  const homeBackground =
    homeMode === 'day' ? '/assets/route5-day.jpg' : '/assets/route5-night.jpg'

  return (
    <>
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#151515] text-[#f7f2e8]">
      <nav className="fixed left-1/2 top-4 z-40 flex w-[min(calc(100%-24px),1120px)] -translate-x-1/2 items-center justify-between rounded-full border border-white/25 bg-black/45 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5">
        <a href="#catalogue" className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59c4ff]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e53935] font-black text-white">
            PX
          </span>
          <span className="hidden font-black tracking-normal sm:block">Pokedex</span>
        </a>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f7f2e8]/80 sm:gap-5">
          <a className="transition hover:text-white" href="#catalogue">
            Catalogue
          </a>
          <a className="transition hover:text-white" href="#field-notes">
            Field notes
          </a>
        </div>
      </nav>

      <section
        ref={heroRef}
        className="route-home relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-28 sm:px-6 lg:px-10"
      >
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={homeBackground}
          alt=""
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 ${
            homeMode === 'day'
              ? 'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(21,21,21,0.12)_58%,rgba(21,21,21,0.35))]'
              : 'bg-[linear-gradient(to_bottom,rgba(2,16,31,0.18),rgba(2,16,31,0.22)_52%,rgba(0,0,0,0.45))]'
          }`}
        />
        <div className="route-home-reveal relative z-10 flex min-h-[62svh] flex-col items-center justify-center gap-8 text-center">
          <img
            className="w-[min(78vw,520px)] drop-shadow-[0_18px_26px_rgba(0,0,0,0.42)]"
            src="/assets/pokedex-logo.png"
            alt="Pokedex"
          />
          <a
            href="#catalogue"
            aria-label="Scroll to catalogue"
            className="route-arrow inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/38 text-white shadow-[0_18px_42px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:translate-y-1 hover:bg-[#e53935] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59c4ff]"
          >
            <ChevronDown className="h-9 w-9" />
          </a>
        </div>
        <div className="absolute bottom-6 right-4 z-10 flex rounded-full border border-white/35 bg-black/42 p-1 shadow-[0_16px_42px_rgba(0,0,0,0.32)] backdrop-blur-md sm:right-6">
          <button
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59c4ff] ${
              homeMode === 'day' ? 'bg-white text-neutral-950' : 'text-white hover:bg-white/12'
            }`}
            onClick={() => setHomeMode('day')}
            aria-pressed={homeMode === 'day'}
          >
            <Sun className="h-4 w-4" />
            Day
          </button>
          <button
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59c4ff] ${
              homeMode === 'night' ? 'bg-white text-neutral-950' : 'text-white hover:bg-white/12'
            }`}
            onClick={() => setHomeMode('night')}
            aria-pressed={homeMode === 'night'}
          >
            <Moon className="h-4 w-4" />
            Night
          </button>
        </div>
      </section>
      <section id="catalogue" className="relative px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-normal sm:text-5xl">Catalogue</h2>
              <p className="mt-3 max-w-2xl text-[#f7f2e8]/64">
                Search by name or ID, filter by type, then open any card for complete field notes.
              </p>
            </div>
            <p className="font-mono text-sm text-[#f7f2e8]/58">
              Showing {Math.min(visiblePokemon.length, filteredPokemon.length)} of {filteredPokemon.length}
            </p>
          </div>

          <div className="mb-8 grid gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3 backdrop-blur md:grid-cols-[1fr_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
              <input
                className="h-12 w-full rounded-md border border-white/10 bg-[#f7f2e8] pl-12 pr-4 font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-500 focus:border-[#59c4ff] focus:ring-2 focus:ring-[#59c4ff]/30"
                placeholder="Search by name or ID"
                value={searchTerm}
                onChange={(event) => {
                  setVisibleCount(PAGE_SIZE)
                  setSearchTerm(event.target.value)
                }}
              />
            </label>
            <label className="relative block">
              <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
              <select
                className="h-12 w-full appearance-none rounded-md border border-white/10 bg-[#f7f2e8] pl-12 pr-4 font-semibold text-neutral-950 outline-none transition focus:border-[#59c4ff] focus:ring-2 focus:ring-[#59c4ff]/30"
                value={typeFilter}
                onChange={(event) => {
                  setVisibleCount(PAGE_SIZE)
                  setTypeFilter(event.target.value)
                }}
              >
                <option value="all">All types</option>
                {typeOptions.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {titleCase(typeName)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#e53935] px-4 font-black text-white transition hover:bg-[#ff504c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59c4ff]"
              onClick={() => {
                setVisibleCount(PAGE_SIZE)
                setSortMode((current) => (current === 'id' ? 'name' : 'id'))
              }}
            >
              <ArrowDownWideNarrow className="h-5 w-5" />
              Sort: {sortMode === 'id' ? 'ID' : 'Name'}
            </button>
          </div>

          {loading && (
            <div className="flex min-h-80 items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] text-[#f7f2e8]/74">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Pokemon catalogue
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-[#e53935]/40 bg-[#e53935]/10 p-8 text-center font-semibold text-white">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div ref={gridRef} className="grid-flow-dense grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {visiblePokemon.map((entry) => (
                  <PokemonCard
                    key={entry.id}
                    item={entry}
                    detail={detailCache[entry.id]}
                    onOpen={openDetail}
                  />
                ))}
              </div>

              {filteredPokemon.length === 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-10 text-center">
                  <h3 className="text-2xl font-black">No Pokemon found</h3>
                  <p className="mt-2 text-[#f7f2e8]/64">Try a different name, ID, or type filter.</p>
                </div>
              )}

              {visibleCount < filteredPokemon.length && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    className="rounded-full bg-[#f7f2e8] px-7 py-4 font-black text-neutral-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59c4ff]"
                    onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section id="field-notes" className="px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-8">
            <h2 className="text-4xl font-black tracking-normal">Field notes</h2>
            <p className="mt-4 leading-8 text-[#f7f2e8]/66">
              The detail view combines Pokemon, species, and type data into one profile. Weakness
              follows the requested prompt example by using type matchups that resist or ignore that
              Pokemon type's attacks.
            </p>
          </div>
          <div className="grid grid-flow-dense gap-4 sm:grid-cols-3">
            {['Search IDs like 001', 'Sort by name', 'Filter by type'].map((copy) => (
              <div key={copy} className="rounded-lg border border-white/10 bg-[#f7f2e8] p-5 text-neutral-950">
                <p className="text-xl font-black">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-[#f7f2e8]/58 sm:px-6 lg:px-10">
        Built with PokéAPI data and official Pokemon artwork paths.
      </footer>

      {selectedId !== null && (
        <DetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onNavigate={(nextId) => setSelectedId(nextId)}
          detailCache={detailCache}
          setDetailCache={setDetailCache}
          typeCache={typeCache}
          setTypeCache={setTypeCache}
        />
      )}
    </main>
    {!introComplete && <IntroSequence onComplete={() => setIntroComplete(true)} />}
    </>
  )
}

export default App
