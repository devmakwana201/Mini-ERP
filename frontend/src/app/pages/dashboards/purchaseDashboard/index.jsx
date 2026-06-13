// AgroPurchaseDashboard.jsx
// Comprehensive Agricultural Purchase Management Dashboard (JS)
// PrimeReact (Chart.js) + ApexCharts, all dummy data (realistic) — swap with APIs later.

import React, { useMemo, useState } from "react";
import { Page } from "components/shared/Page";

// PrimeReact
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { InputSwitch } from "primereact/inputswitch";
import { Slider } from "primereact/slider";
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
  ShoppingCartIcon,
  TruckIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  BeakerIcon,
  GlobeAsiaAustraliaIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------
// Helper utilities
// ---------------------------------
const number = (n) => (typeof n === "number" ? n.toLocaleString() : n);

const vendors = [
  { label: "All Vendors", value: "all" },
  { label: "AgriSource Inc.", value: "agrisource" },
  { label: "Global Seeds", value: "globalseeds" },
  { label: "ChemGrow Ltd.", value: "chemgrow" },
  { label: "BioSolutions", value: "biosolutions" },
];

const purchaseCategories = [
  { label: "All Categories", value: "all" },
  { label: "Seeds", value: "seeds" },
  { label: "Fertilizers", value: "fertilizers" },
  { label: "Pesticides", value: "pesticides" },
  { label: "Equipment", value: "equipment" },
];

const procurementTypes = [
  { label: "All Types", value: "all" },
  { label: "Direct Purchase", value: "direct" },
  { label: "Contract", value: "contract" },
  { label: "Tender", value: "tender" },
  { label: "Import", value: "import" },
];

// ---------------------------------
// Dummy datasets
// ---------------------------------
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// High-level PO summary
const purchaseOrdersSummary = {
  total: 892,
  pending: 124,
  approved: 568,
  received: 178,
  cancelled: 22,
  totalValue: 8420000,
  avgOrderValue: 9439,
};

// Monthly Purchase Trends
const monthlyPurchaseData = {
  purchaseValue: [
    680, 720, 890, 760, 920, 1050, 1180, 960, 880, 940, 1020, 1100,
  ], // ₹K
  orderCount: [42, 48, 56, 45, 62, 78, 92, 68, 58, 64, 72, 85],
  avgLeadTime: [7.2, 6.8, 7.5, 8.1, 6.9, 7.3, 8.2, 7.6, 6.5, 7.0, 7.8, 7.4], // days
};

// Vendor Performance (table)
const vendorPerformanceMetrics = [
  {
    vendor: "AgriSource Inc.",
    totalPurchase: 2840000,
    onTimeDelivery: 96.5,
    qualityScore: 94.2,
    priceCompetitiveness: 92,
    responseTime: 2.4,
    defectRate: 0.8,
    paymentTerms: "Net 30",
    totalOrders: 245,
  },
  {
    vendor: "Global Seeds",
    totalPurchase: 1920000,
    onTimeDelivery: 89.3,
    qualityScore: 91.5,
    priceCompetitiveness: 88,
    responseTime: 3.6,
    defectRate: 2.1,
    paymentTerms: "Net 45",
    totalOrders: 186,
  },
  {
    vendor: "ChemGrow Ltd.",
    totalPurchase: 2180000,
    onTimeDelivery: 98.2,
    qualityScore: 96.8,
    priceCompetitiveness: 85,
    responseTime: 1.8,
    defectRate: 0.4,
    paymentTerms: "Net 30",
    totalOrders: 198,
  },
  {
    vendor: "BioSolutions",
    totalPurchase: 1480000,
    onTimeDelivery: 92.7,
    qualityScore: 89.3,
    priceCompetitiveness: 94,
    responseTime: 4.2,
    defectRate: 3.2,
    paymentTerms: "Net 60",
    totalOrders: 142,
  },
];

// Category-wise Purchase Analysis
const categoryPurchaseData = [
  {
    category: "Seeds",
    value: 2680000,
    growth: 12.4,
    items: 4280,
    avgPrice: 626,
  },
  {
    category: "Fertilizers",
    value: 3420000,
    growth: 8.2,
    items: 8640,
    avgPrice: 396,
  },
  {
    category: "Pesticides",
    value: 1840000,
    growth: 15.6,
    items: 2960,
    avgPrice: 622,
  },
  {
    category: "Equipment",
    value: 480000,
    growth: -5.2,
    items: 182,
    avgPrice: 2637,
  },
];

// Price Variation (point-in-time vs last month vs market)
const priceVariationData = {
  products: ["Urea", "DAP", "NPK", "Glyphosate", "Corn Seeds", "Wheat Seeds"],
  currentPrices: [320, 580, 420, 680, 1200, 980],
  lastMonthPrices: [310, 560, 415, 690, 1180, 975],
  lastYearPrices: [285, 520, 380, 640, 1050, 920],
  marketPrices: [315, 575, 418, 675, 1190, 985],
};

// Purchase Order Aging
const purchaseOrderAging = [
  { range: "0-7 days", count: 42, value: 680000 },
  { range: "8-15 days", count: 38, value: 520000 },
  { range: "16-30 days", count: 28, value: 410000 },
  { range: "31-60 days", count: 12, value: 180000 },
  { range: ">60 days", count: 4, value: 62000 },
];

