// Estado compartilhado entre a visão do cliente e a da acompanhante.
// Funções puras: recebem um estado e devolvem um novo, sem mutar o anterior.

export const TAKE_RATE = 0.1;
export const STORAGE_KEY = 'fatal-tools:state';
export const ORDER_STATUS = { toDeliver: 'to_deliver', delivered: 'delivered' };

export class ShopError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ShopError';
    this.fields = fields;
  }
}

const SEED_PRODUCTS = [
  { id: 'lube', name: 'Gel lubrificante à base d’água 60ml', price: 39.9, stock: 8, emoji: '💧', color: '#e3f1fb', category: 'Lubrificantes' },
  { id: 'condoms', name: 'Preservativos ultrafinos (caixa c/ 12)', price: 29.9, stock: 10, emoji: '🛡️', color: '#eaf5e4', category: 'Proteção' },
  { id: 'oil', name: 'Óleo de massagem aromático 120ml', price: 54.9, stock: 4, emoji: '🌿', color: '#f5efe3', category: 'Massagem' },
  { id: 'candle', name: 'Vela de massagem baunilha', price: 64.9, stock: 3, emoji: '🕯️', color: '#fbf0e0', category: 'Massagem' },
  { id: 'blindfold', name: 'Venda de cetim para os olhos', price: 34.9, stock: 5, emoji: '🎀', color: '#f6e6eb', category: 'Acessórios' },
  { id: 'kit', name: 'Kit “Primeiro encontro” (gel + preservativos + óleo)', price: 109.9, stock: 6, emoji: '🎁', color: '#fbeef0', category: 'Kits', pick: true }
];

const PRODUCT_COLORS = ['#e3f1fb', '#eaf5e4', '#f5efe3', '#fbf0e0', '#f6e6eb', '#fbeef0'];

const roundMoney = (value) => Math.round(value * 100) / 100;

const orderItem = (product) => ({ productId: product.id, name: product.name, price: product.price });
const orderTotal = (items) => roundMoney(items.reduce((sum, item) => sum + item.price, 0));

// Prefixo próprio: nunca colide com os ids gerados por nextId.
function seedOrders(products) {
  const items = ['lube', 'blindfold'].map((id) => orderItem(products.find((product) => product.id === id)));
  return [{ id: 'seed-order-1', customer: 'Marcos', meetingAt: 'Hoje, 21:00', items, total: orderTotal(items), status: ORDER_STATUS.toDeliver }];
}

export function createSeedState() {
  const products = SEED_PRODUCTS.map((product) => ({ ...product, visible: true, pick: Boolean(product.pick) }));
  return { nextId: 1, products, orders: seedOrders(products) };
}

export const companionPayout = (amount) => roundMoney(amount * (1 - TAKE_RATE));

export function validateProductInput(input) {
  const fields = {};
  if (!String(input.name ?? '').trim()) fields.name = 'Dê um nome ao produto.';
  const price = roundMoney(Number(input.price));
  if (!(Number.isFinite(price) && price > 0)) fields.price = 'Informe um preço maior que zero.';
  if (!(Number.isInteger(Number(input.stock)) && Number(input.stock) >= 1)) fields.stock = 'Informe ao menos 1 unidade.';
  if (!input.sealed) fields.sealed = 'Confirme que o produto é novo e lacrado.';
  if (!input.regulated) fields.regulated = 'Confirme o registro na ANVISA quando exigido.';
  return fields;
}

export function addProduct(state, input) {
  const fields = validateProductInput(input);
  if (Object.keys(fields).length) throw new ShopError('Produto inválido', fields);
  const product = {
    id: `product-${state.nextId}`,
    name: String(input.name).trim(),
    price: roundMoney(Number(input.price)),
    stock: Number(input.stock),
    emoji: input.emoji,
    color: PRODUCT_COLORS[state.nextId % PRODUCT_COLORS.length],
    category: input.category,
    visible: true,
    pick: false
  };
  return { ...state, nextId: state.nextId + 1, products: [...state.products, product] };
}

const updateProduct = (state, productId, change) => ({
  ...state,
  products: state.products.map((product) => (product.id === productId ? { ...product, ...change(product) } : product))
});

export const adjustStock = (state, productId, delta) =>
  updateProduct(state, productId, (product) => ({ stock: Math.max(0, product.stock + delta) }));

export const toggleVisibility = (state, productId) =>
  updateProduct(state, productId, (product) => ({ visible: !product.visible }));

export const visibleShopProducts = (state) => state.products.filter((product) => product.visible);

export const findProduct = (state, productId) => state.products.find((product) => product.id === productId);

function orderableProduct(state, productId) {
  const product = findProduct(state, productId);
  if (!product || !product.visible) throw new ShopError('Produto indisponível');
  if (product.stock < 1) throw new ShopError(`${product.name} esgotou`);
  return product;
}

export function placeOrder(state, productIds, { customer, meetingAt = 'A combinar' }) {
  if (!productIds.length) throw new ShopError('O kit está vazio');
  if (new Set(productIds).size !== productIds.length) throw new ShopError('Cada item entra uma vez no kit');
  const items = productIds.map((id) => orderItem(orderableProduct(state, id)));
  const order = { id: `order-${state.nextId}`, customer, meetingAt, items, total: orderTotal(items), status: ORDER_STATUS.toDeliver };
  const withStock = productIds.reduce((current, id) => adjustStock(current, id, -1), state);
  return { ...withStock, nextId: state.nextId + 1, orders: [...state.orders, order] };
}

export const markDelivered = (state, orderId) => ({
  ...state,
  orders: state.orders.map((order) => (order.id === orderId ? { ...order, status: ORDER_STATUS.delivered } : order))
});

export const ordersToDeliver = (state) => state.orders.filter((order) => order.status === ORDER_STATUS.toDeliver);

export function shopSummary(state) {
  const sales = roundMoney(state.orders.reduce((sum, order) => sum + order.total, 0));
  return { sales, toReceive: companionPayout(sales), ordersToDeliver: ordersToDeliver(state).length };
}

// ---------- Persistência ----------

function loadState(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (saved && Number.isInteger(saved.nextId) && Array.isArray(saved.products) && Array.isArray(saved.orders)) return saved;
  } catch (error) { /* storage bloqueado ou JSON corrompido: começa do seed */ }
  return createSeedState();
}

function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* sem storage: segue só em memória */ }
}

export function createStore({ storage }) {
  let state = loadState(storage);
  const listeners = new Set();
  const commit = (next) => {
    state = next;
    saveState(storage, state);
    listeners.forEach((listener) => listener(state));
  };
  return {
    getState: () => state,
    update: (change) => commit(change(state)),
    reset: () => commit(createSeedState()),
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); }
  };
}
