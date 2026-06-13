import { useRef, useEffect } from "react";

/**
 * Custom hook to get the previous value of a prop or state.
 * This is used to determine the animation direction (e.g., forward or backward).
 * @param value The value to track.
 * @returns The previous value.
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if the value changes

  return ref.current;
}
