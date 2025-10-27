// Test Project Context Awareness
// Bu dosyada tanımlanan fonksiyonlar diğer dosyalarda kullanılabilir

// Fonksiyon 1: User işlemleri
function getUserById(userId) {
  return fetch(`/api/users/${userId}`).then(res => res.json());
}

function createUser(userData) {
  return fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }).then(res => res.json());
}

function deleteUser(userId) {
  return fetch(`/api/users/${userId}`, { method: 'DELETE' });
}

// Fonksiyon 2: Hesaplama işlemleri
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function calculateDiscount(total, percentage) {
  return total * (percentage / 100);
}

function calculateTax(amount, taxRate = 0.18) {
  return amount * taxRate;
}

// Class: Product
class Product {
  constructor(name, price, category) {
    this.name = name;
    this.price = price;
    this.category = category;
  }

  getDiscountedPrice(discount) {
    return this.price - (this.price * discount / 100);
  }

  isExpensive() {
    return this.price > 1000;
  }
}

// Class: ShoppingCart
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(product, quantity = 1) {
    this.items.push({ product, quantity });
  }

  removeItem(productName) {
    this.items = this.items.filter(item => item.product.name !== productName);
  }

  getTotal() {
    return this.items.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
  }
}

// Variables
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_CURRENCY = 'USD';
const TAX_RATE = 0.18;

// Export
export { getUserById, createUser, deleteUser, Product, ShoppingCart };
