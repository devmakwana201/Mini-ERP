// AgroManagementDashboard.jsx
// Complete Agro Management dashboard with ALL modules and realistic agricultural data
// Comprehensive solution for Indian agricultural market

import React, { useMemo, useState } from "react";
import { Page } from "components/shared/Page";

// PrimeReact
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import BottomToTop from "components/ui/BottomToTop";

// ApexCharts
import ReactApexChart from "react-apexcharts";

// Icons
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  TruckIcon,
  UsersIcon,
  TagIcon,
  BeakerIcon,
  ShoppingBagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ScaleIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";

// Helper utilities
const number = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : n);

// Filter options
const regions = [
  { label: "All Regions", value: "all" },
  { label: "Maharashtra", value: "maharashtra" },
  { label: "Gujarat", value: "gujarat" },
  { label: "Punjab", value: "punjab" },
  { label: "Karnataka", value: "karnataka" },
  { label: "Haryana", value: "haryana" },
];

const seasons = [
  { label: "All Seasons", value: "all" },
  { label: "Kharif (Jun-Oct)", value: "kharif" },
  { label: "Rabi (Oct-Mar)", value: "rabi" },
  { label: "Zaid (Apr-Jun)", value: "zaid" },
];

const cropTypes = [
  { label: "All Crops", value: "all" },
  { label: "Cereals", value: "cereals" },
  { label: "Pulses", value: "pulses" },
  { label: "Cash Crops", value: "cash" },
  { label: "Horticulture", value: "horticulture" },
];

// Months (Financial Year)
const months = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

// ===== COMPREHENSIVE REALISTIC AGRO DATA =====

// Product Categories with Subcategories
const productCategories = [
  {
    category: "Seeds",
    revenue: 12850000,
    units: 42000,
    marginPct: 28,
    yoy: 15,
    subcategories: [
      "Hybrid Seeds",
      "BT Cotton",
      "Organic Seeds",
      "Vegetable Seeds",
    ],
  },
  {
    category: "Fertilizers",
    revenue: 18320000,
    units: 125000,
    marginPct: 18,
    yoy: 12,
    subcategories: [
      "NPK Complex",
      "Urea",
      "DAP",
      "SSP",
      "Micronutrients",
      "Organic",
    ],
  },
  {
    category: "Crop Protection",
    revenue: 9780000,
    units: 68000,
    marginPct: 32,
    yoy: 22,
    subcategories: [
      "Insecticides",
      "Fungicides",
      "Herbicides",
      "Bio-Pesticides",
      "Growth Regulators",
    ],
  },
  {
    category: "Farm Machinery",
    revenue: 6540000,
    units: 3200,
    marginPct: 24,
    yoy: 8,
    subcategories: ["Hand Tools", "Power Sprayers", "Tillers", "Spare Parts"],
  },
  {
    category: "Irrigation",
    revenue: 7890000,
    units: 8500,
    marginPct: 26,
    yoy: 18,
    subcategories: [
      "Drip Systems",
      "Sprinklers",
      "PVC Pipes",
      "Motors & Pumps",
    ],
  },
  {
    category: "Animal Nutrition",
    revenue: 5620000,
    units: 82000,
    marginPct: 16,
    yoy: 10,
    subcategories: [
      "Cattle Feed",
      "Poultry Feed",
      "Fish Feed",
      "Mineral Mixtures",
    ],
  },
];

// Comprehensive Product Catalog
const productCatalog = [
  // Seeds
  {
    sku: "SEED-COT-BGII-001",
    name: "BT Cotton Bollgard-II (450g)",
    category: "Seeds",
    subcategory: "BT Cotton",
    brand: "Mahyco",
    uom: "packet",
    packSize: "450g",
    mrp: 930,
    costPrice: 650,
    currentStock: 850,
    reorderLevel: 200,
    monthlyVelocity: 320,
    marginPct: 30,
    gstRate: 5,
    expiryDays: 180,
  },
  {
    sku: "SEED-CORN-NK6240",
    name: "Hybrid Corn NK-6240 (4kg)",
    category: "Seeds",
    subcategory: "Hybrid Seeds",
    brand: "Syngenta",
    uom: "bag",
    packSize: "4kg",
    mrp: 1680,
    costPrice: 1180,
    currentStock: 420,
    reorderLevel: 100,
    monthlyVelocity: 180,
    marginPct: 30,
    gstRate: 5,
    expiryDays: 365,
  },
  {
    sku: "SEED-WHEAT-HD2967",
    name: "Wheat HD-2967 (40kg)",
    category: "Seeds",
    subcategory: "Cereals",
    brand: "IARI",
    uom: "bag",
    packSize: "40kg",
    mrp: 2080,
    costPrice: 1600,
    currentStock: 1200,
    reorderLevel: 300,
    monthlyVelocity: 450,
    marginPct: 23,
    gstRate: 0,
    expiryDays: 270,
  },
  {
    sku: "SEED-RICE-MTU1010",
    name: "Paddy MTU-1010 (25kg)",
    category: "Seeds",
    subcategory: "Hybrid Seeds",
    brand: "Nuziveedu",
    uom: "bag",
    packSize: "25kg",
    mrp: 3200,
    costPrice: 2400,
    currentStock: 680,
    reorderLevel: 150,
    monthlyVelocity: 280,
    marginPct: 25,
    gstRate: 5,
    expiryDays: 365,
  },

  // Fertilizers
  {
    sku: "FERT-NPK-102626",
    name: "NPK 10:26:26 Complex (50kg)",
    category: "Fertilizers",
    subcategory: "NPK Complex",
    brand: "IFFCO",
    uom: "bag",
    packSize: "50kg",
    mrp: 1420,
    costPrice: 1150,
    currentStock: 2400,
    reorderLevel: 500,
    monthlyVelocity: 820,
    marginPct: 19,
    gstRate: 5,
    expiryDays: 730,
  },
  {
    sku: "FERT-UREA-46N",
    name: "Urea 46% N (45kg)",
    category: "Fertilizers",
    subcategory: "Straight Fertilizers",
    brand: "NFL",
    uom: "bag",
    packSize: "45kg",
    mrp: 266,
    costPrice: 242,
    currentStock: 4800,
    reorderLevel: 1000,
    monthlyVelocity: 1650,
    marginPct: 9,
    gstRate: 5,
    expiryDays: 1095,
  },
  {
    sku: "FERT-DAP-1846",
    name: "DAP 18:46:0 (50kg)",
    category: "Fertilizers",
    subcategory: "Phosphatic",
    brand: "Coromandel",
    uom: "bag",
    packSize: "50kg",
    mrp: 1350,
    costPrice: 1250,
    currentStock: 1850,
    reorderLevel: 400,
    monthlyVelocity: 680,
    marginPct: 7,
    gstRate: 5,
    expiryDays: 1095,
  },
  {
    sku: "FERT-MOP-0060",
    name: "Muriate of Potash (50kg)",
    category: "Fertilizers",
    subcategory: "Potassic",
    brand: "IPL",
    uom: "bag",
    packSize: "50kg",
    mrp: 1680,
    costPrice: 1420,
    currentStock: 920,
    reorderLevel: 200,
    monthlyVelocity: 320,
    marginPct: 15,
    gstRate: 5,
    expiryDays: 1460,
  },

  // Crop Protection
  {
    sku: "PEST-CHLOR-50EC",
    name: "Chlorpyriphos 50% EC (1L)",
    category: "Crop Protection",
    subcategory: "Insecticides",
    brand: "Crystal",
    uom: "bottle",
    packSize: "1L",
    mrp: 580,
    costPrice: 380,
    currentStock: 1200,
    reorderLevel: 250,
    monthlyVelocity: 420,
    marginPct: 34,
    gstRate: 18,
    expiryDays: 730,
  },
  {
    sku: "PEST-IMIDA-178SL",
    name: "Imidacloprid 17.8% SL (250ml)",
    category: "Crop Protection",
    subcategory: "Insecticides",
    brand: "Bayer",
    uom: "bottle",
    packSize: "250ml",
    mrp: 320,
    costPrice: 210,
    currentStock: 2100,
    reorderLevel: 400,
    monthlyVelocity: 680,
    marginPct: 34,
    gstRate: 18,
    expiryDays: 730,
  },
  {
    sku: "FUNG-MANC-75WP",
    name: "Mancozeb 75% WP (1kg)",
    category: "Crop Protection",
    subcategory: "Fungicides",
    brand: "UPL",
    uom: "pouch",
    packSize: "1kg",
    mrp: 480,
    costPrice: 320,
    currentStock: 980,
    reorderLevel: 200,
    monthlyVelocity: 350,
    marginPct: 33,
    gstRate: 18,
    expiryDays: 910,
  },
  {
    sku: "HERB-GLYPH-41SL",
    name: "Glyphosate 41% SL (1L)",
    category: "Crop Protection",
    subcategory: "Herbicides",
    brand: "Excel",
    uom: "bottle",
    packSize: "1L",
    mrp: 650,
    costPrice: 420,
    currentStock: 680,
    reorderLevel: 150,
    monthlyVelocity: 280,
    marginPct: 35,
    gstRate: 18,
    expiryDays: 1095,
  },

  // Irrigation
  {
    sku: "IRR-DRIP-16MM",
    name: "Inline Dripper 16mm (100m)",
    category: "Irrigation",
    subcategory: "Drip Systems",
    brand: "Jain Irrigation",
    uom: "roll",
    packSize: "100m",
    mrp: 2800,
    costPrice: 2100,
    currentStock: 120,
    reorderLevel: 25,
    monthlyVelocity: 35,
    marginPct: 25,
    gstRate: 18,
    expiryDays: 3650,
  },
  {
    sku: "IRR-SPRI-MINI",
    name: "Mini Sprinkler Set",
    category: "Irrigation",
    subcategory: "Sprinklers",
    brand: "Netafim",
    uom: "set",
    packSize: "complete",
    mrp: 450,
    costPrice: 320,
    currentStock: 280,
    reorderLevel: 50,
    monthlyVelocity: 85,
    marginPct: 29,
    gstRate: 18,
    expiryDays: 3650,
  },

  // Animal Nutrition
  {
    sku: "FEED-CATTLE-TYPE2",
    name: "Cattle Feed Type-2 (50kg)",
    category: "Animal Nutrition",
    subcategory: "Cattle Feed",
    brand: "Godrej Agrovet",
    uom: "bag",
    packSize: "50kg",
    mrp: 1400,
    costPrice: 1180,
    currentStock: 680,
    reorderLevel: 150,
    monthlyVelocity: 280,
    marginPct: 16,
    gstRate: 5,
    expiryDays: 90,
  },
  {
    sku: "FEED-POULTRY-STARTER",
    name: "Poultry Starter Feed (50kg)",
    category: "Animal Nutrition",
    subcategory: "Poultry Feed",
    brand: "Suguna",
    uom: "bag",
    packSize: "50kg",
    mrp: 1850,
    costPrice: 1580,
    currentStock: 420,
    reorderLevel: 100,
    monthlyVelocity: 180,
    marginPct: 15,
    gstRate: 5,
    expiryDays: 60,
  },
];

