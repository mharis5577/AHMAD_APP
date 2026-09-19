// Comprehensive Demo & Cash Memo Dataset for The Chocolate House
export const SAMPLE_MEMO_ITEMS = [
  {
    id: "item_memo_1",
    name: "Ferrero Rocher T16 (200g)",
    category: "Boxes & Pralines",
    purchasePrice: 1650,
    salePrice: 2200,
    stock: 45,
    minStock: 10,
    unit: "box",
    barcode: "8000500003787",
    notes: "Italian hazelnut pralines in golden wrapper"
  },
  {
    id: "item_memo_2",
    name: "Lindt Excellence 85% Cocoa (100g)",
    category: "Dark Chocolate",
    purchasePrice: 850,
    salePrice: 1200,
    stock: 60,
    minStock: 12,
    unit: "bar",
    barcode: "7610400070776",
    notes: "Swiss rich intense dark chocolate bar"
  },
  {
    id: "item_memo_3",
    name: "Nutella Hazelnut Spread (750g)",
    category: "Spreads",
    purchasePrice: 1950,
    salePrice: 2600,
    stock: 35,
    minStock: 8,
    unit: "jar",
    barcode: "8000500179833",
    notes: "Imported German hazelnut cocoa spread"
  },
  {
    id: "item_memo_4",
    name: "Cadbury Dairy Milk Silk Roast Almond (143g)",
    category: "Bars & Snacks",
    purchasePrice: 680,
    salePrice: 950,
    stock: 75,
    minStock: 15,
    unit: "bar",
    barcode: "7622201440053",
    notes: "Creamy milk chocolate with whole roasted almonds"
  },
  {
    id: "item_memo_5",
    name: "Toblerone Swiss Milk Chocolate (100g)",
    category: "Bars & Snacks",
    purchasePrice: 420,
    salePrice: 600,
    stock: 90,
    minStock: 20,
    unit: "bar",
    barcode: "7622210403339",
    notes: "Honey and almond nougat triangular bar"
  },
  {
    id: "item_memo_6",
    name: "Godiva Dark Chocolate Ganache Hearts (130g)",
    category: "Boxes & Pralines",
    purchasePrice: 2200,
    salePrice: 3100,
    stock: 20,
    minStock: 5,
    unit: "box",
    barcode: "031290084428",
    notes: "Belgian luxury dark ganache filled hearts"
  },
  {
    id: "item_memo_7",
    name: "Bounty Miniatures Bag (333g)",
    category: "Bars & Snacks",
    purchasePrice: 1100,
    salePrice: 1550,
    stock: 40,
    minStock: 10,
    unit: "bag",
    barcode: "5000159492652",
    notes: "Tender moist coconut covered in milk chocolate"
  },
  {
    id: "item_memo_8",
    name: "Raffaello T15 Coconut Pralines (150g)",
    category: "Boxes & Pralines",
    purchasePrice: 1400,
    salePrice: 1950,
    stock: 30,
    minStock: 8,
    unit: "box",
    barcode: "8000500009666",
    notes: "Crisp coconut almond specialty pralines"
  }
];

export const SAMPLE_MEMO_PARTIES = [
  {
    id: "pty_memo_1",
    name: "Bilal Khan",
    phone: "03001234567",
    address: "DHA Phase 5, Karachi",
    type: "customer",
    openingBalance: 4500,
    openingBalanceType: "debit",
    notes: "Regular corporate gifting client. Past udhaar carried forward.",
    createdAt: "2026-09-10T10:00:00.000Z"
  },
  {
    id: "pty_memo_2",
    name: "Ayesha Siddiqui",
    phone: "03219876543",
    address: "Gulshan-e-Iqbal Block 6, Karachi",
    type: "customer",
    openingBalance: 1500,
    openingBalanceType: "credit",
    notes: "Advance payment deposited for custom event chocolate hampers.",
    createdAt: "2026-09-12T11:30:00.000Z"
  },
  {
    id: "pty_memo_3",
    name: "Hamza Ali Tariq",
    phone: "03332211445",
    address: "Clifton Block 2, Karachi",
    type: "customer",
    openingBalance: 0,
    openingBalanceType: "debit",
    notes: "Walk-in repeat customer",
    createdAt: "2026-09-15T14:15:00.000Z"
  },
  {
    id: "pty_memo_sup_1",
    name: "Al-Madina Confectionery Importers",
    phone: "03008765432",
    address: "Shop 42, Karachi Port Wholesale Market",
    type: "supplier",
    openingBalance: 45000,
    openingBalanceType: "credit",
    notes: "Primary distributor for Ferrero, Nutella, and Lindt wholesale shipments",
    bank: {
      bankName: "Meezan Bank",
      accountTitle: "Al Madina Confectionery",
      accountNo: "01020304050607",
      iban: "PK55MEZN0102030405060701"
    },
    createdAt: "2026-09-01T09:00:00.000Z"
  },
  {
    id: "pty_memo_sup_2",
    name: "Swiss Choco Traders Lahore",
    phone: "03223344556",
    address: "Hall Road, Lahore",
    type: "supplier",
    openingBalance: 0,
    openingBalanceType: "debit",
    notes: "Supplier for Toblerone and European confectionery stock",
    createdAt: "2026-09-05T12:00:00.000Z"
  }
];

