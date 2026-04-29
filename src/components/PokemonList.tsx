import { Loader2 } from 'lucide-react'
import { memo } from 'react'
import type { PokemonDetail, PokemonListItem } from '../api'
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard'

const SKELETON_COUNT = 6

/**
 * Renders the visible catalogue page, Load More button, and auto-load fallback.
 * @param props - Visible Pokémon, cached details, favorites, loading state, and event handlers.
 * @returns Catalogue grid or loading skeletons.
 */
export const PokemonList = memo(function PokemonList({
  pokemon,
  detailCache,
  favoriteIds,
  loading,
  loadingMore,
  hasMore,
  sentinelRef,
  onLoadMore,
  onOpen,
  onToggleFavorite,
}: {
  pokemon: PokemonListItem[]
  detailCache: Record<number, PokemonDetail>
  favoriteIds: Set<number>
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  onLoadMore: () => void
  onOpen: (id: number) => void
  onToggleFavorite: (id: number) => void
}) {
  if (loading) {
    return (
      <div className="catalogue-grid">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <PokemonCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="catalogue-grid">
        {pokemon.map((entry) => (
          <PokemonCard
            key={entry.id}
            item={entry}
            detail={detailCache[entry.id]}
            isFavorite={favoriteIds.has(entry.id)}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
        {loadingMore
          ? Array.from({ length: 3 }, (_, index) => (
              <PokemonCardSkeleton key={`loading-more-${index}`} />
            ))
          : null}
      </div>
      {hasMore ? (
        <>
          <div className="catalogue-load-more-row">
            <button
              type="button"
              className="catalogue-load-more"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
          <div ref={sentinelRef} className="catalogue-load-more-sentinel" aria-hidden="true">
            {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          </div>
        </>
      ) : null}
    </>
  )
})
