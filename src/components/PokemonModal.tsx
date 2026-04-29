import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ChevronLeft, ChevronRight, Loader2, Star, X } from 'lucide-react'
import {
  formatId,
  getPokemonDetail,
  getPokemonSpecies,
  getTypeDetail,
  officialImage,
  pixelSprite,
  titleCase,
  type HomeMode,
  type PokemonDetail,
  type PokemonListItem,
  type PokemonSpecies,
  type TypeDetail,
} from '../api'

const STAT_MAX = 180
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}
const STAT_COLORS: Record<string, string> = {
  hp: '#e7bf36',
  attack: '#e96d20',
  defense: '#e96d20',
  'special-attack': '#11aaa0',
  'special-defense': '#8ccd16',
  speed: '#23b35d',
}

/**
 * Finds the display label for a base stat.
 * @param statName - PokeAPI stat key.
 * @returns Short stat label for the modal table.
 */
function getStatLabel(statName: string) {
  return STAT_LABELS[statName] ?? titleCase(statName)
}

/**
 * Finds the themed bar color for a base stat.
 * @param statName - PokeAPI stat key.
 * @returns CSS color for the stat bar.
 */
function getStatColor(statName: string) {
  return STAT_COLORS[statName] ?? '#4f8f74'
}

/**
 * Converts a stat value into a capped percentage width.
 * @param value - Numeric base stat.
 * @returns Width percentage used by the stat bar.
 */
function getStatWidth(value: number) {
  return `${Math.min(100, (value / STAT_MAX) * 100)}%`
}

/**
 * Renders the detailed Pokémon profile modal.
 * @param props - Selected Pokémon ID, cached API data, navigation, close, and favorite handlers.
 * @returns Modal dialog element.
 */
