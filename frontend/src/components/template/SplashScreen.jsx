// Local Imports
import Logo from "assets/appLogo.svg?react";
import { Progress } from "components/ui";

// ----------------------------------------------------------------------

export function SplashScreen() {
  // scatter + gentle motion per icon (positions kept similar to your original)
  const nodes = [
    {
      id: "icon-wheat",
      x: 220,
      y: 160,
      s: 2.0,
      rot: 6,
      dy: 6,
      durR: "11s",
      durY: "9s",
      delay: "-1s",
      opacity: 0.9,
    },
    {
      id: "icon-tractor",
      x: 1180,
      y: 220,
      s: 1.9,
      rot: 5,
      dy: 5,
      durR: "10s",
      durY: "8s",
      delay: "-3s",
      opacity: 0.85,
    },
    {
      id: "icon-corn",
      x: 980,
      y: 560,
      s: 2.1,
      rot: 7,
      dy: 7,
      durR: "12s",
      durY: "10s",
      delay: "-2s",
      opacity: 0.85,
    },
    {
      id: "icon-sprout",
      x: 400,
      y: 560,
      s: 2.0,
      rot: 6,
      dy: 6,
      durR: "12s",
      durY: "10s",
      delay: "-4s",
      opacity: 0.85,
    },

    {
      id: "icon-shovel",
      x: 300,
      y: 360,
      s: 1.8,
      rot: 6,
      dy: 4,
      durR: "10s",
      durY: "8.5s",
      delay: "-5s",
      opacity: 0.8,
    },
    {
      id: "icon-watering",
      x: 720,
      y: 160,
      s: 1.9,
      rot: 5,
      dy: 5,
      durR: "9.5s",
      durY: "7.5s",
      delay: "-6s",
      opacity: 0.75,
    },
    {
      id: "icon-basket",
      x: 1240,
      y: 640,
      s: 1.9,
      rot: 6,
      dy: 6,
      durR: "11s",
      durY: "9s",
      delay: "-1.5s",
      opacity: 0.8,
    },
    {
      id: "icon-leaf",
      x: 160,
      y: 640,
      s: 1.8,
      rot: 6,
      dy: 6,
      durR: "11s",
      durY: "9s",
      delay: "-2.5s",
      opacity: 0.8,
    },
    {
      id: "icon-apple",
      x: 1080,
      y: 420,
      s: 2.0,
      rot: 7,
      dy: 5,
      durR: "12s",
      durY: "10s",
      delay: "-3.5s",
      opacity: 0.85,
    },
    {
      id: "icon-hoe",
      x: 620,
      y: 620,
      s: 2.0,
      rot: 5,
      dy: 5,
      durR: "10s",
      durY: "8.5s",
      delay: "-4.5s",
      opacity: 0.8,
    },
    {
      id: "icon-barn",
      x: 1280,
      y: 120,
      s: 1.8,
      rot: 6,
      dy: 6,
      durR: "11s",
      durY: "9s",
      delay: "-5.5s",
      opacity: 0.8,
    },
    {
      id: "icon-irrigation",
      x: 520,
      y: 300,
      s: 1.9,
      rot: 6,
      dy: 5,
      durR: "11s",
      durY: "9s",
      delay: "-2.2s",
      opacity: 0.8,
    },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-white">
      {/* BACKGROUND: farming icons, gently dangling */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          {/* ------- Farming icons (each ~40x40, centered around 20,20) ------- */}

          {/* Wheat stalk - more precise grain clusters */}
          <g
            id="icon-wheat"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main stem */}
            <path d="M20 5v31" strokeWidth="2" />

            {/* Grain clusters - more detailed and symmetrical */}
            <ellipse cx="16" cy="8" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="24" cy="11" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="15" cy="14" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="25" cy="17" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="14" cy="20" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="26" cy="23" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="15" cy="26" rx="2.5" ry="3.5" fill="#E2E8F0" />
            <ellipse cx="25" cy="29" rx="2.5" ry="3.5" fill="#E2E8F0" />

            {/* Awns (grain whiskers) */}
            <path d="M16 8l-3-2.5" strokeWidth="1" />
            <path d="M24 11l3-2.5" strokeWidth="1" />
            <path d="M15 14l-3.5-2" strokeWidth="1" />
            <path d="M25 17l3.5-2" strokeWidth="1" />
          </g>

          {/* Tractor - more detailed and proportional */}
          <g
            id="icon-tractor"
            fill="none"
            stroke="#16A34A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main body */}
            <path
              d="M8 19h18c1 0 2 1 2 2v6c0 1-1 2-2 2H8c-1 0-2-1-2-2v-6c0-1 1-2 2-2z"
              fill="#86EFAC"
              opacity="0.7"
              stroke="#16A34A"
              strokeWidth="2.5"
            />

            {/* Cabin */}
            <path
              d="M19 12h8c1.5 0 2 1 2 2v5h-11v-6c0-0.5 0.5-1 1-1z"
              fill="#BBF7D0"
              opacity="0.7"
              stroke="#16A34A"
              strokeWidth="2.5"
            />
            <rect
              x="21"
              y="14"
              width="4"
              height="3"
              rx="0.5"
              fill="#DBEAFE"
              opacity="0.6"
              stroke="#16A34A"
              strokeWidth="1.5"
            />

            {/* Large rear wheel */}
            <circle
              cx="12"
              cy="29"
              r="6"
              strokeWidth="2.5"
              stroke="#15803D"
              fill="#22C55E"
              opacity="0.3"
            />
            <circle
              cx="12"
              cy="29"
              r="4"
              opacity="0.5"
              stroke="#15803D"
              strokeWidth="2"
            />
            <circle cx="12" cy="29" r="1.5" fill="#15803D" stroke="none" />

            {/* Small front wheel */}
            <circle
              cx="26"
              cy="29"
              r="4"
              strokeWidth="2"
              stroke="#15803D"
              fill="#22C55E"
              opacity="0.3"
            />
            <circle
              cx="26"
              cy="29"
              r="2.5"
              opacity="0.5"
              stroke="#15803D"
              strokeWidth="1.5"
            />
            <circle cx="26" cy="29" r="1" fill="#15803D" stroke="none" />

            {/* Exhaust pipe */}
            <path
              d="M6 23h-2c-1 0-1-1-1-2v-1"
              strokeWidth="2"
              stroke="#6B7280"
            />

            {/* Details */}
            <line
              x1="19"
              y1="19"
              x2="19"
              y2="27"
              opacity="0.4"
              stroke="#16A34A"
              strokeWidth="1.5"
            />

            {/* Engine grille lines */}
            <line
              x1="10"
              y1="21"
              x2="17"
              y2="21"
              opacity="0.4"
              stroke="#15803D"
              strokeWidth="1"
            />
            <line
              x1="10"
              y1="23"
              x2="17"
              y2="23"
              opacity="0.4"
              stroke="#15803D"
              strokeWidth="1"
            />
            <line
              x1="10"
              y1="25"
              x2="17"
              y2="25"
              opacity="0.4"
              stroke="#15803D"
              strokeWidth="1"
            />
          </g>

          {/* Corn cob - more detailed kernels and husk */}
          <g
            id="icon-corn"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Corn body */}
            <path
              d="M20 8c-2.5 0-4.5 2-5 4.5c-0.5 3-0.5 9 0 12c0.5 2.5 2.5 4.5 5 4.5c2.5 0 4.5-2 5-4.5c0.5-3 0.5-9 0-12c-0.5-2.5-2.5-4.5-5-4.5z"
              fill="#FEF3C7"
              opacity="0.6"
            />

            {/* Kernel rows - more realistic pattern */}
            <g opacity="0.7" stroke="#FCD34D" strokeWidth="1.5">
              <path d="M17 12c0.5 0.5 1 0.5 1.5 0.5s1-0.5 1.5-0.5s1 0.5 1.5 0.5s1-0.5 1.5-0.5" />
              <path d="M17 15c0.5 0.5 1 0.5 1.5 0.5s1-0.5 1.5-0.5s1 0.5 1.5 0.5s1-0.5 1.5-0.5" />
              <path d="M17 18c0.5 0.5 1 0.5 1.5 0.5s1-0.5 1.5-0.5s1 0.5 1.5 0.5s1-0.5 1.5-0.5" />
              <path d="M17 21c0.5 0.5 1 0.5 1.5 0.5s1-0.5 1.5-0.5s1 0.5 1.5 0.5s1-0.5 1.5-0.5" />
              <path d="M17 24c0.5 0.5 1 0.5 1.5 0.5s1-0.5 1.5-0.5s1 0.5 1.5 0.5s1-0.5 1.5-0.5" />
            </g>

            {/* Husk leaves */}
            <path
              d="M15 10c-3 1-5 3-6 6c-1 2-1 4 0 6"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M25 10c3 1 5 3 6 6c1 2 1 4 0 6"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M14 28c-2 2-4 4-5 6" stroke="#CBD5E1" strokeWidth="1.5" />
            <path d="M26 28c2 2 4 4 5 6" stroke="#CBD5E1" strokeWidth="1.5" />
          </g>

          {/* Sprout - more organic leaf shapes */}
          <g
            id="icon-sprout"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Stem */}
            <path d="M20 30v-9" strokeWidth="2.5" stroke="#93C5FD" />

            {/* Left leaf with vein */}
            <path
              d="M20 21c-1 0-3-0.5-5-2c-2-1.5-3.5-3.5-4-6c0.5-0.5 1.5-0.5 3 0c2 0.5 4 2 5.5 4c1 1.5 1.5 3 0.5 4z"
              fill="#DBEAFE"
              opacity="0.6"
              stroke="#93C5FD"
            />
            <path
              d="M15 15c1.5 2 3 4 5 6"
              stroke="#93C5FD"
              strokeWidth="1"
              opacity="0.7"
            />

            {/* Right leaf with vein */}
            <path
              d="M20 21c1 0 3-0.5 5-2c2-1.5 3.5-3.5 4-6c-0.5-0.5-1.5-0.5-3 0c-2 0.5-4 2-5.5 4c-1 1.5-1.5 3-0.5 4z"
              fill="#DBEAFE"
              opacity="0.6"
              stroke="#93C5FD"
            />
            <path
              d="M25 15c-1.5 2-3 4-5 6"
              stroke="#93C5FD"
              strokeWidth="1"
              opacity="0.7"
            />

            {/* Ground line */}
            <path d="M8 32h24" opacity="0.4" strokeWidth="1.5" />
            <circle cx="20" cy="32" r="2" fill="#CBD5E1" opacity="0.3" />
          </g>

          {/* Shovel - more defined blade and handle */}
          <g
            id="icon-shovel"
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Wooden handle */}
            <path
              d="M28 8l6 6"
              strokeWidth="3"
              stroke="#A78BFA"
              strokeLinecap="round"
            />
            <path d="M28 8l-10 10" strokeWidth="2.5" stroke="#C4B5FD" />

            {/* Metal blade */}
            <path
              d="M18 18l-8 8c-0.5 1-0.5 2 0 3c1 1 2 1 3 0l8-8z"
              fill="#E5E7EB"
              opacity="0.7"
              stroke="#9CA3AF"
              strokeWidth="2"
            />
            <path
              d="M11 28l2 2"
              stroke="#9CA3AF"
              strokeWidth="1.5"
              opacity="0.5"
            />

            {/* Handle grip details */}
            <circle cx="31" cy="11" r="1.5" fill="#A78BFA" stroke="none" />
            <line
              x1="23"
              y1="13"
              x2="24"
              y2="14"
              opacity="0.5"
              strokeWidth="1"
            />
            <line
              x1="21"
              y1="15"
              x2="22"
              y2="16"
              opacity="0.5"
              strokeWidth="1"
            />
          </g>

          {/* Watering can - more realistic proportions */}
          <g
            id="icon-watering"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main body with lighter blue color */}
            <path
              d="M10 16h16c1.5 0 2.5 1 2.5 2.5v8c0 1.5-1 2.5-2.5 2.5H10c-1.5 0-2.5-1-2.5-2.5v-8c0-1.5 1-2.5 2.5-2.5z"
              fill="#BFDBFE"
              opacity="0.8"
              stroke="#60A5FA"
              strokeWidth="2.5"
            />

            {/* Water level inside */}
            <path
              d="M9 24h18.5c0 1.2-0.8 2-2 2H10c-1 0-1.5-0.8-1-2z"
              fill="#93C5FD"
              opacity="0.6"
              stroke="none"
            />

            {/* Handle */}
            <path
              d="M10 20c-1.5-1-3-2-4.5-3.5c-0.5-0.5-0.5-1 0-1.5c0.5-0.5 1-0.5 1.5 0c1 0.5 2 1.5 3 2"
              stroke="#60A5FA"
              strokeWidth="2.5"
            />
            <ellipse
              cx="14"
              cy="12"
              rx="3.5"
              ry="3"
              fill="#DBEAFE"
              opacity="0.7"
              stroke="#60A5FA"
              strokeWidth="2"
            />
            <path
              d="M11 12c0-2 2-3.5 4-3.5s4 1.5 4 3.5"
              stroke="#60A5FA"
              strokeWidth="2.5"
            />

            {/* Spout with more definition */}
            <path
              d="M28.5 18h4c1 0 1.5 0.5 1.5 1.5"
              stroke="#60A5FA"
              strokeWidth="2.5"
            />
            <path
              d="M34 19.5v2c0 0.5-0.5 1-1 1h-0.5"
              stroke="#60A5FA"
              strokeWidth="2.5"
            />
            <path
              d="M29 18c0.5 0 1 0 1.5 0.3c1 0.5 2 1 3 1.2"
              fill="#BFDBFE"
              opacity="0.6"
              stroke="none"
            />

            {/* Water drops from spout - larger and more visible */}
            <circle
              cx="34.5"
              cy="24"
              r="1.2"
              fill="#60A5FA"
              opacity="0.9"
              stroke="none"
            />
            <circle
              cx="35.5"
              cy="27"
              r="1.1"
              fill="#93C5FD"
              opacity="0.8"
              stroke="none"
            />
            <circle
              cx="33.5"
              cy="26.5"
              r="1"
              fill="#BFDBFE"
              opacity="0.7"
              stroke="none"
            />
            <circle
              cx="34"
              cy="30"
              r="0.9"
              fill="#93C5FD"
              opacity="0.6"
              stroke="none"
            />

            {/* Body detail line */}
            <line
              x1="10"
              y1="22"
              x2="28"
              y2="22"
              stroke="#60A5FA"
              opacity="0.5"
              strokeWidth="1.5"
            />

            {/* Highlight on body */}
            <ellipse
              cx="14"
              cy="19"
              rx="2"
              ry="3"
              fill="white"
              opacity="0.4"
              stroke="none"
            />
          </g>

          {/* Basket - woven texture pattern */}
          <g
            id="icon-basket"
            fill="none"
            stroke="#D97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Basket rim */}
            <ellipse
              cx="20"
              cy="18"
              rx="10"
              ry="3"
              fill="#FCD34D"
              opacity="0.8"
              stroke="#B45309"
              strokeWidth="2.5"
            />

            {/* Basket body with warm color */}
            <path
              d="M10 18v6c0 3 3 6 6 7c2 0.5 4 0.5 8 0c3-1 6-4 6-7v-6"
              fill="#FDE68A"
              opacity="0.7"
              stroke="#D97706"
              strokeWidth="2.5"
            />

            {/* Vertical weave lines - more visible */}
            <path
              d="M12 18c-0.5 2-0.5 4 0 6c0.3 1.5 1 3 2 4"
              opacity="0.9"
              strokeWidth="2"
              stroke="#B45309"
            />
            <path
              d="M16 18v10"
              opacity="0.9"
              strokeWidth="2"
              stroke="#B45309"
            />
            <path
              d="M20 18v12"
              opacity="0.9"
              strokeWidth="2.5"
              stroke="#92400E"
            />
            <path
              d="M24 18v10"
              opacity="0.9"
              strokeWidth="2"
              stroke="#B45309"
            />
            <path
              d="M28 18c0.5 2 0.5 4 0 6c-0.3 1.5-1 3-2 4"
              opacity="0.9"
              strokeWidth="2"
              stroke="#B45309"
            />

            {/* Horizontal weave lines - more prominent */}
            <path
              d="M11 22c2-0.5 4-0.5 6 0s4 0.5 6 0s4-0.5 6 0"
              opacity="0.8"
              strokeWidth="2"
              stroke="#B45309"
            />
            <path
              d="M12 26c2-0.5 4-0.5 5 0s3 0.5 6 0s3-0.5 5 0"
              opacity="0.8"
              strokeWidth="2"
              stroke="#B45309"
            />
            <path
              d="M13 30c1.5-0.3 3-0.3 4 0s2.5 0.3 6 0s3-0.3 4 0"
              opacity="0.7"
              strokeWidth="1.8"
              stroke="#B45309"
            />

            {/* Handle with stronger color */}
            <path
              d="M14 18c0-3 2-5 6-5s6 2 6 5"
              strokeWidth="3"
              fill="none"
              stroke="#92400E"
            />

            {/* Cross-hatch pattern for texture */}
            <path
              d="M13 20l2 3"
              opacity="0.6"
              strokeWidth="1.5"
              stroke="#D97706"
            />
            <path
              d="M27 20l-2 3"
              opacity="0.6"
              strokeWidth="1.5"
              stroke="#D97706"
            />
            <path
              d="M14 24l2 3"
              opacity="0.6"
              strokeWidth="1.5"
              stroke="#D97706"
            />
            <path
              d="M26 24l-2 3"
              opacity="0.6"
              strokeWidth="1.5"
              stroke="#D97706"
            />

            {/* Shadow/depth at bottom */}
            <ellipse
              cx="20"
              cy="30"
              rx="6"
              ry="1.5"
              fill="#92400E"
              opacity="0.3"
              stroke="none"
            />
          </g>

          {/* Leaf - more organic shape with veins */}
          <g
            id="icon-leaf"
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Leaf outline */}
            <path
              d="M8 30c2-4 5-8 8-10c3-2 6-3 9-3c3 0 5 1 6 3c1 2 1 5-1 8c-2 3-5 6-9 8c-4 2-8 2-11 0c-2-1-3-3-2-6z"
              fill="#D1FAE5"
              opacity="0.5"
            />

            {/* Main vein */}
            <path
              d="M10 28c3-3 6-6 10-8c4-2 8-3 11-2"
              strokeWidth="2"
              stroke="#86EFAC"
            />

            {/* Side veins */}
            <path
              d="M13 28c2-1.5 4-3 7-4"
              strokeWidth="1.2"
              opacity="0.6"
              stroke="#86EFAC"
            />
            <path
              d="M16 27c2-1 4-2 6-3"
              strokeWidth="1.2"
              opacity="0.6"
              stroke="#86EFAC"
            />
            <path
              d="M19 26c2-0.8 4-1.5 5-2"
              strokeWidth="1.2"
              opacity="0.6"
              stroke="#86EFAC"
            />
            <path
              d="M22 24c1.5-0.5 3-1 4-1.5"
              strokeWidth="1.2"
              opacity="0.6"
              stroke="#86EFAC"
            />
            <path
              d="M26 21c1-0.3 2-0.5 3-0.8"
              strokeWidth="1.2"
              opacity="0.6"
              stroke="#86EFAC"
            />

            {/* Leaf tip detail */}
            <circle cx="31" cy="18" r="1" fill="#86EFAC" opacity="0.7" />
          </g>

          {/* Apple - more realistic shape with highlights */}
          <g
            id="icon-apple"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Apple body - more organic shape */}
            <path
              d="M20 13c-5 0-9 3-9 8c0 3 1.5 6 4 8c2 1.5 5 1.5 10 0c2.5-2 4-5 4-8c0-5-4-8-9-8z"
              fill="#FEE2E2"
              opacity="0.6"
              stroke="#FCA5A5"
              strokeWidth="2"
            />

            {/* Indentation at top */}
            <path
              d="M19 13c0-1 0.5-2 1-2s1 1 1 2"
              fill="#FEE2E2"
              stroke="#FCA5A5"
            />

            {/* Stem */}
            <path
              d="M20 11v-4"
              strokeWidth="2"
              stroke="#92400E"
              strokeLinecap="round"
            />
            <path
              d="M20 7c0-0.5 0.5-1 1-1"
              strokeWidth="1.5"
              stroke="#92400E"
              fill="none"
            />

            {/* Leaf on stem */}
            <path
              d="M21 9c1-0.5 3-0.5 4 0c1 0.5 2 1.5 2 3c0 1-0.5 2-1.5 2.5c-1 0.5-2.5 0.5-3.5 0"
              fill="#86EFAC"
              opacity="0.7"
              stroke="#22C55E"
              strokeWidth="1.5"
            />
            <path
              d="M23 11c1-1 2-1.5 3-1.5"
              stroke="#22C55E"
              strokeWidth="1"
              opacity="0.6"
            />

            {/* Highlight on apple */}
            <ellipse
              cx="16"
              cy="18"
              rx="2.5"
              ry="3"
              fill="white"
              opacity="0.4"
              stroke="none"
            />
            <circle
              cx="15"
              cy="17"
              r="1"
              fill="white"
              opacity="0.6"
              stroke="none"
            />
          </g>

          {/* Hoe - more defined blade and handle */}
          <g
            id="icon-hoe"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Wooden handle */}
            <path
              d="M8 34l20-20"
              strokeWidth="3"
              stroke="#C4B5FD"
              strokeLinecap="round"
            />

            {/* Metal blade attachment */}
            <circle
              cx="28"
              cy="14"
              r="1.5"
              fill="#9CA3AF"
              stroke="#6B7280"
              strokeWidth="1.5"
            />

            {/* Hoe blade */}
            <path
              d="M28 14h8c1 0 1.5 0.5 1.5 1.5v1c0 1-0.5 1.5-1.5 1.5h-8"
              fill="#E5E7EB"
              opacity="0.7"
              stroke="#9CA3AF"
              strokeWidth="2"
            />
            <path
              d="M28 14v-6c0-1 0.5-1.5 1.5-1.5h1c1 0 1.5 0.5 1.5 1.5v6"
              fill="#E5E7EB"
              opacity="0.7"
              stroke="#9CA3AF"
              strokeWidth="2"
            />

            {/* Blade edge detail */}
            <line
              x1="29"
              y1="7"
              x2="31"
              y2="7"
              stroke="#6B7280"
              strokeWidth="1.5"
              opacity="0.7"
            />
            <line
              x1="29"
              y1="17"
              x2="36"
              y2="17"
              stroke="#6B7280"
              strokeWidth="1.5"
              opacity="0.7"
            />

            {/* Handle grip marks */}
            <line
              x1="14"
              y1="28"
              x2="15"
              y2="27"
              opacity="0.4"
              strokeWidth="1"
            />
            <line
              x1="18"
              y1="24"
              x2="19"
              y2="23"
              opacity="0.4"
              strokeWidth="1"
            />
            <line
              x1="22"
              y1="20"
              x2="23"
              y2="19"
              opacity="0.4"
              strokeWidth="1"
            />
          </g>

          {/* Barn - more detailed structure */}
          <g
            id="icon-barn"
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Barn roof */}
            <path
              d="M7 20l13-10l13 10"
              fill="#FCA5A5"
              opacity="0.5"
              stroke="#DC2626"
              strokeWidth="2"
            />
            <path
              d="M20 10v-2"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Barn walls */}
            <path
              d="M8 20v12h24V20"
              fill="#FEE2E2"
              opacity="0.5"
              stroke="#DC2626"
              strokeWidth="2"
            />

            {/* Barn door */}
            <rect
              x="17"
              y="24"
              width="6"
              height="8"
              rx="0.5"
              fill="#7C2D12"
              opacity="0.5"
              stroke="#92400E"
              strokeWidth="2"
            />
            <line
              x1="20"
              y1="24"
              x2="20"
              y2="32"
              stroke="#92400E"
              strokeWidth="1"
              opacity="0.7"
            />
            <circle cx="18.5" cy="28" r="0.5" fill="#92400E" />
            <circle cx="21.5" cy="28" r="0.5" fill="#92400E" />

            {/* Windows */}
            <rect
              x="10"
              y="22"
              width="4"
              height="4"
              rx="0.5"
              fill="#DBEAFE"
              opacity="0.6"
              stroke="#60A5FA"
              strokeWidth="1.5"
            />
            <line
              x1="12"
              y1="22"
              x2="12"
              y2="26"
              stroke="#60A5FA"
              strokeWidth="1"
              opacity="0.5"
            />
            <line
              x1="10"
              y1="24"
              x2="14"
              y2="24"
              stroke="#60A5FA"
              strokeWidth="1"
              opacity="0.5"
            />

            <rect
              x="26"
              y="22"
              width="4"
              height="4"
              rx="0.5"
              fill="#DBEAFE"
              opacity="0.6"
              stroke="#60A5FA"
              strokeWidth="1.5"
            />
            <line
              x1="28"
              y1="22"
              x2="28"
              y2="26"
              stroke="#60A5FA"
              strokeWidth="1"
              opacity="0.5"
            />
            <line
              x1="26"
              y1="24"
              x2="30"
              y2="24"
              stroke="#60A5FA"
              strokeWidth="1"
              opacity="0.5"
            />

            {/* Roof details */}
            <line
              x1="8"
              y1="20"
              x2="32"
              y2="20"
              stroke="#DC2626"
              strokeWidth="1.5"
              opacity="0.5"
            />

            {/* Ground */}
            <line
              x1="6"
              y1="32"
              x2="34"
              y2="32"
              stroke="#D1D5DB"
              strokeWidth="2"
              opacity="0.4"
            />
          </g>

          {/* Irrigation system - more detailed drip lines */}
          <g
            id="icon-irrigation"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main pipe */}
            <rect
              x="4"
              y="12"
              width="32"
              height="3"
              rx="1.5"
              fill="#94A3B8"
              opacity="0.6"
              stroke="#64748B"
              strokeWidth="2"
            />

            {/* Pipe connectors */}
            <circle cx="11" cy="13.5" r="1.5" fill="#475569" stroke="none" />
            <circle cx="20" cy="13.5" r="1.5" fill="#475569" stroke="none" />
            <circle cx="29" cy="13.5" r="1.5" fill="#475569" stroke="none" />

            {/* Drip lines with emitters */}
            <g stroke="#60A5FA" strokeWidth="1.5">
              {/* Left drip */}
              <line x1="11" y1="15" x2="11" y2="20" />
              <path d="M11 20c0 1.5-0.5 3-1 4.5" />
              <ellipse
                cx="10"
                cy="26"
                rx="1.5"
                ry="2"
                fill="#DBEAFE"
                opacity="0.6"
              />
              <circle cx="10" cy="28" r="1" fill="#60A5FA" opacity="0.7" />
              <circle cx="9.5" cy="30" r="0.8" fill="#60A5FA" opacity="0.5" />
              <circle cx="10.5" cy="31" r="0.6" fill="#60A5FA" opacity="0.4" />

              {/* Middle drip */}
              <line x1="20" y1="15" x2="20" y2="20" />
              <path d="M20 20c0 1.5-0.5 3-1 4.5" />
              <ellipse
                cx="19"
                cy="26"
                rx="1.5"
                ry="2"
                fill="#DBEAFE"
                opacity="0.6"
              />
              <circle cx="19" cy="28" r="1" fill="#60A5FA" opacity="0.7" />
              <circle cx="18.5" cy="30" r="0.8" fill="#60A5FA" opacity="0.5" />
              <circle cx="19.5" cy="31" r="0.6" fill="#60A5FA" opacity="0.4" />

              {/* Right drip */}
              <line x1="29" y1="15" x2="29" y2="20" />
              <path d="M29 20c0 1.5-0.5 3-1 4.5" />
              <ellipse
                cx="28"
                cy="26"
                rx="1.5"
                ry="2"
                fill="#DBEAFE"
                opacity="0.6"
              />
              <circle cx="28" cy="28" r="1" fill="#60A5FA" opacity="0.7" />
              <circle cx="27.5" cy="30" r="0.8" fill="#60A5FA" opacity="0.5" />
              <circle cx="28.5" cy="31" r="0.6" fill="#60A5FA" opacity="0.4" />
            </g>

            {/* Pipe end caps */}
            <circle
              cx="4"
              cy="13.5"
              r="1.5"
              fill="#475569"
              stroke="#334155"
              strokeWidth="1"
            />
            <circle
              cx="36"
              cy="13.5"
              r="1.5"
              fill="#475569"
              stroke="#334155"
              strokeWidth="1"
            />
          </g>

          <filter id="soft">
            <feGaussianBlur stdDeviation="0.12" />
          </filter>
        </defs>

        <g filter="url(#soft)">
          {nodes.map((n, i) => (
            <g
              key={i}
              transform={`translate(${n.x} ${n.y}) scale(${n.s})`}
              opacity={n.opacity}
            >
              {/* gentle vertical drift */}
              <animateTransform
                attributeName="transform"
                type="translate"
                additive="sum"
                values={`0 ${-n.dy}; 0 ${n.dy}; 0 ${-n.dy}`}
                keyTimes="0; 0.5; 1"
                dur={n.durY}
                begin={n.delay}
                repeatCount="indefinite"
              />
              {/* soft pendulum sway */}
              <animateTransform
                attributeName="transform"
                type="rotate"
                additive="sum"
                values={`${-n.rot} 20 20; ${n.rot} 20 20; ${-n.rot} 20 20`}
                keyTimes="0; 0.5; 1"
                dur={n.durR}
                begin={n.delay}
                repeatCount="indefinite"
              />
              <use href={`#${n.id}`} />
            </g>
          ))}
        </g>
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <Logo className="h-30 w-60" />
        <Progress
          color="primary"
          isIndeterminate
          animationDuration="1s"
          className="mt-2 h-1"
        />
      </div>
    </div>
  );
}
