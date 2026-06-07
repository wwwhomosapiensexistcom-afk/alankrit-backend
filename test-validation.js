async function test() {
  console.log('--- Testing POST /api/discounts/validate ---');

  const scenarios = [
    { name: '1. Valid coupon, total >= minOrderValue', body: { code: 'SAVE10', total: 10000 } },
    { name: '2. Valid coupon, total < minOrderValue', body: { code: 'SAVE10', total: 3000 } },
    { name: '3. Invalid coupon code', body: { code: 'DUMMYCOUPON', total: 10000 } }
  ];

  for (const s of scenarios) {
    console.log(`\nScenario: ${s.name}`);
    try {
      const res = await fetch('http://localhost:3001/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s.body)
      });
      const data = await res.json();
      console.log('Status:', res.status);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  }
}
test();