// Suppliers with Performance Metrics
const suppliers = [
  {
    code: "SUP-IFFCO-001",
    name: "IFFCO Ltd.",
    category: "Fertilizers",
    location: "Kandla, Gujarat",
    creditDays: 30,
    minOrderValue: 100000,
    onTimeDelivery: 94.5,
    qualityScore: 98.2,
    defectRate: 0.8,
    leadTimeDays: 7,
    paymentTerms: "30% Advance",
    totalPurchase: 8200000,
    pendingPayment: 1250000,
  },
  {
    code: "SUP-MAHYCO-002",
    name: "Maharashtra Hybrid Seeds",
    category: "Seeds",
    location: "Jalna, Maharashtra",
    creditDays: 45,
    minOrderValue: 50000,
    onTimeDelivery: 92.0,
    qualityScore: 96.5,
    defectRate: 1.2,
    leadTimeDays: 5,
    paymentTerms: "Net 45 days",
    totalPurchase: 5400000,
    pendingPayment: 820000,
  },
  {
    code: "SUP-BAYER-003",
    name: "Bayer CropScience",
    category: "Crop Protection",
    location: "Mumbai, Maharashtra",
    creditDays: 60,
    minOrderValue: 75000,
    onTimeDelivery: 96.8,
    qualityScore: 99.1,
    defectRate: 0.3,
    leadTimeDays: 4,
    paymentTerms: "Net 60 days",
    totalPurchase: 4200000,
    pendingPayment: 680000,
  },
  {
    code: "SUP-JAIN-004",
    name: "Jain Irrigation Systems",
    category: "Irrigation",
    location: "Jalgaon, Maharashtra",
    creditDays: 30,
    minOrderValue: 80000,
    onTimeDelivery: 88.5,
    qualityScore: 94.0,
    defectRate: 2.1,
    leadTimeDays: 10,
    paymentTerms: "50% Advance",
    totalPurchase: 3600000,
    pendingPayment: 450000,
  },
  {
    code: "SUP-CORO-005",
    name: "Coromandel International",
    category: "Fertilizers",
    location: "Secunderabad, Telangana",
    creditDays: 45,
    minOrderValue: 150000,
    onTimeDelivery: 93.2,
    qualityScore: 97.8,
    defectRate: 0.6,
    leadTimeDays: 8,
    paymentTerms: "Net 45 days",
    totalPurchase: 6800000,
    pendingPayment: 920000,
  },
];

// Customer Segments with Detailed Metrics
const customerSegments = [
  {
    segment: "Progressive Farmers (>25 acres)",
    count: 85,
    avgOrderValue: 125000,
    orderFrequency: 5.2,
    revenue: 55250000,
    marginPct: 18,
    creditDays: 60,
    defaultRate: 2,
  },
  {
    segment: "Large Farmers (10-25 acres)",
    count: 220,
    avgOrderValue: 68000,
    orderFrequency: 4.5,
    revenue: 67320000,
    marginPct: 20,
    creditDays: 45,
    defaultRate: 3,
  },
  {
    segment: "Medium Farmers (5-10 acres)",
    count: 580,
    avgOrderValue: 32000,
    orderFrequency: 3.8,
    revenue: 70528000,
    marginPct: 22,
    creditDays: 30,
    defaultRate: 4,
  },
  {
    segment: "Small Farmers (<5 acres)",
    count: 1250,
    avgOrderValue: 12000,
    orderFrequency: 2.5,
    revenue: 37500000,
    marginPct: 24,
    creditDays: 15,
    defaultRate: 5,
  },
  {
    segment: "Agri Retailers",
    count: 65,
    avgOrderValue: 280000,
    orderFrequency: 8.5,
    revenue: 154700000,
    marginPct: 12,
    creditDays: 45,
    defaultRate: 1,
  },
  {
    segment: "Institutional/FPO",
    count: 18,
    avgOrderValue: 680000,
    orderFrequency: 2.8,
    revenue: 34272000,
    marginPct: 15,
    creditDays: 90,
    defaultRate: 0.5,
  },
];

// Store/Branch Network Performance
const storeNetwork = [
  {
    storeCode: "MH-PUN-001",
    name: "Pune Agro Center",
    location: "Baramati, Maharashtra",
    type: "Company Owned",
    area: 8500,
    monthlyRevenue: 12500000,
    monthlyOrders: 520,
    avgOrderValue: 24038,
    footfall: 3200,
    conversionRate: 16.3,
    topCategory: "Seeds",
    staffCount: 18,
    operatingCostPct: 8.5,
  },
  {
    storeCode: "GJ-SUR-002",
    name: "Surat Krishi Kendra",
    location: "Bardoli, Gujarat",
    type: "Franchise",
    area: 6200,
    monthlyRevenue: 8200000,
    monthlyOrders: 420,
    avgOrderValue: 19524,
    footfall: 2800,
    conversionRate: 15.0,
    topCategory: "Fertilizers",
    staffCount: 12,
    operatingCostPct: 7.2,
  },
  {
    storeCode: "PB-LUD-003",
    name: "Ludhiana Farm Hub",
    location: "Khanna, Punjab",
    type: "Company Owned",
    area: 10200,
    monthlyRevenue: 15800000,
    monthlyOrders: 680,
    avgOrderValue: 23235,
    footfall: 4100,
    conversionRate: 16.6,
    topCategory: "Farm Machinery",
    staffCount: 22,
    operatingCostPct: 9.1,
  },
  {
    storeCode: "KA-BEL-004",
    name: "Belgaum Agri Mall",
    location: "Belgaum, Karnataka",
    type: "Franchise",
    area: 5500,
    monthlyRevenue: 6800000,
    monthlyOrders: 380,
    avgOrderValue: 17895,
    footfall: 2600,
    conversionRate: 14.6,
    topCategory: "Crop Protection",
    staffCount: 10,
    operatingCostPct: 6.8,
  },
];

