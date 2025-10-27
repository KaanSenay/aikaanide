// Test: AI bu dosyada test-project-context.js'deki fonksiyonları kullanmalı
// Her satırın sonunda bekleyin, AI diğer dosyadaki fonksiyonları önerecek

// Test 1: AI getUserById fonksiyonunu bilmeli
async function loadUser() {
  const user = await get
  // Bekleyin - AI "getUserById(123)" gibi bir şey önermeli
}

// Test 2: AI calculateTotal fonksiyonunu bilmeli
function processOrder(items) {
  const total = calc
  // Bekleyin - AI "calculateTotal(items)" önermeli
}

// Test 3: AI Product class'ını bilmeli
const laptop = new Pro
// Bekleyin - AI "Product('Laptop', 1500, 'Electronics')" önermeli

// Test 4: AI ShoppingCart class'ını bilmeli
const cart = new Shop
// Bekleyin - AI "ShoppingCart()" önermeli

// Test 5: AI createUser fonksiyonunu bilmeli
async function registerUser(data) {
  const newUser = await cre
  // Bekleyin - AI "createUser(data)" önermeli
}

// Test 6: AI calculateDiscount fonksiyonunu bilmeli
function applyDiscount(price) {
  const discount = calc
  // Bekleyin - AI "calculateDiscount(price, 10)" önermeli
}

// Test 7: AI API_BASE_URL değişkenini bilmeli
const apiUrl = API
// Bekleyin - AI "_BASE_URL" önermeli

// Test 8: AI ShoppingCart metodlarını bilmeli
const myCart = new ShoppingCart();
myCart.add
// Bekleyin - AI "Item(product, 2)" önermeli

// Test 9: AI Product metodlarını bilmeli
const product = new Product('Phone', 800, 'Electronics');
const discounted = product.get
// Bekleyin - AI "DiscountedPrice(20)" önermeli

// Test 10: AI tüm bağlamı kullanmalı
async function checkout() {
  const user = await getUserById(1);
  const cart = new ShoppingCart();
  cart.addItem(new Product('Laptop', 1500, 'Electronics'), 1);
  const total = 
  // Bekleyin - AI "calculateTotal(cart.items)" veya "cart.getTotal()" önermeli
}
