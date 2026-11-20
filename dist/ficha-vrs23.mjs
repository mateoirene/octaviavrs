function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const status = document.querySelector('[data-profile-status]');
try {
  const response = await fetch('/api/garage/members?member=be298a66-8b6d-4a66-bda5-4aacd25df854', {credentials:'omit'});
  if (!response.ok) throw Error(response.status === 404 ? 'Ficha no disponible.' : 'No se pudo cargar la ficha.');
  const [member] = await response.json();
  const card = element('article', '', 'garage-member');
  const photos = element('div', '', 'garage-member-photos');
  for (const [index, source] of member.images.entries()) {
    const link = element('a');
    link.href = source;
    link.style.gridColumn = index === 0 ? '1 / -1' : 'auto';
    const photo = element('img', '', 'garage-member-photo-main');
    photo.src = source;
    photo.alt = 'Foto ' + (index + 1) + ' del ' + member.model;
    photo.loading = 'lazy';
    link.append(photo);
    photos.append(link);
  }
  const body = element('div', '', 'garage-member-body');
  const identity = element('section', '', 'garage-membership');
  if (member.profileImage) {
    const avatar = element('img', '', 'garage-pilot-avatar');
    avatar.src = member.profileImage;
    avatar.alt = 'Foto de perfil de ' + member.pilot;
    identity.append(avatar);
  }
  identity.append(element('h3', member.pilot), element('p', member.model, 'garage-model'),
    element('strong', member.membershipNumber));
  const specs = element('dl', '', 'garage-specs');
  for (const [label, value] of [['Motor',member.engine],['Potencia',member.power],['Año',member.year],['Cambio',member.gearbox]]) {
    if (!value) continue;
    const field = element('div');
    field.append(element('dt', label), element('dd', value));
    specs.append(field);
  }
  body.append(identity, specs);
  if (member.notes) body.append(element('h4', 'Modificaciones'), element('p', member.notes, 'garage-member-notes'));
  card.append(photos, body);
  document.querySelector('[data-members]').append(card);
  status.textContent = '';
} catch (error) {
  status.textContent = error instanceof Error ? error.message : 'No se pudo cargar la ficha.';
}
