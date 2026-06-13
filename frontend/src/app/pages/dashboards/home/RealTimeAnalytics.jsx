import { useEffect, useState } from "react";
// import { DashboardApi } from "services/dashboard/dashboardapi";
import { Skeleton } from "primereact/skeleton";
import { FiFileText, FiUserCheck, FiClock, FiBarChart2 } from "react-icons/fi";
import { GrDocumentVerified } from "react-icons/gr";
import AnimatedCounter from "components/template/AnimatedCounter";

// Background SVGs (use currentColor; color comes from parent class)
const BgSubmissions = () => (
  <svg
    viewBox="0 0 400 200"
    className="absolute inset-0 z-0 h-full w-full opacity-10"
    preserveAspectRatio="none"
    aria-hidden
  >
    <path
      d="M40,180 v-40 M90,180 v-70 M140,180 v-100 M190,180 v-60 M240,180 v-120 M290,180 v-80 M340,180 v-140"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M20,180 H380"
      stroke="currentColor"
      strokeWidth="6"
      opacity="0.6"
    />
  </svg>
);

const BgPending = () => (
  <svg
    viewBox="0 0 400 200"
    className="absolute inset-0 z-0 h-full w-full opacity-10"
    preserveAspectRatio="none"
    aria-hidden
  >
    <circle
      cx="320"
      cy="70"
      r="40"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
    />
    <path
      d="M320,70 v-20 M320,70 h18"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M0,150 C50,120 100,180 150,150 C200,120 250,180 300,150 C350,120 400,180 450,150"
      stroke="currentColor"
      strokeWidth="12"
      fill="none"
    />
  </svg>
);

const BgCompleted = () => (
  <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
    <g transform="translate(70,35)">
      {/* Clean form card */}
      <g
        opacity="0.12"
        stroke="currentColor"
        fill="none"
        strokeLinejoin="round"
      >
        <rect x="70" y="50" width="180" height="110" rx="12" strokeWidth={8} />
        {/* form lines */}
        <line
          x1="92"
          y1="78"
          x2="220"
          y2="78"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <line
          x1="92"
          y1="102"
          x2="230"
          y2="102"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <line
          x1="92"
          y1="126"
          x2="210"
          y2="126"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <line
          x1="92"
          y1="150"
          x2="170"
          y2="150"
          strokeWidth={6}
          strokeLinecap="round"
        />
      </g>

      {/* Polished seal with check (badge overlapping the form) */}
      <g transform="translate(268,58)">
        {/* double ring */}
        <g opacity="0.10" stroke="currentColor" fill="none">
          <circle cx="0" cy="0" r="46" strokeWidth={12} />
          <circle cx="0" cy="0" r="30" strokeWidth={8} />
        </g>
        {/* checkmark */}
        <g
          opacity="0.16"
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M-12,0 L-2,10 L22,-14" strokeWidth={12} />
        </g>
        {/* subtle rays */}
        <g
          opacity="0.10"
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
        >
          <line x1="0" y1="-58" x2="0" y2="-46" strokeWidth={6} />
          <line x1="41" y1="-41" x2="33" y2="-33" strokeWidth={6} />
          <line x1="58" y1="0" x2="46" y2="0" strokeWidth={6} />
          <line x1="41" y1="41" x2="33" y2="33" strokeWidth={6} />
        </g>
      </g>
    </g>
  </svg>
);

const BgOverdue = () => (
  <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
    <g transform="translate(70,25)">
      {/* Calendar shape */}
      <g
        opacity="0.12"
        stroke="currentColor"
        fill="none"
        strokeLinejoin="round"
      >
        {/* Calendar base */}
        <rect x="60" y="50" width="180" height="120" rx="12" strokeWidth={8} />
        {/* Top binding bar */}
        <rect x="60" y="50" width="180" height="30" rx="6" strokeWidth={8} />
        {/* Binding rings */}
        <line
          x1="90"
          y1="40"
          x2="90"
          y2="65"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <line
          x1="150"
          y1="40"
          x2="150"
          y2="65"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <line
          x1="210"
          y1="40"
          x2="210"
          y2="65"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Grid lines */}
        <line x1="60" y1="90" x2="240" y2="90" strokeWidth={4} />
        <line x1="60" y1="120" x2="240" y2="120" strokeWidth={4} />
        <line x1="60" y1="150" x2="240" y2="150" strokeWidth={4} />
        <line x1="110" y1="80" x2="110" y2="170" strokeWidth={4} />
        <line x1="160" y1="80" x2="160" y2="170" strokeWidth={4} />
        <line x1="210" y1="80" x2="210" y2="170" strokeWidth={4} />
      </g>

      {/* Clock badge in bottom-right */}
      <g transform="translate(280,120)">
        {/* Outer clock ring */}
        <circle
          cx="0"
          cy="0"
          r="40"
          stroke="currentColor"
          strokeWidth={10}
          opacity="0.12"
          fill="none"
        />
        {/* Clock hands */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-18"
          stroke="currentColor"
          strokeWidth={8}
          strokeLinecap="round"
          opacity="0.14"
        />
        <line
          x1="0"
          y1="0"
          x2="14"
          y2="0"
          stroke="currentColor"
          strokeWidth={8}
          strokeLinecap="round"
          opacity="0.14"
        />
        {/* Small alert dot */}
        <circle cx="25" cy="-25" r="8" fill="currentColor" opacity="0.16" />
      </g>
    </g>
  </svg>
);

