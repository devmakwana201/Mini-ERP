import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

const EmptyMessage = ({ title = "No data available", subtitle = "" }) => {
  // State to hold the dynamic width of the container
  const [containerWidth, setContainerWidth] = useState(0);

  // A ref to get a handle on a DOM element within our component
  const containerRef = useRef(null);

  // Effect to measure the width and update state
  useEffect(() => {
    const updateWidth = () => {
      // Find the parent <td> inside the PrimeReact empty message row.
      // This <td> has the correct colspan and full width of the table.
      const emptyMessageCell = containerRef.current?.closest(
        ".p-datatable-emptymessage td",
      );

      if (emptyMessageCell) {
        // Use its offsetWidth, which includes padding and borders
        setContainerWidth(emptyMessageCell.offsetWidth);
      } else {
        // Fallback for cases where it's not in a DataTable
        setContainerWidth(document.body.clientWidth);
      }
    };

    // Run once on mount to get the initial width
    updateWidth();

    // Re-run the measurement if the window is resized
    window.addEventListener("resize", updateWidth);

    // Cleanup: remove the event listener when the component unmounts
    return () => window.removeEventListener("resize", updateWidth);
  }, []); // Empty dependency array ensures this effect runs only on mount and unmount

  return (
    // Add the ref to the top-level div
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center pt-2 pb-14"
    >
      <i className="pi pi-inbox mb-4 text-5xl text-gray-400"></i>
      <p className="mb-2 text-lg font-semibold text-gray-600">{title}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}

      {/* Moving Tractor Animation */}
      <div
        className="pointer-events-none absolute left-0 h-20 w-full overflow-hidden"
        style={{ marginTop: "185px" }}
      >
        <div
          style={{
            animation: "movetractor 15s linear infinite",
            position: "absolute",
            bottom: "0",
          }}
        >
          <svg
            width="140"
            height="80"
            viewBox="-10 -15 160 95"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ====== DEFINITIONS: darker filters & gradients ====== */}
            <defs>
              {/* Darker, soft smoke blur */}
              <filter
                id="smokeBlur"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" />
              </filter>

              {/* Slightly stronger dust blur */}
              <filter
                id="dustBlur"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
              </filter>

              {/* Darker smoke gradient */}
              <radialGradient id="smokeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A9A9A9" stopOpacity="1" />{" "}
                {/* dark center */}
                <stop offset="60%" stopColor="#7A7A7A" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4F4F4F" stopOpacity="0.25" />
              </radialGradient>

              {/* Darker dust gradient */}
              <radialGradient id="dustGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A36B1F" stopOpacity="0.4" />{" "}
                {/* rich brown */}
                <stop offset="60%" stopColor="#8C5718" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5E3A0F" stopOpacity="0.2" />
              </radialGradient>
            </defs>

            {/* SHADOW */}
            <ellipse
              cx="55"
              cy="75"
              rx="45"
              ry="3"
              fill="#000"
              opacity="0.28"
            />

            {/* === GROUPS: keep body slightly translucent, smoke/dust full power === */}
            {/* TRACTOR BODY (everything except smoke/dust) */}
            <g transform="translate(0,5)" opacity="0.8">
              {/* Main chassis */}
              <rect
                x="35"
                y="30"
                width="55"
                height="18"
                rx="2"
                fill="#1B5E20"
              />
              <rect
                x="36"
                y="31"
                width="53"
                height="16"
                rx="2"
                fill="#2E7D32"
              />

              {/* Engine block */}
              <rect
                x="90"
                y="27"
                width="30"
                height="23"
                rx="3"
                fill="#1B5E20"
              />
              <rect
                x="91"
                y="28"
                width="28"
                height="21"
                rx="2"
                fill="#388E3C"
              />

              {/* Hood details */}
              <rect x="95" y="28" width="20" height="3" rx="1" fill="#4CAF50" />
              <rect x="95" y="32" width="20" height="3" rx="1" fill="#4CAF50" />
              <rect x="95" y="40" width="20" height="3" rx="1" fill="#4CAF50" />

              {/* Cabin structure */}
              <rect x="40" y="8" width="30" height="22" rx="3" fill="#1B5E20" />
              <rect x="41" y="9" width="28" height="20" rx="2" fill="#2E7D32" />

              {/* Cabin roof */}
              <rect x="38" y="8" width="34" height="4" rx="2" fill="#1B5E20" />

              {/* Front windshield */}
              <polygon
                points="70,12 70,25 68,25 68,14"
                fill="#4FC3F7"
                opacity="0.9"
              />
              <rect x="69" y="12" width="2" height="13" fill="#1B5E20" />

              {/* Side windows */}
              <rect
                x="43"
                y="12"
                width="10"
                height="12"
                rx="1"
                fill="#4FC3F7"
                opacity="0.9"
              />
              <rect
                x="55"
                y="12"
                width="10"
                height="12"
                rx="1"
                fill="#4FC3F7"
                opacity="0.9"
              />

              {/* Window frames */}
              <rect x="42" y="11" width="12" height="1" fill="#1B5E20" />
              <rect x="54" y="11" width="12" height="1" fill="#1B5E20" />
              <rect x="42" y="24" width="12" height="1" fill="#1B5E20" />
              <rect x="54" y="24" width="12" height="1" fill="#1B5E20" />

              {/* Engine grille */}
              <rect x="95" y="34" width="18" height="10" fill="#0D4F14" />
              <rect x="97" y="35" width="2" height="8" fill="#2E7D32" />
              <rect x="100" y="35" width="2" height="8" fill="#2E7D32" />
              <rect x="103" y="35" width="2" height="8" fill="#2E7D32" />
              <rect x="106" y="35" width="2" height="8" fill="#2E7D32" />
              <rect x="109" y="35" width="2" height="8" fill="#2E7D32" />

              {/* Headlights */}
              <circle cx="120" cy="38" r="4" fill="#FFF8DC" />
              <circle cx="120" cy="38" r="3" fill="#FFEB3B" />
              <circle cx="120" cy="44" r="2.5" fill="#FF5722" />

              {/* === WHEELS (rotating) === */}
              <g className="rear-wheel">
                <circle cx="45" cy="55" r="15" fill="#1A1A1A" />
                <circle cx="45" cy="55" r="12" fill="#424242" />
                <circle cx="45" cy="55" r="8" fill="#757575" />
                <circle cx="45" cy="55" r="3" fill="#1A1A1A" />
                <rect x="35" y="45" width="20" height="2" fill="#1A1A1A" />
                <rect x="35" y="50" width="20" height="2" fill="#1A1A1A" />
                <rect x="35" y="55" width="20" height="2" fill="#1A1A1A" />
                <rect x="35" y="60" width="20" height="2" fill="#1A1A1A" />
                <rect x="35" y="65" width="20" height="2" fill="#1A1A1A" />
              </g>

              <g className="front-wheel">
                <circle cx="100" cy="60" r="10" fill="#1A1A1A" />
                <circle cx="100" cy="60" r="7" fill="#424242" />
                <circle cx="100" cy="60" r="4" fill="#757575" />
                <rect x="93" y="53" width="14" height="1" fill="#1A1A1A" />
                <rect x="93" y="57" width="14" height="1" fill="#1A1A1A" />
                <rect x="93" y="60" width="14" height="1" fill="#1A1A1A" />
                <rect x="93" y="63" width="14" height="1" fill="#1A1A1A" />
              </g>

              {/* Exhaust pipe */}
              <rect x="34" y="5" width="4" height="15" rx="2" fill="#424242" />
              <ellipse cx="36" cy="5" rx="3" ry="1.5" fill="#1A1A1A" />
            </g>

            {/* ====== DARKER, MORE VISIBLE EXHAUST SMOKE ====== */}
            {/* Separate from tractor body to avoid opacity reduction */}
            <g filter="url(#smokeBlur)" style={{ mixBlendMode: "multiply" }}>
              {/* Puff A */}
              <circle cx="36" cy="10" r="2" fill="url(#smokeGrad)" opacity="0">
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  keyTimes="0;0.2;1"
                  dur="3.2s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="36;28;19;11"
                  dur="3.2s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="10;4;-3;-12"
                  dur="3.2s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="2;4;6.5;8"
                  dur="3.2s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Puff B */}
              <circle
                cx="36"
                cy="10"
                r="1.6"
                fill="url(#smokeGrad)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  keyTimes="0;0.2;1"
                  dur="3.2s"
                  begin="0.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="36;29;21;13"
                  dur="3.2s"
                  begin="0.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="10;5;-2;-10"
                  dur="3.2s"
                  begin="0.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.6;3.5;5.5;7.5"
                  dur="3.2s"
                  begin="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Puff C */}
              <circle
                cx="36"
                cy="10"
                r="1.8"
                fill="url(#smokeGrad)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  keyTimes="0;0.2;1"
                  dur="3.2s"
                  begin="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="36;27;18;9"
                  dur="3.2s"
                  begin="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="10;3;-4;-13"
                  dur="3.2s"
                  begin="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.8;3.8;6;8.5"
                  dur="3.2s"
                  begin="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>

            {/* ====== DARKER, HEAVIER DUST TRAIL ====== */}
            <g filter="url(#dustBlur)" style={{ mixBlendMode: "multiply" }}>
              {/* Rear wheel dust */}
              <circle cx="45" cy="70" r="2.5" fill="url(#dustGrad)" opacity="0">
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  keyTimes="0;0.25;1"
                  dur="2.0s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="45;30;15;0"
                  dur="2.0s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="70;65;60;62"
                  dur="2.0s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="2.5;5;8;10"
                  dur="2.0s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="45" cy="70" r="2.2" fill="url(#dustGrad)" opacity="0">
                <animate
                  attributeName="opacity"
                  values="0;0.95;0"
                  keyTimes="0;0.25;1"
                  dur="2.1s"
                  begin="0.45s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                   values="45;32;18;3" 
                  dur="2.1s"
                  begin="0.45s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="70;66;62;64"
                  dur="2.1s"
                  begin="0.45s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="2.2;4.5;7.5;9.5"
                  dur="2.1s"
                  begin="0.45s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Front wheel dust */}
              <circle
                cx="100"
                cy="70"
                r="1.3"
                fill="url(#dustGrad)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.9;0"
                  keyTimes="0;0.25;1"
                  dur="1.9s"
                  begin="0.2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="100;92;84;76"
                  dur="1.9s"
                  begin="0.2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="70;68;66;68"
                  dur="1.9s"
                  begin="0.2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.3;2.6;4.2;5.2"
                  dur="1.9s"
                  begin="0.2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx="100"
                cy="70"
                r="1.1"
                fill="url(#dustGrad)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.85;0"
                  keyTimes="0;0.25;1"
                  dur="1.9s"
                  begin="0.85s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="100;93;86;78"
                  dur="1.9s"
                  begin="0.85s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="70;69;67;69"
                  dur="1.9s"
                  begin="0.85s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.1;2.2;3.8;5"
                  dur="1.9s"
                  begin="0.85s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>
        </div>

        {/* Animation keyframes now use the dynamic width from state */}
        <style>{`
          @keyframes movetractor {
            0% { 
              transform: translateX(-150px); /* Start completely off-screen left */
            }
            100% { 
              /* Animate to the full measured width of the container */
              transform: translateX(${containerWidth}px); 
            }
          }

          /* Wheel rotation (no changes here) */
          @keyframes rotateWheel {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }

          .rear-wheel, .front-wheel {
            transform-box: fill-box;
            transform-origin: center;
            animation: rotateWheel 1s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

EmptyMessage.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default EmptyMessage;
