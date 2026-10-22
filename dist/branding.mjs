// Mantiene la marca también en los textos que generan la agenda y el mercadillo.
export function upperVrs(value) {
  return String(value ?? '').replace(/\bvrs\b/gi, 'VRS');
}

export function setVrsText(node, value) {
  const text = String(value ?? '');
  const parts = text.split(/(\bvrs\b)/gi);
  if (parts.length === 1 || ['OPTION', 'TITLE', 'TEXTAREA', 'SCRIPT', 'STYLE'].includes(node.tagName)) {
    node.textContent = upperVrs(text);
    return;
  }
  const wrapper = document.createElement('span');
  wrapper.className = 'vrs-text';
  for (const part of parts) {
    if (/^vrs$/i.test(part)) {
      const mark = document.createElement('span');
      mark.className = 'vrs-mark';
      const initial = document.createElement('span');
      initial.className = 'vrs-v';
      initial.textContent = 'V';
      mark.append(initial, document.createTextNode('RS'));
      wrapper.append(mark);
    } else if (part) wrapper.append(document.createTextNode(part));
  }
  node.replaceChildren(wrapper);
}
