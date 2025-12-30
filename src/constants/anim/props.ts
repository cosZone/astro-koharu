export type AnimType = 'scale';
export const clickableProps = (type: AnimType = 'scale', props?: { scale?: number }) => {
  switch (type) {
    default: {
      const { scale } = props ?? {};
      return {
        transition: { type: 'spring', stiffness: 80 },
        whileTap: { scale: scale ?? 1.05 },
        whileHover: { scale: scale ?? 1.05 },
      };
    }
  }
};
