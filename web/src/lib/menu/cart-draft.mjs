/**
 * MenuMini Cart & Integer ETB Cents Money Arithmetic
 */

export function toEtbCents(amount) {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  return parseInt(String(amount), 10) || 0;
}

export function formatEtb(cents) {
  const safeCents = Math.round(cents || 0);
  const etb = (safeCents / 100).toFixed(2);
  return `${etb} ETB`;
}

export class DiningCart {
  constructor(venueSlug) {
    this.venueSlug = venueSlug;
    this.items = [];
  }

  addItem(dish, modifiers = [], quantity = 1) {
    const dishPriceCents = dish.price_etb_cents || Math.round((dish.price || 0) * 100);
    let modTotalCents = 0;
    for (const mod of modifiers) {
      modTotalCents += mod.price_delta_cents || mod.price_cents || 0;
    }
    const unitPriceCents = dishPriceCents + modTotalCents;

    const existing = this.items.find(i => 
      i.id === dish.id && JSON.stringify(i.modifiers) === JSON.stringify(modifiers)
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: dish.id || dish.name_en,
        name: dish.name_en || dish.name,
        name_am: dish.name_am,
        price_etb_cents: unitPriceCents,
        unit_price_cents: unitPriceCents,
        modifiers,
        quantity,
      });
    }
  }

  decrementItem(index) {
    if (this.items[index]) {
      this.items[index].quantity -= 1;
      if (this.items[index].quantity <= 0) {
        this.items.splice(index, 1);
      }
    }
  }

  removeItem(index) {
    if (this.items[index]) {
      this.items.splice(index, 1);
    }
  }

  clear() {
    this.items = [];
  }

  getTotalCents() {
    let total = 0;
    for (const item of this.items) {
      total += (item.unit_price_cents || item.price_etb_cents) * item.quantity;
    }
    return total;
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getStorageKey() {
    return `menumini_cart_${this.venueSlug}`;
  }
}
