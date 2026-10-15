import React from "react";

export const BELT_HEX_COLORS: Record<string, string> = {
  white: "#F2F2EE",
  yellow: "#E9B824",
  orange: "#E8762B",
  green: "#3C9A5F",
  blue: "#2F6FDB",
  brown: "#7B4B2A",
  black: "#14161C",
};

interface BeltGraphicProps {
  belt: string;
  className?: string;
}

export function BeltGraphic({ belt, className = "w-full max-w-[280px] h-auto" }: BeltGraphicProps) {
  const normalized = belt.toLowerCase();
  const color = BELT_HEX_COLORS[normalized] || BELT_HEX_COLORS.white;

  return (
    <svg
      viewBox="0 0 320 70"
      className={className}
      aria-label={`${belt} Belt`}
      role="img"
    >
      {/* Belt Band */}
      <rect
        x="10"
        y="22"
        width="300"
        height="26"
        rx="13"
        fill={color}
        stroke="var(--line, #C3CCBE)"
        strokeWidth="1.5"
      />
      {/* Belt Knot */}
      <g>
        <rect
          x="138"
          y="10"
          width="44"
          height="50"
          rx="12"
          fill={color}
          stroke="var(--line, #C3CCBE)"
          strokeWidth="1.5"
        />
        <path
          d="M150 22v26M170 22v26"
          stroke="var(--line, #C3CCBE)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export default BeltGraphic;
