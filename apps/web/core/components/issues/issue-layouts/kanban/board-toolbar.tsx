import React, { useCallback, useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssueGroupByOptions, TIssueOrderByOptions, TBoardCardSize, IIssueDisplayFilterOptions, TWorkItemFilterExpression } from "@plane/types";
import { EIssueLayoutTypes } from "@plane/types";
import { EIssueFilterType } from "@plane/constants";
import { cn } from "@plane/utils";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useUser } from "@/hooks/store/user/user-user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
// components
import { FiltersDropdown } from "../filters";

type SwimlanePreset = "none" | "assignee" | "priority" | "labels";

interface BoardToolbarProps {
  displayFilters: IIssueDisplayFilterOptions | undefined;
  handleDisplayFiltersUpdate: (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => void;
  handleFilterExpressionUpdate?: (filters: TWorkItemFilterExpression) => void;
  storeType?: any;
}

export const BoardToolbar = observer(function BoardToolbar(props: BoardToolbarProps) {
  const { displayFilters, handleDisplayFiltersUpdate, handleFilterExpressionUpdate, storeType } = props;
  const { t } = useTranslation();
  const { workspaceSlug, projectId } = useParams();
  const { data: currentUser } = useUser();
  const issueStoreType = useIssueStoreType();
  const actualStoreType = storeType || issueStoreType;
  const { issuesFilter } = useIssues(actualStoreType);

  // Swimlane presets mapping
  const swimlanePresets: { key: SwimlanePreset; label: string; groupBy: TIssueGroupByOptions; subGroupBy: TIssueGroupByOptions | null }[] = [
    { key: "none", label: "None", groupBy: "state", subGroupBy: null },
    { key: "assignee", label: "Assignee", groupBy: "state", subGroupBy: "assignees" },
    { key: "priority", label: "Priority", groupBy: "state", subGroupBy: "priority" },
    { key: "labels", label: "Labels", groupBy: "state", subGroupBy: "labels" },
  ];

  const currentSwimlane = useMemo(() => {
    const groupBy = displayFilters?.group_by ?? "state";
    const subGroupBy = displayFilters?.sub_group_by ?? null;
    
    if (groupBy === "state") {
      if (subGroupBy === "assignees") return "assignee";
      if (subGroupBy === "priority") return "priority";
      if (subGroupBy === "labels") return "labels";
      return "none";
    }
    return "none";
  }, [displayFilters?.group_by, displayFilters?.sub_group_by]);

  const handleSwimlaneChange = useCallback(
    (preset: SwimlanePreset) => {
      const presetConfig = swimlanePresets.find((p) => p.key === preset);
      if (presetConfig) {
        handleDisplayFiltersUpdate({
          group_by: presetConfig.groupBy,
          sub_group_by: presetConfig.subGroupBy,
        });
      }
    },
    [handleDisplayFiltersUpdate, swimlanePresets]
  );

  // Card size
  const cardSize = displayFilters?.kanban?.card_size ?? "default";
  const cardSizeOptions: { key: TBoardCardSize; label: string }[] = [
    { key: "compact", label: "Compact" },
    { key: "default", label: "Default" },
    { key: "comfortable", label: "Comfortable" },
  ];

  const handleCardSizeChange = useCallback(
    (size: TBoardCardSize) => {
      handleDisplayFiltersUpdate({
        kanban: {
          ...displayFilters?.kanban,
          card_size: size,
        },
      });
    },
    [handleDisplayFiltersUpdate, displayFilters?.kanban]
  );

  // Quick filters
  const richFilters = issuesFilter?.issueFilters?.richFilters;
  const hasMyIssuesFilter = useMemo(() => {
    if (!currentUser?.id || !richFilters) return false;
    // Check if assignee_id filter exists with current user
    if (typeof richFilters === "object" && "assignee_id__in" in richFilters) {
      const assigneeFilter = (richFilters as any).assignee_id__in;
      return Array.isArray(assigneeFilter) && assigneeFilter.includes(currentUser.id);
    }
    return false;
  }, [richFilters, currentUser?.id]);

  const hasHighPriorityFilter = useMemo(() => {
    if (!richFilters) return false;
    if (typeof richFilters === "object" && "priority__in" in richFilters) {
      const priorityFilter = (richFilters as any).priority__in;
      return Array.isArray(priorityFilter) && priorityFilter.includes("urgent");
    }
    return false;
  }, [richFilters]);

  const hasDueThisWeekFilter = useMemo(() => {
    if (!richFilters) return false;
    // Check for target_date filters (this is simplified - actual implementation would check date ranges)
    return typeof richFilters === "object" && ("target_date__gte" in richFilters || "target_date__range" in richFilters);
  }, [richFilters]);

  const handleQuickFilter = useCallback(
    (filterType: "my_issues" | "high_priority" | "due_this_week" | "clear") => {
      if (!handleFilterExpressionUpdate || !workspaceSlug || !projectId) return;

      // Get current filters and merge with new ones
      const currentFilters = richFilters || {};
      let newFilters: TWorkItemFilterExpression = { ...currentFilters };

      if (filterType === "clear") {
        newFilters = {};
      } else if (filterType === "my_issues" && currentUser?.id) {
        // Toggle: if already filtered, clear; otherwise set
        if (hasMyIssuesFilter) {
          // Remove assignee filter
          const { assignee_id__in, ...rest } = newFilters as any;
          newFilters = rest;
        } else {
          newFilters = {
            ...newFilters,
            assignee_id__in: [currentUser.id],
          } as any;
        }
      } else if (filterType === "high_priority") {
        // Toggle: if already filtered, clear; otherwise set
        if (hasHighPriorityFilter) {
          const { priority__in, ...rest } = newFilters as any;
          newFilters = rest;
        } else {
          newFilters = {
            ...newFilters,
            priority__in: ["urgent", "high"],
          } as any;
        }
      } else if (filterType === "due_this_week") {
        // Toggle: if already filtered, clear; otherwise set
        if (hasDueThisWeekFilter) {
          const { target_date__range, target_date__gte, ...rest } = newFilters as any;
          newFilters = rest;
        } else {
          const today = new Date();
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          newFilters = {
            ...newFilters,
            target_date__range: [today.toISOString().split("T")[0], nextWeek.toISOString().split("T")[0]],
          } as any;
        }
      }

      handleFilterExpressionUpdate(newFilters);
    },
    [handleFilterExpressionUpdate, workspaceSlug, projectId, currentUser?.id, richFilters, hasMyIssuesFilter, hasHighPriorityFilter, hasDueThisWeekFilter]
  );

  // Sort options
  const sortOptions: { key: TIssueOrderByOptions; label: string }[] = [
    { key: "-priority", label: "Priority" },
    { key: "-target_date", label: "Due date" },
    { key: "-updated_at", label: "Updated" },
  ];

  const currentSort = displayFilters?.order_by ?? "-created_at";
  const currentSortLabel = sortOptions.find((opt) => opt.key === currentSort)?.label || "Updated";

  const handleSortChange = useCallback(
    (sortKey: TIssueOrderByOptions) => {
      handleDisplayFiltersUpdate({
        order_by: sortKey,
      });
    },
    [handleDisplayFiltersUpdate]
  );

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-custom-border-200 bg-custom-background-100">
      {/* Swimlane Presets */}
      <FiltersDropdown
        title={t("board.swimlanes")}
        placement="bottom-start"
        customButton={
          <Button variant="neutral-primary" size="sm" className="gap-1">
            {swimlanePresets.find((p) => p.key === currentSwimlane)?.label || "None"}
            <ChevronDown className="size-3" />
          </Button>
        }
      >
        <div className="py-2">
          {swimlanePresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handleSwimlaneChange(preset.key)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-custom-background-80 transition-colors",
                currentSwimlane === preset.key && "bg-custom-primary-100/10 text-custom-primary-100"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </FiltersDropdown>

      {/* Card Size */}
      <FiltersDropdown
        title={t("board.card_size")}
        placement="bottom-start"
        customButton={
          <Button variant="neutral-primary" size="sm" className="gap-1">
            {cardSizeOptions.find((opt) => opt.key === cardSize)?.label || "Default"}
            <ChevronDown className="size-3" />
          </Button>
        }
      >
        <div className="py-2">
          {cardSizeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleCardSizeChange(option.key)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-custom-background-80 transition-colors",
                cardSize === option.key && "bg-custom-primary-100/10 text-custom-primary-100"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </FiltersDropdown>

      {/* Quick Filters */}
      <div className="flex items-center gap-1.5 ml-2">
        <Tooltip tooltipContent="Only my issues">
          <Button
            variant={hasMyIssuesFilter ? "primary" : "neutral-primary"}
            size="sm"
            onClick={() => handleQuickFilter("my_issues")}
          >
            My issues
          </Button>
        </Tooltip>
        <Tooltip tooltipContent="High priority">
          <Button
            variant={hasHighPriorityFilter ? "primary" : "neutral-primary"}
            size="sm"
            onClick={() => handleQuickFilter("high_priority")}
          >
            High priority
          </Button>
        </Tooltip>
        <Tooltip tooltipContent="Due this week">
          <Button
            variant={hasDueThisWeekFilter ? "primary" : "neutral-primary"}
            size="sm"
            onClick={() => handleQuickFilter("due_this_week")}
          >
            Due this week
          </Button>
        </Tooltip>
        {(hasMyIssuesFilter || hasHighPriorityFilter || hasDueThisWeekFilter) && (
          <Tooltip tooltipContent="Clear filters">
            <Button variant="neutral-primary" size="sm" onClick={() => handleQuickFilter("clear")}>
              <X className="size-3.5" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Sort By */}
      <div className="ml-auto">
        <FiltersDropdown
          title={t("board.sort_by")}
          placement="bottom-end"
          customButton={
            <Button variant="neutral-primary" size="sm" className="gap-1">
              Sort: {currentSortLabel}
              <ChevronDown className="size-3" />
            </Button>
          }
        >
          <div className="py-2">
            {sortOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSortChange(option.key)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded hover:bg-custom-background-80 transition-colors",
                  currentSort === option.key && "bg-custom-primary-100/10 text-custom-primary-100"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FiltersDropdown>
      </div>
    </div>
  );
});

