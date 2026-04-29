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
const HOME_MODE_STORAGE_KEY = 'pokedex-home-mode'

type SortMode = 'id' | 'name'
type HomeMode = 'day' | 'night'

type PokemonListItem = {
  id: number
  name: string
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
    double_damage_from: NamedResource[]
  }
  pokemon: Array<{
    pokemon: NamedResource
  }>
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

function pixelSprite(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
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
    <span className={`catalogue-type-chip catalogue-type-${type}`}>
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
  const primaryType = detail?.types[0]?.type.name ?? 'normal'
  const heightMeters = detail ? `${Number((detail.height / 10).toFixed(1))} M` : '--'
  const weightKg = detail ? `${Number((detail.weight / 10).toFixed(1))} Kg` : '--'

  return (
    <button
      type="button"
      className={`pokemon-card catalogue-card catalogue-card-${primaryType} group`}
      onClick={() => onOpen(item.id)}
    >
      <span className="catalogue-card-id">#{formatId(item.id)}</span>
      <img
        className="catalogue-card-ball"
        src="/assets/pokeball.png"
        alt=""
        aria-hidden="true"
      />
      <div className="catalogue-card-art">
        <img
          className="catalogue-card-pokemon"
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
      <div className="catalogue-card-body">
        <h3>{titleCase(item.name)}</h3>
        <div className="catalogue-card-types">
          {detail ? (
            detail.types.map(({ type }) => <TypeChip key={type.name} type={type.name} />)
          ) : (
            <span className="catalogue-type-chip catalogue-type-loading">
              Loading
            </span>
          )}
        </div>
        <div className="catalogue-card-measures">
          <div>
            <span>Height</span>
            <strong>{heightMeters}</strong>
          </div>
          <div>
            <span>Weight</span>
            <strong>{weightKg}</strong>
          </div>
        </div>
        <span className="catalogue-card-more">More Details</span>
      </div>
    </button>
  )
}

