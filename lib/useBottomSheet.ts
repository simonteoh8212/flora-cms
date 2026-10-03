"use client";

import { useState, useRef, useEffect, useCallback, CSSProperties } from "react";

interface UseBottomSheetOptions {
  isOpen: boolean;
  onClose: () => void;
  dismissThreshold?: number; // Distance in px to trigger dismiss, default 80
}

export function useBottomSheet({
  isOpen,
  onClose,
  dismissThreshold = 80,
}: UseBottomSheetOptions) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentDragYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth close action that triggers exit animation before notifying parent
  const handleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsVisible(false);
    setDragY(0);
    currentDragYRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);

    closeTimerRef.current = setTimeout(() => {
      setIsMounted(false);
      onClose();
    }, 320);
  }, [onClose]);

  // Synchronize with parent's isOpen prop
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setIsMounted(true);
      // Double rAF ensures the browser paints initial off-screen transform before animating in
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
        return () => cancelAnimationFrame(frame2);
      });
      return () => cancelAnimationFrame(frame1);
    } else {
      if (isMounted) {
        setIsVisible(false);
        const timer = setTimeout(() => {
          setIsMounted(false);
        }, 320);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isMounted]);

  // Rock-solid Body Scroll Lock: prevent background scrolling when bottom sheet is open
  useEffect(() => {
    if (!isMounted) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
    };
  }, [isMounted]);

  // Global window listeners when actively dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - startYRef.current;

      if (deltaY > 0) {
        // Dragging downwards: 1:1 smooth tracking
        currentDragYRef.current = deltaY;
        setDragY(deltaY);
      } else {
        // Dragging upwards: rubber-band elastic resistance
        const resisted = Math.max(-25, deltaY * 0.15);
        currentDragYRef.current = resisted;
        setDragY(resisted);
      }
    };

    const handleWindowPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const elapsed = Math.max(1, Date.now() - startTimeRef.current);
      const finalDeltaY = currentDragYRef.current;
      const velocity = finalDeltaY / elapsed; // px per millisecond

      // If dragged past threshold or flicked downwards with speed
      if (finalDeltaY > dismissThreshold || (velocity > 0.35 && finalDeltaY > 25)) {
        handleClose();
      } else {
        // Snap back smoothly
        setDragY(0);
        currentDragYRef.current = 0;
      }
    };

    const handleWindowPointerCancel = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragY(0);
      currentDragYRef.current = 0;
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [isDragging, dismissThreshold, handleClose]);

  // Handle pointer down on the dragger or header
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!e.isPrimary) return;

    // Do not initiate drag if user taps interactive elements (buttons, links, inputs)
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }

    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    currentDragYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const sheetStyle: CSSProperties = isDragging
    ? {
        transform: `translateY(${Math.max(0, dragY)}px)`,
        transition: "none",
      }
    : dragY !== 0
    ? {
        transform: "translateY(0)",
        transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : {};

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    style: { touchAction: "none" as const },
  };

  const backdropProps = {
    onTouchMove: (e: React.TouchEvent) => {
      if (e.target === e.currentTarget) {
        e.preventDefault();
      }
    },
    style: { touchAction: "none" as const },
  };

  return {
    isMounted,
    isVisible,
    handleClose,
    sheetStyle,
    dragHandleProps,
    backdropProps,
    isDragging,
  };
}
