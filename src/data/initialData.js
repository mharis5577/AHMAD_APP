export const BUSINESS_INFO = {
  name: "The Chocolate House",
  tagline: "Imported Chocolates",
  phone: "03353465000",
  whatsapp: "923353465000",
  address: "Premium Imported Chocolates & Confections",
  currency: "Rs.",
  logoUrl: "/logo.png"
};

export const BANK_ACCOUNTS = [
  {
    id: "dib",
    bankName: "Dubai Islamic Bank",
    accountTitle: "The chocolate house",
    accountNo: "",
    iban: "PK84DUIB0000001114770001",
    shortCode: "DIB"
  },
  {
    id: "meezan",
    bankName: "Meezan Bank",
    accountTitle: "THE CHOCOLATE HOUSE",
    accountNo: "57020115209000",
    iban: "PK39MEZN0057020115209000",
    shortCode: "MEZN"
  },
  {
    id: "ubl",
    bankName: "United Bank Limited",
    accountTitle: "The chocolate house",
    accountNo: "",
    iban: "PK61UNIL0109000374171856",
    shortCode: "UBL"
  }
];

export const INITIAL_BILLS = [
  {
    id: "TCH-1001",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    customerName: "Kamran Shah",
    customerPhone: "03001234567",
    deliveryAddress: "House 42, Street 8, DHA Phase 5, Lahore",
    items: [
      { id: "item_1", name: "Ferrero Rocher T24 Box", price: 3450, qty: 2, total: 6900 },
      { id: "item_2", name: "Lindt Excellence 85% Dark (100g)", price: 1150, qty: 1, total: 1150 }
    ],
    subtotal: 8050,
    discount: 150,
    netTotal: 7900,
    paymentMethod: "Bank Transfer (Meezan)",
    status: "Paid",
    notes: "VIP Gift ribbon requested"
  },
  {
    id: "TCH-1002",
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    customerName: "Kamran Shah",
    customerPhone: "03001234567",
    deliveryAddress: "House 42, Street 8, DHA Phase 5, Lahore",
    items: [
      { id: "item_1", name: "Patchi Classic Gift Assortment (500g)", price: 5800, qty: 1, total: 5800 }
    ],
    subtotal: 5800,
    discount: 0,
    netTotal: 5800,
    paymentMethod: "Bank Transfer (Meezan)",
    status: "Pending",
    notes: "Awaiting bank transfer screenshot"
  },
  {
    id: "TCH-1003",
    date: new Date(Date.now() - 3600000 * 8).toISOString(),
    customerName: "Ayesha Malik",
    customerPhone: "03219876543",
    deliveryAddress: "Apartment 5B, Ocean Tower, Clifton, Karachi",
    items: [
      { id: "item_1", name: "Patchi Deluxe Gold Hamper", price: 8500, qty: 1, total: 8500 },
      { id: "item_2", name: "Kinder Bueno (Pack of 2)", price: 420, qty: 3, total: 1260 }
    ],
    subtotal: 9760,
    discount: 260,
    netTotal: 9500,
    paymentMethod: "Bank Transfer (Dubai Islamic)",
    status: "Paid",
    notes: "Dispatched via TCS Overnight"
  },
  {
    id: "TCH-1004",
    date: new Date(Date.now() - 3600000 * 14).toISOString(),
    customerName: "Ayesha Malik",
    customerPhone: "03219876543",
    deliveryAddress: "Apartment 5B, Ocean Tower, Clifton, Karachi",
    items: [
      { id: "item_1", name: "Lindt Lindor Milk Truffles (200g)", price: 2450, qty: 1, total: 2450 },
      { id: "item_2", name: "Toblerone Dark (100g)", price: 580, qty: 3, total: 1740 }
    ],
    subtotal: 4190,
    discount: 0,
    netTotal: 4190,
    paymentMethod: "Bank Transfer (Meezan)",
    status: "Paid",
    notes: "Settled completely"
  },
  {
    id: "TCH-1005",
    date: new Date(Date.now() - 3600000 * 20).toISOString(),
    customerName: "Zainab Tariq",
    customerPhone: "03335558899",
    deliveryAddress: "Bungalow 18, Sector F-7/2, Islamabad",
    items: [
      { id: "item_1", name: "Godiva Signature Dark Mini Bars", price: 1850, qty: 2, total: 3700 },
      { id: "item_2", name: "Ferrero Rocher T30 Box (375g)", price: 4200, qty: 2, total: 8400 },
      { id: "item_3", name: "Nutella Hazelnut Spread (750g)", price: 2400, qty: 1, total: 2400 }
    ],
    subtotal: 14500,
    discount: 500,
    netTotal: 14000,
    paymentMethod: "Bank Transfer (Meezan)",
    status: "Pending",
    notes: "Corporate anniversary gift packing"
  }
];

export const INITIAL_PURCHASES = [
  {
    id: "PUR-2001",
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    supplierName: "Dubai Confectionery Wholesale",
    supplierPhone: "03214455667",
    supplierBank: {
      bankName: "Habib Bank Limited (HBL)",
      accountTitle: "Dubai Confectionery Traders",
      accountNo: "00427900123403",
      iban: "PK72HABB0000427900123403"
    },
    paidFromBank: "Meezan Bank",
    items: [
      { id: "p_1", name: "Ferrero Rocher T24 (Carton of 12)", price: 34000, qty: 2, total: 68000 },
      { id: "p_2", name: "Lindt Excellence 85% (Box of 20)", price: 18000, qty: 1, total: 18000 }
    ],
    subtotal: 86000,
    discount: 2000,
    netTotal: 84000,
    status: "Paid",
    txRef: "MEZN-TX-98421",
    notes: "Direct container shipment from Port Qasim"
  },
  {
    id: "PUR-2002",
    date: new Date(Date.now() - 3600000 * 12).toISOString(),
    supplierName: "Al-Madina Importers Karachi",
    supplierPhone: "03009876543",
    supplierBank: {
      bankName: "Bank Alfalah",
      accountTitle: "Al Madina Trading Co",
      accountNo: "55010023498701",
      iban: "PK19ALFH55010023498701"
    },
    paidFromBank: "Meezan Bank",
    items: [
      { id: "p_1", name: "Patchi Classic Gift Assortments (Carton of 6)", price: 38000, qty: 1, total: 38000 },
      { id: "p_2", name: "Kinder Bueno Bulk Carton (30 packs)", price: 9500, qty: 2, total: 19000 }
    ],
    subtotal: 57000,
    discount: 1000,
    netTotal: 56000,
    status: "Pending",
    txRef: "",
    notes: "Payment due within 7 days upon delivery verification"
  }
];

export const INITIAL_SUPPLIERS = [
  {
    id: "sup_1",
    name: "Dubai Confectionery Wholesale",
    phone: "03214455667",
    bankName: "Habib Bank Limited (HBL)",
    accountTitle: "Dubai Confectionery Traders",
    accountNo: "00427900123403",
    iban: "PK72HABB0000427900123403"
  },
  {
    id: "sup_2",
    name: "Al-Madina Importers Karachi",
    phone: "03009876543",
    bankName: "Bank Alfalah",
    accountTitle: "Al Madina Trading Co",
    accountNo: "55010023498701",
    iban: "PK19ALFH55010023498701"
  }
];
