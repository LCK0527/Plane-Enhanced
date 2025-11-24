import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { CircularProgressIndicator, CollapsibleButton } from "@plane/ui";
// hooks
import useSWR from "swr";
// services
import { IssueChecklistService } from "@/services/issue/issue_checklist.service";

type Props = {
  isOpen: boolean;
  issueId: string;
  workspaceSlug: string;
  projectId: string;
};

const checklistService = new IssueChecklistService();

export const ChecklistCollapsibleTitle = observer(function ChecklistCollapsibleTitle(props: Props) {
  const { isOpen, issueId, workspaceSlug, projectId } = props;
  const { t } = useTranslation();

  const { data: checklistData } = useSWR(
    issueId ? `CHECKLIST_${workspaceSlug}_${projectId}_${issueId}` : null,
    () => checklistService.getChecklist(workspaceSlug, projectId, issueId),
    {
      revalidateOnFocus: false,
    }
  );

  const progress = checklistData?.progress ?? { total: 0, completed: 0, percentage: 0 };

  if (progress.total === 0) {
    return (
      <CollapsibleButton
        isOpen={isOpen}
        title="Checklist"
        indicatorElement={
          <div className="flex items-center gap-1.5 text-custom-text-300 text-sm">
            <span>{t("common.none")}</span>
          </div>
        }
      />
    );
  }

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title="Checklist"
      indicatorElement={
        <div className="flex items-center gap-1.5 text-custom-text-300 text-sm">
          <CircularProgressIndicator size={18} percentage={progress.percentage} strokeWidth={3} />
          <span>
            {progress.completed}/{progress.total} {t("common.completed") || "done"}
          </span>
        </div>
      }
    />
  );
});

