import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return;

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isLocked]);
};