// Pending Approvals
const pendingApprovals = [
  {
    poNumber: "PO-2025-0892",
    vendor: "AgriSource Inc.",
    category: "Fertilizers",
    amount: 145000,
    requestDate: "2025-09-08",
    priority: "High",
    requestor: "Raj Kumar",
    items: 12,
  },
  {
    poNumber: "PO-2025-0891",
    vendor: "Global Seeds",
    category: "Seeds",
    amount: 98000,
    requestDate: "2025-09-07",
    priority: "Medium",
    requestor: "Priya Sharma",
    items: 8,
  },
  {
    poNumber: "PO-2025-0890",
    vendor: "ChemGrow Ltd.",
    category: "Pesticides",
    amount: 76000,
    requestDate: "2025-09-06",
    priority: "High",
    requestor: "Amit Patel",
    items: 6,
  },
  {
    poNumber: "PO-2025-0889",
    vendor: "BioSolutions",
    category: "Biologicals",
    amount: 52000,
    requestDate: "2025-09-05",
    priority: "Low",
    requestor: "Neha Singh",
    items: 4,
  },
];

// Contracts
const activeContracts = [
  {
    contractId: "CTR-2025-012",
    vendor: "AgriSource Inc.",
    type: "Annual Supply",
    value: 4200000,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    utilized: 68,
    status: "Active",
    items: ["Urea", "DAP", "NPK"],
  },
  {
    contractId: "CTR-2025-008",
    vendor: "Global Seeds",
    type: "Seasonal",
    value: 2800000,
    startDate: "2025-03-01",
    endDate: "2025-10-31",
    utilized: 72,
    status: "Active",
    items: ["Corn Seeds", "Wheat Seeds"],
  },
  {
    contractId: "CTR-2025-015",
    vendor: "ChemGrow Ltd.",
    type: "Rate Contract",
    value: 1600000,
    startDate: "2025-02-01",
    endDate: "2026-01-31",
    utilized: 45,
    status: "Active",
    items: ["Pesticides", "Herbicides"],
  },
];

// Payment Schedule
const paymentSchedule = [
  {
    vendor: "AgriSource Inc.",
    dueAmount: 245000,
    dueDate: "2025-09-15",
    aging: "Current",
    discount: "2% if paid by Sept 10",
  },
  {
    vendor: "Global Seeds",
    dueAmount: 182000,
    dueDate: "2025-09-20",
    aging: "Current",
    discount: "None",
  },
  {
    vendor: "ChemGrow Ltd.",
    dueAmount: 156000,
    dueDate: "2025-09-18",
    aging: "Current",
    discount: "1.5% if paid early",
  },
  {
    vendor: "BioSolutions",
    dueAmount: 98000,
    dueDate: "2025-09-25",
    aging: "Current",
    discount: "None",
  },
  {
    vendor: "FarmTech Supplies",
    dueAmount: 42000,
    dueDate: "2025-08-30",
    aging: "Overdue",
    discount: "Lost",
  },
];

// Inventory vs Purchase Balance
const inventoryPurchaseBalance = [
  {
    category: "Seeds",
    currentStock: 4200,
    reorderLevel: 2000,
    pendingOrders: 1500,
    consumptionRate: 420,
    coverageDays: 70,
  },
  {
    category: "Fertilizers",
    currentStock: 8900,
    reorderLevel: 5000,
    pendingOrders: 3000,
    consumptionRate: 890,
    coverageDays: 70,
  },
  {
    category: "Pesticides",
    currentStock: 2100,
    reorderLevel: 1500,
    pendingOrders: 800,
    consumptionRate: 280,
    coverageDays: 52,
  },
  {
    category: "Equipment",
    currentStock: 85,
    reorderLevel: 50,
    pendingOrders: 25,
    consumptionRate: 8,
    coverageDays: 74,
  },
];

// Supplier Reliability (for scatter coloring)
const supplierReliabilityMatrix = [
  { supplier: "AgriSource Inc.", reliability: 94, risk: "Low" },
  { supplier: "Global Seeds", reliability: 86, risk: "Medium" },
  { supplier: "ChemGrow Ltd.", reliability: 97, risk: "Low" },
  { supplier: "BioSolutions", reliability: 82, risk: "Medium" },
  { supplier: "FarmTech Supplies", reliability: 78, risk: "High" },
  { supplier: "GreenGrow Co.", reliability: 91, risk: "Low" },
];

/** NEW — PO Funnel (PO→Approved→GRN→Billed) */
const poFunnel = { created: 920, approved: 780, received: 610, billed: 552 };

/** NEW — GRN vs PO variance (qty/value) monthly */
const grnPoVariance = {
  labels: months,
  qtyVariancePct: [2, -3, 1, -1, 0, -2, 4, -1, 3, -2, 1, 0], // + over-receipt, - short
  valueVariancePct: [1, -2, 2, -1, 1, -3, 5, 0, 2, -1, 2, 1],
};

/** NEW — OTIF monthly % (weighted) */
const otifTrend = [91, 92, 90, 89, 93, 95, 94, 96, 92, 93, 94, 95];

/** NEW — Lead time distribution (histogram bins in days) */
const leadTimeHistogram = [
  { bin: "1–3", count: 36 },
  { bin: "4–6", count: 88 },
  { bin: "7–9", count: 112 },
  { bin: "10–12", count: 74 },
  { bin: "13–15", count: 30 },
  { bin: ">15", count: 14 },
];

/** NEW — Vendor concentration (top 6 spend) */
const vendorSpend = [
  { name: "AgriSource Inc.", value: 2840000 },
  { name: "ChemGrow Ltd.", value: 2180000 },
  { name: "Global Seeds", value: 1920000 },
  { name: "BioSolutions", value: 1480000 },
  { name: "FarmTech Supplies", value: 620000 },
  { name: "Others", value: 380000 },
];

/** NEW — Currency mix for import exposure */
const fxMix = [
  { ccy: "INR", share: 72 },
  { ccy: "USD", share: 20 },
  { ccy: "EUR", share: 6 },
  { ccy: "CNY", share: 2 },
];

/** NEW — Agri Input Price Index vs Market (12 mo, base=100) */
const inputPriceIndex = {
  labels: months,
  internalIndex: [100, 101, 103, 104, 106, 108, 110, 111, 112, 113, 114, 116],
  marketIndex: [100, 100, 102, 105, 105, 107, 109, 110, 112, 112, 113, 115],
};

