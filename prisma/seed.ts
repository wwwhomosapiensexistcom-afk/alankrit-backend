import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- Shared sample data (mirrors frontend sample data) ---

type ProductCategory = 'Rings' | 'Necklaces' | 'Earrings' | 'Bracelets';

type ProductInput = {
  id: string;
  name: string;
  price: number; // in INR rupees (same as frontend sample)
  category: ProductCategory;
  material: string;
  description: string;
  images: string[];
  inStock: boolean;
  sku: string;
};

const products: ProductInput[] = [
  {
    id: 'minimalist-gold-band',
    name: 'Minimalist Gold Band',
    price: 129,
    category: 'Rings',
    material: 'Premium 9K Gold',
    description:
      'A slim, unadorned gold band designed for everyday wear. Understated yet precise, ideal for quiet statements and subtle stacking.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-RING-001',
  },
  {
    id: 'sculpted-gold-signet',
    name: 'Sculpted Gold Signet',
    price: 249,
    category: 'Rings',
    material: 'Premium 9K Gold',
    description:
      'A low-profile signet ring with clean planes and softened edges. Designed to sit close to the hand for a refined, architectural look.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-RING-002',
  },
  {
    id: 'twisted-gold-necklace',
    name: 'Twisted Gold Necklace',
    price: 289,
    category: 'Necklaces',
    material: 'Premium 9K Gold',
    description:
      'A fine gold chain with a subtle twisted profile that catches light without excess shine. Quietly intricate, designed for layering or solo wear.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-NECK-001',
  },
  {
    id: 'parallel-bar-necklace',
    name: 'Parallel Bar Necklace',
    price: 319,
    category: 'Necklaces',
    material: 'Premium 9K Gold',
    description:
      'Two parallel gold bars suspended on a fine chain create a balanced, linear silhouette. A precise focal point above clean tailoring.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-NECK-002',
  },
  {
    id: 'arc-drop-earrings',
    name: 'Arc Drop Earrings',
    price: 189,
    category: 'Earrings',
    material: 'Premium 9K Gold',
    description:
      'Delicate arc-shaped drops that frame the jawline with a clean, continuous line. Lightweight and engineered for all-day wear.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-EARR-001',
  },
  {
    id: 'linear-stud-set',
    name: 'Linear Gold Stud Set',
    price: 149,
    category: 'Earrings',
    material: 'Premium 9K Gold',
    description:
      'A set of linear gold studs in varying lengths for asymmetrical pairings. Designed for precise placement and minimal visual noise.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-EARR-002',
  },
  {
    id: 'contour-cuff-bracelet',
    name: 'Contour Cuff Bracelet',
    price: 279,
    category: 'Bracelets',
    material: 'Premium 9K Gold',
    description:
      'An open cuff with a gentle contour that follows the wrist. The profile stays slim and architectural, catching light along a single edge.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-BRAC-001',
  },
  {
    id: 'offset-chain-bracelet',
    name: 'Offset Chain Bracelet',
    price: 219,
    category: 'Bracelets',
    material: 'Premium 9K Gold',
    description:
      'A sequence of offset rectangular links that read as a continuous line from a distance. Subtle movement with a distinctly modern rhythm.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-BRAC-002',
  },
  {
    id: 'stackable-gold-rings-set',
    name: 'Stackable Gold Rings Set',
    price: 199,
    category: 'Rings',
    material: 'Premium 9K Gold',
    description:
      'A trio of ultra-slim bands with slightly varied profiles. Wear singly for restraint or stack for a bolder monochrome presence.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-RING-003',
  },
  {
    id: 'orbit-pendant-necklace',
    name: 'Orbit Pendant Necklace',
    price: 309,
    category: 'Necklaces',
    material: 'Premium 9K Gold',
    description:
      'A circular pendant suspended within a fine open frame. The negative space is as considered as the gold itself, echoing orbital paths.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: false,
    sku: 'AR-NECK-003',
  },
  {
    id: 'column-drop-earrings',
    name: 'Column Drop Earrings',
    price: 229,
    category: 'Earrings',
    material: 'Premium 9K Gold',
    description:
      'Elongated gold columns that hang with precise verticality. Engineered backings keep the profile parallel to the jawline.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-EARR-003',
  },
  {
    id: 'hinged-gold-bangle',
    name: 'Hinged Gold Bangle',
    price: 339,
    category: 'Bracelets',
    material: 'Premium 9K Gold',
    description:
      'A slim hinged bangle that opens along a near-invisible seam. Designed to sit close to the wrist with a clean, uninterrupted surface.',
    images: [
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
      'https://picsum.photos/seed/x3hurxo/900/900',
    ],
    inStock: true,
    sku: 'AR-BRAC-003',
  },
];

