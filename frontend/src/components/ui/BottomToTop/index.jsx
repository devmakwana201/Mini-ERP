// Import Dependencies

// ----------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";

export default function BottomToTop() {
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isBtnVisible, setIsBtnVisible] = useState(false);
  const btnRef = useRef(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setShowScrollBtn(false), 600); // retract after scroll
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsBtnVisible(true);
      } else {
        setIsBtnVisible(false);
        setShowScrollBtn(false); // retract when at top
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showScrollBtn &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setShowScrollBtn(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showScrollBtn]);

  return (
    <>
      {isBtnVisible && (
        <div
          ref={btnRef}
          className={`fixed right-0 bottom-6 z-50 transition-all duration-300 ease-in-out ${
            showScrollBtn
              ? "translate-x-0 opacity-80"
              : "translate-x-[85%] opacity-20 hover:translate-x-0 hover:opacity-80"
          } group`}
          onMouseLeave={() => setShowScrollBtn(false)}
        >
          <div
            className="flex max-w-[60px] cursor-pointer items-center justify-center rounded-l-xl bg-gradient-to-r from-green-400 to-emerald-500 px-3 py-2 text-white shadow-lg transition-all duration-300 hover:from-green-500 hover:to-emerald-600 sm:max-w-none sm:px-4 sm:py-3"
            onClick={scrollToTop}
            onTouchStart={() => setShowScrollBtn((prev) => !prev)}
          >
            <i className="pi pi-chevron-up text-xl" />
          </div>
        </div>
      )}
    </>
  );
}
