// Liga as duas visões ao store e ao seletor do apresentador.
import { $$, closeSheet, showToast } from './ui.js';
import { createStore } from './store.js';
import { createClientView } from './client-view.js';
import { createCompanionView } from './companion-view.js';

// Cada grupo de botões do seletor: classe no body, atributo do botão, opções e chave salva.
const CHOICES = {
  mode: { prefix: 'view', attribute: 'data-mode', options: ['mobile', 'desktop'], key: 'fatal-tools:view-mode' },
  role: { prefix: 'role', attribute: 'data-role', options: ['client', 'companion'], key: 'fatal-tools:role' }
};

const browserStorage = (() => {
  try { return window.localStorage; } catch (error) { return null; }
})();

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
};

const storage = browserStorage ?? memoryStorage();
const store = createStore({ storage });
const client = createClientView(store);
const companion = createCompanionView(store);

function readPreference({ key, options }) {
  try {
    const saved = storage.getItem(key);
    return options.includes(saved) ? saved : options[0];
  } catch (error) { return options[0]; }
}

function applyChoice({ prefix, attribute, options, key }, value) {
  options.forEach((option) => document.body.classList.toggle(`${prefix}-${option}`, option === value));
  $$(`[${attribute}]`).forEach((button) => button.setAttribute('aria-pressed', button.getAttribute(attribute) === value));
  try { storage.setItem(key, value); } catch (error) { /* sem storage: só não lembra */ }
}

const setViewMode = (mode) => applyChoice(CHOICES.mode, mode);

// Fecha pelo caminho que avisa a visão do cliente, para a confirmação do Pix não ficar presa.
function setRole(role) {
  closeOpenSheet();
  applyChoice(CHOICES.role, role);
}

function resetDemo() {
  closeSheet();
  client.reset();
  companion.reset();
  store.reset();
  showToast('Demo reiniciada');
}

function closeOpenSheet() {
  client.onSheetClosed(closeSheet());
}

const CLICK_HANDLERS = [
  ['data-mode', (el) => setViewMode(el.dataset.mode)],
  ['data-role', (el) => setRole(el.dataset.role)],
  ['data-reset-demo', () => resetDemo()],
  ['data-toast', (el) => showToast(el.dataset.toast)],
  ...client.clickHandlers,
  ...companion.clickHandlers,
  ['data-close-sheet', () => closeOpenSheet()]
];

document.addEventListener('click', (event) => {
  if (event.target.closest('a[href="#"]')) event.preventDefault();
  const element = event.target.closest('button, [data-close-sheet]');
  if (!element) return;
  CLICK_HANDLERS
    .filter(([attribute]) => element.hasAttribute(attribute))
    .forEach(([, handler]) => handler(element));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeOpenSheet();
});

document.addEventListener('submit', (event) => companion.handleSubmit(event));
document.addEventListener('input', (event) => companion.handleInput(event));

store.subscribe(() => {
  client.render();
  companion.render();
});

setViewMode(readPreference(CHOICES.mode));
setRole(readPreference(CHOICES.role));
client.render();
companion.render();