export const PokemonModal = memo(function PokemonModal({
  id,
  mode,
  onClose,
  onNavigate,
  pokemon,
  detailCache,
  setDetailCache,
  typeCache,
  setTypeCache,
  favoriteIds,
  onToggleFavorite,
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
  favoriteIds: Set<number>
  onToggleFavorite: (id: number) => void
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

    /**
     * Loads the active Pokémon, species flavor text, and missing type data.
     * @returns Promise that resolves after modal state is synchronized.
     */
    async function loadDetail() {
      setLoading(true)
      setError('')
      try {
        const pokemonDetail = detailCacheRef.current[id] ?? (await getPokemonDetail(id))
        const speciesData = await getPokemonSpecies(pokemonDetail.species.url)

        if (cancelled) return

        setDetail(pokemonDetail)
        setSpecies(speciesData)
        setDetailCache((current) => {
          if (current[pokemonDetail.id]) return current
          const next = { ...current, [pokemonDetail.id]: pokemonDetail }
          detailCacheRef.current = next
          return next
        })

        const missingTypes = pokemonDetail.types
          .map(({ type }) => type.name)
          .filter((typeName) => !typeCacheRef.current[typeName])

        if (missingTypes.length > 0) {
          const loadedTypes = await Promise.allSettled(
            missingTypes.map(async (typeName) => [typeName, await getTypeDetail(typeName)] as const),
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
      .to(modal, { y: 22, opacity: 0, scale: 0.975, duration: 0.24, ease: 'power2.in' }, 0)
      .to(backdrop, { opacity: 0, duration: 0.26, ease: 'power2.out' }, 0)
  }, [onClose])

  const pokemonById = useMemo(
    () => new Map(pokemon.map((entry) => [entry.id, entry])),
    [pokemon],
  )
  const currentIndex = useMemo(
    () => pokemon.findIndex((entry) => entry.id === id),
    [id, pokemon],
  )
  const previousPokemon = currentIndex > 0 ? pokemon[currentIndex - 1] : null
  const nextPokemon =
    currentIndex >= 0 && currentIndex < pokemon.length - 1 ? pokemon[currentIndex + 1] : null

  useEffect(() => {
    /**
     * Handles modal keyboard shortcuts for close and adjacent navigation.
     * @param event - Browser keyboard event.
     * @returns Nothing.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation()
      if (event.key === 'ArrowLeft' && previousPokemon) onNavigate(previousPokemon.id)
      if (event.key === 'ArrowRight' && nextPokemon) onNavigate(nextPokemon.id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeWithAnimation, nextPokemon, onNavigate, previousPokemon])

  const nearbyIds = useMemo(() => {
    const windowSize = 5
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const start = Math.max(0, Math.min(safeIndex - 2, pokemon.length - windowSize))
    return pokemon.slice(start, start + windowSize).map((entry) => entry.id)
  }, [currentIndex, pokemon])

  const category =
    species?.genera.find((entry) => entry.language.name === 'en')?.genus ?? 'Unknown Pokemon'
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
  const activePokemon = detail ? pokemonById.get(detail.id) : null
  const statTotal = detail?.stats.reduce((total, entry) => total + entry.base_stat, 0) ?? 0

  return (
    <div
      ref={backdropRef}
      className={`detail-modal-backdrop detail-modal-${mode} fixed inset-0 z-50 flex items-center justify-center px-4 py-6`}
      role="dialog"
      aria-modal="true"
      aria-label="Pokemon detail"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeWithAnimation()
      }}
    >
      <div
        ref={modalRef}
        className="detail-pokedex max-h-[94svh] w-full max-w-7xl overflow-y-auto text-[#203447]"
      >
        <button
          type="button"
          className="detail-close-button"
          onClick={closeWithAnimation}
          aria-label="Close detail"
        >
          <X className="h-5 w-5" />
        </button>

        {loading && (
          <div className="detail-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Pokemon profile
          </div>
        )}

        {error && !loading ? <div className="detail-error">{error}</div> : null}

        {detail && !loading && !error ? (
          <div className="detail-shell">
            <section className="detail-main-page">
              <div className="detail-tabs" aria-hidden="true">
                <span className="detail-pokeball-tab" />
              </div>

              <header className="detail-header">
                <span className="detail-number">No. {formatId(detail.id)}</span>
                <h2>{titleCase(detail.name)}</h2>
                <span className="detail-category">{category}</span>
                <div className="detail-header-types">
                  <button
                    type="button"
                    className={`detail-favorite-button${favoriteIds.has(detail.id) ? ' is-active' : ''}`}
                    onClick={() => onToggleFavorite(detail.id)}
                    aria-label={
                      favoriteIds.has(detail.id)
                        ? `Remove ${titleCase(detail.name)} from favorites`
                        : `Favorite ${titleCase(detail.name)}`
                    }
                    aria-pressed={favoriteIds.has(detail.id)}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  {detail.types.map(({ type }) => (
                    <span key={type.name} className={`detail-type-chip detail-type-${type.name}`}>
                      {titleCase(type.name)}
                    </span>
                  ))}
                </div>
              </header>

              <div className="detail-page-body">
                <section className="detail-photo-panel">
                  <div className="detail-photo-frame">
                    <span className="detail-photo-corner detail-photo-corner-tl" />
                    <span className="detail-photo-corner detail-photo-corner-br" />
                    <img
                      className="detail-pokemon-art"
                      src={officialArtwork}
                      alt={titleCase(detail.name)}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = officialImage(detail.id)
                      }}
                    />
                  </div>
                  <div className="detail-nav-row">
                    <button
                      type="button"
                      className="detail-nav-button"
                      onClick={() => {
                        if (previousPokemon) onNavigate(previousPokemon.id)
                      }}
                      aria-label="Previous Pokemon"
                      disabled={!previousPokemon}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      PREV
                    </button>
                    <span>No. {formatId(detail.id)}</span>
                    <button
                      type="button"
                      className="detail-nav-button"
                      onClick={() => {
                        if (nextPokemon) onNavigate(nextPokemon.id)
                      }}
                      aria-label="Next Pokemon"
                      disabled={!nextPokemon}
                    >
                      NEXT
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>

                <section className="detail-info-panel">
                  <div className="detail-measure-list">
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

                  <div className="detail-info-block">
                    <h3>Abilities</h3>
                    <p>{detail.abilities.map(({ ability }) => titleCase(ability.name)).join(', ')}</p>
                  </div>

                  <div className="detail-info-block">
                    <h3>Weaknesses</h3>
                    <p>
                      {weaknesses.length > 0
                        ? weaknesses.map((typeName) => titleCase(typeName)).join(', ')
                        : 'Loading type matchups'}
                    </p>
                  </div>

                  <div className="detail-info-block detail-stats-block">
                    <h3>Base Stats</h3>
                    <div className="detail-stat-bars">
                      {detail.stats.map(({ stat, base_stat }) => (
                        <div className="detail-stat-row" key={stat.name}>
                          <span>{getStatLabel(stat.name)}</span>
                          <strong>{base_stat}</strong>
                          <div className="detail-stat-track">
                            <span
                              style={{
                                width: getStatWidth(base_stat),
                                background: getStatColor(stat.name),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="detail-stat-row detail-stat-total">
                        <span>Total</span>
                        <strong>{statTotal}</strong>
                        <div className="detail-stat-track" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <footer className="detail-research-note">
                <p>{flavorText || 'No field notes are available for this Pokemon.'}</p>
                <div>
                  <span>Research Level</span>
                  <strong>10</strong>
                </div>
              </footer>
            </section>

            <aside className="detail-region-rail" aria-label="Nearby Pokemon">
              <h3>PokeDex</h3>
              <div className="detail-rail-list">
                {nearbyIds.map((railId) => {
                  const railPokemon = pokemonById.get(railId) ?? detailCache[railId]
                  const railName = railPokemon?.name ?? `Pokemon ${formatId(railId)}`
                  const active = railId === id

                  return (
                    <button
                      key={railId}
                      type="button"
                      className={`detail-rail-item${active ? ' is-active' : ''}`}
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
              <p className="detail-rail-order">
                {activePokemon ? `${titleCase(activePokemon.name)} in catalogue order` : 'Ordered numerically'}
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
})
