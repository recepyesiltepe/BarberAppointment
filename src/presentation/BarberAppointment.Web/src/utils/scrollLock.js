// Reference-counted body scroll lock to prevent stuck overflow:hidden when modals open/close
let lockCount = 0;

export const lockScroll = () => {
  lockCount++;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }
};

export const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
};

export const resetScroll = () => {
  lockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
};