// Monthly Revenue & Margin Trend (Realistic)
const monthlyRevenue = [
  3200, 3800, 5600, 8200, 9600, 7800, 6400, 7200, 8400, 8800, 6200, 4800,
];
const monthlyMargin = [
  18.5, 19.2, 21.5, 22.8, 23.5, 22.2, 21.8, 22.5, 23.2, 22.8, 21.5, 20.2,
];
const monthlyOrders = [
  1250, 1420, 2180, 3200, 3650, 2980, 2520, 2780, 3120, 3280, 2380, 1860,
];

// District-wise Performance
const districtPerformance = [
  {
    state: "Maharashtra",
    district: "Pune",
    taluka: "Baramati",
    revenue: 5200000,
    farmers: 2800,
    dealers: 18,
    penetration: 42,
  },
  {
    state: "Maharashtra",
    district: "Nashik",
    taluka: "Niphad",
    revenue: 4800000,
    farmers: 2450,
    dealers: 15,
    penetration: 38,
  },
  {
    state: "Maharashtra",
    district: "Ahmednagar",
    taluka: "Sangamner",
    revenue: 3900000,
    farmers: 2100,
    dealers: 12,
    penetration: 35,
  },
  {
    state: "Gujarat",
    district: "Surat",
    taluka: "Bardoli",
    revenue: 3600000,
    farmers: 1950,
    dealers: 14,
    penetration: 32,
  },
  {
    state: "Gujarat",
    district: "Vadodara",
    taluka: "Padra",
    revenue: 3200000,
    farmers: 1780,
    dealers: 11,
    penetration: 28,
  },
  {
    state: "Punjab",
    district: "Ludhiana",
    taluka: "Khanna",
    revenue: 6200000,
    farmers: 2600,
    dealers: 20,
    penetration: 48,
  },
  {
    state: "Punjab",
    district: "Patiala",
    taluka: "Rajpura",
    revenue: 4800000,
    farmers: 2100,
    dealers: 16,
    penetration: 40,
  },
  {
    state: "Karnataka",
    district: "Belgaum",
    taluka: "Gokak",
    revenue: 3100000,
    farmers: 1680,
    dealers: 10,
    penetration: 26,
  },
  {
    state: "Haryana",
    district: "Karnal",
    taluka: "Karnal",
    revenue: 4500000,
    farmers: 2200,
    dealers: 17,
    penetration: 38,
  },
];

// Inventory Metrics by Category
const inventoryMetrics = [
  {
    category: "Seeds",
    stockValue: 5200000,
    turnoverRatio: 8.5,
    daysOnHand: 43,
    stockOutRate: 2.8,
    fillRate: 96.5,
    gmroi: 3.2,
    obsoleteStock: 125000,
  },
  {
    category: "Fertilizers",
    stockValue: 8400000,
    turnoverRatio: 5.8,
    daysOnHand: 63,
    stockOutRate: 4.2,
    fillRate: 93.8,
    gmroi: 2.1,
    obsoleteStock: 85000,
  },
  {
    category: "Crop Protection",
    stockValue: 3200000,
    turnoverRatio: 7.2,
    daysOnHand: 51,
    stockOutRate: 3.1,
    fillRate: 95.2,
    gmroi: 2.8,
    obsoleteStock: 180000,
  },
  {
    category: "Irrigation",
    stockValue: 2800000,
    turnoverRatio: 4.5,
    daysOnHand: 81,
    stockOutRate: 5.8,
    fillRate: 91.5,
    gmroi: 1.9,
    obsoleteStock: 45000,
  },
  {
    category: "Animal Nutrition",
    stockValue: 1600000,
    turnoverRatio: 9.2,
    daysOnHand: 40,
    stockOutRate: 1.5,
    fillRate: 97.8,
    gmroi: 2.4,
    obsoleteStock: 35000,
  },
];

// Near Expiry Products (Critical)
const nearExpiryProducts = [
  {
    sku: "PEST-CHLOR-50EC",
    name: "Chlorpyriphos 50% EC",
    batch: "CLB2024Q1",
    expiryDate: "2025-10-15",
    daysToExpiry: 22,
    quantity: 180,
    value: 104400,
    riskLevel: "Critical",
    action: "Flash sale 25% off",
  },
  {
    sku: "FEED-POULTRY-STARTER",
    name: "Poultry Starter Feed",
    batch: "PSF2024AUG",
    expiryDate: "2025-10-28",
    daysToExpiry: 35,
    quantity: 120,
    value: 222000,
    riskLevel: "High",
    action: "Bundle with grower feed",
  },
  {
    sku: "SEED-COT-BGII-001",
    name: "BT Cotton Seeds",
    batch: "BTC2024S1",
    expiryDate: "2025-12-20",
    daysToExpiry: 88,
    quantity: 150,
    value: 139500,
    riskLevel: "Medium",
    action: "Push for next season",
  },
  {
    sku: "FUNG-MANC-75WP",
    name: "Mancozeb 75% WP",
    batch: "MZB2024Q2",
    expiryDate: "2026-01-15",
    daysToExpiry: 114,
    quantity: 280,
    value: 134400,
    riskLevel: "Low",
    action: "Normal sales",
  },
];

// Sales Team Performance
const salesTeamPerformance = [
  {
    id: "ST-001",
    name: "Rajesh Kumar",
    territory: "Pune Rural",
    designation: "Area Manager",
    monthlyTarget: 3500000,
    achieved: 3850000,
    achievementPct: 110,
    customerVisits: 220,
    newCustomers: 28,
    orderConversion: 68,
    avgOrderValue: 17500,
    topProduct: "BT Cotton Seeds",
  },
  {
    id: "ST-002",
    name: "Priya Sharma",
    territory: "Nashik",
    designation: "Territory Officer",
    monthlyTarget: 2800000,
    achieved: 2650000,
    achievementPct: 95,
    customerVisits: 185,
    newCustomers: 22,
    orderConversion: 62,
    avgOrderValue: 14324,
    topProduct: "NPK Fertilizer",
  },
  {
    id: "ST-003",
    name: "Amit Patel",
    territory: "Surat Rural",
    designation: "Sales Executive",
    monthlyTarget: 2500000,
    achieved: 2900000,
    achievementPct: 116,
    customerVisits: 165,
    newCustomers: 35,
    orderConversion: 71,
    avgOrderValue: 17576,
    topProduct: "Drip Irrigation",
  },
  {
    id: "ST-004",
    name: "Sunita Reddy",
    territory: "Belgaum",
    designation: "Territory Officer",
    monthlyTarget: 2200000,
    achieved: 2100000,
    achievementPct: 95,
    customerVisits: 142,
    newCustomers: 18,
    orderConversion: 58,
    avgOrderValue: 14789,
    topProduct: "Paddy Seeds",
  },
];

// Credit & Collections Data
const creditAccounts = [
  {
    customerCode: "CUST-D-001",
    customerName: "Shivaji Agro Traders",
    type: "Dealer",
    creditLimit: 800000,
    outstanding: 685000,
    overdueAmount: 225000,
    daysPastDue: 48,
    lastPayment: "2025-08-12",
    riskScore: 72,
  },
  {
    customerCode: "CUST-F-002",
    customerName: "Krishna Farmers FPO",
    type: "FPO",
    creditLimit: 1200000,
    outstanding: 920000,
    overdueAmount: 0,
    daysPastDue: 0,
    lastPayment: "2025-09-15",
    riskScore: 35,
  },
  {
    customerCode: "CUST-D-003",
    customerName: "Bharat Seeds & Chemicals",
    type: "Dealer",
    creditLimit: 500000,
    outstanding: 495000,
    overdueAmount: 380000,
    daysPastDue: 82,
    lastPayment: "2025-07-10",
    riskScore: 88,
  },
  {
    customerCode: "CUST-R-004",
    customerName: "Modern Agri Retail",
    type: "Retailer",
    creditLimit: 600000,
    outstanding: 420000,
    overdueAmount: 120000,
    daysPastDue: 35,
    lastPayment: "2025-08-25",
    riskScore: 58,
  },
];