export const SAMPLE_MEMO_BILLS = [
  {
    id: "MEMO-1001",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    customerName: "Bilal Khan",
    customerPhone: "03001234567",
    deliveryAddress: "DHA Phase 5, Karachi",
    items: [
      {
        id: "item_memo_1",
        name: "Ferrero Rocher T16 (200g)",
        price: 2200,
        qty: 1,
        total: 2200
      },
      {
        id: "item_memo_2",
        name: "Lindt Excellence 85% Cocoa (100g)",
        price: 1200,
        qty: 1,
        total: 1200
      }
    ],
    subtotal: 3400,
    discount: 0,
    netTotal: 3400,
    paymentMethod: "Cash",
    status: "Paid",
    notes: "Cash Memo: Corporate gift pack with ribbon packaging.",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "MEMO-1002",
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    customerName: "Ayesha Siddiqui",
    customerPhone: "03219876543",
    deliveryAddress: "Gulshan-e-Iqbal Block 6, Karachi",
    items: [
      {
        id: "item_memo_3",
        name: "Nutella Hazelnut Spread (750g)",
        price: 2600,
        qty: 1,
        total: 2600
      },
      {
        id: "item_memo_4",
        name: "Cadbury Dairy Milk Silk Roast Almond (143g)",
        price: 950,
        qty: 1,
        total: 950
      }
    ],
    subtotal: 3550,
    discount: 50,
    netTotal: 3500,
    paymentMethod: "Meezan Bank (MEZN)",
    status: "Paid",
    notes: "Cash Memo: Home delivery order via Rider. Paid via online transfer.",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: "MEMO-1003",
    date: new Date().toISOString(),
    customerName: "Hamza Ali Tariq",
    customerPhone: "03332211445",
    deliveryAddress: "Clifton Block 2, Karachi",
    items: [
      {
        id: "item_memo_6",
        name: "Godiva Dark Chocolate Ganache Hearts (130g)",
        price: 3100,
        qty: 1,
        total: 3100
      },
      {
        id: "item_memo_5",
        name: "Toblerone Swiss Milk Chocolate (100g)",
        price: 600,
        qty: 1,
        total: 600
      }
    ],
    subtotal: 3700,
    discount: 0,
    netTotal: 3700,
    paymentMethod: "Cash",
    status: "Pending",
    notes: "Credit Memo: Udhaar order. Customer promised settlement by weekend.",
    createdAt: new Date().toISOString()
  }
];

export const SAMPLE_MEMO_PURCHASES = [
  {
    id: "PUR-MEMO-901",
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    supplierId: "pty_memo_sup_1",
    supplierName: "Al-Madina Confectionery Importers",
    supplierPhone: "03008765432",
    items: [
      {
        id: "item_memo_1",
        name: "Ferrero Rocher T16 (200g)",
        purchasePrice: 1650,
        qty: 50,
        total: 82500
      },
      {
        id: "item_memo_3",
        name: "Nutella Hazelnut Spread (750g)",
        purchasePrice: 1950,
        qty: 30,
        total: 58500
      }
    ],
    subtotal: 141000,
    tax: 0,
    netTotal: 141000,
    paymentMethod: "Meezan Bank",
    status: "Paid",
    notes: "Wholesale Purchase Memo: Batch #CH-2026 air cargo consignment.",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];

export const SAMPLE_MEMO_PAYMENTS = [
  {
    id: "RCP-MEMO-1001",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    partyId: "03001234567",
    partyName: "Bilal Khan",
    partyPhone: "03001234567",
    partyType: "customer",
    amount: 3400,
    paymentMethod: "Cash",
    notes: "Cash Memo Receipt for Bill #MEMO-1001",
    billId: "MEMO-1001",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "RCP-MEMO-1002",
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    partyId: "03219876543",
    partyName: "Ayesha Siddiqui",
    partyPhone: "03219876543",
    partyType: "customer",
    amount: 3500,
    paymentMethod: "Meezan Bank (MEZN)",
    notes: "Bank Transfer Receipt for Bill #MEMO-1002",
    billId: "MEMO-1002",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export const SAMPLE_MEMO_MANUAL_ENTRIES = [
  {
    id: "entry_memo_1",
    date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    type: "capital",
    category: "Initial Capital Investment",
    amount: 500000,
    account: "Cash",
    particulars: "Initial seed capital injection by store owner into Cash in Hand",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: "entry_memo_2",
    date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    type: "capital",
    category: "Owner Capital Contribution",
    amount: 300000,
    account: "Meezan Bank (MEZN)",
    particulars: "Bank account working capital deposit for chocolate shipments",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: "entry_memo_3",
    date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    type: "expense",
    category: "Shop Rent",
    amount: 45000,
    account: "Cash",
    particulars: "Monthly store rental payment (Advance receipt #RNT-502)",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: "entry_memo_4",
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    type: "expense",
    category: "Electricity / Utilities",
    amount: 16800,
    account: "Meezan Bank (MEZN)",
    particulars: "Commercial shop electric bill paid via banking portal",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: "entry_memo_5",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    type: "expense",
    category: "Packaging & Bags",
    amount: 6500,
    account: "Cash",
    particulars: "Custom golden boxes, gift wrapping ribbon & premium shopping bags",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];
