export const MARKET_CATEGORIES = ['Motor', 'Llantas y neumáticos', 'Interior', 'Exterior', 'Otros'];
export function groupByCategory(items, selected = '') {
  return MARKET_CATEGORIES.filter(category => !selected || category === selected)
    .map(category => ({ category, items: items.filter(item => item.category === category) }))
    .filter(group => group.items.length);
}
