export type RegionName =
  | 'all'
  | 'kanto'
  | 'johto'
  | 'hoenn'
  | 'sinnoh'
  | 'unova'
  | 'kalos'
  | 'alola'
  | 'galar'
  | 'hisui'
  | 'paldea'

type RegionRange = {
  name: Exclude<RegionName, 'all'>
  start: number
  end: number
}

export const REGION_RANGES: RegionRange[] = [
  { name: 'kanto', start: 1, end: 151 },
  { name: 'johto', start: 152, end: 251 },
  { name: 'hoenn', start: 252, end: 386 },
  { name: 'sinnoh', start: 387, end: 493 },
  { name: 'unova', start: 494, end: 649 },
  { name: 'kalos', start: 650, end: 721 },
  { name: 'alola', start: 722, end: 809 },
  { name: 'galar', start: 810, end: 898 },
  { name: 'hisui', start: 899, end: 905 },
  { name: 'paldea', start: 906, end: 1010 },
]

export function getPokemonRegion(id: number) {
  return REGION_RANGES.find((region) => id >= region.start && id <= region.end)?.name ?? 'paldea'
}
