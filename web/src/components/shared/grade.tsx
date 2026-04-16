import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export type GradeLetter = "A" | "B" | "C" | "D" | "F";

export const GRADE_NAMES: Record<GradeLetter, string> = {
  A: "Trusted",
  B: "Sound",
  C: "Monitor",
  D: "Risky",
  F: "Hostile",
};

export const GRADE_DESCRIPTIONS: Record<GradeLetter, string> = {
  A: "Zero critical findings. Safe to connect.",
  B: "Minor findings. Review before wide use.",
  C: "Notable concerns. Scope-limit recommended.",
  D: "Major risks. Do not grant write access.",
  F: "Weaponized by design. Do not connect.",
};

const gradeStampVariants = cva(
  "relative inline-flex items-center justify-center rounded aspect-square font-black leading-[0.85] tracking-[-0.05em] select-none after:absolute after:inset-[6px] after:rounded-[2px] after:border-[1.5px] after:border-current after:opacity-25 after:content-['']",
  {
    variants: {
      letter: {
        A: "text-[#10b981] bg-[rgba(16,185,129,0.1)]",
        B: "text-[#22c55e] bg-[rgba(34,197,94,0.1)]",
        C: "text-[#eab308] bg-[rgba(234,179,8,0.1)]",
        D: "text-[#f97316] bg-[rgba(249,115,22,0.1)]",
        F: "text-[#ef4444] bg-[rgba(239,68,68,0.1)]",
      },
      size: {
        sm: "w-6 h-6 text-[15px] after:inset-[3px]",
        md: "w-11 h-11 text-[32px] after:inset-[4px]",
        lg: "w-[72px] h-[72px] text-[56px]",
        xl: "w-[120px] h-[120px] text-[96px] after:inset-[8px]",
        hero: "w-[180px] h-[180px] text-[160px] after:inset-[10px]",
      },
      rotated: {
        true: "-rotate-[2deg]",
        false: "",
      },
    },
    defaultVariants: {
      letter: "C",
      size: "md",
      rotated: false,
    },
  }
);

export interface GradeStampProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof gradeStampVariants>, "letter"> {
  letter: GradeLetter;
}

export const GradeStamp = React.forwardRef<HTMLSpanElement, GradeStampProps>(
  ({ className, letter, size, rotated, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="img"
        aria-label={`AgentsID Grade ${letter} — ${GRADE_NAMES[letter]}`}
        className={cn(gradeStampVariants({ letter, size, rotated }), className)}
        {...props}
      >
        {letter}
      </span>
    );
  }
);
GradeStamp.displayName = "GradeStamp";

/**
 * Inline grade chip — for row context (registry lists, audit log entries, nav pills).
 * Shows "● A · Trusted" with matching grade color.
 */
const gradeChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.005em]",
  {
    variants: {
      letter: {
        A: "text-[#10b981] border-[#10b981]/30 bg-[#10b981]/10",
        B: "text-[#22c55e] border-[#22c55e]/30 bg-[#22c55e]/10",
        C: "text-[#eab308] border-[#eab308]/30 bg-[#eab308]/10",
        D: "text-[#f97316] border-[#f97316]/30 bg-[#f97316]/10",
        F: "text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/12",
      },
      showName: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      letter: "C",
      showName: true,
    },
  }
);

export interface GradeChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof gradeChipVariants>, "letter"> {
  letter: GradeLetter;
  showName?: boolean;
}

export const GradeChip = React.forwardRef<HTMLSpanElement, GradeChipProps>(
  ({ className, letter, showName = true, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(gradeChipVariants({ letter }), className)}
        {...props}
      >
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        <span className="font-black">{letter}</span>
        {showName && <span className="font-medium opacity-90">· {GRADE_NAMES[letter]}</span>}
      </span>
    );
  }
);
GradeChip.displayName = "GradeChip";

/**
 * Grade color token helper — lets callers pull the raw hex when they can't
 * use CSS classes (charts, SVG fills, etc.).
 */
export const GRADE_COLORS: Record<GradeLetter, string> = {
  A: "#10b981",
  B: "#22c55e",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};
