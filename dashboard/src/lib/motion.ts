// Shared animation tokens so every motion in the app is consistent.
// Timing: micro 150–200ms · cards 250–350ms · pages 300–450ms · viz 500–800ms.

export const EASE: [number, number, number, number] = [0.22, 0.8, 0.26, 1]; // smooth, professional
export const DUR = {
  micro: 0.18,
  card: 0.3,
  page: 0.4,
  viz: 0.6,
} as const;

// Whole-screen transition on navigation — a calm cross-fade, no movement.
export const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: EASE } },
};

// Reusable item entrance for motion lists.
export const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.card, ease: EASE } },
};

// Modal panel + backdrop.
export const modalPanel = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.card, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: DUR.micro, ease: EASE } },
};
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.card } },
  exit: { opacity: 0, transition: { duration: DUR.micro } },
};

// Sliding sidebar active-indicator transition (layoutId).
export const navIndicator = { type: "tween" as const, duration: 0.26, ease: EASE };
