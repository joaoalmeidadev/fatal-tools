// Visão da acompanhante: Meu painel e Minha loja (Fatal Tools).
import { $, $$, formatPrice, escapeHtml, openSheet, closeSheet, showToast } from './ui.js';
import {
  addProduct, adjustStock, toggleVisibility, markDelivered, ordersToDeliver,
  shopSummary, companionPayout, TAKE_RATE, ShopError
} from './store.js';

const PRODUCT_SHEET = 'product-sheet';
const MENU_SHEET = 'menu-sheet';
const SCREENS = { dashboard: 'dashboard', shop: 'shop' };
const FORM_EMOJIS = ['💧', '🛡️', '🌿', '🕯️', '🎀', '✨', '🎁', '🍓'];
const FORM_CATEGORIES = ['Lubrificantes', 'Proteção', 'Massagem', 'Acessórios', 'Brinquedos', 'Kits'];
const TAKE_RATE_LABEL = `${Math.round(TAKE_RATE * 100)}%`;
const PERFORMANCE = { visits: '1.284', phoneClicks: '96' };

export function createCompanionView(store) {
  const view = { screen: SCREENS.dashboard, draft: { emoji: FORM_EMOJIS[0], category: FORM_CATEGORIES[0] } };

  const orderWord = (count) => (count === 1 ? 'pedido' : 'pedidos');

  // ---------- Meu painel ----------
  function renderDashboard() {
    const summary = shopSummary(store.getState());
    return `
      <div class="panel-card me-row">
        <div class="avatar-md" aria-hidden="true"></div>
        <div>
          <h1>Luna Martins <span class="verified-mark">✪</span></h1>
          <div class="status-line">“Agende já e se surpreenda!!!” <button class="link-btn" data-toast="Edição de status: disponível no site atual">Editar</button></div>
        </div>
      </div>
      <div class="panel-columns">
        <div class="panel-card">
          <h2>Desempenho <small class="status-line">últimos 7 dias</small></h2>
          <div class="stat-grid">
            <div class="stat"><small>Visitas no perfil</small><b>${PERFORMANCE.visits}</b></div>
            <div class="stat"><small>Cliques no telefone</small><b>${PERFORMANCE.phoneClicks}</b></div>
          </div>
        </div>
        <div class="panel-card tools-card">
          <h2>🛍️ Minha loja <span class="new-pill">NOVO</span></h2>
          <p><b>${summary.ordersToDeliver} ${orderWord(summary.ordersToDeliver)} para levar</b> no encontro · ${formatPrice(summary.toReceive)} a receber</p>
          <button class="primary-btn full" data-companion-nav="${SCREENS.shop}">Abrir Minha loja</button>
        </div>
      </div>`;
  }

  // ---------- Minha loja ----------
  function renderSummary() {
    const summary = shopSummary(store.getState());
    return `
      <div class="panel-card">
        <h2>Resumo do mês</h2>
        <div class="stat-grid three">
          <div class="stat"><small>Vendas</small><b>${formatPrice(summary.sales)}</b></div>
          <div class="stat"><small>A receber</small><b>${formatPrice(summary.toReceive)}</b><span class="hint">já sem a taxa de ${TAKE_RATE_LABEL}</span></div>
          <div class="stat"><small>Para levar</small><b>${summary.ordersToDeliver}</b><span class="hint">${orderWord(summary.ordersToDeliver)}</span></div>
        </div>
      </div>`;
  }

  function renderOrder(order) {
    return `
      <article class="order-item">
        <div class="order-head"><span>${escapeHtml(order.customer)}</span><span>${escapeHtml(order.meetingAt)}</span></div>
        <div class="order-items">${order.items.map((item) => escapeHtml(item.name)).join('<br>')}</div>
        <span class="meet-tag">🤝 Levar lacrado no encontro</span>
        <div class="order-foot">
          <span>Você recebe <b>${formatPrice(companionPayout(order.total))}</b></span>
          <button class="ghost-btn" data-deliver="${order.id}">Marcar como entregue</button>
        </div>
      </article>`;
  }

  function renderOrders() {
    const pending = ordersToDeliver(store.getState());
    return `
      <div class="panel-card">
        <h2>Pedidos para levar</h2>
        ${pending.length ? pending.map(renderOrder).join('') : '<p class="empty-note">Nenhum pedido para levar agora.</p>'}
      </div>`;
  }

  function renderProductRow(product) {
    const stockLabel = product.stock ? `${product.stock} em estoque` : '<span class="sold-out">Esgotado</span>';
    return `
      <div class="product-row">
        <div class="thumb-sm" style="background:${product.color}">${product.emoji}</div>
        <div class="product-info">
          <b>${escapeHtml(product.name)}</b>
          <small>${formatPrice(product.price)} · você recebe ${formatPrice(companionPayout(product.price))}</small><br>
          <small>${stockLabel}</small>
        </div>
        <div class="product-controls">
          <div class="stepper">
            <button data-stock-step="-1" data-product-id="${product.id}" aria-label="Diminuir estoque">−</button>
            <span>${product.stock}</span>
            <button data-stock-step="1" data-product-id="${product.id}" aria-label="Aumentar estoque">+</button>
          </div>
          <button class="switch" role="switch" aria-checked="${product.visible}" data-toggle-visibility="${product.id}">
            <span class="track"></span>${product.visible ? 'No perfil' : 'Oculto'}
          </button>
        </div>
      </div>`;
  }

  function renderProducts() {
    return `
      <div class="panel-card">
        <h2>Meus produtos <button class="ghost-btn" data-open-product-form>+ Cadastrar</button></h2>
        ${store.getState().products.map(renderProductRow).join('')}
      </div>`;
  }

  function renderShopScreen() {
    return `
      <nav class="crumbs"><button data-companion-nav="${SCREENS.dashboard}">Meu painel</button> › Minha loja</nav>
      <h1 class="page-title">Minha loja</h1>
      ${renderSummary()}
      <div class="panel-columns">${renderOrders()}${renderProducts()}</div>`;
  }

  // ---------- Cadastro ----------
  const choiceButtons = (attribute, options, selected, className = '') => options.map((option) =>
    `<button type="button" class="${className}" ${attribute}="${escapeHtml(option)}" aria-pressed="${option === selected}">${escapeHtml(option)}</button>`).join('');

  function renderProductForm() {
    $(`#${PRODUCT_SHEET}`).innerHTML = `
      <h3>Cadastrar produto <button type="button" data-close-sheet aria-label="Fechar">✕</button></h3>
      <form id="product-form" class="product-form" novalidate>
        <div class="field"><span>Foto</span><div class="emoji-pick">${choiceButtons('data-pick-emoji', FORM_EMOJIS, view.draft.emoji)}</div></div>
        <label class="field"><span>Nome</span><input type="text" name="name" maxlength="80" data-autofocus placeholder="Ex.: Gel de morango 30ml"><div class="field-error" data-error-for="name"></div></label>
        <div class="field"><span>Categoria</span><div class="pills">${choiceButtons('data-pick-category', FORM_CATEGORIES, view.draft.category, 'pill')}</div></div>
        <div class="field-row">
          <label class="field"><span>Preço (R$)</span><input type="number" name="price" min="0" step="0.01" inputmode="decimal"><div class="field-error" data-error-for="price"></div></label>
          <label class="field"><span>Quantidade</span><input type="number" name="stock" min="1" step="1" value="1" inputmode="numeric"><div class="field-error" data-error-for="stock"></div></label>
        </div>
        <div class="payout-box" id="payout-preview">${payoutText(0)}</div>
        <label class="check"><input type="checkbox" name="sealed"> Produto novo e lacrado</label>
        <div class="field-error" data-error-for="sealed"></div>
        <label class="check"><input type="checkbox" name="regulated"> Tem registro na ANVISA quando exigido</label>
        <div class="field-error" data-error-for="regulated"></div>
        <button type="submit" class="primary-btn full">Publicar na minha loja</button>
      </form>`;
  }

  function payoutText(price) {
    if (!(price > 0)) return `Você recebe o valor da venda menos a taxa de ${TAKE_RATE_LABEL}.`;
    return `Você recebe <b>${formatPrice(companionPayout(price))}</b> por unidade (taxa Fatal de ${TAKE_RATE_LABEL}).`;
  }

  function openProductForm() {
    renderProductForm();
    openSheet(PRODUCT_SHEET);
  }

  function pickChoice(button, attribute, draftKey) {
    view.draft[draftKey] = button.getAttribute(attribute);
    $$(`[${attribute}]`).forEach((option) => option.setAttribute('aria-pressed', option === button));
  }

  function readForm(form) {
    const data = new FormData(form);
    return {
      name: data.get('name'),
      price: data.get('price'),
      stock: data.get('stock'),
      sealed: data.has('sealed'),
      regulated: data.has('regulated'),
      emoji: view.draft.emoji,
      category: view.draft.category
    };
  }

  function showFieldErrors(fields) {
    $$('[data-error-for]').forEach((slot) => { slot.textContent = fields[slot.dataset.errorFor] ?? ''; });
  }

  function submitProduct(form) {
    try {
      store.update((state) => addProduct(state, readForm(form)));
      closeSheet();
      showToast('Produto publicado no seu perfil');
    } catch (error) {
      if (!(error instanceof ShopError)) throw error;
      showFieldErrors(error.fields);
    }
  }

  function handleSubmit(event) {
    if (event.target.id !== 'product-form') return;
    event.preventDefault();
    submitProduct(event.target);
  }

  function handleInput(event) {
    if (event.target.name !== 'price') return;
    $('#payout-preview').innerHTML = payoutText(Number(event.target.value));
  }

  // ---------- Navegação ----------
  function navigate(screen) {
    view.screen = screen;
    if (closeSheet() === MENU_SHEET) $('#menu-toggle').focus();
    render();
    $('#companion-viewport').scrollTop = 0;
  }

  function renderMenuState() {
    $$('#menu-sheet [data-companion-nav]').forEach((item) => {
      if (item.dataset.companionNav === view.screen) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function render() {
    $('#companion-main').innerHTML = view.screen === SCREENS.shop ? renderShopScreen() : renderDashboard();
    renderMenuState();
  }

  function reset() {
    view.screen = SCREENS.dashboard;
    view.draft = { emoji: FORM_EMOJIS[0], category: FORM_CATEGORIES[0] };
  }

  return {
    render,
    reset,
    handleSubmit,
    handleInput,
    clickHandlers: [
      ['data-companion-nav', (el) => navigate(el.dataset.companionNav)],
      ['data-open-menu', () => openSheet(MENU_SHEET)],
      ['data-open-product-form', () => openProductForm()],
      ['data-pick-emoji', (el) => pickChoice(el, 'data-pick-emoji', 'emoji')],
      ['data-pick-category', (el) => pickChoice(el, 'data-pick-category', 'category')],
      ['data-stock-step', (el) => store.update((state) => adjustStock(state, el.dataset.productId, Number(el.dataset.stockStep)))],
      ['data-toggle-visibility', (el) => store.update((state) => toggleVisibility(state, el.dataset.toggleVisibility))],
      ['data-deliver', (el) => {
        store.update((state) => markDelivered(state, el.dataset.deliver));
        showToast('Pedido marcado como entregue');
      }]
    ]
  };
}