function DetailModal({
  id,
  mode,
  onClose,
  onNavigate,
  pokemon,
  detailCache,
  setDetailCache,
  typeCache,
  setTypeCache,
}: {
  id: number
  mode: HomeMode
  onClose: () => void
  onNavigate: (id: number) => void
  pokemon: PokemonListItem[]
  detailCache: Record<number, PokemonDetail>
  setDetailCache: React.Dispatch<React.SetStateAction<Record<number, PokemonDetail>>>
  typeCache: Record<string, TypeDetail>
  setTypeCache: React.Dispatch<React.SetStateAction<Record<string, TypeDetail>>>
}) {
  const [detail, setDetail] = useState<PokemonDetail | null>(detailCache[id] ?? null)
  const [species, setSpecies] = useState<PokemonSpecies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const closingRef = useRef(false)
  const detailCacheRef = useRef(detailCache)
  const typeCacheRef = useRef(typeCache)

  useEffect(() => {
    detailCacheRef.current = detailCache
  }, [detailCache])

  useEffect(() => {
    typeCacheRef.current = typeCache
  }, [typeCache])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDetail() {
      setLoading(true)
      setError('')
      try {
        const pokemon =
          detailCacheRef.current[id] ?? (await getJson<PokemonDetail>(`${API_BASE}/pokemon/${id}`))
        const speciesData = await getJson<PokemonSpecies>(`${API_BASE}/pokemon-species/${id}`)

        if (cancelled) return

        setDetail(pokemon)
        setSpecies(speciesData)
        setDetailCache((current) => {
          if (current[pokemon.id]) return current
          const next = { ...current, [pokemon.id]: pokemon }
          detailCacheRef.current = next
          return next
        })

        const missingTypes = pokemon.types
          .map(({ type }) => type.name)
          .filter((typeName) => !typeCacheRef.current[typeName])

        if (missingTypes.length > 0) {
          const loadedTypes = await Promise.allSettled(
            missingTypes.map(async (typeName) => [
              typeName,
              await getJson<TypeDetail>(`${API_BASE}/type/${typeName}`),
            ] as const),
          )

          if (!cancelled) {
            const fulfilledTypes = loadedTypes
              .filter((result): result is PromiseFulfilledResult<readonly [string, TypeDetail]> => result.status === 'fulfilled')
              .map((result) => result.value)

            if (fulfilledTypes.length > 0) {
              setTypeCache((current) => {
                const next = { ...current, ...Object.fromEntries(fulfilledTypes) }
                typeCacheRef.current = next
                return next
              })
            }
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
  }, [id, setDetailCache, setTypeCache])

  useEffect(() => {
    if (!modalRef.current) return
    gsap.fromTo(
      modalRef.current,
      { y: 28, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' },
    )
  }, [id])

  const closeWithAnimation = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true

    const modal = modalRef.current
    const backdrop = backdropRef.current

    if (!modal || !backdrop) {
      onClose()
      return
    }

    gsap.killTweensOf([modal, backdrop])
    gsap
      .timeline({ onComplete: onClose })
      .to(
        modal,
        {
          y: 22,
          opacity: 0,
          scale: 0.975,
          duration: 0.24,
          ease: 'power2.in',
        },
        0,
      )
      .to(
        backdrop,
        {
          opacity: 0,
          duration: 0.26,
          ease: 'power2.out',
        },
        0,
      )
  }, [onClose])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation()
      if (event.key === 'ArrowLeft') onNavigate(Math.max(1, id - 1))
      if (event.key === 'ArrowRight') onNavigate(Math.min(MAX_POKEMON_ID, id + 1))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeWithAnimation, id, onNavigate])

  const pokemonById = useMemo(
    () => new Map(pokemon.map((entry) => [entry.id, entry])),
    [pokemon],
  )
  const nearbyIds = useMemo(() => {
    const windowSize = 5
    const start = Math.max(1, Math.min(id - 2, MAX_POKEMON_ID - windowSize + 1))
    return Array.from({ length: windowSize }, (_, index) => start + index).filter(
      (entryId) => entryId <= MAX_POKEMON_ID,
    )
  }, [id])
  const category =
    species?.genera.find((entry) => entry.language.name === 'en')?.genus ??
    'Unknown Pokemon'
  const flavorText =
    species?.flavor_text_entries
      .find((entry) => entry.language.name === 'en')
      ?.flavor_text.replace(/\f|\n/g, ' ') ?? ''
  const weaknesses = detail
    ? Array.from(
        new Set(
          detail.types.flatMap(({ type }) => [
            ...(typeCache[type.name]?.damage_relations.double_damage_from.map(({ name }) => name) ?? []),
          ]),
        ),
      )
    : []
  const heightInches = detail ? Math.round(detail.height * 3.93701) : 0
  const heightFeet = Math.floor(heightInches / 12)
  const remainingInches = heightInches % 12
  const weightLbs = detail ? ((detail.weight / 10) * 2.20462).toFixed(1) : '0.0'
  const officialArtwork =
    detail?.sprites.other?.['official-artwork']?.front_default ??
    detail?.sprites.front_default ??
    (detail ? officialImage(detail.id) : '')

  return (
    <div
      ref={backdropRef}
      className={`arceus-modal-backdrop arceus-modal-${mode} fixed inset-0 z-50 flex items-center justify-center px-4 py-6`}
      role="dialog"
      aria-modal="true"
      aria-label="Pokemon detail"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeWithAnimation()
      }}
    >
      <div
        ref={modalRef}
        className="arceus-pokedex max-h-[94svh] w-full max-w-7xl overflow-y-auto text-[#203447]"
      >
        <button
          type="button"
          className="arceus-close-button"
          onClick={closeWithAnimation}
          aria-label="Close detail"
        >
          <X className="h-5 w-5" />
        </button>

        {loading && (
          <div className="arceus-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Pokemon profile
          </div>
        )}

        {error && !loading && <div className="arceus-error">{error}</div>}

        {detail && !loading && !error && (
          <div className="arceus-shell">
            <section className="arceus-main-page">
              <div className="arceus-tabs" aria-hidden="true">
                <span className="arceus-pokeball-tab" />
              </div>

              <header className="arceus-header">
                <span className="arceus-number">No. {formatId(detail.id)}</span>
                <h2>{titleCase(detail.name)}</h2>
                <span className="arceus-category">{category}</span>
                <div className="arceus-header-types">
                  {detail.types.map(({ type }) => (
                    <span key={type.name} className={`arceus-type-chip arceus-type-${type.name}`}>
                      {titleCase(type.name)}
                    </span>
                  ))}
                </div>
              </header>

              <div className="arceus-page-body">
                <section className="arceus-photo-panel">
                  <div className="arceus-photo-frame">
                    <span className="arceus-photo-corner arceus-photo-corner-tl" />
                    <span className="arceus-photo-corner arceus-photo-corner-br" />
                    <img
                      className="arceus-pokemon-art"
                      src={officialArtwork}
                      alt={titleCase(detail.name)}
                      onError={(event) => {
                        event.currentTarget.src = officialImage(detail.id)
                      }}
                    />
                  </div>
                  <div className="arceus-nav-row">
                    <button
                      type="button"
                      className="arceus-nav-button"
                      onClick={() => onNavigate(Math.max(1, id - 1))}
                      aria-label="Previous Pokemon"
                      disabled={id <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      PREV
                    </button>
                    <span>No. {formatId(detail.id)}</span>
                    <button
                      type="button"
                      className="arceus-nav-button"
                      onClick={() => onNavigate(Math.min(MAX_POKEMON_ID, id + 1))}
                      aria-label="Next Pokemon"
                      disabled={id >= MAX_POKEMON_ID}
                    >
                      NEXT
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>

                <section className="arceus-info-panel">
                  <div className="arceus-measure-list">
                    <div>
                      <span>Weight</span>
                      <strong>{weightLbs} lbs.</strong>
                    </div>
                    <div>
                      <span>Height</span>
                      <strong>
                        {heightFeet}'{String(remainingInches).padStart(2, '0')}"
                      </strong>
                    </div>
                  </div>

                  <div className="arceus-info-block">
                    <h3>Abilities</h3>
                    <p>{detail.abilities.map(({ ability }) => titleCase(ability.name)).join(', ')}</p>
                  </div>

                  <div className="arceus-info-block">
                    <h3>Weaknesses</h3>
                    <p>
                      {weaknesses.length > 0
                        ? weaknesses.map((typeName) => titleCase(typeName)).join(', ')
                        : 'Loading type matchups'}
                    </p>
                  </div>

                  <div className="arceus-info-block arceus-stats-block">
                    <h3>Base Stats</h3>
                    <div>
                      {detail.stats.map(({ stat, base_stat }) => (
                        <span key={stat.name}>
                          {titleCase(stat.name)} <strong>{base_stat}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <footer className="arceus-research-note">
                <p>{flavorText || 'No field notes are available for this Pokemon.'}</p>
                <div>
                  <span>Research Level</span>
                  <strong>10</strong>
                </div>
              </footer>
            </section>

            <aside className="arceus-region-rail" aria-label="Nearby Pokemon">
              <h3>PokeDex</h3>
              <div className="arceus-rail-list">
                {nearbyIds.map((railId) => {
                  const railPokemon = pokemonById.get(railId) ?? detailCache[railId]
                  const railName = railPokemon?.name ?? `Pokemon ${formatId(railId)}`
                  const active = railId === id

                  return (
                    <button
                      key={railId}
                      type="button"
                      className={`arceus-rail-item${active ? ' is-active' : ''}`}
                      onClick={() => onNavigate(railId)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <img
                        src={pixelSprite(railId)}
                        alt=""
                        aria-hidden="true"
                        onError={(event) => {
                          event.currentTarget.src =
                            detailCache[railId]?.sprites.front_default ?? officialImage(railId)
                        }}
                      />
                      <span>No. {formatId(railId)}</span>
                      <strong>{titleCase(railName)}</strong>
                    </button>
                  )
                })}
              </div>
              <p className="arceus-rail-order">Ordered numerically</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function IntroSequence({
  onExitStart,
  onComplete,
}: {
  onExitStart: () => void
  onComplete: () => void
}) {
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
      onExitStart()
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
  }, [onComplete, onExitStart, startTitleAudio])

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
                const overlay = overlayRef.current
                if (!overlay) return
                completedRef.current = true
                onExitStart()
                window.scrollTo({ top: 0 })
                gsap.to(overlay, {
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
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [typeFilterIds, setTypeFilterIds] = useState<Set<number> | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('id')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [introComplete, setIntroComplete] = useState(false)
  const [homeRevealReady, setHomeRevealReady] = useState(false)
  const [homeMode, setHomeMode] = useState<HomeMode>(() => {
    if (typeof window === 'undefined') return 'day'
    const savedMode = window.localStorage.getItem(HOME_MODE_STORAGE_KEY)
    return savedMode === 'night' || savedMode === 'day' ? savedMode : 'day'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const heroRef = useRef<HTMLElement | null>(null)
  const typeMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.localStorage.setItem(HOME_MODE_STORAGE_KEY, homeMode)
  }, [homeMode])

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
            .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
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
    function onPointerDown(event: PointerEvent) {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setTypeMenuOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setTypeMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
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

  const visiblePokemon = useMemo(
    () => filteredPokemon.slice(0, visibleCount),
    [filteredPokemon, visibleCount],
  )

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
    if (!homeRevealReady) return
    if (!heroRef.current) return
    const context = gsap.context(() => {
      gsap.fromTo(
        '.route-home-reveal',
        { y: 34, opacity: 0, scale: 0.94, filter: 'blur(10px)' },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.15,
          ease: 'power3.out',
        },
      )

      gsap.fromTo(
        '.route-home-logo-pop',
        { opacity: 0, scale: 0.62 },
        { opacity: 1, scale: 1, duration: 0.82, ease: 'back.out(1.9)', delay: 0.12 },
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
  }, [filteredPokemon.length, homeRevealReady, visiblePokemon.length])

  const openDetail = useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  const homeBackground =
    homeMode === 'day' ? '/assets/route5-day.jpg' : '/assets/route5-night.jpg'
  const selectedTypeLabel = typeFilter === 'all' ? 'All types' : titleCase(typeFilter)

  return (
    <>
    <main className={`app-shell app-shell-${homeMode}`}>
      <section
        ref={heroRef}
        className={`route-home route-home-${homeMode}`}
      >
        <img
          className="route-home-bg"
          src={homeBackground}
          alt=""
          aria-hidden="true"
        />
        <div className="route-home-overlay" />
        <div className="route-home-reveal">
          <span className="route-home-logo-pop">
            <img
              className="route-home-logo"
              src="/assets/pokedex-logo.png"
              alt="Pokedex"
            />
          </span>
          <a
            href="#catalogue"
            aria-label="Scroll to catalogue"
            className="route-arrow"
          >
            <ChevronDown className="h-9 w-9" />
          </a>
        </div>
        <div className="route-mode-panel">
          <img
            className="route-mode-pokemon"
            src={homeMode === 'day' ? '/assets/charizard.gif' : '/assets/charizardx.gif'}
            alt={homeMode === 'day' ? 'Charizard' : 'Mega Charizard X'}
          />
          <div className="route-mode-toggle">
            <button
              type="button"
              className={homeMode === 'day' ? 'is-active' : ''}
              onClick={() => setHomeMode('day')}
              aria-pressed={homeMode === 'day'}
            >
              <Sun className="h-4 w-4" />
              Day
            </button>
            <button
              type="button"
              className={homeMode === 'night' ? 'is-active' : ''}
              onClick={() => setHomeMode('night')}
              aria-pressed={homeMode === 'night'}
            >
              <Moon className="h-4 w-4" />
              Night
            </button>
          </div>
        </div>
      </section>
      <section id="catalogue" className={`catalogue-section catalogue-section-${homeMode}`}>
        <div className="catalogue-inner mx-auto max-w-6xl">
          <header className="catalogue-heading">
            <span>The Pokemon Catalogue</span>
            <h2>PokeDex</h2>
          </header>

          <div className="catalogue-toolbar">
            <button
              type="button"
              className="catalogue-sort-button"
              onClick={() => {
                setVisibleCount(PAGE_SIZE)
                setSortMode((current) => (current === 'id' ? 'name' : 'id'))
              }}
              aria-label={`Sort by ${sortMode === 'id' ? 'name' : 'ID'}`}
            >
              <ArrowDownWideNarrow className="h-4 w-4" />
              {sortMode === 'id' ? 'ID' : 'Name'}
            </button>

            <label className="catalogue-search">
              <input
                placeholder="Enter Pokemon Name"
                value={searchTerm}
                onChange={(event) => {
                  setVisibleCount(PAGE_SIZE)
                  setSearchTerm(event.target.value)
                }}
              />
              <Search className="catalogue-search-icon h-5 w-5" />
            </label>

            <div className="catalogue-filter" ref={typeMenuRef}>
              <button
                type="button"
                className="catalogue-filter-trigger"
                aria-haspopup="listbox"
                aria-expanded={typeMenuOpen}
                onClick={() => setTypeMenuOpen((current) => !current)}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span>{selectedTypeLabel}</span>
                <ChevronDown className={`h-4 w-4${typeMenuOpen ? ' is-open' : ''}`} />
              </button>

              {typeMenuOpen && (
                <div className="catalogue-filter-menu" role="listbox" aria-label="Filter Pokemon by type">
                  {['all', ...typeOptions].map((typeName) => {
                    const active = typeFilter === typeName
                    return (
                      <button
                        key={typeName}
                        type="button"
                        className={active ? 'is-active' : ''}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setVisibleCount(PAGE_SIZE)
                          setTypeFilter(typeName)
                          setTypeMenuOpen(false)
                        }}
                      >
                        <span>{typeName === 'all' ? 'All types' : titleCase(typeName)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <p className="catalogue-count">
            Showing {Math.min(visiblePokemon.length, filteredPokemon.length)} of {filteredPokemon.length}
          </p>

          {loading && (
            <div className="catalogue-state">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Pokemon catalogue
            </div>
          )}

          {error && !loading && (
            <div className="catalogue-state catalogue-state-error">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="catalogue-grid">
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
                <div className="catalogue-empty">
                  <h3 className="text-2xl font-black">No Pokemon found</h3>
                  <p>Try a different name, ID, or type filter.</p>
                </div>
              )}

              {visibleCount < filteredPokemon.length && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    className="catalogue-load-more"
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

      <footer className="site-footer">
        Built with PokeAPI data and official Pokemon artwork paths. (SeanCordovaGit)
      </footer>

      {selectedId !== null && (
        <DetailModal
          id={selectedId}
          mode={homeMode}
          onClose={() => setSelectedId(null)}
          onNavigate={(nextId) => setSelectedId(nextId)}
          pokemon={pokemon}
          detailCache={detailCache}
          setDetailCache={setDetailCache}
          typeCache={typeCache}
          setTypeCache={setTypeCache}
        />
      )}
    </main>
    {!introComplete && (
      <IntroSequence
        onExitStart={() => setHomeRevealReady(true)}
        onComplete={() => setIntroComplete(true)}
      />
    )}
    </>
  )
}

export default App