const BgActiveUsers = () => (
  <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
    <g transform="translate(70)">
      {/* Thicker connection lines */}
      <g opacity="0.12" fill="none" stroke="currentColor" strokeWidth={5}>
        <line x1="100" y1="100" x2="200" y2="100" />
        <line x1="200" y1="100" x2="300" y2="100" />
        <line x1="150" y1="190" x2="250" y2="190" />
        <line x1="100" y1="100" x2="150" y2="190" />
        <line x1="200" y1="100" x2="150" y2="190" />
        <line x1="200" y1="100" x2="250" y2="190" />
        <line x1="300" y1="100" x2="250" y2="190" />
      </g>

      {/* Huge user icons */}
      <g opacity="0.12" fill="currentColor">
        {/* Top left user */}
        <circle cx="100" cy="70" r="20" />
        <rect x="72" y="92" width="56" height="28" rx="14" />

        {/* Top middle user */}
        <circle cx="200" cy="70" r="20" />
        <rect x="172" y="92" width="56" height="28" rx="14" />

        {/* Top right user */}
        <circle cx="300" cy="70" r="20" />
        <rect x="272" y="92" width="56" height="28" rx="14" />

        {/* Bottom left user */}
        <circle cx="150" cy="160" r="20" />
        <rect x="122" y="182" width="56" height="28" rx="14" />

        {/* Bottom right user */}
        <circle cx="250" cy="160" r="20" />
        <rect x="222" y="182" width="56" height="28" rx="14" />
      </g>
    </g>
  </svg>
);

export function RealTimeAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRealTimeAnalytics();
  }, []);

  const getRealTimeAnalytics = async () => {
    setLoading(true);
    try {
      // const response = await DashboardApi.getRealTimeData();
      setData({
        today: {
          analytics1: 199,
          analytics2: 268,
          analytics3: 321,
        },
        overdue: {
          analytics4: 474,
        },
        activeUsers: {
          analytics5: 534,
        },
      });
    } catch (error) {
      console.error("Failed to fetch real-time analytics", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const skeletonCards = [
    {
      label: "",
      value: null,
      icon: null,
      border: "border-blue-500",
      accent: "text-blue-600",
      Bg: BgSubmissions,
    },
    {
      label: "",
      value: null,
      icon: null,
      border: "border-orange-500",
      accent: "text-orange-600",
      Bg: BgPending,
    },
    {
      label: "",
      value: null,
      icon: null,
      border: "border-green-500",
      accent: "text-green-600",
      Bg: BgCompleted,
    },
    {
      label: "",
      value: null,
      icon: null,
      border: "border-yellow-500",
      accent: "text-yellow-600",
      Bg: BgOverdue,
    },
    {
      label: "",
      value: null,
      icon: null,
      border: "border-red-500",
      accent: "text-red-600",
      Bg: BgActiveUsers,
    },
  ];

  const cards = loading
    ? skeletonCards
    : [
        {
          label: "Analytics 1",
          value: data?.today?.analytics1 ?? 0,
          icon: <FiFileText size={20} />,
          border: "border-blue-500",
          accent: "text-blue-600 dark:text-blue-400",
          Bg: BgSubmissions,
        },
        {
          label: "Analytics 2",
          value: data?.today?.analytics3 ?? 0,
          icon: <FiClock size={20} />,
          border: "border-orange-500",
          accent: "text-orange-600 dark:text-orange-400",
          Bg: BgPending,
        },
        {
          label: "Analytics 3",
          value: data?.today?.analytics2 ?? 0,
          icon: <GrDocumentVerified size={20} />,
          border: "border-green-500",
          accent: "text-green-600 dark:text-green-400",
          Bg: BgCompleted,
        },
        {
          label: "Analytics 4",
          value: data?.overdue?.analytics4 ?? 0,
          icon: <FiBarChart2 size={20} />,
          border: "border-yellow-500",
          accent: "text-yellow-600 dark:text-yellow-400",
          Bg: BgOverdue,
        },
        {
          label: "Analytics 5",
          value: data?.activeUsers?.analytics5 ?? 0,
          icon: <FiUserCheck size={20} />,
          border: "border-red-500",
          accent: "text-red-600 dark:text-red-400",
          Bg: BgActiveUsers,
        },
      ];

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
        Daily Statistics
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`relative flex items-center gap-4 rounded-xl border-t-4 bg-white p-5 shadow-md dark:bg-gray-800 ${card.border} transition ${
              idx === 0
                ? "hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)]" // blue
                : idx === 1
                  ? "hover:shadow-[0_4px_12px_rgba(234,88,12,0.2)]" // orange
                  : idx === 2
                    ? "hover:shadow-[0_4px_12px_rgba(22,163,74,0.2)]" // green
                    : idx === 3
                      ? "hover:shadow-[0_4px_12px_rgba(202,138,4,0.2)]" // yellow
                      : "hover:shadow-[0_4px_12px_rgba(220,38,38,0.2)]" // red
            }`}
          >
            <div
              className={`absolute top-9 right-0 h-[50px] w-[70px] ${card.accent}`}
            >
              <card.Bg />
            </div>
            <div
              className={`rounded-full bg-gray-100 p-2 text-blue-600 dark:bg-gray-700 ${card.accent}`}
            >
              {loading ? <Skeleton shape="circle" size={20} /> : card.icon}
            </div>
            <div className="flex flex-col items-start">
              {loading ? (
                <>
                  <Skeleton width="2rem" height="1.5rem" className="mb-2" />
                  <Skeleton width="6rem" height="1rem" />
                </>
              ) : (
                <>
                  <p className="dark:text-dark-100 text-xl font-semibold text-gray-800">
                    <AnimatedCounter
                      from={0}
                      to={card.value || 0}
                      duration={0.7}
                    />
                  </p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
