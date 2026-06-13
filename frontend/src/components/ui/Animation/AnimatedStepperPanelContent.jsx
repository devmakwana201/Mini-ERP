import { forwardRef } from "react";
import { motion, usePresenceData } from "motion/react";

/**
 * A reusable animation wrapper for stepper content that provides a
 * slide-in/slide-out effect. It uses `usePresenceData` to get the
 * animation direction from its parent `AnimatePresence` component.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The content to be animated.
 * @param {React.Ref} ref - The forwarded ref.
 * @returns {JSX.Element} The animated content wrapper.
 */
const AnimatedStepperPanelContent = forwardRef(
  function AnimatedStepperPanelContent({ children }, ref) {
    // This hook gets the `custom` prop from AnimatePresence, which we use
    // to determine the animation direction (1 for next, -1 for back).
    const direction = usePresenceData();

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: direction * 300 }} // Start off-screen
        animate={{
          opacity: 1,
          x: 0,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 30,
          },
        }}
        exit={{
          opacity: 0,
          x: direction * -300, // Exit to the opposite side
          transition: { duration: 0.15 },
        }}
      >
        {children}
      </motion.div>
    );
  },
);

export default AnimatedStepperPanelContent;
