// Visão do cliente: perfil público da acompanhante com a aba Tools (loja dela) e o kit.
import { $, $$, formatPrice, escapeHtml, openSheet, isSheetOpen } from './ui.js';
import { visibleShopProducts, findProduct, placeOrder, ShopError } from './store.js';

const CART_SHEET = 'cart-sheet';
const HEADER_HEIGHT = 60;
const ALL_CATEGORIES = 'Todos';
const DEMO_CUSTOMER = { customer: 'Cliente da demo', meetingAt: 'Hoje, 22:00' };

const REVIEWS = [
  { title: 'Maravilhosa', when: 'há 3 dias', who: 'Rafa', since: '1 ano na Fatal Model', text: 'Super educada e pontual. O kit chegou lacrado, achei muito cuidadoso.' },
  { title: 'Inesquecível', when: 'há 2 semanas', who: 'Marcos', since: '4 meses na Fatal Model', text: 'Ambiente limpo e tranquilo, conversa ótima.' },
  { title: 'Recomendo', when: 'há 1 mês', who: 'Thiago', since: '2 anos na Fatal Model', text: 'Tudo exatamente como nas fotos.' }
];

const GALLERY_COLORS = ['#8c6f78', '#5d4a55', '#b49a96', '#7b6670', '#a1868a', '#6a5560', '#9a7f86', '#4f3f49', '#c2aaa5'];

