function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}


function looselyMatches(left, right) {
  const a = normalize(left)
  const b = normalize(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}


function signalMatchesProduct(product, signal) {
  if (signal.kind === 'category') {
    return looselyMatches(product.category, signal.value)
  }
  return (product.ingredients || []).some(
    (ingredient) => looselyMatches(ingredient, signal.value),
  )
}


export function scoreProduct(product, signals = []) {
  return signals.reduce((score, signal) => (
    signalMatchesProduct(product, signal)
      ? score + Number(signal.weight || 0)
      : score
  ), Number(product.match || 0))
}


export function getProductReason(product, signals = []) {
  const matched = signals
    .filter((signal) => (
      signal.weight > 0
      && ['category', 'ingredient'].includes(signal.kind)
      && signalMatchesProduct(product, signal)
    ))
    .sort((left, right) => right.weight - left.weight)
  if (!matched.length) return null
  return {
    label: matched[0].value,
    reason: matched[0].reason,
    weight: matched[0].weight,
  }
}


export function rankProducts(products, signals = []) {
  return products
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(product, signals),
      reason: getProductReason(product, signals),
    }))
    .sort((left, right) => (
      right.score - left.score
      || right.product.match - left.product.match
      || right.product.rating - left.product.rating
      || left.index - right.index
    ))
    .map(({ product, score, reason }) => ({
      ...product,
      personalizedScore: score,
      personalizedMatch: Math.max(0, Math.min(100, Math.round(score))),
      personalizedReason: reason,
    }))
}
