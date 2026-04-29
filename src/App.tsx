import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowDownWideNarrow,
  ChevronDown,
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
  Star,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  PAGE_SIZE,
  formatId,
  getPokemonDetail,
  getPokemonList,
  getTypeDetail,
  getTypeList,
  idFromUrl,
  titleCase,
  type HomeMode,
  type PokemonDetail,
  type PokemonListItem,
  type SortMode,
  type TypeDetail,
} from './api'
import { PokemonList } from './components/PokemonList'
import { REGION_RANGES, getPokemonRegion, type RegionName } from './regions'
import './index.css'

gsap.registerPlugin(ScrollTrigger)

const HOME_MODE_STORAGE_KEY = 'pokedex-home-mode-v2'
const FAVORITES_STORAGE_KEY = 'pokedex-favorites-v1'

/**
 * Defers the detailed modal bundle until a Pokémon is opened.
 * @returns Lazy React component for the Pokémon detail modal.
 */
const PokemonModal = lazy(() =>
  import('./components/PokemonModal').then((module) => ({ default: module.PokemonModal })),
)

/**
 * Reads favorite Pokémon IDs from localStorage.
 * @returns Set of favorite Pokémon IDs, or an empty set when storage is unavailable.
 */
function readFavorites() {
  if (typeof window === 'undefined') return new Set<number>()

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return new Set<number>()
    return new Set(parsed.filter((id): id is number => Number.isInteger(id) && id > 0))
  } catch {
    return new Set<number>()
  }
}

/**
 * Reads the saved home mode while defaulting first-time visitors to day mode.
 * @returns Home mode for the app shell.
 */
function readHomeMode(): HomeMode {
  if (typeof window === 'undefined') return 'day'
  const savedMode = window.localStorage.getItem(HOME_MODE_STORAGE_KEY)
  return savedMode === 'night' || savedMode === 'day' ? savedMode : 'day'
}

/**
 * Normalizes catalogue search input for name and ID matching.
 * @param value - Raw search field value.
 * @returns Lowercase search value without a leading hash.
 */
function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/^#/, '')
}

/**
 * Checks whether a Pokémon matches the current search query.
 * @param entry - Pokémon list item to evaluate.
 * @param normalizedSearch - Normalized user search query.
 * @returns True when name or numeric ID matches.
 */
function matchesSearch(entry: PokemonListItem, normalizedSearch: string) {
  if (!normalizedSearch) return true

  // Numeric searches accept both exact padded IDs ("025") and loose prefixes ("2").
  const numericSearch = /^\d+$/.test(normalizedSearch)
  const idMatch = numericSearch
    ? normalizedSearch.length >= 3
      ? formatId(entry.id) === normalizedSearch
      : String(entry.id).startsWith(normalizedSearch)
    : false

  return entry.name.includes(normalizedSearch) || idMatch
}

