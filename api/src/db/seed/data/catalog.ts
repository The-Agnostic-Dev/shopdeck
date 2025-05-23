import { FOOD_CATEGORIES } from './catalog-food.js'
import { HOME_CATEGORIES } from './catalog-home.js'

// Ọjà Fresh catalogue used for local and staging seeds.
// Each line: brand | product | sizes (comma separated) | price in naira for the first size

export interface CategorySeed {
  name: string
  slug: string
  prefix: string
  lines: string[]
}

export const CATEGORIES: CategorySeed[] = [...FOOD_CATEGORIES, ...HOME_CATEGORIES]
