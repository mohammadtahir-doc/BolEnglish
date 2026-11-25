import React from "react";
import { Flame } from "lucide-react";

interface StreakFlameBadgeProps {
  streak: number;
}

export const StreakFlameBadge: React.FC<StreakFlameBadgeProps> = ({ streak }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 font-bold text-sm select-none shadow-sm">
      <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
      <span>{streak} Days</span>
    </div>
  );
};