// Promotion/Scheme Performance
const activeSchemes = [
  {
    schemeCode: "SCH-KH-001",
    schemeName: "Kharif Bonanza 2025",
    type: "Volume Discount",
    category: "Seeds",
    startDate: "2025-06-01",
    endDate: "2025-07-31",
    targetSales: 8000000,
    achievedSales: 6200000,
    achievementPct: 77.5,
    redemptions: 420,
    marginImpact: -3.2,
    roiPct: 18.5,
  },
  {
    schemeCode: "SCH-FB-002",
    schemeName: "Fertilizer Bundle Pack",
    type: "Product Bundle",
    category: "Fertilizers",
    startDate: "2025-05-15",
    endDate: "2025-06-30",
    targetSales: 5500000,
    achievedSales: 6100000,
    achievementPct: 110.9,
    redemptions: 680,
    marginImpact: -2.1,
    roiPct: 22.8,
  },
  {
    schemeCode: "SCH-CP-003",
    schemeName: "Crop Protection Combo",
    type: "Buy 2 Get 1",
    category: "Crop Protection",
    startDate: "2025-06-15",
    endDate: "2025-08-15",
    targetSales: 3500000,
    achievedSales: 2800000,
    achievementPct: 80,
    redemptions: 285,
    marginImpact: -4.5,
    roiPct: 15.2,
  },
];

// Payment Methods Distribution
const paymentMethods = {
  Cash: 38,
  "UPI/Digital": 32,
  "Credit (30-90 days)": 22,
  "Bank Transfer": 6,
  Cards: 2,
};

// Returns & Quality Issues
const returnReasons = [
  { reason: "Quality Issue", count: 42, value: 185000 },
  { reason: "Expired Product", count: 28, value: 125000 },
  { reason: "Wrong Product", count: 18, value: 65000 },
  { reason: "Damaged in Transit", count: 15, value: 48000 },
  { reason: "Customer Changed Mind", count: 8, value: 22000 },
];

// Hourly Sales Pattern
const hourlySalesPattern = {
  hours: [
    "7AM",
    "8AM",
    "9AM",
    "10AM",
    "11AM",
    "12PM",
    "1PM",
    "2PM",
    "3PM",
    "4PM",
    "5PM",
    "6PM",
    "7PM",
  ],
  sales: [120, 280, 420, 680, 850, 920, 650, 580, 720, 880, 750, 480, 220],
  footfall: [15, 32, 48, 75, 92, 105, 72, 65, 82, 98, 85, 55, 28],
};

// Crop-wise Recommendations
const cropRecommendations = {
  Cotton: {
    season: "Kharif",
    products: [
      "BT Cotton Seeds",
      "NPK 10:26:26",
      "Imidacloprid",
      "Drip Irrigation",
    ],
    avgSpendPerAcre: 12500,
    marketPrice: 6800,
  },
  Wheat: {
    season: "Rabi",
    products: ["HD-2967 Seeds", "DAP", "Urea", "Sulfosulfuron"],
    avgSpendPerAcre: 8200,
    marketPrice: 2200,
  },
  Paddy: {
    season: "Kharif",
    products: ["MTU-1010 Seeds", "Urea", "Zinc Sulphate", "Chlorpyriphos"],
    avgSpendPerAcre: 9500,
    marketPrice: 2100,
  },
  Sugarcane: {
    season: "Annual",
    products: ["CoJ-64 Setts", "SSP", "Potash", "Drip System"],
    avgSpendPerAcre: 25000,
    marketPrice: 3500,
  },
};

// Regulatory Compliance Tracking
const complianceIssues = [
  {
    issueId: "COMP-001",
    type: "License Expiry",
    description: "Pesticide License renewal due",
    severity: "High",
    dueDate: "2025-10-31",
    status: "Pending",
    action: "Submit renewal application",
  },
  {
    issueId: "COMP-002",
    type: "GST Filing",
    description: "Monthly GST return pending",
    severity: "Medium",
    dueDate: "2025-10-20",
    status: "In Progress",
    action: "Complete filing by due date",
  },
  {
    issueId: "COMP-003",
    type: "Product Registration",
    description: "New herbicide registration",
    severity: "Low",
    dueDate: "2025-11-30",
    status: "Initiated",
    action: "Submit documents to authority",
  },
];

// Forecast vs Actual
const forecastData = {
  months: months,
  forecast: [
    3500, 4000, 5800, 8500, 9200, 7500, 6800, 7500, 8200, 8600, 6500, 5000,
  ],
  actual: monthlyRevenue,
  mape: 8.5,
  bias: 2.3,
};

