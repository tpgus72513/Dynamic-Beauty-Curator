import { expect, it } from 'vitest'

import {
  getProductReason,
  rankProducts,
  scoreProduct,
} from './recommendation-ranking'


const products = [
  {
    id: 'pigment',
    match: 94,
    rating: 4.8,
    category: '선케어',
    ingredients: ['나이아신아마이드'],
  },
  {
    id: 'dry',
    match: 80,
    rating: 4.7,
    category: '보습',
    ingredients: ['세라마이드', '판테놀'],
  },
]


it('moves a lower-base product up when risk signals match', () => {
  const signals = [
    { kind: 'category', value: '보습', weight: 16.2, reason: '건조 위험도 90' },
    { kind: 'ingredient', value: '세라마이드', weight: 10.8, reason: '건조 위험도 90' },
  ]

  expect(rankProducts(products, signals)[0].id).toBe('dry')
  expect(products.map((product) => product.id)).toEqual(['pigment', 'dry'])
})


it('applies an avoid penalty larger than positive boosts', () => {
  const risky = {
    id: 'risky',
    match: 99,
    rating: 5,
    category: '에센스',
    ingredients: ['향료'],
  }

  const score = scoreProduct(risky, [
    { kind: 'avoid', value: '향료', weight: -100 },
  ])

  expect(score).toBe(-1)
})


it('uses the highest-weight matching signal as the product reason', () => {
  const signals = [
    { kind: 'ingredient', value: '판테놀', weight: 7.2, reason: '민감 위험도 80' },
    { kind: 'category', value: '보습', weight: 16.2, reason: '건조 위험도 90' },
  ]

  expect(getProductReason(products[1], signals)).toEqual({
    label: '보습',
    reason: '건조 위험도 90',
    weight: 16.2,
  })
})