// Inventory base data (matches frontend inventory-store)

const baseQuantities: number[] = [18, 24, 15, 12, 20, 28, 10, 14, 8, 16, 22, 9];
const defaultWeights: number[] = [
  8.5, 11.2, 9.8, 10.4, 6.2, 5.8, 13.1, 12.4, 7.9, 10.9, 14.5, 11.8,
];

// Customers base data (mirrors frontend customers.ts baseCustomers)

type AddressInput = {
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
};

type BaseCustomerInput = {
  id: string;
  name: string;
  email: string;
  phoneDigits: string;
  addresses: AddressInput[];
  joinDate: string;
};

const makePhone = (digits: string): string => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

const addr = (overrides: Partial<AddressInput>): AddressInput => ({
  street: 'Flat 12, Minimal Tower',
  city: 'Mumbai',
  state: 'Maharashtra',
  pinCode: '400001',
  country: 'India',
  ...overrides,
});

const baseCustomers: BaseCustomerInput[] = [
  {
    id: 'cust-rajesh-kumar',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@gmail.com',
    phoneDigits: '9876543210',
    addresses: [addr({ city: 'Mumbai', state: 'Maharashtra', pinCode: '400001' })],
    joinDate: '2025-01-15T10:15:00.000Z',
  },
  {
    id: 'cust-priya-sharma',
    name: 'Priya Sharma',
    email: 'priya.sharma@yahoo.co.in',
    phoneDigits: '9123456780',
    addresses: [
      addr({ city: 'Delhi', state: 'Delhi', pinCode: '110001' }),
      addr({
        street: 'Sector 21, Office Tower',
        city: 'Gurgaon',
        state: 'Haryana',
        pinCode: '122001',
      }),
    ],
    joinDate: '2025-02-02T09:30:00.000Z',
  },
  {
    id: 'cust-arjun-patel',
    name: 'Arjun Patel',
    email: 'arjun.patel@outlook.com',
    phoneDigits: '9812345678',
    addresses: [addr({ city: 'Ahmedabad', state: 'Gujarat', pinCode: '380001' })],
    joinDate: '2024-12-10T14:45:00.000Z',
  },
  {
    id: 'cust-meera-iyer',
    name: 'Meera Iyer',
    email: 'meera.iyer@gmail.com',
    phoneDigits: '9898989898',
    addresses: [addr({ city: 'Chennai', state: 'Tamil Nadu', pinCode: '600001' })],
    joinDate: '2025-03-05T11:05:00.000Z',
  },
  {
    id: 'cust-vikram-singh',
    name: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    phoneDigits: '9876012345',
    addresses: [addr({ city: 'Bangalore', state: 'Karnataka', pinCode: '560001' })],
    joinDate: '2024-11-22T16:20:00.000Z',
  },
  {
    id: 'cust-ananya-reddy',
    name: 'Ananya Reddy',
    email: 'ananya.reddy@yahoo.co.in',
    phoneDigits: '9823456712',
    addresses: [addr({ city: 'Hyderabad', state: 'Telangana', pinCode: '500001' })],
    joinDate: '2025-04-12T12:10:00.000Z',
  },
  {
    id: 'cust-rahul-verma',
    name: 'Rahul Verma',
    email: 'rahul.verma@gmail.com',
    phoneDigits: '9765432109',
    addresses: [addr({ city: 'Pune', state: 'Maharashtra', pinCode: '411001' })],
    joinDate: '2025-05-01T08:40:00.000Z',
  },
  {
    id: 'cust-kavya-nair',
    name: 'Kavya Nair',
    email: 'kavya.nair@gmail.com',
    phoneDigits: '9988776655',
    addresses: [addr({ city: 'Kochi', state: 'Kerala', pinCode: '682001' })],
    joinDate: '2024-10-25T10:00:00.000Z',
  },
  {
    id: 'cust-sanjay-gupta',
    name: 'Sanjay Gupta',
    email: 'sanjay.gupta@outlook.com',
    phoneDigits: '9911223344',
    addresses: [addr({ city: 'Kolkata', state: 'West Bengal', pinCode: '700001' })],
    joinDate: '2024-09-18T13:20:00.000Z',
  },
  {
    id: 'cust-nisha-menon',
    name: 'Nisha Menon',
    email: 'nisha.menon@gmail.com',
    phoneDigits: '9845012345',
    addresses: [addr({ city: 'Bangalore', state: 'Karnataka', pinCode: '560002' })],
    joinDate: '2025-01-02T09:10:00.000Z',
  },
  {
    id: 'cust-siddharth-jain',
    name: 'Siddharth Jain',
    email: 'sid.jain@yahoo.co.in',
    phoneDigits: '9753124680',
    addresses: [addr({ city: 'Jaipur', state: 'Rajasthan', pinCode: '302001' })],
    joinDate: '2024-08-14T15:35:00.000Z',
  },
  {
    id: 'cust-isha-chopra',
    name: 'Isha Chopra',
    email: 'isha.chopra@gmail.com',
    phoneDigits: '9822001122',
    addresses: [addr({ city: 'Delhi', state: 'Delhi', pinCode: '110002' })],
    joinDate: '2024-07-30T11:50:00.000Z',
  },
  {
    id: 'cust-amar-singh',
    name: 'Amar Singh',
    email: 'amar.singh@outlook.com',
    phoneDigits: '9789456123',
    addresses: [addr({ city: 'Lucknow', state: 'Uttar Pradesh', pinCode: '226001' })],
    joinDate: '2024-06-05T10:25:00.000Z',
  },
  {
    id: 'cust-rhea-das',
    name: 'Rhea Das',
    email: 'rhea.das@gmail.com',
    phoneDigits: '9830099900',
    addresses: [addr({ city: 'Kolkata', state: 'West Bengal', pinCode: '700002' })],
    joinDate: '2024-05-22T17:10:00.000Z',
  },
  {
    id: 'cust-tanvi-rao',
    name: 'Tanvi Rao',
    email: 'tanvi.rao@yahoo.co.in',
    phoneDigits: '9890011223',
    addresses: [addr({ city: 'Pune', state: 'Maharashtra', pinCode: '411002' })],
    joinDate: '2025-03-18T09:55:00.000Z',
  },
  {
    id: 'cust-abhishek-reddy',
    name: 'Abhishek Reddy',
    email: 'abhishek.reddy@gmail.com',
    phoneDigits: '9876001122',
    addresses: [addr({ city: 'Hyderabad', state: 'Telangana', pinCode: '500002' })],
    joinDate: '2024-04-10T12:40:00.000Z',
  },
  {
    id: 'cust-sneha-krishnan',
    name: 'Sneha Krishnan',
    email: 'sneha.krishnan@gmail.com',
    phoneDigits: '9898765432',
    addresses: [addr({ city: 'Chennai', state: 'Tamil Nadu', pinCode: '600002' })],
    joinDate: '2024-03-02T14:15:00.000Z',
  },
  {
    id: 'cust-omkar-deshmukh',
    name: 'Omkar Deshmukh',
    email: 'omkar.deshmukh@outlook.com',
    phoneDigits: '9765009988',
    addresses: [addr({ city: 'Pune', state: 'Maharashtra', pinCode: '411003' })],
    joinDate: '2024-02-11T16:05:00.000Z',
  },
  {
    id: 'cust-poonam-joshi',
    name: 'Poonam Joshi',
    email: 'poonam.joshi@yahoo.co.in',
    phoneDigits: '9811998877',
    addresses: [addr({ city: 'Delhi', state: 'Delhi', pinCode: '110003' })],
    joinDate: '2024-01-29T10:30:00.000Z',
  },
  {
    id: 'cust-rahul-nambiar',
    name: 'Rahul Nambiar',
    email: 'rahul.nambiar@gmail.com',
    phoneDigits: '9847321650',
    addresses: [addr({ city: 'Kochi', state: 'Kerala', pinCode: '682002' })],
    joinDate: '2023-12-15T09:20:00.000Z',
  },
];

