import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

const SPRING = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 0.8,
};

/**
 * Spring-animated content reveal: fades up from `distance` pixels below.
 *
 * @param {number}  delay    - delay before animation starts, in milliseconds
 * @param {number}  distance - y offset to start from (px)
 *
 * Under prefers-reduced-motion: instant opacity fade only.
 */
export default function FadeUp({ children, delay = 0, distance = 14, style, ...props }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce
        ? { duration: motionTokens.fast / 1000, delay: 0 }
        : { ...SPRING, delay: delay / 1000, opacity: { duration: motionTokens.normal / 1000 } }
      }
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered reveal: each direct child springs in sequentially.
 *
 * @param {number} staggerMs - delay between each child's entrance (ms)
 */
export function FadeStagger({ children, staggerMs = 65, style, ...props }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: staggerMs / 1000, delayChildren: 0.02 } },
      }}
      style={style}
      {...props}
    >
      {React.Children.map(children, (child, i) =>
        child ? (
          <motion.div
            key={i}
            variants={{
              hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
              show: {
                opacity: 1, y: 0,
                transition: { ...SPRING, opacity: { duration: motionTokens.normal / 1000 } },
              },
            }}
          >
            {child}
          </motion.div>
        ) : null
      )}
    </motion.div>
  );
}
