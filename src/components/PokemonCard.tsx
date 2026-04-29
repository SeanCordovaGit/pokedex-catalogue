import { Star } from 'lucide-react'
import {
  formatId,
  officialImage,
  titleCase,
  type PokemonDetail,
  type PokemonListItem,
} from '../api'

function TypeChip({ type }: { type: string }) {
  return (
    <span className={`catalogue-type-chip catalogue-type-${type}`}>
      {titleCase(type)}
    </span>
  )
}

export function PokemonCard({
  item,
  detail,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  item: PokemonListItem
  detail?: PokemonDetail
  isFavorite: boolean
  onOpen: (id: number) => void
  onToggleFavorite: (id: number) => void
}) {
  const fallback =
    detail?.sprites.other?.['official-artwork']?.front_default ?? detail?.sprites.front_default ?? ''
  const primaryType = detail?.types[0]?.type.name ?? 'normal'
  const heightMeters = detail ? `${Number((detail.height / 10).toFixed(1))} M` : '--'
  const weightKg = detail ? `${Number((detail.weight / 10).toFixed(1))} Kg` : '--'

  return (
    <article className={`pokemon-card catalogue-card catalogue-card-${primaryType} group`}>
      <button
        type="button"
        className={`catalogue-favorite-button${isFavorite ? ' is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(item.id)
        }}
        aria-label={isFavorite ? `Remove ${titleCase(item.name)} from favorites` : `Favorite ${titleCase(item.name)}`}
        aria-pressed={isFavorite}
      >
        <Star className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="catalogue-card-main"
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
            src={officialImage(item.id)}
            alt={titleCase(item.name)}
            loading="lazy"
            onError={(event) => {
              if (fallback && event.currentTarget.src !== fallback) {
                event.currentTarget.src = fallback
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
              <>
                <span className="catalogue-skeleton catalogue-skeleton-chip" />
                <span className="catalogue-skeleton catalogue-skeleton-chip is-short" />
              </>
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
    </article>
  )
}

export function PokemonCardSkeleton() {
  return (
    <article className="pokemon-card catalogue-card catalogue-card-skeleton">
      <span className="catalogue-card-id catalogue-skeleton catalogue-skeleton-id" />
      <div className="catalogue-card-art">
        <span className="catalogue-skeleton catalogue-skeleton-art" />
      </div>
      <div className="catalogue-card-body">
        <span className="catalogue-skeleton catalogue-skeleton-title" />
        <div className="catalogue-card-types">
          <span className="catalogue-skeleton catalogue-skeleton-chip" />
          <span className="catalogue-skeleton catalogue-skeleton-chip is-short" />
        </div>
        <div className="catalogue-card-measures">
          <span className="catalogue-skeleton catalogue-skeleton-line" />
          <span className="catalogue-skeleton catalogue-skeleton-line" />
        </div>
        <span className="catalogue-skeleton catalogue-skeleton-button" />
      </div>
    </article>
  )
}