/** NEW — Exceptions (actionable) */
const exceptions = [
  {
    type: "Price Variance",
    item: "DAP (18:46:0)",
    vendor: "AgriSource Inc.",
    variance: "+4.6%",
    date: "2025-09-07",
    action: "Trigger contract clause",
  },
  {
    type: "Late Delivery",
    item: "Corn Seeds",
    vendor: "Global Seeds",
    variance: "+5 days",
    date: "2025-09-06",
    action: "Apply SLA penalty",
  },
  {
    type: "Over Receipt",
    item: "Glyphosate 41%",
    vendor: "ChemGrow Ltd.",
    variance: "+2.1%",
    date: "2025-09-05",
    action: "Adjust GRN / credit note",
  },
];

// ---------------------------------
// KPI Card Component
// ---------------------------------
const Kpi = ({ icon: Icon, label, value, hint, colorClass }) => (
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
    {hint && <div className="mt-2 text-xs text-gray-400">{hint}</div>}
  </div>
);

// ---------------------------------
// Main Purchase Dashboard Component
// ---------------------------------
export default function AgroPurchaseDashboard() {
  const [dateRange, setDateRange] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [procurementType, setProcurementType] = useState("all");

  // Section-specific filters
  const [monthWindow, setMonthWindow] = useState([0, 11]); // for any monthly chart
  const [trendShowOrders, setTrendShowOrders] = useState(true);
  const [trendShowLead, setTrendShowLead] = useState(true);

  const [catFilter, setCatFilter] = useState(
    categoryPurchaseData.map((c) => c.category),
  );

  const allProducts = priceVariationData.products.map((p) => ({
    label: p,
    value: p,
  }));
  const [priceProdFilter, setPriceProdFilter] = useState(
    priceVariationData.products,
  );
  const [showLastMonth, setShowLastMonth] = useState(true);
  const [showMarket, setShowMarket] = useState(true);

  const [riskLevels, setRiskLevels] = useState(["Low", "Medium", "High"]);

  const [vendorTermsFilter, setVendorTermsFilter] = useState([
    "Net 30",
    "Net 45",
    "Net 60",
  ]);
  const [minOTD, setMinOTD] = useState(0);
  const [maxDefect, setMaxDefect] = useState(5);

  const [agingCats, setAgingCats] = useState([
    "Seeds",
    "Fertilizers",
    "Pesticides",
    "Equipment",
  ]);
  const [agingWeeks, setAgingWeeks] = useState([
    "Week 1",
    "Week 2",
    "Week 3",
    "Week 4",
  ]);

  const [leadBins, setLeadBins] = useState(leadTimeHistogram.map((b) => b.bin));

  const [exceptionsTypeFilter, setExceptionsTypeFilter] = useState([
    "Price Variance",
    "Late Delivery",
    "Over Receipt",
  ]);
  const [exceptionsDateRange, setExceptionsDateRange] = useState(null);

  const [payStatus, setPayStatus] = useState(["Current", "Overdue"]);
  const [payVendors, setPayVendors] = useState([
    ...new Set(paymentSchedule.map((p) => p.vendor)),
  ]);
  const [payDueBefore, setPayDueBefore] = useState(null);

  const [invCats, setInvCats] = useState(
    inventoryPurchaseBalance.map((i) => i.category),
  );

  // KPIs (reactive later if you hook filters)
  const kpis = useMemo(
    () => ({
      totalPurchase: 8420000,
      pendingOrders: 124,
      avgLeadTime: 7.2,
      costSaving: 345000,
      vendorCount: 36,
      contractValue: 8600000,
      qualityScore: 93.2,
      paymentDue: 723000,
    }),
    [],
  );

  // Helper to slice by month range
  const sliceByWindow = (labels, arr, [from, to]) => {
    const start = Math.max(0, from);
    const end = Math.min(labels.length - 1, to);
    return arr.slice(start, end + 1);
  };
  const monthLabelsWindow = useMemo(
    () => months.slice(monthWindow[0], monthWindow[1] + 1),
    [monthWindow],
  );

  // Purchase Trend Chart (Bar + Line + Line) with filters
  const purchaseTrendChart = useMemo(() => {
    const labels = monthLabelsWindow;
    const pv = sliceByWindow(
      months,
      monthlyPurchaseData.purchaseValue,
      monthWindow,
    );
    const oc = sliceByWindow(
      months,
      monthlyPurchaseData.orderCount,
      monthWindow,
    );
    const lt = sliceByWindow(
      months,
      monthlyPurchaseData.avgLeadTime,
      monthWindow,
    );

    const datasets = [
      {
        type: "bar",
        label: "Purchase Value (₹K)",
        data: pv,
        backgroundColor: "rgba(59,130,246,0.35)",
        borderRadius: 6,
        yAxisID: "y",
      },
    ];
    if (trendShowOrders) {
      datasets.push({
        type: "line",
        label: "Order Count",
        data: oc,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.15)",
        tension: 0.3,
        fill: true,
        yAxisID: "y1",
      });
    }
    if (trendShowLead) {
      datasets.push({
        type: "line",
        label: "Avg Lead Time (days)",
        data: lt,
        borderColor: "#f59e0b",
        tension: 0.3,
        yAxisID: "y2",
      });
    }
    return { labels, datasets };
  }, [monthLabelsWindow, monthWindow, trendShowLead, trendShowOrders]);

  const purchaseTrendOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: {
        beginAtZero: true,
        position: "left",
        title: { display: true, text: "Purchase Value (₹K)" },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Order Count" },
        grid: { drawOnChartArea: false },
      },
      y2: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Lead Time (days)" },
        grid: { drawOnChartArea: false },
        ticks: { display: false },
      },
    },
  };

  // Vendor Radar (vs industry) — no extra filter (not useful here)
  const vendorRadarData = useMemo(() => {
    return {
      labels: [
        "On-Time Delivery",
        "Quality Score",
        "Price Competitiveness",
        "Response Time",
        "Low Defect Rate",
      ],
      datasets: [
        {
          label: "AgriSource Inc.",
          data: [96.5, 94.2, 92, 95, 99.2],
          backgroundColor: "rgba(59,130,246,0.2)",
          borderColor: "#3b82f6",
        },
        {
          label: "Industry Avg",
          data: [90, 90, 85, 85, 95],
          backgroundColor: "rgba(107,114,128,0.2)",
          borderColor: "#6b7280",
        },
      ],
    };
  }, []);

  const radarOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { r: { beginAtZero: true, max: 100 } },
  };

  // Category Donut with category filter
  const categoryDonutData = useMemo(() => {
    const data = categoryPurchaseData.filter((c) =>
      catFilter.includes(c.category),
    );
    return {
      labels: data.map((c) => c.category),
      datasets: [
        {
          data: data.map((c) => c.value),
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
        },
      ],
    };
  }, [catFilter]);

  const donutOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  // Price Variation with product filter + toggles
  const priceVariationChart = useMemo(() => {
    const idxs = priceVariationData.products
      .map((p, i) => (priceProdFilter.includes(p) ? i : -1))
      .filter((i) => i >= 0);

    const labels = idxs.map((i) => priceVariationData.products[i]);
    const current = idxs.map((i) => priceVariationData.currentPrices[i]);

    const datasets = [
      {
        label: "Current Price",
        data: current,
        backgroundColor: "rgba(59,130,246,0.6)",
      },
    ];
    if (showLastMonth) {
      datasets.push({
        label: "Last Month",
        data: idxs.map((i) => priceVariationData.lastMonthPrices[i]),
        backgroundColor: "rgba(107,114,128,0.4)",
      });
    }
    if (showMarket) {
      datasets.push({
        label: "Market Price",
        data: idxs.map((i) => priceVariationData.marketPrices[i]),
        type: "line",
        borderColor: "#ef4444",
        backgroundColor: "transparent",
        tension: 0.3,
      });
    }

    return { labels, datasets };
  }, [priceProdFilter, showLastMonth, showMarket]);

  const priceVariationOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Price (₹)" } },
    },
  };

  // Heatmap (Order aging) — using Apex with filters
  const orderAgingHeatmapOptions = {
    chart: { type: "heatmap", toolbar: { show: false } },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.2,
        colorScale: {
          ranges: [
            { from: 0, to: 7, color: "#86efac", name: "0-7 days (Fresh)" },
            { from: 8, to: 15, color: "#fde047", name: "8-15 days (Warning)" },
            {
              from: 16,
              to: 30,
              color: "#fca552",
              name: "16-30 days (Critical)",
            },
            { from: 31, to: 100, color: "#f87171", name: ">30 days (Aging)" },
          ],
        },
      },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: agingWeeks,
      title: { text: "Time Period" },
    },
    yaxis: {
      categories: agingCats,
      title: { text: "Category" },
    },
  };

  const baseAgingSeries = useMemo(
    () => [
      {
        name: "Seeds",
        data: [
          { x: "Week 1", y: 5 },
          { x: "Week 2", y: 8 },
          { x: "Week 3", y: 12 },
          { x: "Week 4", y: 18 },
        ],
      },
      {
        name: "Fertilizers",
        data: [
          { x: "Week 1", y: 3 },
          { x: "Week 2", y: 7 },
          { x: "Week 3", y: 15 },
          { x: "Week 4", y: 22 },
        ],
      },
      {
        name: "Pesticides",
        data: [
          { x: "Week 1", y: 6 },
          { x: "Week 2", y: 10 },
          { x: "Week 3", y: 9 },
          { x: "Week 4", y: 14 },
        ],
      },
      {
        name: "Equipment",
        data: [
          { x: "Week 1", y: 4 },
          { x: "Week 2", y: 12 },
          { x: "Week 3", y: 28 },
          { x: "Week 4", y: 45 },
        ],
      },
    ],
    [],
  );

  const orderAgingHeatmapSeries = useMemo(() => {
    return baseAgingSeries
      .filter((s) => agingCats.includes(s.name))
      .map((s) => ({
        ...s,
        data: s.data.filter((d) => agingWeeks.includes(d.x)),
      }));
  }, [agingCats, agingWeeks, baseAgingSeries]);

  // Contract radial — no filter (utilization by vendor already clear)
  const contractRadialOptions = {
    chart: { type: "radialBar" },
    plotOptions: {
      radialBar: {
        dataLabels: { name: { fontSize: "14px" }, value: { fontSize: "16px" } },
      },
    },
    labels: activeContracts.map((c) => c.vendor.split(" ")[0]),
    colors: ["#3b82f6", "#10b981", "#f59e0b"],
  };
  const contractRadialSeries = activeContracts.map((c) => c.utilized);

  // Supplier Risk Matrix (Chart.js scatter) with risk filter
  const supplierRiskData = useMemo(
    () => ({
      datasets: [
        {
          label: "Suppliers",
          data: supplierReliabilityMatrix
            .filter((s) => riskLevels.includes(s.risk))
            .map((s) => ({
              x: s.reliability,
              y:
                (s.risk === "Low" ? 1.2 : s.risk === "Medium" ? 3.2 : 5.0) +
                Math.random() * 0.5,
              label: s.supplier,
              risk: s.risk,
            })),
          backgroundColor: supplierReliabilityMatrix
            .filter((s) => riskLevels.includes(s.risk))
            .map((s) =>
              s.risk === "Low"
                ? "rgba(16,185,129,0.6)"
                : s.risk === "Medium"
                  ? "rgba(245,158,11,0.6)"
                  : "rgba(239,68,68,0.6)",
            ),
        },
      ],
    }),
    [riskLevels],
  );
  const riskMatrixOpts = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.raw.label}: Reliability ${ctx.parsed.x}% (${ctx.raw.risk})`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Reliability (%)" },
        min: 70,
        max: 100,
      },
      y: {
        title: { display: true, text: "Risk Level (low→high)" },
        min: 0,
        max: 6,
      },
    },
  };

  // Inventory Coverage (bar+line) with category filter
  const inventoryCoverageData = useMemo(() => {
    const data = inventoryPurchaseBalance.filter((i) =>
      invCats.includes(i.category),
    );
    return {
      labels: data.map((i) => i.category),
      datasets: [
        {
          type: "bar",
          label: "Current Stock",
          data: data.map((i) => i.currentStock),
          backgroundColor: "rgba(59,130,246,0.35)",
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Pending Orders",
          data: data.map((i) => i.pendingOrders),
          backgroundColor: "rgba(16,185,129,0.35)",
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Coverage Days",
          data: data.map((i) => i.coverageDays),
          borderColor: "#f59e0b",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    };
  }, [invCats]);

  const inventoryCoverageOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Units" } },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Coverage Days" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  /** PO Funnel — Chart.js (horizontal) */
  const poFunnelData = useMemo(
    () => ({
      labels: ["PO Created", "PO Approved", "GRN Received", "Billed"],
      datasets: [
        {
          label: "Count",
          data: [
            poFunnel.created,
            poFunnel.approved,
            poFunnel.received,
            poFunnel.billed,
          ],
          backgroundColor: [
            "rgba(59,130,246,0.35)",
            "rgba(16,185,129,0.35)",
            "rgba(251,191,36,0.35)",
            "rgba(139,92,246,0.35)",
          ],
          borderColor: ["#3b82f6", "#10b981", "#fbbf24", "#8b5cf6"],
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 36,
        },
      ],
    }),
    [],
  );

  const poFunnelOpts = {
    indexAxis: "y",
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
      y: { grid: { display: false } },
    },
  };

  /** NEW — GRN vs PO variance (Chart.js) with month window */
  const grnVsPoChart = useMemo(() => {
    const labels = monthLabelsWindow;
    const qty = sliceByWindow(
      months,
      grnPoVariance.qtyVariancePct,
      monthWindow,
    );
    const val = sliceByWindow(
      months,
      grnPoVariance.valueVariancePct,
      monthWindow,
    );
    return {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Qty Variance %",
          data: qty,
          backgroundColor: "rgba(99,102,241,0.35)",
          borderRadius: 6,
        },
        {
          type: "line",
          label: "Value Variance %",
          data: val,
          borderColor: "#ef4444",
          tension: 0.3,
        },
      ],
    };
  }, [monthLabelsWindow, monthWindow]);
  const grnVsPoOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: {
        title: { display: true, text: "Variance (%)" },
        suggestedMin: -8,
        suggestedMax: 8,
      },
    },
  };

  /** NEW — OTIF line (Chart.js) with month window */
  const otifData = useMemo(() => {
    const labels = monthLabelsWindow;
    const data = sliceByWindow(months, otifTrend, monthWindow);
    return {
      labels,
      datasets: [
        {
          label: "OTIF %",
          data,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [monthLabelsWindow, monthWindow]);
  const otifOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { y: { min: 80, max: 100, title: { display: true, text: "%" } } },
  };

  /** NEW — Lead-time histogram (Chart.js bar) with bin filter */
  const leadHistData = useMemo(() => {
    const data = leadTimeHistogram.filter((b) => leadBins.includes(b.bin));
    return {
      labels: data.map((b) => b.bin),
      datasets: [
        {
          label: "POs",
          data: data.map((b) => b.count),
          backgroundColor: "rgba(59,130,246,0.5)",
          borderRadius: 6,
        },
      ],
    };
  }, [leadBins]);
  const leadHistOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "PO Count" } },
      x: { title: { display: true, text: "Lead Time (days)" } },
    },
  };

  /** NEW — Vendor concentration donut (Chart.js) — no filter (summary) */
  const vendorDonutData = useMemo(
    () => ({
      labels: vendorSpend.map((v) => v.name),
      datasets: [
        {
          data: vendorSpend.map((v) => v.value),
          backgroundColor: [
            "#3b82f6",
            "#10b981",
            "#f59e0b",
            "#8b5cf6",
            "#ef4444",
            "#9ca3af",
          ],
        },
      ],
    }),
    [],
  );
  const vendorDonutOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  /** NEW — FX exposure donut (Chart.js) — no filter (share %) */
  const fxDonutData = useMemo(
    () => ({
      labels: fxMix.map((x) => x.ccy),
      datasets: [
        {
          data: fxMix.map((x) => x.share),
          backgroundColor: ["#60a5fa", "#22c55e", "#fbbf24", "#ef4444"],
        },
      ],
    }),
    [],
  );
  const fxDonutOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  /** NEW — Input price index line (Chart.js) with month window */
  const indexData = useMemo(() => {
    const labels = monthLabelsWindow;
    const ours = sliceByWindow(
      months,
      inputPriceIndex.internalIndex,
      monthWindow,
    );
    const market = sliceByWindow(
      months,
      inputPriceIndex.marketIndex,
      monthWindow,
    );
    return {
      labels,
      datasets: [
        {
          label: "Our Index",
          data: ours,
          borderColor: "#3b82f6",
          tension: 0.3,
        },
        {
          label: "Market Index",
          data: market,
          borderColor: "#6b7280",
          borderDash: [6, 4],
          tension: 0.3,
        },
      ],
    };
  }, [monthLabelsWindow, monthWindow]);
  const indexOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { y: { title: { display: true, text: "Index (base=100)" } } },
  };

  // Derived blurbs (unchanged)
  const funnelLoss = poFunnel.created - poFunnel.billed;
  const funnelConclusion = `PO→Bill conversion ${(
    (poFunnel.billed / poFunnel.created) *
    100
  ).toFixed(
    1,
  )}%. Drop-off ${funnelLoss} POs — expedite approvals/GRN to unlock billing.`;
  const grnConclusion = `Avg qty variance ${(
    grnPoVariance.qtyVariancePct.reduce((s, v) => s + v, 0) /
    grnPoVariance.qtyVariancePct.length
  ).toFixed(1)}%. Keep variance within ±2% to reduce credit notes.`;
  const otifConclusion = `OTIF trending ${otifTrend[otifTrend.length - 1]}%. Target ≥95% before peak season; anchor on ChemGrow-level performance.`;
  const leadConclusion = `Lead-time P50 ~8–9 days; long tail >12 days. Pull-in POs in ${leadTimeHistogram[3].bin}+ bin.`;
  const vendorConc = (() => {
    const total = vendorSpend.reduce((s, v) => s + v.value, 0);
    const top2 =
      (vendorSpend.slice(0, 2).reduce((s, v) => s + v.value, 0) / total) * 100;
    return `Top-2 vendors = ${top2.toFixed(1)}% of spend — acceptable but watch single-vendor risk.`;
  })();
  const fxConclusion = `FX exposure ${100 - fxMix[0].share}% (non-INR) — lock USD/EUR forward for seasonal imports.`;
  const indexConclusion = `Our input index +16 vs base (market +15) — buying slightly above market; renegotiate or shift mix.`;

  // Filters applied to Vendor Performance table
  const vendorTableData = useMemo(() => {
    return vendorPerformanceMetrics.filter(
      (r) =>
        vendorTermsFilter.includes(r.paymentTerms) &&
        r.onTimeDelivery >= minOTD &&
        r.defectRate <= maxDefect,
    );
  }, [vendorTermsFilter, minOTD, maxDefect]);

  // Filters for Exceptions table
  const exceptionRows = useMemo(() => {
    const inType = (row) => exceptionsTypeFilter.includes(row.type);
    const inDate = (row) => {
      if (!exceptionsDateRange || exceptionsDateRange.length !== 2) return true;
      const d = new Date(row.date);
      const [from, to] = exceptionsDateRange;
      if (!from || !to) return true;
      return (
        d >= new Date(from.toDateString()) && d <= new Date(to.toDateString())
      );
    };
    return exceptions.filter((e) => inType(e) && inDate(e));
  }, [exceptionsTypeFilter, exceptionsDateRange]);

  // Filters for Payment Schedule table
  const paymentRows = useMemo(() => {
    return paymentSchedule.filter((p) => {
      const statusOk = payStatus.includes(p.aging);
      const vendorOk = payVendors.includes(p.vendor);
      const dueOk = payDueBefore
        ? new Date(p.dueDate) <= new Date(new Date(payDueBefore).toDateString())
        : true;
      return statusOk && vendorOk && dueOk;
    });
  }, [payStatus, payVendors, payDueBefore]);

  return (
    <Page title="Agro Purchase Management – Dashboard">
      <div className="overflow-hidden pb-8">
        {/* GLOBAL Filters */}
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
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.value)}
              options={vendors}
              className="w-full"
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <Dropdown
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.value)}
              options={purchaseCategories}
              className="w-full"
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <Dropdown
              value={procurementType}
              onChange={(e) => setProcurementType(e.value)}
              options={procurementTypes}
              className="w-full"
            />
          </div>
        </div>

        {/* KPI Row */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ShoppingCartIcon}
              label="Total Purchase"
              value={`₹${number(kpis.totalPurchase)}`}
              hint="YoY -8.2%"
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ClockIcon}
              label="Pending Orders"
              value={kpis.pendingOrders}
              hint="₹1.24M value"
              colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={TruckIcon}
              label="Avg Lead Time"
              value={`${kpis.avgLeadTime} days`}
              hint="Target: 6 days"
              colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Kpi
              icon={ArrowTrendingDownIcon}
              label="Cost Savings"
              value={`₹${number(kpis.costSaving)}`}
              hint="4.1% of spend"
              colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
            />
          </div>
        </div>

        {/* Purchase Trends & Vendor Performance */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-8 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Purchase Trends</h3>
              </div>
            </div>
            <div className="h-[320px]">
              <Chart
                type="bar"
                data={purchaseTrendChart}
                options={purchaseTrendOpts}
                style={{ height: "100%" }}
              />
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">
                Vendor Performance (Radar)
              </h3>
            </div>
            <div className="h-[320px]">
              <Chart
                type="radar"
                data={vendorRadarData}
                options={radarOpts}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* PO Funnel & GRN vs PO Variance */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-5 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">PO → GRN → Bill Funnel</h3>
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={poFunnelData}
                options={poFunnelOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {funnelConclusion}
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-7 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldExclamationIcon className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-semibold">GRN vs PO Variance</h3>
              </div>
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={grnVsPoChart}
                options={grnVsPoOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {grnConclusion}
            </div>
          </div>
        </div>

        {/* Category Distribution & Price Variations */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BeakerIcon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Category Distribution</h3>
              </div>
              <MultiSelect
                display="chip"
                className="w-48"
                value={catFilter}
                onChange={(e) => setCatFilter(e.value)}
                options={categoryPurchaseData.map((c) => ({
                  label: c.category,
                  value: c.category,
                }))}
                placeholder="Categories"
              />
            </div>
            <div className="h-[280px]">
              <Chart
                type="doughnut"
                data={categoryDonutData}
                options={donutOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                {" "}
                Total Items:{" "}
                {categoryPurchaseData.reduce((s, c) => s + c.items, 0)}{" "}
              </div>
              <div>
                {" "}
                Avg Growth:{" "}
                {(
                  categoryPurchaseData.reduce((s, c) => s + c.growth, 0) / 4
                ).toFixed(1)}
                %{" "}
              </div>
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-8 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScaleIcon className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-semibold">
                  Price Variations Analysis
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <MultiSelect
                  display="chip"
                  className="w-56"
                  value={priceProdFilter}
                  onChange={(e) => setPriceProdFilter(e.value)}
                  options={allProducts}
                  placeholder="Products"
                />
              </div>
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={priceVariationChart}
                options={priceVariationOpts}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* OTIF & Lead-time */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-5 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">OTIF Trend</h3>
              </div>
            </div>
            <div className="h-[280px]">
              <Chart
                type="line"
                data={otifData}
                options={otifOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {otifConclusion}
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-7 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold">
                  Lead-time Distribution
                </h3>
              </div>
              <MultiSelect
                display="chip"
                className="w-56"
                value={leadBins}
                onChange={(e) => setLeadBins(e.value)}
                options={leadTimeHistogram.map((b) => ({
                  label: b.bin,
                  value: b.bin,
                }))}
                placeholder="Bins"
              />
            </div>
            <div className="h-[280px]">
              <Chart
                type="bar"
                data={leadHistData}
                options={leadHistOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {leadConclusion}
            </div>
          </div>
        </div>

        {/* Vendor Table */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">
                  Vendor Performance Metrics
                </h3>
              </div>
              {/* Filters: Payment Terms + OTD >= + Defect <= */}
              <div className="flex flex-wrap items-center gap-3">
                <MultiSelect
                  display="chip"
                  className="w-56"
                  value={vendorTermsFilter}
                  onChange={(e) => setVendorTermsFilter(e.value)}
                  options={[
                    ...new Set(
                      vendorPerformanceMetrics.map((v) => v.paymentTerms),
                    ),
                  ].map((t) => ({
                    label: t,
                    value: t,
                  }))}
                  placeholder="Payment Terms"
                />
              </div>
            </div>
            <DataTable
              value={vendorTableData}
              paginator
              rows={5}
              className="rounded border"
            >
              <Column
                field="vendor"
                header="Vendor"
                sortable
                style={{ minWidth: 180 }}
              />
              <Column
                field="totalPurchase"
                header="Total Purchase"
                sortable
                body={(r) => `₹${number(r.totalPurchase)}`}
                style={{ minWidth: 140 }}
              />
              <Column
                field="onTimeDelivery"
                header="OTD %"
                sortable
                body={(r) => (
                  <span
                    className={
                      r.onTimeDelivery >= 95
                        ? "text-emerald-600"
                        : r.onTimeDelivery >= 90
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  >
                    {r.onTimeDelivery}%
                  </span>
                )}
              />
              <Column
                field="qualityScore"
                header="Quality"
                sortable
                body={(r) => <ProgressBar value={r.qualityScore} />}
                style={{ minWidth: 120 }}
              />
              <Column field="responseTime" header="Response (hrs)" sortable />
              <Column
                field="defectRate"
                header="Defect %"
                sortable
                body={(r) => (
                  <Tag
                    value={`${r.defectRate}%`}
                    severity={
                      r.defectRate <= 1
                        ? "success"
                        : r.defectRate <= 2
                          ? "warning"
                          : "danger"
                    }
                  />
                )}
              />
              <Column field="paymentTerms" header="Terms" />
              <Column field="totalOrders" header="Orders" sortable />
            </DataTable>
          </div>
        </div>

        {/* Order Aging & Contract Utilization */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-7 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold">Order Aging Heatmap</h3>
              </div>
              <div className="flex items-center gap-2">
                <MultiSelect
                  display="chip"
                  className="w-44"
                  value={agingCats}
                  onChange={(e) => setAgingCats(e.value)}
                  options={[
                    "Seeds",
                    "Fertilizers",
                    "Pesticides",
                    "Equipment",
                  ].map((c) => ({
                    label: c,
                    value: c,
                  }))}
                  placeholder="Categories"
                />
                <MultiSelect
                  display="chip"
                  className="w-44"
                  value={agingWeeks}
                  onChange={(e) => setAgingWeeks(e.value)}
                  options={["Week 1", "Week 2", "Week 3", "Week 4"].map(
                    (w) => ({ label: w, value: w }),
                  )}
                  placeholder="Weeks"
                />
              </div>
            </div>
            <ReactApexChart
              type="heatmap"
              series={orderAgingHeatmapSeries}
              options={orderAgingHeatmapOptions}
              height={300}
            />
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm dark:bg-slate-700">
              • Equipment shows aging &gt;30 days — expedite or alternate
              vendor.
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-5 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Contract Utilization</h3>
            </div>
            <ReactApexChart
              options={contractRadialOptions}
              series={contractRadialSeries}
              type="radialBar"
              height={300}
            />
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Total Contract Value: ₹{(8600000).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
              <h3 className="text-lg font-semibold">
                Pending Purchase Approvals
              </h3>
            </div>
            <DataTable
              value={pendingApprovals}
              paginator
              rows={5}
              className="rounded border"
            >
              <Column field="poNumber" header="PO Number" sortable />
              <Column field="vendor" header="Vendor" sortable />
              <Column field="category" header="Category" sortable />
              <Column
                field="amount"
                header="Amount"
                sortable
                body={(r) => `₹${number(r.amount)}`}
              />
              <Column field="requestDate" header="Request Date" sortable />
              <Column
                field="priority"
                header="Priority"
                body={(r) => (
                  <Tag
                    value={r.priority}
                    severity={
                      r.priority === "High"
                        ? "danger"
                        : r.priority === "Medium"
                          ? "warning"
                          : "info"
                    }
                  />
                )}
              />
              <Column field="requestor" header="Requestor" />
              <Column
                header="Action"
                body={() => (
                  <div className="flex gap-2">
                    <Button
                      label="Approve"
                      className="p-button-success p-button-sm"
                    />
                    <Button
                      label="Reject"
                      className="p-button-danger p-button-sm p-button-outlined"
                    />
                  </div>
                )}
              />
            </DataTable>
          </div>
        </div>

        {/* Supplier Risk & Inventory Coverage */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold">Supplier Risk Matrix</h3>
              </div>
              <MultiSelect
                display="chip"
                className="w-44"
                value={riskLevels}
                onChange={(e) => setRiskLevels(e.value)}
                options={["Low", "Medium", "High"].map((r) => ({
                  label: r,
                  value: r,
                }))}
                placeholder="Risk"
              />
            </div>
            <div className="h-[300px]">
              <Chart
                type="scatter"
                data={supplierRiskData}
                options={riskMatrixOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>{" "}
                Low Risk
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>{" "}
                Medium Risk
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-red-500"></span> High
                Risk
              </div>
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-6 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">
                  Inventory vs Purchase Balance
                </h3>
              </div>
              <MultiSelect
                display="chip"
                className="w-48"
                value={invCats}
                onChange={(e) => setInvCats(e.value)}
                options={inventoryPurchaseBalance.map((i) => ({
                  label: i.category,
                  value: i.category,
                }))}
                placeholder="Categories"
              />
            </div>
            <div className="h-[300px]">
              <Chart
                type="bar"
                data={inventoryCoverageData}
                options={inventoryCoverageOpts}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Concentration, FX Exposure & Input Index */}
        <div className="transition-content mt-4 grid grid-cols-12 gap-4 px-(--margin-x)">
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Vendor Concentration</h3>
            </div>
            <div className="h-[240px]">
              <Chart
                type="doughnut"
                data={vendorDonutData}
                options={vendorDonutOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-purple-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {vendorConc}
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <GlobeAsiaAustraliaIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">FX / Import Exposure</h3>
            </div>
            <div className="h-[240px]">
              <Chart
                type="doughnut"
                data={fxDonutData}
                options={fxDonutOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {fxConclusion}
            </div>
          </div>
          <div className="col-span-12 rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] lg:col-span-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScaleIcon className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-semibold">
                  Agri Input Price Index
                </h3>
              </div>
            </div>
            <div className="h-[240px]">
              <Chart
                type="line"
                data={indexData}
                options={indexOpts}
                style={{ height: "100%" }}
              />
            </div>
            <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm dark:bg-slate-700">
              <strong>Best conclusion:</strong> {indexConclusion}
            </div>
          </div>
        </div>

        {/* Exceptions / Alerts */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-semibold">
                  Exceptions & Action Log
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <MultiSelect
                  display="chip"
                  className="w-56"
                  value={exceptionsTypeFilter}
                  onChange={(e) => setExceptionsTypeFilter(e.value)}
                  options={[...new Set(exceptions.map((e) => e.type))].map(
                    (t) => ({ label: t, value: t }),
                  )}
                  placeholder="Types"
                />
                <Calendar
                  value={exceptionsDateRange}
                  onChange={(e) => setExceptionsDateRange(e.value)}
                  selectionMode="range"
                  placeholder="Date range"
                  readOnlyInput
                  showIcon
                />
              </div>
            </div>
            <DataTable
              value={exceptionRows}
              paginator
              rows={5}
              className="rounded border"
            >
              <Column field="type" header="Type" sortable />
              <Column field="item" header="Item / SKU" sortable />
              <Column field="vendor" header="Vendor" sortable />
              <Column field="variance" header="Variance" sortable />
              <Column field="date" header="Date" sortable />
              <Column
                field="action"
                header="Suggested Action"
                style={{ minWidth: 220 }}
              />
            </DataTable>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="transition-content mt-4 px-(--margin-x)">
          <div className="rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">Payment Schedule</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MultiSelect
                  display="chip"
                  className="w-48"
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.value)}
                  options={["Current", "Overdue"].map((s) => ({
                    label: s,
                    value: s,
                  }))}
                  placeholder="Status"
                />
                <MultiSelect
                  display="chip"
                  className="w-56"
                  value={payVendors}
                  onChange={(e) => setPayVendors(e.value)}
                  options={[
                    ...new Set(paymentSchedule.map((p) => p.vendor)),
                  ].map((v) => ({ label: v, value: v }))}
                  placeholder="Vendors"
                />
                <Calendar
                  value={payDueBefore}
                  onChange={(e) => setPayDueBefore(e.value)}
                  placeholder="Due on/before"
                  readOnlyInput
                  showIcon
                />
              </div>
            </div>
            <DataTable
              value={paymentRows}
              paginator
              rows={5}
              className="rounded border"
            >
              <Column field="vendor" header="Vendor" sortable />
              <Column
                field="dueAmount"
                header="Due Amount"
                sortable
                body={(r) => `₹${number(r.dueAmount)}`}
              />
              <Column field="dueDate" header="Due Date" sortable />
              <Column
                field="aging"
                header="Status"
                body={(r) => (
                  <Tag
                    value={r.aging}
                    severity={r.aging === "Overdue" ? "danger" : "success"}
                  />
                )}
              />
              <Column field="discount" header="Early Payment Discount" />
              <Column
                header="Action"
                body={() => (
                  <Button
                    label="Pay Now"
                    icon="pi pi-credit-card"
                    className="p-button-sm"
                  />
                )}
              />
            </DataTable>
            <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-slate-700">
              • Potential savings of ₹12,450 available via early payment
              discounts.
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="transition-content mt-6 flex items-center justify-end gap-2 px-(--margin-x)">
          <Button
            label="Generate Purchase Report"
            icon="pi pi-file-pdf"
            className="p-button-outlined"
            onClick={() => alert("Generating purchase report...")}
          />
          <Button
            label="Export Data"
            icon="pi pi-download"
            className="p-button-outlined"
            onClick={() => alert("Exporting purchase data...")}
          />
        </div>
      </div>
      <BottomToTop />
    </Page>
  );
}
