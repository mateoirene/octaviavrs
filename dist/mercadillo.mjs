import { setVrsText, upperVrs } from './branding.mjs';

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function availableListings(items) {
  if (!Array.isArray(items)) throw new TypeError('El mercadillo debe contener una lista de anuncios.');
  return items.filter(item => item && typeof item.title === 'string' && item.title.trim() && item.status === 'approved');
}

export function filterListings(items, query = '', category = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const text = normalize([item.title, item.description, item.compatibility, item.condition, item.location, item.seller, item.category].join(' '));
    return (!category || item.category === category) && terms.every(term => text.includes(term));
  });
}

export function formatPrice(price) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return 'Consultar precio';
  if (price === 0) return 'Gratis';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(price);
}

function safeUrl(value, protocols) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, document.baseURI);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) setVrsText(node, text);
  return node;
}

function listingCard(item) {
  const card = element('article', 'market-card');
  const photo = safeUrl(item.image, ['https:', 'http:']);
  if (photo) {
    const link = element('a', 'market-card-photo');
    link.href = photo;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Ver foto completa: ${upperVrs(item.title)}`);
    const image = element('img');
    image.src = photo;
    image.alt = upperVrs(item.title);
    image.loading = 'lazy';
    link.append(image);
    card.append(link);
  }
  for (const source of (item.images || []).slice(1)) {
    const url = safeUrl(source, ['https:', 'http:']);
    if (!url) continue;
    const link = element('a', 'market-extra-photo', 'Ver otra foto ↗');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; card.append(link);
  }
  const body = element('div', 'market-card-body');
  if (item.category) body.append(element('p', 'eyebrow red', item.category));
  body.append(element('h3', '', item.title), element('p', 'market-price', formatPrice(item.price)));
  if (item.description) body.append(element('p', 'market-description', item.description));
  const facts = element('dl', 'market-facts');
  for (const [label, value] of [['Estado', item.condition], ['Compatible con', item.compatibility], ['Localidad', item.location], ['Vendedor', item.seller]]) {
    if (!value) continue;
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    facts.append(row);
  }
  if (facts.children.length) body.append(facts);
  const contact = safeUrl(item.contactUrl, ['https:', 'http:', 'mailto:', 'tel:']);
  if (contact) {
    const link = element('a', 'event-social', 'Contactar con el vendedor ↗');
    link.href = contact;
    if (/^https?:/.test(contact)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    body.append(link);
  } else {
    body.append(element('p', 'market-contact-pending', 'Consulta al club para contactar con el vendedor.'));
  }
  card.append(body);
  return card;
}

export async function initMarket(root, fetcher = fetch) {
  if (!root) return;
  const grid = root.querySelector('[data-market-grid]');
  const status = root.querySelector('[data-market-status]');
  const empty = root.querySelector('[data-market-empty]');
  const emptyTitle = root.querySelector('[data-market-empty-title]');
  const emptyCopy = root.querySelector('[data-market-empty-copy]');
  const form = root.querySelector('[data-market-filters]');
  const search = root.querySelector('[data-market-search]');
  const category = root.querySelector('[data-market-category]');
  status.textContent = 'Cargando anuncios…';
  empty.hidden = true;
  try {
    const response = await fetcher('/api/market/listings', { cache: 'no-cache' });
    if (!response.ok) throw new Error('No se pudo cargar el mercadillo.');
    const items = availableListings(await response.json());
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    for (const name of categories) {
      const option = element('option', '', name);
      option.value = name;
      category.append(option);
    }
    form.hidden = items.length === 0;
    function render() {
      const visible = filterListings(items, search.value, category.value);
      grid.replaceChildren(...visible.map(listingCard));
      empty.hidden = visible.length > 0;
      if (!items.length) {
        status.textContent = 'Todavía no hay piezas anunciadas.';
      } else {
        const quantity = `${visible.length} ${visible.length === 1 ? 'pieza' : 'piezas'}`;
        status.textContent = search.value.trim() || category.value ? `${quantity} de ${items.length} en venta.` : `${quantity} en venta.`;
        if (!visible.length) {
          emptyTitle.textContent = 'No encontramos piezas con esos filtros.';
          emptyCopy.textContent = 'Prueba con otro nombre o limpia los filtros para ver todos los anuncios.';
        }
      }
    }
    form.addEventListener('submit', event => event.preventDefault());
    search.addEventListener('input', render);
    category.addEventListener('change', render);
    form.addEventListener('reset', () => {
      search.value = '';
      category.value = '';
      render();
    });
    render();
  } catch {
    grid.replaceChildren();
    form.hidden = true;
    empty.hidden = false;
    status.textContent = 'Los anuncios no están disponibles en este momento.';
    emptyTitle.textContent = 'No hemos podido cargar las piezas.';
    emptyCopy.textContent = 'Vuelve a cargar la página o pregunta al club por Instagram para consultar las piezas disponibles.';
  }
}

if (typeof document !== 'undefined') initMarket(document.querySelector('[data-market]'));