// Orders sample data (mirrors frontend orders.ts logic)

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

type OrderItemInput = {
  productId: string;
  quantity: number;
  price: number; // in INR rupees
  size?: string;
};

type OrderInput = {
  id: string; // e.g. #ORD-001
  customerId: string;
  items: OrderItemInput[];
  subtotal: number; // rupees
  shipping: number; // rupees
  tax: number; // rupees
  total: number; // rupees
  status: OrderStatus;
  placedAt: string; // ISO
  shippingAddress: AddressInput;
  trackingNumber?: string;
  courier?: string;
  notes?: string;
};

const INR_RATE = 80; // same as frontend seed logic

const formatDate = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
};

const findProduct = (id: string): ProductInput => {
  const product = products.find((p) => p.id === id);
  if (!product) {
    throw new Error(`Product not found for order seed: ${id}`);
  }
  return product;
};

const item = (productId: string, quantity: number): OrderItemInput => {
  const product = findProduct(productId);
  const price = Math.round(product.price * INR_RATE);
  return { productId: product.id, quantity, price };
};

const makeOrder = (
  id: string,
  customerId: string,
  items: OrderItemInput[],
  status: OrderStatus,
  placedOffsetDays: number,
  opts?: {
    shipping?: number;
    city?: string;
    state?: string;
    pinCode?: string;
    trackingNumber?: string;
    courier?: string;
    notes?: string;
  },
): OrderInput => {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shipping = opts?.shipping ?? (subtotal >= 5000 ? 0 : 100);
  const tax = Math.round(subtotal * 0.03);
  const total = subtotal + shipping + tax;

  const shippingAddress: AddressInput = addr({
    city: opts?.city ?? 'Mumbai',
    state: opts?.state ?? 'Maharashtra',
    pinCode: opts?.pinCode ?? '400001',
  });

  return {
    id,
    customerId,
    items,
    subtotal,
    shipping,
    tax,
    total,
    status,
    placedAt: formatDate(placedOffsetDays),
    shippingAddress,
    trackingNumber: opts?.trackingNumber,
    courier: opts?.courier,
    notes: opts?.notes,
  };
};