/**
 * Renders the click/keyboard intro title screen.
 * @param props - Callbacks for when the intro begins exiting and fully completes.
 * @returns Full-screen intro overlay.
 */
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
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)

  const completeIntro = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay || completedRef.current) return

    completedRef.current = true
    onExitStart()
    window.scrollTo({ top: 0 })
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.12 : 0.42,
      ease: 'power2.out',
      onComplete: () => onComplete(),
    })
  }, [onComplete, onExitStart])

  const startTitleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio || mutedRef.current || completedRef.current) return
    audio.volume = 0.42
    audio.muted = false
    void audio.play().catch(() => undefined)
  }, [])

  useEffect(() => {
    mutedRef.current = muted
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

    const onKeyDown = (event: KeyboardEvent) => {
      startTitleAudio()
      if (event.key === 'Enter') {
        completeIntro()
      }
    }

    /**
     * Advances the intro from any click/tap except the music button.
     * @param event - Browser pointer event.
     * @returns Nothing.
     */
    const onIntroPointerDown = (event: PointerEvent) => {
      if ((event.target as Element).closest('.intro-mute-button')) return
      startTitleAudio()
      completeIntro()
    }

    window.addEventListener('keydown', onKeyDown)
    overlay.addEventListener('pointerdown', onIntroPointerDown)
    window.addEventListener('pointerdown', startTitleAudio, { once: true })
    window.setTimeout(startTitleAudio, 0)

    if (reducedMotion) {
      gsap.set(overlay, { autoAlpha: 1 })
      gsap.set([title, prompt], { autoAlpha: 1, y: 0 })
      return () => {
        window.removeEventListener('keydown', onKeyDown)
        overlay.removeEventListener('pointerdown', onIntroPointerDown)
        window.removeEventListener('pointerdown', startTitleAudio)
        document.body.style.overflow = originalOverflow
      }
    }

    const context = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .set(overlay, { autoAlpha: 1 })
        .fromTo(title, { y: 28, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.7 })
        .fromTo(prompt, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35 }, '-=0.18')
        .to(prompt, { autoAlpha: 0.38, duration: 0.85, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    }, overlay)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      overlay.removeEventListener('pointerdown', onIntroPointerDown)
      window.removeEventListener('pointerdown', startTitleAudio)
      context.revert()
      document.body.style.overflow = originalOverflow
    }
  }, [completeIntro, startTitleAudio])

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
          <button ref={promptRef} type="button" className="intro-press-enter" onClick={completeIntro}>
            <span className="intro-prompt-line">
              Press Enter
              <span className="intro-key-icon" aria-hidden="true">Enter</span>
            </span>
            <span className="intro-prompt-line intro-prompt-line-secondary">
              or Click Anywhere
            </span>
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

/**
 * Coordinates app state, filtering, data loading, and top-level routes.
 * @returns The complete Pokédex application.
 */
