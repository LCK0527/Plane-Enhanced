import React from "react";
import { ISSUE_PRIORITIES } from "@plane/constants";
import { PriorityIcon } from "@plane/propel/icons";
import type { TIssuePriorities } from "@plane/types";
import { cn } from "@plane/utils";

type PriorityQuickSelectProps = {
  value: TIssuePriorities | undefined | null;
  onChange: (priority: TIssuePriorities) => void;
  className?: string;
};

// Priority color classes matching the dropdown styles
const priorityClasses: Record<TIssuePriorities, string> = {
  urgent: "border-red-500/20 bg-red-500/10 text-red-500",
  high: "border-orange-500/20 bg-orange-500/10 text-orange-500",
  medium: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  none: "border-custom-border-300 bg-custom-background-90 text-custom-text-400",
};

export const PriorityQuickSelect = React.memo(function PriorityQuickSelect(props: PriorityQuickSelectProps) {
  const { value, onChange, className } = props;
  const currentPriority = value ?? "none";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-xs text-custom-text-400 whitespace-nowrap">Priority:</span>
      <div className="flex items-center gap-1">
        {ISSUE_PRIORITIES.map((priority) => {
          const isSelected = currentPriority === priority.key;
          return (
            <button
              key={priority.key}
              type="button"
              onClick={() => {
                const newPriority = isSelected ? "none" : priority.key;
                onChange(newPriority as TIssuePriorities);
              }}
              className={cn(
                "flex items-center justify-center gap-1 px-2 py-1 rounded-md border transition-all",
                "hover:scale-105 active:scale-95",
                isSelected
                  ? priorityClasses[priority.key]
                  : "border-custom-border-200 bg-custom-background-100 text-custom-text-400 hover:bg-custom-background-80",
                priority.key === "urgent" && isSelected && "ring-2 ring-red-500/30"
              )}
              title={priority.title}
            >
              <PriorityIcon priority={priority.key} size={14} className="flex-shrink-0" />
              <span className="text-xs font-medium">{priority.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