// KPI Card Component
const Kpi = ({ icon: Icon, label, value, hint, colorClass, trend }) => (
  <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xl font-semibold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {(hint || trend) && (
      <div className="mt-2 flex items-center justify-between">
        {hint && <div className="text-xs text-gray-400">{hint}</div>}
        {trend && (
          <div
            className={`text-xs font-medium ${trend > 0 ? "text-green-600" : "text-red-600"}`}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>
    )}
  </div>
);

// Main Dashboard Component
export default function AgroManagementDashboard() {
  const [dateRange, setDateRange] = useState(null);
  const [region, setRegion] = useState("all");
  const [season, setSeason] = useState("kharif");
  const [cropType, setCropType] = useState("all");

  // Calculate KPIs
  const kpis = useMemo(
    () => ({
      totalRevenue: 61000000,
      grossProfit: 13420000,
      netProfit: 7930000,
      totalOrders: 24620,
      avgOrderValue: 24779,
      activeCustomers: 2218,
      inventoryValue: 21200000,
      creditOutstanding: 7800000,
      inventoryTurnover: 6.8,
      customerRetention: 76,
    }),
    [],
  );

  // MODULE 1: Revenue & Margin Analysis
  const revenueMarginChart = useMemo(
    () => ({
      labels: months,
      datasets: [
        {
          type: "bar",
          label: "Revenue (₹ Lakhs)",
          data: monthlyRevenue.map((v) => v / 10),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderRadius: 6,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Gross Margin %",
          data: monthlyMargin,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          tension: 0.35,
          fill: true,
          yAxisID: "y1",
        },
      ],
    }),
    [],
  );

  const revenueMarginOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.label.includes("Revenue")) {
              return `Revenue: ₹${context.parsed.y} Lakhs`;
            }
            return `Margin: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Revenue (₹ Lakhs)" },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Margin %" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  // MODULE 2: Category Performance
  const categoryChart = useMemo(
    () => ({
      labels: productCategories.map((c) => c.category),
      datasets: [
        {
          type: "bar",
          label: "Revenue (₹ Lakhs)",
          data: productCategories.map((c) => c.revenue / 100000),
          backgroundColor: "rgba(99, 102, 241, 0.6)",
          borderRadius: 6,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Margin %",
          data: productCategories.map((c) => c.marginPct),
          borderColor: "#f59e0b",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    }),
    [],
  );

  const categoryOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Revenue (₹ Lakhs)" },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Margin %" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  // MODULE 3: Customer Segmentation
  const customerSegmentChart = useMemo(
    () => ({
      labels: customerSegments.map((s) => s.segment),
      datasets: [
        {
          data: customerSegments.map((s) => s.revenue),
          backgroundColor: [
            "#22c55e",
            "#3b82f6",
            "#f59e0b",
            "#a855f7",
            "#06b6d4",
            "#ef4444",
          ],
        },
      ],
    }),
    [],
  );

  const segmentOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const segment = customerSegments[context.dataIndex];
            return [
              `Revenue: ₹${(segment.revenue / 100000).toFixed(1)}L`,
              `Count: ${segment.count}`,
              `Avg Order: ₹${number(segment.avgOrderValue)}`,
            ];
          },
        },
      },
    },
  };

  // MODULE 4: Product Velocity Matrix
  const velocityMatrixData = useMemo(() => {
    const products = productCatalog.slice(0, 20);

    // bubble size by revenue proxy
    const revenues = products.map((p) => p.mrp * p.monthlyVelocity);
    const minRev = Math.min(...revenues);
    const maxRev = Math.max(...revenues);
    const rMin = 6,
      rMax = 22;
    const scaleR = (rev) =>
      rMin + ((rev - minRev) / (maxRev - minRev || 1)) * (rMax - rMin);

    // 4 soft transparent colors
    const fill = [
      "rgba(59, 130, 246, 0.35)", // blue
      "rgba(16, 185, 129, 0.35)", // green
      "rgba(245, 158, 11, 0.35)", // amber
      "rgba(139, 92, 246, 0.35)", // violet
    ];
    const stroke = [
      "rgba(59, 130, 246, 0.6)",
      "rgba(16, 185, 129, 0.6)",
      "rgba(245, 158, 11, 0.6)",
      "rgba(139, 92, 246, 0.6)",
    ];

    const dataPoints = products.map((p, i) => ({
      x: p.monthlyVelocity,
      y: p.marginPct,
      r: scaleR(p.mrp * p.monthlyVelocity),
      label: p.name,
      revenue: p.mrp * p.monthlyVelocity,
    }));

    return {
      datasets: [
        {
          label: "Products",
          type: "bubble",
          data: dataPoints,
          backgroundColor: dataPoints.map((_, i) => fill[i % fill.length]),
          borderColor: dataPoints.map((_, i) => stroke[i % stroke.length]),
          borderWidth: 1,
        },
      ],
    };
  }, []);

  const velocityMatrixOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const r = ctx.raw;
            // r.revenue is our custom field
            return [
              r.label,
              `Velocity: ${ctx.parsed.x}/mo`,
              `Margin: ${ctx.parsed.y}%`,
              `Revenue: ₹${Math.round(r.revenue).toLocaleString("en-IN")}`,
            ];
          },
        },
      },
    },
    scales: {
      x: { title: { display: true, text: "Monthly Velocity (units)" } },
      y: { title: { display: true, text: "Gross Margin %" } },
    },
  };

  // MODULE 5: Sales Velocity Heatmap
  const velocityHeatmapSeries = useMemo(() => {
    const categories = [
      "Seeds",
      "Fertilizers",
      "Crop Protection",
      "Irrigation",
    ];
    const monthsShort = ["Jun", "Jul", "Aug", "Sep", "Oct"];

    return categories.map((cat) => ({
      name: cat,
      data: monthsShort.map((month) => ({
        x: month,
        y: Math.floor(Math.random() * 40) + 60,
      })),
    }));
  }, []);

  const velocityHeatmapOptions = {
    chart: { type: "heatmap", toolbar: { show: false } },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 40, name: "Low", color: "#fee2e2" },
            { from: 41, to: 60, name: "Medium", color: "#fbbf24" },
            { from: 61, to: 80, name: "Good", color: "#60a5fa" },
            { from: 81, to: 100, name: "Excellent", color: "#22c55e" },
          ],
        },
      },
    },
    dataLabels: { enabled: true },
    xaxis: { type: "category", title: { text: "Month" } },
    yaxis: { title: { text: "Category" } },
  };

  // MODULE 6: District Performance Map (TreeMap)
  const districtTreemapSeries = useMemo(
    () => [
      {
        data: districtPerformance.map((d) => ({
          x: `${d.district}-${d.taluka}`,
          y: d.revenue / 100000,
          district: d.district,
          taluka: d.taluka,
          state: d.state,
          farmers: d.farmers,
          dealers: d.dealers,
          penetration: d.penetration,
        })),
      },
    ],
    [],
  );

  const districtTreemapOptions = {
    chart: { type: "treemap", toolbar: { show: false } },
    legend: { show: false },
    plotOptions: {
      treemap: {
        enableShades: true,
        shadeIntensity: 0.3,
        distributed: false,
        colorScale: {
          ranges: [
            { from: 0, to: 40, name: "Low", color: "#a7f3d0" }, // Light Green
            { from: 41, to: 50, name: "Medium", color: "#34d399" }, // Medium Green
            { from: 51, to: 60, name: "Good", color: "#059669" }, // Dark Green
            { from: 61, to: 100, name: "Excellent", color: "#065f46" }, // Deep Green
          ],
        },
      },
    },
    tooltip: {
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const data = w.config.series[seriesIndex].data[dataPointIndex];
        return `
          <div class="p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div class="font-semibold text-gray-900 mb-2">${data.district} - ${data.taluka}</div>
            <div class="text-sm text-gray-600 space-y-1">
              <div><span class="font-medium">State:</span> ${data.state}</div>
              <div><span class="font-medium">Revenue:</span> ₹${data.y} Lakhs</div>
              <div><span class="font-medium">Farmers:</span> ${data.farmers.toLocaleString()}</div>
              <div><span class="font-medium">Dealers:</span> ${data.dealers}</div>
              <div><span class="font-medium">Penetration:</span> ${data.penetration}%</div>
            </div>
          </div>
        `;
      },
    },
  };

  // MODULE 7: Stock Health Radial
  const stockHealthRadial = {
    series: [
      inventoryMetrics[0].fillRate,
      inventoryMetrics[1].fillRate,
      inventoryMetrics[2].fillRate,
    ],
    options: {
      chart: { type: "radialBar" },
      plotOptions: {
        radialBar: {
          dataLabels: {
            total: {
              show: true,
              label: "Avg Fill Rate",
              formatter: () => "95.2%",
            },
          },
        },
      },
      labels: ["Seeds", "Fertilizers", "Crop Protection"],
      colors: ["#22c55e", "#3b82f6", "#f59e0b"],
    },
  };

  // MODULE 8: Payment Method Distribution
  const paymentChart = useMemo(
    () => ({
      labels: Object.keys(paymentMethods),
      datasets: [
        {
          data: Object.values(paymentMethods),
          backgroundColor: [
            "#94a3b8",
            "#22c55e",
            "#3b82f6",
            "#f59e0b",
            "#a855f7",
          ],
        },
      ],
    }),
    [],
  );

  // MODULE 9: Inventory Turnover by Category
  const inventoryTurnoverChart = useMemo(
    () => ({
      labels: inventoryMetrics.map((i) => i.category),
      datasets: [
        {
          type: "bar",
          label: "Turnover Ratio",
          data: inventoryMetrics.map((i) => i.turnoverRatio),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Days on Hand",
          data: inventoryMetrics.map((i) => i.daysOnHand),
          borderColor: "#ef4444",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    }),
    [],
  );

  const inventoryTurnoverOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Turnover Ratio" },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Days on Hand" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  // MODULE 10: Returns Analysis
  const returnsChart = useMemo(
    () => ({
      labels: returnReasons.map((r) => r.reason),
      datasets: [
        {
          data: returnReasons.map((r) => r.count),
          backgroundColor: [
            "#ef4444",
            "#f59e0b",
            "#3b82f6",
            "#10b981",
            "#a855f7",
          ],
        },
      ],
    }),
    [],
  );

  // MODULE 11: Hourly Sales Pattern
  const hourlySalesChart = useMemo(
    () => ({
      labels: hourlySalesPattern.hours,
      datasets: [
        {
          type: "line",
          label: "Sales (₹K)",
          data: hourlySalesPattern.sales,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Footfall",
          data: hourlySalesPattern.footfall,
          backgroundColor: "rgba(16, 185, 129, 0.5)",
          yAxisID: "y1",
        },
      ],
    }),
    [],
  );

  const hourlySalesOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Sales (₹K)" } },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Footfall" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  // MODULE 12: Forecast vs Actual
  const forecastChart = useMemo(
    () => ({
      labels: forecastData.months,
      datasets: [
        {
          type: "line",
          label: "Forecast",
          data: forecastData.forecast,
          borderColor: "#3b82f6",
          borderDash: [5, 5],
          tension: 0.3,
        },
        {
          type: "line",
          label: "Actual",
          data: forecastData.actual,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    }),
    [],
  );

  return (
    <Page title="Agro Management Dashboard - Complete Analytics">
      <div className="overflow-hidden pb-8">
        {/* Filters */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 lg:col-span-6">
            <Calendar
              value={dateRange}
              onChange={(e) => setDateRange(e.value)}
              selectionMode="range"
              placeholder="Select date range"
              readOnlyInput
              showIcon
              hideOnRangeSelection
              className="w-full"
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <Dropdown
              value={region}
              onChange={(e) => setRegion(e.value)}
              options={regions}
              className="w-full"
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <Dropdown
              value={season}
              onChange={(e) => setSeason(e.value)}
              options={seasons}
              className="w-full"
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <Dropdown
              value={cropType}
              onChange={(e) => setCropType(e.value)}
              options={cropTypes}
              className="w-full"
            />
          </div>
        </div>

        {/* KPI Cards Row 1 */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={CurrencyDollarIcon}
              label="Total Revenue"
              value={`₹${(kpis.totalRevenue / 10000000).toFixed(1)} Cr`}
              hint="FY 2025-26"
              trend={15}
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={BanknotesIcon}
              label="Gross Profit"
              value={`₹${(kpis.grossProfit / 100000).toFixed(1)}L`}
              hint={`GM: ${((kpis.grossProfit / kpis.totalRevenue) * 100).toFixed(1)}%`}
              trend={12}
              colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ArrowTrendingUpIcon}
              label="Net Profit"
              value={`₹${(kpis.netProfit / 100000).toFixed(1)}L`}
              hint={`NPM: ${((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1)}%`}
              trend={18}
              colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ShoppingBagIcon}
              label="Total Orders"
              value={number(kpis.totalOrders)}
              hint={`Avg: ₹${number(kpis.avgOrderValue)}`}
              trend={8}
              colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
            />
          </div>
        </div>

        {/* KPI Cards Row 2 */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={UsersIcon}
              label="Active Customers"
              value={number(kpis.activeCustomers)}
              hint={`Retention: ${kpis.customerRetention}%`}
              trend={-2}
              colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={CubeIcon}
              label="Inventory Value"
              value={`₹${(kpis.inventoryValue / 10000000).toFixed(2)} Cr`}
              hint={`Turnover: ${kpis.inventoryTurnover}x`}
              trend={5}
              colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ScaleIcon}
              label="Credit Outstanding"
              value={`₹${(kpis.creditOutstanding / 100000).toFixed(1)}L`}
              hint="DSO: 42 days"
              trend={-8}
              colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={TruckIcon}
              label="Supplier Count"
              value={suppliers.length}
              hint="OTIF: 93.2%"
              trend={0}
              colorClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
            />
          </div>
        </div>

        {/* MODULE 1: Revenue & Margin Analysis + Stock Health */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-8 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Revenue & Margin Trend</h3>
            </div>
            <div className="h-[320px]">
              <Chart
                type="bar"
                data={revenueMarginChart}
                options={revenueMarginOptions}
                style={{ height: "100%" }}
              />
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Stock Fill Rate</h3>
            </div>
            <ReactApexChart
              options={stockHealthRadial.options}
              series={stockHealthRadial.series}
              type="radialBar"
              height={320}
            />
          </div>
        </div>

        {/* MODULE 2: Category Performance + Customer Segments */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-7 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Category Performance</h3>
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={categoryChart}
                options={categoryOptions}
                style={{ height: "100%" }}
              />
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-5 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Customer Segments</h3>
            </div>
            <div className="h-[300px]">
              <Chart
                type="doughnut"
                data={customerSegmentChart}
                options={segmentOptions}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* MODULE 3: Product Inventory Status Table */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BeakerIcon className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">
                  Product Inventory Management
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Total SKUs: {productCatalog.length} | Low Stock:{" "}
                <span className="font-semibold text-red-600">8</span>
              </div>
            </div>
            <DataTable
              value={productCatalog}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="sku"
                header="SKU"
                sortable
                style={{ minWidth: 140 }}
              />
              <Column
                field="name"
                header="Product Name"
                sortable
                style={{ minWidth: 220 }}
              />
              <Column field="category" header="Category" sortable />
              <Column field="brand" header="Brand" sortable />
              <Column
                field="currentStock"
                header="Stock"
                sortable
                body={(rowData) => (
                  <span
                    className={
                      rowData.currentStock < rowData.reorderLevel
                        ? "font-semibold text-red-600"
                        : ""
                    }
                  >
                    {rowData.currentStock} {rowData.uom}
                  </span>
                )}
              />
              <Column
                field="mrp"
                header="MRP"
                sortable
                body={(rowData) => `₹${rowData.mrp}`}
              />
              <Column
                field="marginPct"
                header="Margin"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.marginPct}%`}
                    severity={
                      rowData.marginPct > 25
                        ? "success"
                        : rowData.marginPct > 15
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
              <Column
                field="monthlyVelocity"
                header="Velocity"
                sortable
                body={(rowData) => `${rowData.monthlyVelocity}/mo`}
              />
              <Column
                header="Stock Days"
                sortable
                body={(rowData) => {
                  const days = Math.round(
                    (rowData.currentStock / rowData.monthlyVelocity) * 30,
                  );
                  return (
                    <span
                      className={
                        days < 15
                          ? "text-red-600"
                          : days < 30
                            ? "text-amber-600"
                            : ""
                      }
                    >
                      {days} days
                    </span>
                  );
                }}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 4: Product Velocity Matrix + Sales Velocity Heatmap */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <BeakerIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">
                Product Matrix (Velocity vs Margin)
              </h3>
            </div>
            <div className="h-[320px]">
              <Chart
                type="bubble"
                data={velocityMatrixData}
                options={velocityMatrixOptions}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>
                High Velocity + High Margin ={" "}
                <span className="font-semibold text-emerald-600">Stars</span>
              </div>
              <div>
                High Velocity + Low Margin ={" "}
                <span className="font-semibold text-blue-600">
                  Volume Drivers
                </span>
              </div>
              <div>
                Low Velocity + High Margin ={" "}
                <span className="font-semibold text-amber-600">Niche</span>
              </div>
              <div>
                Low Velocity + Low Margin ={" "}
                <span className="font-semibold text-red-600">Review</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">
                Category Sales Velocity (Kharif)
              </h3>
            </div>
            <ReactApexChart
              type="heatmap"
              series={velocityHeatmapSeries}
              options={velocityHeatmapOptions}
              height={320}
            />
          </div>
        </div>

        {/* MODULE 5: Store Network Performance */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BuildingStorefrontIcon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">
                  Store Network Performance
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Total Stores: {storeNetwork.length} | Company Owned: 2 |
                Franchise: 2
              </div>
            </div>
            <DataTable
              value={storeNetwork}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="name"
                header="Store Name"
                sortable
                style={{ minWidth: 180 }}
              />
              <Column
                field="location"
                header="Location"
                sortable
                style={{ minWidth: 160 }}
              />
              <Column field="type" header="Type" sortable />
              <Column
                field="monthlyRevenue"
                header="Monthly Revenue"
                sortable
                body={(rowData) =>
                  `₹${(rowData.monthlyRevenue / 100000).toFixed(1)}L`
                }
              />
              <Column field="monthlyOrders" header="Orders" sortable />
              <Column
                field="avgOrderValue"
                header="Avg Order"
                sortable
                body={(rowData) => `₹${number(rowData.avgOrderValue)}`}
              />
              <Column
                field="conversionRate"
                header="Conversion"
                sortable
                body={(rowData) => `${rowData.conversionRate}%`}
              />
              <Column field="topCategory" header="Top Category" sortable />
              <Column
                field="operatingCostPct"
                header="Op Cost"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.operatingCostPct}%`}
                    severity={
                      rowData.operatingCostPct < 7
                        ? "success"
                        : rowData.operatingCostPct < 9
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 6: District Performance Analysis */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">
                Top Districts Performance
              </h3>
            </div>
            <DataTable
              value={districtPerformance}
              paginator
              rows={8}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column field="state" header="State" sortable />
              <Column field="district" header="District" sortable />
              <Column field="taluka" header="Taluka" sortable />
              <Column
                field="revenue"
                header="Revenue"
                sortable
                body={(rowData) => `₹${(rowData.revenue / 100000).toFixed(1)}L`}
              />
              <Column
                field="farmers"
                header="Farmers"
                sortable
                body={(rowData) => rowData.farmers.toLocaleString()}
              />
              <Column field="dealers" header="Dealers" sortable />
              <Column
                field="penetration"
                header="Penetration"
                sortable
                body={(rowData) => (
                  <ProgressBar value={rowData.penetration} showValue={true} />
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 7: Supplier Performance Analysis */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold">
                  Supplier Performance Scorecard
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Avg OTIF: 93.8% | Avg Lead Time: 6.8 days
              </div>
            </div>
            <DataTable
              value={suppliers}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="name"
                header="Supplier"
                sortable
                style={{ minWidth: 200 }}
              />
              <Column field="category" header="Category" sortable />
              <Column
                field="onTimeDelivery"
                header="OTIF %"
                sortable
                body={(rowData) => (
                  <span
                    className={
                      rowData.onTimeDelivery >= 95
                        ? "text-green-600"
                        : rowData.onTimeDelivery >= 90
                          ? ""
                          : "text-red-600"
                    }
                  >
                    {rowData.onTimeDelivery}%
                  </span>
                )}
              />
              <Column
                field="qualityScore"
                header="Quality"
                sortable
                body={(rowData) => `${rowData.qualityScore}%`}
              />
              <Column
                field="defectRate"
                header="Defects"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.defectRate}%`}
                    severity={
                      rowData.defectRate < 1
                        ? "success"
                        : rowData.defectRate < 2
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
              <Column field="leadTimeDays" header="Lead (days)" sortable />
              <Column
                field="totalPurchase"
                header="Purchase YTD"
                sortable
                body={(rowData) =>
                  `₹${(rowData.totalPurchase / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="pendingPayment"
                header="Pending"
                sortable
                body={(rowData) =>
                  `₹${(rowData.pendingPayment / 100000).toFixed(1)}L`
                }
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 8: Inventory Health Metrics */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-7 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold">
                Inventory Turnover Analysis
              </h3>
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={inventoryTurnoverChart}
                options={inventoryTurnoverOptions}
                style={{ height: "100%" }}
              />
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-5 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">
                Inventory KPIs by Category
              </h3>
            </div>
            <DataTable
              value={inventoryMetrics}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column field="category" header="Category" />
              <Column
                field="fillRate"
                header="Fill Rate"
                body={(rowData) => `${rowData.fillRate}%`}
              />
              <Column
                field="stockOutRate"
                header="Stock Out"
                body={(rowData) => (
                  <span
                    className={rowData.stockOutRate > 4 ? "text-red-600" : ""}
                  >
                    {rowData.stockOutRate}%
                  </span>
                )}
              />
              <Column
                field="gmroi"
                header="GMROI"
                body={(rowData) => (
                  <Tag
                    value={rowData.gmroi}
                    severity={
                      rowData.gmroi > 2.5
                        ? "success"
                        : rowData.gmroi > 1.5
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 9: Near Expiry Products Alert */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">
                  Near Expiry Products - Immediate Action Required
                </h3>
              </div>
              <div className="text-sm">
                Total at Risk:{" "}
                <span className="font-semibold text-red-600">
                  ₹{number(600300)}
                </span>
              </div>
            </div>
            <DataTable
              value={nearExpiryProducts}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="sku"
                header="SKU"
                sortable
                style={{ minWidth: 140 }}
              />
              <Column
                field="name"
                header="Product"
                sortable
                style={{ minWidth: 180 }}
              />
              <Column field="batch" header="Batch" sortable />
              <Column field="expiryDate" header="Expiry Date" sortable />
              <Column
                field="daysToExpiry"
                header="Days Left"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.daysToExpiry} days`}
                    severity={
                      rowData.daysToExpiry < 30
                        ? "danger"
                        : rowData.daysToExpiry < 60
                          ? "warning"
                          : "info"
                    }
                  />
                )}
              />
              <Column field="quantity" header="Qty" sortable />
              <Column
                field="value"
                header="Value at Risk"
                sortable
                body={(rowData) => `₹${number(rowData.value)}`}
              />
              <Column
                field="riskLevel"
                header="Risk"
                body={(rowData) => (
                  <Tag
                    value={rowData.riskLevel}
                    severity={
                      rowData.riskLevel === "Critical"
                        ? "danger"
                        : rowData.riskLevel === "High"
                          ? "warning"
                          : "info"
                    }
                  />
                )}
              />
              <Column
                field="action"
                header="Action"
                style={{ minWidth: 150 }}
              />
            </DataTable>
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-relaxed dark:bg-slate-700">
              <strong>Critical Alert:</strong> 2 products expiring within 30
              days worth ₹3,26,400. Implement flash sales immediately. Contact
              category managers for clearance approval.
            </div>
          </div>
        </div>

        {/* MODULE 10: Sales Team Performance */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">
                  Sales Team Performance Dashboard
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Team Achievement:{" "}
                <span className="font-semibold text-green-600">104%</span> | New
                Customers: 103
              </div>
            </div>
            <DataTable
              value={salesTeamPerformance}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="name"
                header="Sales Person"
                sortable
                style={{ minWidth: 150 }}
              />
              <Column field="territory" header="Territory" sortable />
              <Column
                field="monthlyTarget"
                header="Target"
                sortable
                body={(rowData) =>
                  `₹${(rowData.monthlyTarget / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="achieved"
                header="Achieved"
                sortable
                body={(rowData) =>
                  `₹${(rowData.achieved / 100000).toFixed(1)}L`
                }
              />
              <Column
                header="Achievement"
                sortable
                body={(rowData) => (
                  <div>
                    <ProgressBar
                      value={rowData.achievementPct}
                      showValue={false}
                      className="mb-1"
                    />
                    <span
                      className={
                        rowData.achievementPct >= 100
                          ? "font-semibold text-green-600"
                          : "text-amber-600"
                      }
                    >
                      {rowData.achievementPct}%
                    </span>
                  </div>
                )}
              />
              <Column field="customerVisits" header="Visits" sortable />
              <Column field="newCustomers" header="New" sortable />
              <Column
                field="orderConversion"
                header="Conv %"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.orderConversion}%`}
                    severity={
                      rowData.orderConversion >= 65
                        ? "success"
                        : rowData.orderConversion >= 55
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
              <Column field="topProduct" header="Top Product" />
            </DataTable>
          </div>
        </div>

        {/* MODULE 11: Credit Management & Collections */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScaleIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold">
                  Credit Management & Collections
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Total Outstanding:{" "}
                <span className="font-semibold text-amber-600">₹78L</span> |
                Overdue:{" "}
                <span className="font-semibold text-red-600">₹11.5L</span>
              </div>
            </div>
            <DataTable
              value={creditAccounts}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="customerName"
                header="Customer"
                sortable
                style={{ minWidth: 200 }}
              />
              <Column field="type" header="Type" sortable />
              <Column
                field="creditLimit"
                header="Credit Limit"
                sortable
                body={(rowData) =>
                  `₹${(rowData.creditLimit / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="outstanding"
                header="Outstanding"
                sortable
                body={(rowData) =>
                  `₹${(rowData.outstanding / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="overdueAmount"
                header="Overdue"
                sortable
                body={(rowData) => (
                  <span
                    className={
                      rowData.overdueAmount > 0
                        ? "font-semibold text-red-600"
                        : "text-green-600"
                    }
                  >
                    ₹{(rowData.overdueAmount / 1000).toFixed(0)}K
                  </span>
                )}
              />
              <Column
                field="daysPastDue"
                header="Days Overdue"
                sortable
                body={(rowData) => (
                  <Tag
                    value={
                      rowData.daysPastDue > 0
                        ? `${rowData.daysPastDue} days`
                        : "Current"
                    }
                    severity={
                      rowData.daysPastDue > 60
                        ? "danger"
                        : rowData.daysPastDue > 30
                          ? "warning"
                          : "success"
                    }
                  />
                )}
              />
              <Column
                field="riskScore"
                header="Risk Score"
                sortable
                body={(rowData) => (
                  <div>
                    <ProgressBar
                      value={rowData.riskScore}
                      showValue={true}
                      className={
                        rowData.riskScore > 70
                          ? "p-progressbar-danger"
                          : rowData.riskScore > 50
                            ? "p-progressbar-warning"
                            : ""
                      }
                    />
                  </div>
                )}
              />
              <Column
                header="Action"
                body={() => (
                  <Button
                    label="Remind"
                    icon="pi pi-envelope"
                    className="p-button-text p-button-sm"
                  />
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 12: Active Schemes Performance */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">
                Active Promotional Schemes
              </h3>
            </div>
            <DataTable
              value={activeSchemes}
              paginator
              rows={5}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column
                field="schemeName"
                header="Scheme Name"
                sortable
                style={{ minWidth: 200 }}
              />
              <Column field="type" header="Type" sortable />
              <Column field="category" header="Category" sortable />
              <Column
                field="targetSales"
                header="Target"
                sortable
                body={(rowData) =>
                  `₹${(rowData.targetSales / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="achievedSales"
                header="Achieved"
                sortable
                body={(rowData) =>
                  `₹${(rowData.achievedSales / 100000).toFixed(1)}L`
                }
              />
              <Column
                field="achievementPct"
                header="Achievement"
                sortable
                body={(rowData) => (
                  <ProgressBar
                    value={rowData.achievementPct}
                    showValue={true}
                  />
                )}
              />
              <Column field="redemptions" header="Redemptions" sortable />
              <Column
                field="marginImpact"
                header="Margin Impact"
                sortable
                body={(rowData) => (
                  <span
                    className={
                      rowData.marginImpact < -3
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {rowData.marginImpact}%
                  </span>
                )}
              />
              <Column
                field="roiPct"
                header="ROI %"
                sortable
                body={(rowData) => (
                  <Tag
                    value={`${rowData.roiPct}%`}
                    severity={
                      rowData.roiPct > 20
                        ? "success"
                        : rowData.roiPct > 15
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* MODULE 13: Payment Methods & Returns Analysis */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <BanknotesIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">
                Payment Method Distribution
              </h3>
            </div>
            <div className="h-[280px]">
              <Chart
                type="doughnut"
                data={paymentChart}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                      callbacks: {
                        label: (context) =>
                          `${context.label}: ${context.parsed}%`,
                      },
                    },
                  },
                }}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Digital Adoption:{" "}
              <span className="font-semibold text-green-600">40%</span> (UPI +
              Bank Transfer + Cards)
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">
                Product Returns Analysis
              </h3>
            </div>
            <div className="h-[280px]">
              <Chart
                type="doughnut"
                data={returnsChart}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const reason = returnReasons[context.dataIndex];
                          return [
                            `${reason.reason}: ${reason.count} cases`,
                            `Value: ₹${number(reason.value)}`,
                          ];
                        },
                      },
                    },
                  },
                }}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Total Returns: 111 | Value: ₹4,45,000 | Return Rate: 0.73%
            </div>
          </div>
        </div>

        {/* MODULE 14: Hourly Sales Pattern & Forecast Analysis */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">
                Hourly Sales & Footfall Pattern
              </h3>
            </div>
            <div className="h-[300px]">
              <Chart
                type="line"
                data={hourlySalesChart}
                options={hourlySalesOptions}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs dark:bg-slate-700">
              Peak Hours: 11 AM - 12 PM & 4 PM - 5 PM | Schedule staff
              accordingly
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">Forecast vs Actual</h3>
              </div>
              <div className="text-sm text-gray-500">
                MAPE: {forecastData.mape}% | Bias: {forecastData.bias}%
              </div>
            </div>
            <div className="h-[300px]">
              <Chart
                type="line"
                data={forecastChart}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "Revenue (₹K)" },
                    },
                  },
                }}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* MODULE 15: Regulatory Compliance */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold">
                Regulatory Compliance Tracker
              </h3>
            </div>
            <DataTable
              value={complianceIssues}
              className="rounded border"
              responsiveLayout="scroll"
            >
              <Column field="issueId" header="ID" sortable />
              <Column field="type" header="Type" sortable />
              <Column
                field="description"
                header="Description"
                sortable
                style={{ minWidth: 250 }}
              />
              <Column
                field="severity"
                header="Severity"
                sortable
                body={(rowData) => (
                  <Tag
                    value={rowData.severity}
                    severity={
                      rowData.severity === "High"
                        ? "danger"
                        : rowData.severity === "Medium"
                          ? "warning"
                          : "info"
                    }
                  />
                )}
              />
              <Column field="dueDate" header="Due Date" sortable />
              <Column
                field="status"
                header="Status"
                sortable
                body={(rowData) => (
                  <Tag
                    value={rowData.status}
                    severity={
                      rowData.status === "Pending"
                        ? "warning"
                        : rowData.status === "In Progress"
                          ? "info"
                          : "success"
                    }
                  />
                )}
              />
              <Column
                field="action"
                header="Required Action"
                style={{ minWidth: 200 }}
              />
            </DataTable>
          </div>
        </div>

        {/* Executive Summary Section */}
        <div className="transition-content mt-6 px-(--margin-x)">
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:from-gray-800 dark:to-gray-700">
            <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
              Executive Summary & Key Actions
            </h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6">
                <h4 className="mb-2 font-semibold text-green-600">
                  Achievements
                </h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                    Revenue growth of 15% YoY, exceeding target by ₹48L
                  </li>
                  <li className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-green-600" />
                    Gross margin improved to 22% from 20.5% last year
                  </li>
                  <li className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-green-600" />
                    Customer retention at 76%, up from 71%
                  </li>
                  <li className="flex items-center gap-2">
                    <BanknotesIcon className="h-5 w-5 text-green-600" />
                    Digital payment adoption reached 40%
                  </li>
                </ul>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <h4 className="mb-2 font-semibold text-red-600">
                  Critical Actions Required
                </h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    Clear ₹3.26L worth products expiring in 30 days
                  </li>
                  <li className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    Collect ₹11.5L overdue payments from 3 accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    Restock 8 SKUs below reorder level
                  </li>
                  <li className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    Renew pesticide license by Oct 31
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-4">
                <h4 className="mb-2 font-semibold text-blue-600">
                  Top Performers
                </h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    Ludhiana store: ₹1.58 Cr/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    Rajesh Kumar: 110% target achieved
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    Seeds category: 28% margin
                  </li>
                </ul>
              </div>
              <div className="col-span-12 lg:col-span-4">
                <h4 className="mb-2 font-semibold text-amber-600">
                  Opportunities
                </h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-amber-600" />
                    Expand drip irrigation (26% margin)
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-amber-600" />
                    Focus on Punjab market (48% penetration)
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-amber-600" />
                    Push bio-pesticides (growing 22% YoY)
                  </li>
                </ul>
              </div>
              <div className="col-span-12 lg:col-span-4">
                <h4 className="mb-2 font-semibold text-purple-600">
                  Strategic Focus
                </h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <FlagIcon className="h-5 w-5 text-purple-600" />
                    Kharif preparation for cotton farmers
                  </li>
                  <li className="flex items-center gap-2">
                    <FlagIcon className="h-5 w-5 text-purple-600" />
                    Improve Karnataka penetration (26%)
                  </li>
                  <li className="flex items-center gap-2">
                    <FlagIcon className="h-5 w-5 text-purple-600" />
                    Reduce credit days from 42 to 35
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="transition-content mt-6 flex items-center justify-between px-(--margin-x)">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString("en-IN")} | Next refresh in
            15 minutes
          </div>
          <div className="flex gap-2">
            <Button
              label="Export Excel"
              icon="pi pi-file-excel"
              className="p-button-outlined p-button-success"
              onClick={() => alert("Exporting to Excel...")}
            />
            <Button
              label="PDF Report"
              icon="pi pi-file-pdf"
              className="p-button-outlined p-button-danger"
              onClick={() => alert("Generating PDF report...")}
            />
            <Button
              label="Email Dashboard"
              icon="pi pi-envelope"
              className="p-button-outlined"
              onClick={() => alert("Emailing dashboard...")}
            />
            <Button
              label="Schedule Meeting"
              icon="pi pi-calendar"
              onClick={() => alert("Opening calendar...")}
            />
          </div>
        </div>
      </div>
      <BottomToTop />
    </Page>
  );
}
