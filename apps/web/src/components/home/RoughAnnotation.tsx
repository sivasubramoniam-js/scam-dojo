import React, { useEffect, useRef } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotationType } from "rough-notation/lib/model";

interface RoughAnnotationProps {
  type: RoughAnnotationType;
  color?: string;
  strokeWidth?: number;
  padding?: number | [number, number] | [number, number, number, number];
  animate?: boolean;
  animationDuration?: number;
  iterations?: number;
  show?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function RoughAnnotation({
  type,
  color = "#EF4444",
  strokeWidth = 2,
  padding = 3,
  animate = true,
  animationDuration = 600,
  iterations = 2,
  show = true,
  children,
  className = "",
}: RoughAnnotationProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const annotationRef = useRef<ReturnType<typeof annotate> | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Clean up any existing annotation
    if (annotationRef.current) {
      annotationRef.current.remove();
    }

    if (!show) return;

    try {
      const annotation = annotate(ref.current, {
        type,
        color,
        strokeWidth,
        padding,
        animate,
        animationDuration,
        iterations,
      });

      annotationRef.current = annotation;
      // Slight delay so DOM layout has settled
      const timer = setTimeout(() => {
        annotation.show();
      }, 50);

      return () => {
        clearTimeout(timer);
        annotation.remove();
      };
    } catch (e) {
      // Gracefully handle any layout calculation edge cases
      console.debug("[rough-notation] render skipped:", e);
    }
  }, [type, color, strokeWidth, padding, animate, animationDuration, iterations, show]);

  return (
    <span ref={ref} className={`inline-block relative ${className}`}>
      {children}
    </span>
  );
}

export default RoughAnnotation;
