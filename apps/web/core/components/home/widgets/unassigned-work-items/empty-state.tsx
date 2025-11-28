import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/propel/empty-state";

export function UnassignedWorkItemsEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center py-10 bg-custom-background-90 w-full">
      <EmptyStateCompact
        assetKey="work-item"
        assetClassName="size-20"
        title={t("home.unassigned_work_items.empty.title") || "All work items are assigned! 🎉"}
        description={
          t("home.unassigned_work_items.empty.description") ||
          "Great job! There are no unassigned work items at the moment."
        }
      />
    </div>
  );
}

