export const MAX_POKEMON_ID = 1010
export const PAGE_SIZE = 10
export const API_BASE = 'https://pokeapi.co/api/v2'

export type SortMode = 'id' | 'name'
export type HomeMode = 'day' | 'night'

export type PokemonListItem = {
  id: number
  name: string
}

export type NamedResource = {
  name: string
  url: string
}

export type PokemonDetail = {
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
  species: NamedResource
}

export type PokemonSpecies = {
  genera: Array<{
    genus: string
    language: NamedResource
  }>
  flavor_text_entries: Array<{
    flavor_text: string
    language: NamedResource
  }>
}

export type TypeDetail = {
  damage_relations: {
    double_damage_from: NamedResource[]
  }
  pokemon: Array<{
    pokemon: NamedResource
  }>
}

/**
 * Pads a national Pokédex ID for display.
 * @param id - Numeric Pokémon ID from PokeAPI.
 * @returns Three-character display ID, such as "001".
 */
export function formatId(id: number) {
  return String(id).padStart(3, '0')
}

/**
 * Converts PokeAPI kebab-case names into readable labels.
 * @param value - Raw API name, often kebab-case.
 * @returns Title-cased display text.
 */
export function titleCase(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Builds the official artwork URL used by catalogue and modal art.
 * @param id - Numeric national Pokédex ID.
 * @returns Public Pokémon artwork URL.
 */
export function officialImage(id: number) {
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${formatId(id)}.png`
}

/**
 * Builds the small sprite URL used by the modal side rail.
 * @param id - Numeric national Pokédex ID.
 * @returns Public PokeAPI sprite URL.
 */
export function pixelSprite(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

/**
 * Extracts a numeric resource ID from a PokeAPI URL.
 * @param url - PokeAPI resource URL.
 * @returns The trailing numeric ID.
 */
export function idFromUrl(url: string) {
  const parts = url.split('/').filter(Boolean)
  return Number(parts[parts.length - 1])
}

/**
 * Fetches JSON and converts non-2xx responses into thrown errors.
 * @param url - Fully qualified API URL.
 * @returns Parsed JSON response.
 */
async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

/**
 * Loads the regular national Pokédex list used by the catalogue.
 * @returns Pokémon list items capped to the app's supported ID range.
 */
export async function getPokemonList() {
  const data = await getJson<{ results: NamedResource[] }>(
    `${API_BASE}/pokemon?limit=${MAX_POKEMON_ID}&offset=0`,
  )

  return data.results
    .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
    .filter((entry) => entry.id >= 1 && entry.id <= MAX_POKEMON_ID)
}

/**
 * Loads a Pokémon's detailed battle/profile data.
 * @param id - Numeric national Pokédex ID.
 * @returns PokeAPI Pokémon detail payload.
 */
export async function getPokemonDetail(id: number) {
  return getJson<PokemonDetail>(`${API_BASE}/pokemon/${id}`)
}

/**
 * Loads species metadata from either an ID or PokeAPI species URL.
 * @param urlOrId - Species URL from a Pokémon payload, or a numeric ID.
 * @returns Species flavor/category metadata.
 */
export async function getPokemonSpecies(urlOrId: string | number) {
  const url = typeof urlOrId === 'number' ? `${API_BASE}/pokemon-species/${urlOrId}` : urlOrId
  return getJson<PokemonSpecies>(url)
}

/**
 * Loads the filterable type names for the catalogue controls.
 * @returns Sorted list of usable Pokémon type names.
 */
export async function getTypeList() {
  const data = await getJson<{ results: NamedResource[] }>(`${API_BASE}/type`)
  return data.results
    .map(({ name }) => name)
    .filter((name) => !['unknown', 'shadow'].includes(name))
    .sort()
}

/**
 * Loads type data used for filtering and weakness calculation.
 * @param typeName - PokeAPI type name, such as "fire".
 * @returns Type detail payload.
 */
export async function getTypeDetail(typeName: string) {
  return getJson<TypeDetail>(`${API_BASE}/type/${typeName}`)
}
