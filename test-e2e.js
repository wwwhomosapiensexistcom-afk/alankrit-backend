const API_URL = "https://alankrit-backend-production.up.railway.app/api";

async function run() {
  console.log("=== STARTING E2E API TEST ===");
  try {
    // 1. Admin Login
    console.log("1. Logging in as Admin...");
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@alankrit.com", password: "Admin@2025" })
    });
    const adminData = await adminRes.json();
    if (!adminData.token) throw new Error("Admin login failed: " + JSON.stringify(adminData));
    console.log("✅ Admin logged in successfully.");

    // 2. Fetch Products
    console.log("\n2. Fetching Products from Storefront...");
    const productsRes = await fetch(`${API_URL}/products`);
    const productsJson = await productsRes.json();
    const productsData = productsJson.data || [];
    
    if (productsData.length === 0) {
        console.log("⚠️ No products found. Checking if database is seeded.");
    } else {
        console.log(`✅ Found ${productsData.length} products. First product: ${productsData[0].name}`);
    }

    // 3. Customer Registration/Login
    console.log("\n3. Registering/Logging in test customer...");
    let customerToken;
    const testEmail = "test.shopper" + Date.now() + "@alankrit.com";
    const regRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Shopper", email: testEmail, phone: "999" + Math.floor(1000000 + Math.random() * 9000000).toString(), password: "Password123" })
    });
    const regData = await regRes.json();
    if (regData.token) {
        customerToken = regData.token;
        console.log("✅ Customer registered successfully.");
    } else {
        throw new Error("Customer registration failed: " + JSON.stringify(regData));
    }

    // 4. Create an Order
    if (productsData.length > 0) {
        console.log("\n4. Placing an order as customer...");
        const productId = productsData[0].id;
        const price = productsData[0].price;
        
        const orderPayload = {
            items: [{ productId, quantity: 1, price: price, size: "7" }],
            shippingAddress: {
                street: "123 Test Ave",
                city: "Test City",
                state: "Test State",
                pinCode: "123456",
                country: "India"
            },
            subtotal: price,
            shippingCost: 0,
            gstAmount: Math.round(price * 0.03),
            totalAmount: price + Math.round(price * 0.03)
        };

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${customerToken}`
            },
            body: JSON.stringify(orderPayload)
        });
        const orderData = await orderRes.json();
        if (orderRes.ok) {
            console.log(`✅ Order placed successfully! Order ID: ${orderData.data.id}`);
        } else {
            throw new Error("Order creation failed: " + JSON.stringify(orderData));
        }
    }

    console.log("\n🎉 ALL E2E API TESTS PASSED!");

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  }
}
run();
