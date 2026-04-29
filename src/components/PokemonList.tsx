import { Loader2 } from 'lucide-react'
import type { PokemonDetail, PokemonListItem } from '../api'
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard'

const SKELETON_COUNT = 6

export function PokemonList({
  pokemon,
  detailCache,
  favoriteIds,
  loading,
  hasMore,
  sentinelRef,
  onOpen,
  onToggleFavorite,
}: {
  pokemon: PokemonListItem[]
  detailCache: Record<number, PokemonDetail>
  favoriteIds: Set<number>
  loading: boolean
  hasMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
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
      </div>
      <div ref={sentinelRef} className="catalogue-infinite-sentinel" aria-hidden="true">
        {hasMore ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      </div>
    </>
  )
}
