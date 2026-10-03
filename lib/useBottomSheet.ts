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
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentDragYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 1. Rock-solid Body Scroll Lock: prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
      return;
    }

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
  }, [isOpen]);

  // 2. Global window listeners when dragging so finger can move anywhere on screen
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

      // If dragged past threshold or flicked downwards
      if (finalDeltaY > dismissThreshold || (velocity > 0.35 && finalDeltaY > 25)) {
        setIsClosing(true);
        setTimeout(() => {
          onClose();
        }, 150);
      } else {
        // Smoothly snap back to origin
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
  }, [isDragging, dismissThreshold, onClose]);

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

  const sheetStyle: CSSProperties = {
    transform: isClosing
      ? "translateY(100%)"
      : dragY !== 0
      ? `translateY(${Math.max(0, dragY)}px)`
      : undefined,
    transition: isDragging
      ? "none"
      : "transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
  };

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
    sheetStyle,
    dragHandleProps,
    backdropProps,
    isDragging,
  };
}