export function createClientView(store) {
  const view = { tab: 'photos', category: ALL_CATEGORIES, cart: [], checkedOut: false, error: null };

  const shopProducts = () => visibleShopProducts(store.getState());
  const isOrderable = (product) => product && product.visible && product.stock > 0;
  const cartProducts = () => view.cart.map((id) => findProduct(store.getState(), id));
  const cartTotal = () => cartProducts().reduce((sum, product) => sum + product.price, 0);

  // A acompanhante pode ocultar ou zerar um item que já está no kit.
  function pruneCart() {
    view.cart = view.cart.filter((id) => isOrderable(findProduct(store.getState(), id)));
  }

  // ---------- Perfil estático ----------
  function renderStaticSections() {
    $('#review-chips').innerHTML = REVIEWS.map((review) => `
      <div class="review-chip"><span class="stars">★ 5.0</span> <small>${review.when}</small><br>${review.title}</div>`).join('')
      + '<button class="review-more" data-goto-tab="reviews">Ler avaliações</button>';
    $('#gallery').innerHTML = GALLERY_COLORS.map((color, index) => `
      <div class="gallery-tile" style="background:${color}">${index < 3 ? '<span class="pin">📌</span>' : ''}▶</div>`).join('');
    $('#review-list').innerHTML = REVIEWS.map((review) => `
      <article class="review-card">
        <div class="who">${review.who}<small>${review.since}</small></div>
        <div class="rating">★★★★★ Muito satisfeito · ${review.title}</div>
        <div>${review.text}</div>
      </article>`).join('');
  }

  // ---------- Abas ----------
  const tabs = () => [
    { id: 'photos', label: 'Fotos e vídeos', count: 148 },
    { id: 'about', label: 'Sobre mim' },
    { id: 'shop', label: 'Tools', count: shopProducts().length, isNew: true },
    { id: 'reviews', label: 'Avaliações', count: 87 }
  ];

  function renderTabs() {
    $('#profile-tabs').innerHTML = tabs().map((tab) => `
      <button class="profile-tab" role="tab" data-goto-tab="${tab.id}" aria-selected="${tab.id === view.tab}">
        ${tab.label}${tab.count ? `<span class="count">(${tab.count})</span>` : ''}${tab.isNew ? '<span class="new-dot"></span>' : ''}
      </button>`).join('');
    $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== view.tab; });
  }

  // Mede pela âncora fixa: o offsetTop das abas sticky muda quando elas grudam no topo.
  const tabsScrollTop = () => $('#tabs-anchor').offsetTop - HEADER_HEIGHT;

  function selectTab(tabId) {
    view.tab = tabId;
    renderTabs();
    const viewport = $('#client-viewport');
    if (viewport.scrollTop > tabsScrollTop()) viewport.scrollTop = tabsScrollTop();
  }

  function goToShop() {
    selectTab('shop');
    $('#client-viewport').scrollTo({ top: tabsScrollTop(), behavior: 'smooth' });
  }

  // ---------- Loja ----------
  const categories = () => [ALL_CATEGORIES, ...new Set(shopProducts().map((product) => product.category))];
  const filteredProducts = () => shopProducts().filter((product) => view.category === ALL_CATEGORIES || product.category === view.category);

  function renderAddButton(product) {
    if (product.stock < 1) return '<button class="add-btn" disabled>Esgotado</button>';
    const inCart = view.cart.includes(product.id);
    return `<button class="add-btn ${inCart ? 'added' : ''}" data-toggle-product="${product.id}">${inCart ? '✓ No kit' : '+ Adicionar ao kit'}</button>`;
  }

  function renderProductCard(product) {
    return `
      <article class="product">
        <div class="thumb" style="background:${product.color}">${product.emoji}${product.pick ? '<span class="pick">★ Escolha da Luna</span>' : ''}</div>
        <div class="body">
          <h4>${escapeHtml(product.name)}</h4>
          <span class="price">${formatPrice(product.price)}</span>
          <span class="meet-tag">🤝 Ela leva no encontro</span>
          <span class="seller">Vendido pela Luna</span>
          ${renderAddButton(product)}
        </div>
      </article>`;
  }

  function renderShop() {
    if (!categories().includes(view.category)) view.category = ALL_CATEGORIES;
    $('#shop-filters').innerHTML = categories().map((category) =>
      `<button class="pill" data-category="${escapeHtml(category)}" aria-pressed="${category === view.category}">${escapeHtml(category)}</button>`).join('');
    $('#shop-grid').innerHTML = filteredProducts().map(renderProductCard).join('');
  }

  function toggleProduct(productId) {
    view.cart = view.cart.includes(productId) ? view.cart.filter((id) => id !== productId) : [...view.cart, productId];
    view.error = null;
    render();
  }

  // ---------- Kit ----------
  function renderCartCount() {
    $$('[data-cart-count]').forEach((badge) => {
      badge.hidden = view.cart.length === 0;
      badge.textContent = view.cart.length;
    });
    const kitButton = $('#kit-fab');
    kitButton.hidden = view.cart.length === 0;
    kitButton.textContent = `🛍️ Ver kit (${view.cart.length}) · ${formatPrice(cartTotal())}`;
  }

  const cartHeader = () => '<h3>Seu kit <button data-close-sheet aria-label="Fechar">✕</button></h3>';

  function renderCartItems() {
    return cartProducts().map((product) => `
      <div class="cart-line">
        <span>${escapeHtml(product.name)}<small>Vendido pela Luna · <button class="remove" data-toggle-product="${product.id}">remover</button></small></span>
        <b>${formatPrice(product.price)}</b>
      </div>`).join('');
  }

  function renderCart() {
    const sheet = $(`#${CART_SHEET}`);
    if (view.checkedOut) {
      sheet.innerHTML = `
        <div class="cart-done"><div class="big">✅</div><h4>Pedido confirmado</h4>
          <p>A Luna foi avisada e vai levar seu kit lacrado no encontro.<br>Na fatura aparece apenas <b>“FM SERVICOS DIGITAIS”</b>.</p>
          <button class="pay-btn" data-close-sheet>Voltar ao perfil</button></div>`;
      return;
    }
    if (!view.cart.length) {
      sheet.innerHTML = `${cartHeader()}<p class="cart-empty">Seu kit está vazio.<br>Escolha produtos na aba Tools.</p>
        <button class="pay-btn" data-close-sheet data-goto-shop>Ver loja</button>`;
      return;
    }
    sheet.innerHTML = `
      ${cartHeader()}
      ${renderCartItems()}
      <div class="delivery-box"><span>🤝</span><span><b>Ela leva no encontro</b><br>Os produtos chegam lacrados, entregues pela Luna no dia combinado.</span></div>
      <div class="cart-total"><span>Total dos produtos</span><span>${formatPrice(cartTotal())}</span></div>
      <div class="legal-note">⚖️ Este pagamento é <b>só dos produtos</b>. Valores e detalhes do atendimento são combinados direto com a Luna.</div>
      ${view.error ? `<p class="cart-error">${escapeHtml(view.error)}</p>` : ''}
      <button class="pay-btn" data-checkout>Pagar com Pix</button>`;
  }

  function openCart() {
    renderCart();
    openSheet(CART_SHEET);
  }

  function checkoutCart() {
    try {
      const next = placeOrder(store.getState(), view.cart, DEMO_CUSTOMER);
      view.checkedOut = true;
      store.update(() => next);
    } catch (error) {
      if (!(error instanceof ShopError)) throw error;
      view.error = error.message;
      renderCart();
    }
  }

  function onSheetClosed(sheetId) {
    if (sheetId !== CART_SHEET || !view.checkedOut) return;
    view.checkedOut = false;
    view.cart = [];
    render();
  }

  function reset() {
    Object.assign(view, { tab: 'photos', category: ALL_CATEGORIES, cart: [], checkedOut: false, error: null });
  }

  function render() {
    pruneCart();
    renderTabs();
    renderShop();
    renderCartCount();
    if (isSheetOpen(CART_SHEET)) renderCart();
  }

  renderStaticSections();

  return {
    render,
    reset,
    onSheetClosed,
    clickHandlers: [
      ['data-toggle-product', (el) => toggleProduct(el.dataset.toggleProduct)],
      ['data-category', (el) => { view.category = el.dataset.category; renderShop(); }],
      ['data-goto-tab', (el) => selectTab(el.dataset.gotoTab)],
      ['data-checkout', () => checkoutCart()],
      ['data-open-cart', () => openCart()],
      ['data-goto-shop', () => goToShop()]
    ]
  };
}