const orders: OrderInput[] = [
  makeOrder('#ORD-001', 'cust-rajesh-kumar', [item('minimalist-gold-band', 1), item('arc-drop-earrings', 1)], 'Delivered', 2, {
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    courier: 'Delhivery',
    trackingNumber: 'DLV-MUM-001',
  }),
  makeOrder('#ORD-002', 'cust-priya-sharma', [item('twisted-gold-necklace', 1)], 'Shipped', 4, {
    city: 'Delhi',
    state: 'Delhi',
    pinCode: '110001',
    courier: 'Blue Dart',
    trackingNumber: 'BD-DEL-1452',
  }),
  makeOrder('#ORD-003', 'cust-arjun-patel', [item('contour-cuff-bracelet', 1), item('linear-stud-set', 2)], 'Processing', 6, {
    city: 'Ahmedabad',
    state: 'Gujarat',
    pinCode: '380001',
    courier: 'Delhivery',
  }),
  makeOrder('#ORD-004', 'cust-meera-iyer', [item('orbit-pendant-necklace', 1)], 'Pending', 1, {
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '600001',
  }),
  makeOrder('#ORD-005', 'cust-vikram-singh', [item('column-drop-earrings', 1), item('hinged-gold-bangle', 1)], 'Delivered', 10, {
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560001',
    courier: 'DTDC',
    trackingNumber: 'DT-560-9921',
  }),
  makeOrder('#ORD-006', 'cust-ananya-reddy', [item('stackable-gold-rings-set', 1)], 'Processing', 3, {
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '500001',
  }),
  makeOrder('#ORD-007', 'cust-rahul-verma', [item('minimalist-gold-band', 2)], 'Pending', 0, {
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411001',
  }),
  makeOrder('#ORD-008', 'cust-kavya-nair', [item('parallel-bar-necklace', 1), item('arc-drop-earrings', 1)], 'Shipped', 5, {
    city: 'Kochi',
    state: 'Kerala',
    pinCode: '682001',
    courier: 'India Post',
    trackingNumber: 'IP-KCH-7744',
  }),
  makeOrder('#ORD-009', 'cust-sanjay-gupta', [item('offset-chain-bracelet', 1)], 'Delivered', 12, {
    city: 'Kolkata',
    state: 'West Bengal',
    pinCode: '700001',
    courier: 'Blue Dart',
    trackingNumber: 'BD-KOL-2201',
  }),
  makeOrder('#ORD-010', 'cust-nisha-menon', [item('twisted-gold-necklace', 1), item('linear-stud-set', 1)], 'Delivered', 7, {
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560002',
    courier: 'Delhivery',
    trackingNumber: 'DLV-560-7823',
  }),
  makeOrder('#ORD-011', 'cust-siddharth-jain', [item('sculpted-gold-signet', 1)], 'Processing', 8, {
    city: 'Jaipur',
    state: 'Rajasthan',
    pinCode: '302001',
  }),
  makeOrder('#ORD-012', 'cust-isha-chopra', [item('orbit-pendant-necklace', 1), item('contour-cuff-bracelet', 1)], 'Shipped', 9, {
    city: 'Delhi',
    state: 'Delhi',
    pinCode: '110002',
    courier: 'DTDC',
    trackingNumber: 'DT-110-3321',
  }),
  makeOrder('#ORD-013', 'cust-amar-singh', [item('hinged-gold-bangle', 1)], 'Pending', 0, {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pinCode: '226001',
  }),
  makeOrder('#ORD-014', 'cust-rhea-das', [item('column-drop-earrings', 1), item('stackable-gold-rings-set', 1)], 'Delivered', 14, {
    city: 'Kolkata',
    state: 'West Bengal',
    pinCode: '700002',
    courier: 'India Post',
    trackingNumber: 'IP-KOL-6610',
  }),
  makeOrder('#ORD-015', 'cust-tanvi-rao', [item('offset-chain-bracelet', 1), item('minimalist-gold-band', 1)], 'Processing', 11, {
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411002',
  }),
];

