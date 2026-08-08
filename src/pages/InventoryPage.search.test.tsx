import { describe, it, expect } from 'vitest'
import { filterStockTakeItems, type StockTakeFilter } from './InventoryPage'
import type { StockTakeItem } from '../types'

function makeItem(overrides: Partial<StockTakeItem>): StockTakeItem {
  return {
    articleId: 'a1',
    articleName: 'Cartable scolaire',
    articleReference: 'ART-0001',
    categoryId: 'cat1',
    categoryName: 'Fournitures',
    storageLocationId: 'loc1',
    storageName: 'Entrepôt A',
    theoretical: 5,
    counted: null,
    diff: null,
    status: 'disponible',
    ...overrides,
  }
}

const items: StockTakeItem[] = [
  makeItem({}),
  makeItem({
    articleId: 'a2',
    articleName: 'Stylos bleus',
    articleReference: 'ART-0002',
    categoryId: 'cat1',
    categoryName: 'Fournitures scolaires',
    storageLocationId: 'loc2',
    storageName: 'Entrepôt B',
    status: 'disponible',
  }),
  makeItem({
    articleId: 'a3',
    articleName: 'Médicament A',
    articleReference: 'ART-0003',
    categoryId: 'cat2',
    categoryName: 'Médical',
    storageLocationId: 'loc1',
    storageName: 'Entrepôt A',
    status: 'hors_service',
  }),
]

const noFilter: StockTakeFilter = { search: '', category: '', storage: '', status: '' }

describe('filterStockTakeItems — recherche avancée de l\'inventaire', () => {
  it('retourne tous les éléments sans filtre', () => {
    expect(filterStockTakeItems(items, noFilter)).toHaveLength(3)
  })

  it('filtre par nom (insensible à la casse)', () => {
    const r = filterStockTakeItems(items, { ...noFilter, search: 'styl' })
    expect(r.map((i) => i.articleId)).toEqual(['a2'])
  })

  it('filtre par référence d\'article', () => {
    const r = filterStockTakeItems(items, { ...noFilter, search: 'ART-0003' })
    expect(r.map((i) => i.articleId)).toEqual(['a3'])
  })

  it('filtre par nom de catégorie', () => {
    const r = filterStockTakeItems(items, { ...noFilter, search: 'médical' })
    expect(r.map((i) => i.articleId)).toEqual(['a3'])
  })

  it('filtre par lieu de stockage', () => {
    const r = filterStockTakeItems(items, { ...noFilter, search: 'entrepôt B' })
    expect(r.map((i) => i.articleId)).toEqual(['a2'])
  })

  it('filtre par catégorie exacte', () => {
    const r = filterStockTakeItems(items, { ...noFilter, category: 'cat2' })
    expect(r.map((i) => i.articleId)).toEqual(['a3'])
  })

  it('filtre par lieu exact', () => {
    const r = filterStockTakeItems(items, { ...noFilter, storage: 'loc1' })
    expect(r.map((i) => i.articleId)).toEqual(['a1', 'a3'])
  })

  it('filtre par statut', () => {
    const r = filterStockTakeItems(items, { ...noFilter, status: 'hors_service' })
    expect(r.map((i) => i.articleId)).toEqual(['a3'])
  })

  it('combine recherche + catégorie + statut', () => {
    // "médicament" matche le nom de a3 mais cat1 exclut a3 (cat2) → aucun résultat
    const r = filterStockTakeItems(items, { search: 'médicament', category: 'cat1', storage: '', status: 'disponible' })
    expect(r).toHaveLength(0)
  })

  it('combine lieu + catégorie', () => {
    const r = filterStockTakeItems(items, { search: '', category: 'cat1', storage: 'loc2', status: '' })
    expect(r.map((i) => i.articleId)).toEqual(['a2'])
  })

  it('gère les éléments sans catégorie/lieu', () => {
    const noMeta = [makeItem({ categoryId: null, categoryName: '', storageLocationId: null, storageName: '' })]
    expect(filterStockTakeItems(noMeta, noFilter)).toHaveLength(1)
    const r = filterStockTakeItems(noMeta, { ...noFilter, category: 'cat1' })
    expect(r).toHaveLength(0)
  })
})