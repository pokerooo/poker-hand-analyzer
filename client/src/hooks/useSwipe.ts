import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number;
}

export function useSwipe(handlers: SwipeHandlers, options: SwipeOptions = {}) {
  const { threshold = 50 } = options;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold && absDeltaX > absDeltaY) {
      if (deltaX > 0) handlers.onSwipeRight?.();
      else handlers.onSwipeLeft?.();
    } else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      if (deltaY > 0) handlers.onSwipeDown?.();
      else handlers.onSwipeUp?.();
    }

    touchStart.current = null;
  }, [handlers, threshold]);

  const onTouchCancel = useCallback(() => {
    touchStart.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
