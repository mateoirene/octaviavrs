import { setVrsText, upperVrs } from './branding.mjs';

const pad = number => String(number).padStart(2, '0');
export const dateKey = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;
export function shiftMonth(year, month, step) {
  const date = new Date(Date.UTC(year, month - 1 + step, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}
export function monthCells(year, month) {
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day > 0 && day <= days ? dateKey(year, month, day) : null;
  });
}
export function eventsFor(events, year, month, selectedDate = null) {
  const prefix = `${year}-${pad(month)}-`;
  return events.filter(event => selectedDate ? event.date === selectedDate : event.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
}
export function nextUpcoming(events, today) {
  return [...events].filter(event => event.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-club-calendar]');
  const data = document.getElementById('club-events');
  if (root && data) {
    let events;
    try { events = JSON.parse(data.textContent); } catch { events = null; }
    if (Array.isArray(events)) {
      const now = new Date();
      const today = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const upcoming = nextUpcoming(events, today);
      const initial = upcoming?.date || today;
      let year = Number(initial.slice(0, 4));
      let month = Number(initial.slice(5, 7));
      let selectedDate = upcoming?.date || null;
      const table = root.querySelector('[data-calendar-days]');
      const monthTitle = root.querySelector('[data-calendar-month]');
      const status = root.querySelector('[data-calendar-status]');
      const list = root.querySelector('[data-calendar-events]');
      const agendaTitle = root.querySelector('[data-agenda-title]');
      const nextButton = root.querySelector('[data-calendar-next-event]');
      const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      const labelDate = date => dayFormat.format(new Date(date + 'T12:00:00Z'));
      const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) setVrsText(node, text);
        return node;
      };
      function eventCard(event) {
        const article = element('article', 'calendar-event-card');
        const time = element('time', 'event-date', labelDate(event.date));
        time.dateTime = event.date;
        const title = element('h4', '', event.title);
        article.append(time, title, element('p', '', event.description));
        const details = element('dl', 'event-facts');
        for (const [name, value] of [['Lugar', event.location || 'Pendiente de confirmar'], ['Hora', event.time || 'Pendiente de confirmar']]) {
          const row = element('div');
          row.append(element('dt', '', name), element('dd', '', value));
          details.append(row);
        }
        article.append(details);
        const actions = element('div', 'event-actions');
        if (event.url) {
          const link = element('a', 'event-social', 'Ver información en Instagram ↗');
          link.href = event.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
          actions.append(link);
        }
        if (event.calendarUrl) {
          const save = element('a', 'calendar-save', 'Guardar fecha en mi calendario ↓');
          save.href = event.calendarUrl; save.download = event.id + '.ics';
          actions.append(save);
        }
        article.append(actions);
        return article;
      }
      function render() {
        const monthName = monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
        monthTitle.textContent = monthName;
        const dates = new Set(events.map(event => event.date));
        const fragment = document.createDocumentFragment();
        const cells = monthCells(year, month);
        for (let index = 0; index < cells.length; index += 7) {
          const row = element('tr');
          for (const date of cells.slice(index, index + 7)) {
            const cell = element('td');
            if (date) {
              const content = element(dates.has(date) ? 'button' : 'span', 'calendar-day', String(Number(date.slice(-2))));
              if (date === today) content.setAttribute('aria-current', 'date');
              if (dates.has(date)) {
                content.type = 'button'; content.dataset.calendarDate = date;
                content.classList.add('has-event');
                content.setAttribute('aria-label', labelDate(date) + ': ' + events.filter(event => event.date === date).map(event => upperVrs(event.title)).join(', '));
                content.setAttribute('aria-pressed', String(date === selectedDate));
              }
              cell.append(content);
            } else cell.className = 'calendar-empty';
            row.append(cell);
          }
          fragment.append(row);
        }
        table.replaceChildren(fragment);
        const monthEvents = eventsFor(events, year, month);
        status.textContent = monthEvents.length ? `${monthEvents.length} ${monthEvents.length === 1 ? 'quedada anunciada' : 'quedadas anunciadas'} en ${monthName}.` : `Sin quedadas anunciadas en ${monthName}.`;
        agendaTitle.textContent = selectedDate ? 'Quedada seleccionada' : 'Eventos de este mes';
        const shown = eventsFor(events, year, month, selectedDate);
        list.replaceChildren(...shown.map(eventCard));
        if (!shown.length) {
          list.append(element('p', 'calendar-no-events', 'Este mes no hay quedadas anunciadas. Las nuevas fechas aparecerán aquí cuando el club las confirme.'));
        }
      }
      root.querySelector('[data-calendar-prev]').addEventListener('click', () => { ({ year, month } = shiftMonth(year, month, -1)); selectedDate = null; render(); });
      root.querySelector('[data-calendar-next]').addEventListener('click', () => { ({ year, month } = shiftMonth(year, month, 1)); selectedDate = null; render(); });
      root.querySelector('[data-calendar-today]').addEventListener('click', () => { year = now.getFullYear(); month = now.getMonth() + 1; selectedDate = null; render(); });
      nextButton.disabled = !upcoming;
      nextButton.addEventListener('click', () => { if (!upcoming) return; year = Number(upcoming.date.slice(0, 4)); month = Number(upcoming.date.slice(5, 7)); selectedDate = upcoming.date; render(); });
      table.addEventListener('click', event => {
        const button = event.target.closest('[data-calendar-date]');
        if (!button || !table.contains(button)) return;
        selectedDate = button.dataset.calendarDate;
        render();
        table.querySelector(`[data-calendar-date="${selectedDate}"]`)?.focus({ preventScroll: true });
      });
      for (const selector of ['[data-calendar-prev]', '[data-calendar-next]', '[data-calendar-today]']) root.querySelector(selector).disabled = false;
      render();
    }
  }
}