function App() {
  const [pokemon, setPokemon] = useState<PokemonListItem[]>([])
  const [detailCache, setDetailCache] = useState<Record<number, PokemonDetail>>({})
  const [typeCache, setTypeCache] = useState<Record<string, TypeDetail>>({})
  const [typeOptions, setTypeOptions] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [typeFilterIds, setTypeFilterIds] = useState<Set<number> | null>(null)
  const [regionFilter, setRegionFilter] = useState<RegionName>('all')
  const [regionMenuOpen, setRegionMenuOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => readFavorites())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('id')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [introComplete, setIntroComplete] = useState(false)
  const [homeRevealReady, setHomeRevealReady] = useState(false)
  const [homeMode, setHomeMode] = useState<HomeMode>(() => readHomeMode())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const heroRef = useRef<HTMLElement | null>(null)
  const typeMenuRef = useRef<HTMLDivElement | null>(null)
  const regionMenuRef = useRef<HTMLDivElement | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const homeRevealPlayedRef = useRef(false)

  useEffect(() => {
    window.localStorage.setItem(HOME_MODE_STORAGE_KEY, homeMode)
  }, [homeMode])

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteIds].sort((a, b) => a - b)))
  }, [favoriteIds])

  useEffect(() => {
    /**
     * Closes open dropdown menus when the user clicks elsewhere.
     * @param event - Browser pointer event.
     * @returns Nothing.
     */
    function onPointerDown(event: PointerEvent) {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setTypeMenuOpen(false)
      }
      if (!regionMenuRef.current?.contains(event.target as Node)) {
        setRegionMenuOpen(false)
      }
    }

    /**
     * Closes dropdown menus from the Escape key.
     * @param event - Browser keyboard event.
     * @returns Nothing.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTypeMenuOpen(false)
        setRegionMenuOpen(false)
      }
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

    /**
     * Loads the catalogue list and static type options in parallel.
     * @returns Promise that resolves when initial data is stored.
     */
    async function loadInitialData() {
      setLoading(true)
      setError('')
      try {
        const [listData, typesData] = await Promise.all([getPokemonList(), getTypeList()])
        if (cancelled) return
        setPokemon(listData)
        setTypeOptions(typesData)
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

    /**
     * Loads the selected type's Pokémon ID set for fast filtering.
     * @returns Promise that resolves when type filter IDs are synchronized.
     */
    async function loadTypeFilter() {
      if (typeFilter === 'all') {
        setTypeFilterIds(null)
        return
      }

      try {
        const data = typeCache[typeFilter] ?? (await getTypeDetail(typeFilter))
        if (cancelled) return
        if (!typeCache[typeFilter]) {
          setTypeCache((current) => ({ ...current, [typeFilter]: data }))
        }
        setTypeFilterIds(
          new Set(
            data.pokemon
              .map(({ pokemon: typedPokemon }) => idFromUrl(typedPokemon.url))
              .filter((id) => id >= 1),
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
    const normalizedSearch = normalizeSearch(searchTerm)

    return pokemon
      .filter((entry) => {
        const matchesType = !typeFilterIds || typeFilterIds.has(entry.id)
        const matchesRegion = regionFilter === 'all' || getPokemonRegion(entry.id) === regionFilter
        const matchesFavorite = !favoritesOnly || favoriteIds.has(entry.id)
        return matchesSearch(entry, normalizedSearch) && matchesType && matchesRegion && matchesFavorite
      })
      .sort((a, b) => (sortMode === 'id' ? a.id - b.id : a.name.localeCompare(b.name)))
  }, [favoriteIds, favoritesOnly, pokemon, regionFilter, searchTerm, sortMode, typeFilterIds])

  const visiblePokemon = useMemo(
    () => filteredPokemon.slice(0, visibleCount),
    [filteredPokemon, visibleCount],
  )
  const hasMore = visibleCount < filteredPokemon.length

  useEffect(() => {
    if (!loadingMore) return
    const timeoutId = window.setTimeout(() => setLoadingMore(false), 360)
    return () => window.clearTimeout(timeoutId)
  }, [loadingMore, visibleCount])

  useEffect(() => {
    let cancelled = false
    const missingIds = visiblePokemon
      .map(({ id }) => id)
      .filter((id) => !detailCache[id])
      .slice(0, PAGE_SIZE)

    if (missingIds.length === 0) return

    /**
     * Fetches details for currently visible cards that are not cached yet.
     * @returns Promise that resolves when visible details are cached.
     */
    async function loadVisibleDetails() {
      const entries = await Promise.allSettled(
        missingIds.map(async (id) => [id, await getPokemonDetail(id)] as const),
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
    if (homeRevealPlayedRef.current) return
    if (!heroRef.current) return
    homeRevealPlayedRef.current = true

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
    }, heroRef)

    return () => context.revert()
  }, [homeRevealReady])

  const openDetail = useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  const loadMorePokemon = useCallback(() => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredPokemon.length))
  }, [filteredPokemon.length, hasMore, loadingMore])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Auto-load fallback: uses the same code path as the visible button.
          loadMorePokemon()
        }
      },
      { rootMargin: '180px 0px', threshold: 0.01 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMorePokemon, loading, loadingMore, visibleCount])

  const toggleFavorite = useCallback((id: number) => {
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const homeBackground = homeMode === 'day' ? '/assets/route5-day.jpg' : '/assets/route5-night.jpg'
  const selectedTypeLabel = typeFilter === 'all' ? 'All Types' : titleCase(typeFilter)
  const selectedRegionLabel = regionFilter === 'all' ? 'All Regions' : titleCase(regionFilter)

  return (
    <>
      <main className={`app-shell app-shell-${homeMode}`}>
        <section ref={heroRef} className={`route-home route-home-${homeMode}`}>
          <img className="route-home-bg" src={homeBackground} alt="" aria-hidden="true" />
          <div className="route-home-overlay" />
          <div className="route-home-reveal">
            <span className="route-home-logo-pop">
              <img className="route-home-logo" src="/assets/pokedex-logo.png" alt="Pokedex" />
            </span>
            <a href="#catalogue" aria-label="Scroll to catalogue" className="route-arrow">
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
                  placeholder="Search by Name or ID"
                  value={searchTerm}
                  onChange={(event) => {
                    setVisibleCount(PAGE_SIZE)
                    setSearchTerm(event.target.value)
                  }}
                />
                <Search className="catalogue-search-icon h-5 w-5" />
              </label>

              <button
                type="button"
                className={`catalogue-favorites-filter${favoritesOnly ? ' is-active' : ''}`}
                onClick={() => {
                  setVisibleCount(PAGE_SIZE)
                  setFavoritesOnly((current) => !current)
                }}
                aria-pressed={favoritesOnly}
              >
                <Star className="h-4 w-4" />
                Favorites
              </button>

              <div className="catalogue-filter" ref={typeMenuRef}>
                <button
                  type="button"
                  className="catalogue-filter-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={typeMenuOpen}
                  onClick={() => {
                    setRegionMenuOpen(false)
                    setTypeMenuOpen((current) => !current)
                  }}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  <span>{selectedTypeLabel}</span>
                  <ChevronDown className={`h-4 w-4${typeMenuOpen ? ' is-open' : ''}`} />
                </button>

                {typeMenuOpen ? (
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
                          <span>{typeName === 'all' ? 'All Types' : titleCase(typeName)}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="catalogue-filter" ref={regionMenuRef}>
                <button
                  type="button"
                  className="catalogue-filter-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={regionMenuOpen}
                  onClick={() => {
                    setTypeMenuOpen(false)
                    setRegionMenuOpen((current) => !current)
                  }}
                >
                  <MapPin className="h-5 w-5" />
                  <span>{selectedRegionLabel}</span>
                  <ChevronDown className={`h-4 w-4${regionMenuOpen ? ' is-open' : ''}`} />
                </button>

                {regionMenuOpen ? (
                  <div className="catalogue-filter-menu" role="listbox" aria-label="Filter Pokemon by origin region">
                    {(['all', ...REGION_RANGES.map((region) => region.name)] as RegionName[]).map((regionName) => {
                      const active = regionFilter === regionName
                      return (
                        <button
                          key={regionName}
                          type="button"
                          className={active ? 'is-active' : ''}
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setVisibleCount(PAGE_SIZE)
                            setRegionFilter(regionName)
                            setRegionMenuOpen(false)
                          }}
                        >
                          <span>{regionName === 'all' ? 'All Regions' : titleCase(regionName)}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="catalogue-count">
              Showing {Math.min(visiblePokemon.length, filteredPokemon.length)} of {filteredPokemon.length}
            </p>

            {error && !loading ? (
              <div className="catalogue-state catalogue-state-error">
                {error}
              </div>
            ) : null}

            {!error ? (
              <>
                <PokemonList
                  pokemon={visiblePokemon}
                  detailCache={detailCache}
                  favoriteIds={favoriteIds}
                  loading={loading}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  sentinelRef={loadMoreSentinelRef}
                  onLoadMore={loadMorePokemon}
                  onOpen={openDetail}
                  onToggleFavorite={toggleFavorite}
                />

                {!loading && filteredPokemon.length === 0 ? (
                  <div className="catalogue-empty">
                    <h3 className="text-2xl font-black">No Pokemon found</h3>
                    <p>Try a different name, ID, type, region, or favorites filter.</p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        <footer className="site-footer">
          Built with PokeAPI data and official Pokemon artwork paths. (SeanCordovaGit)
        </footer>

        {selectedId !== null ? (
          <Suspense fallback={null}>
            <PokemonModal
              id={selectedId}
              mode={homeMode}
              onClose={() => setSelectedId(null)}
              onNavigate={(nextId) => setSelectedId(nextId)}
              pokemon={pokemon}
              detailCache={detailCache}
              setDetailCache={setDetailCache}
              typeCache={typeCache}
              setTypeCache={setTypeCache}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </Suspense>
        ) : null}
      </main>
      {!introComplete ? (
        <IntroSequence
          onExitStart={() => setHomeRevealReady(true)}
          onComplete={() => setIntroComplete(true)}
        />
      ) : null}
    </>
  )
}

export default App
