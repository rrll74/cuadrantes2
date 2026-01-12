import React from "react";
import { clsx } from "clsx";

interface ProgressBarProps {
  progress: number;
  className?: string;
  color?: string;
}

export const ProgressBar = ({
  progress,
  className,
  color = "bg-blue-600",
}: ProgressBarProps) => {
  // Aseguramos que el valor esté entre 0 y 100
  const percentage = Math.max(0, Math.min(100, progress));

  return (
    <div className={clsx("w-full bg-gray-200 rounded-full h-2.5", className)}>
      <div
        className={clsx(
          "h-2.5 rounded-full transition-all duration-300 ease-out",
          color,
        )}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