// --- Seeding logic ---

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('Admin@2025', 10);

  await prisma.user.upsert({
    where: { email: 'admin@alankrit.com' },
    update: {},
    create: {
      email: 'admin@alankrit.com',
      password: passwordHash,
      name: 'Admin',
      role: 'admin',
    },
  });
}

async function seedProductsAndInventory() {
  for (let index = 0; index < products.length; index += 1) {
    const p = products[index];
    const weightGrams = defaultWeights[index] ?? 10.0;
    const quantity = baseQuantities[index] ?? 12;

    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: {
          connectOrCreate: {
            where: { slug: p.category.toLowerCase() },
            create: { slug: p.category.toLowerCase(), name: p.category }
          }
        },
        price: Math.round(p.price * 100), // rupees -> paise
        description: p.description,
        material: p.material,
        purity: '92.5%',
        weightGrams,
        imageUrl: p.images[0],
        status: 'Published',
        availableSizes: p.category === 'Rings' ? ['5', '6', '7', '8'] : [],
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity,
        reorderPoint: 6,
        weightGrams: weightGrams * quantity,
        adjustmentHistory: {
          create: [
            {
              adjustment: quantity,
              reason: 'Restock',
              notes: 'Initial stock import',
            },
          ],
        },
      },
    });
  }
}

async function seedCustomers() {
  for (const base of baseCustomers) {
    await prisma.customer.upsert({
      where: { email: base.email },
      update: {},
      create: {
        id: base.id,
        name: base.name,
        email: base.email,
        phone: makePhone(base.phoneDigits),
        totalSpent: 0, // will be updated after orders
        totalOrders: 0,
        joinDate: new Date(base.joinDate),
        addresses: {
          create: base.addresses.map((a, index) => ({
            street: a.street,
            city: a.city,
            state: a.state,
            pinCode: a.pinCode,
            country: a.country,
            isDefault: index === 0,
          })),
        },
      },
    });
  }
}

async function seedOrders() {
  for (const o of orders) {
    const subtotalPaise = Math.round(o.subtotal * 100);
    const shippingPaise = Math.round(o.shipping * 100);
    const taxPaise = Math.round(o.tax * 100);
    const totalPaise = Math.round(o.total * 100);

    const order = await prisma.order.create({
      data: {
        id: o.id,
        orderNumber: o.id,
        customer: {
          connect: { id: o.customerId },
        },
        subtotal: subtotalPaise,
        shippingCost: shippingPaise,
        gstAmount: taxPaise,
        totalAmount: totalPaise,
        status: o.status,
        shippingAddress: JSON.stringify(o.shippingAddress),
        trackingNumber: o.trackingNumber ?? null,
        courierService: o.courier ?? null,
        notes: o.notes ?? null,
        paymentStatus: 'Completed',
        placedAt: new Date(o.placedAt),
      },
    });

    if (o.items.length > 0) {
      await prisma.orderItem.createMany({
        data: o.items.map((it) => ({
          orderId: order.id,
          productId: it.productId,
          quantity: it.quantity,
          price: Math.round(it.price * 100), // rupees -> paise
          size: it.size ?? null,
        })),
      });
    }
  }
}

async function updateCustomerTotals() {
  for (const base of baseCustomers) {
    const aggregates = await prisma.order.aggregate({
      where: { customerId: base.id },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    await prisma.customer.update({
      where: { id: base.id },
      data: {
        totalOrders: aggregates._count.id,
        totalSpent: aggregates._sum.totalAmount ?? 0,
      },
    });
  }
}

async function seedAdminSettings() {
  await prisma.adminSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      storeName: 'Alankrit',
      contactEmail: 'support@alankrit.com',
      phone: '+91 98765 43210',
      address: 'Flat 12, Minimal Tower, Mumbai, Maharashtra 400001, India',
      gstNumber: '22AAAAA0000A1Z5',
      openingTime: '09:00',
      closingTime: '18:00',
      currency: 'INR',
    },
  });
}

async function main() {
  console.log('⏳ Seeding Alankrit database...');

  await seedAdminUser();
  await seedProductsAndInventory();
  await seedCustomers();
  await seedOrders();
  await updateCustomerTotals();
  await seedAdminSettings();

  console.log('✅ Seeding completed.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
