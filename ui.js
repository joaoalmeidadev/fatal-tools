// Helpers de interface compartilhados pelas duas visões.

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

export const formatPrice = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// ---------- Sheets: só um aberto por vez ----------
let openSheetId = null;

export const isSheetOpen = (sheetId) => openSheetId === sheetId;

export function openSheet(sheetId) {
  if (openSheetId) closeSheet();
  openSheetId = sheetId;
  $('#device').classList.add('sheet-open');
  const sheet = document.getElementById(sheetId);
  sheet.classList.add('is-open');
  sheet.inert = false;
  $('.sheet-backdrop').inert = false;
  // preventScroll: o #device tem overflow:hidden e o navegador o rolaria até o sheet ainda fora da tela.
  (sheet.querySelector('[data-autofocus]') ?? sheet.querySelector('button, input'))?.focus({ preventScroll: true });
}

export function closeSheet() {
  if (!openSheetId) return null;
  const closedId = openSheetId;
  const sheet = document.getElementById(closedId);
  sheet.classList.remove('is-open');
  sheet.inert = true;
  $('.sheet-backdrop').inert = true;
  $('#device').classList.remove('sheet-open');
  $('#device').scrollTop = 0;
  openSheetId = null;
  return closedId;
}

// ---------- Toast ----------
let toastTimer = null;

export function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}
