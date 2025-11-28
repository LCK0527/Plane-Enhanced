import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { THomeWidgetProps, TIssue, TIssuesResponse } from "@plane/types";
// components
import { ContentOverflowWrapper } from "@/components/core/content-overflow-HOC";
// services
import { WorkspaceService } from "@/plane-web/services";
// hooks
import { useUser } from "@/hooks/store/user";
import { useProject } from "@/hooks/store/use-project";
import { useIssues } from "@/hooks/store/use-issues";
import { EIssuesStoreType } from "@plane/types";
// local imports
import { UnassignedIssueCard } from "./issue-card";
import { UnassignedWorkItemsEmptyState } from "./empty-state";
import { UnassignedWorkItemsLoader } from "./loader";

const workspaceService = new WorkspaceService();

export const UnassignedWorkItemsWidget = observer(function UnassignedWorkItemsWidget(props: THomeWidgetProps) {
  const { workspaceSlug } = props;
  const { t } = useTranslation();
  const { data: currentUser } = useUser();
  const { getProjectIdentifierById } = useProject();
  const { issues } = useIssues(EIssuesStoreType.WORKSPACE);
  const { workspaceSlug: routeWorkspaceSlug } = useParams();
  const ref = useRef<HTMLDivElement>(null);
  const [claimingIssueId, setClaimingIssueId] = useState<string | null>(null);

  // Fetch unassigned issues (show all, not limited to 10)
  const { data: unassignedIssuesResponse, isLoading, mutate } = useSWR(
    workspaceSlug && currentUser?.id ? `UNASSIGNED_WORK_ITEMS_${workspaceSlug}` : null,
    workspaceSlug && currentUser?.id
      ? () =>
          workspaceService.getViewIssues(workspaceSlug.toString(), {
            assignees: "None", // Filter for unassigned issues (API expects "None" not "__none__")
            per_page: 100, // Show more items (or all if less than 100)
            order_by: "-created_at", // Sort by newest first
            // Don't use expand: "issue_relation" to avoid 404 on issues-detail endpoint
          })
      : null,
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Extract issues from response (handle different response formats)
  const issuesList: TIssue[] = (() => {
    if (!unassignedIssuesResponse) return [];
    
    // If response is directly an array
    if (Array.isArray(unassignedIssuesResponse)) {
      return unassignedIssuesResponse;
    }
    
    // If response has results property
    if (unassignedIssuesResponse.results) {
      // If results is an array (ungrouped)
      if (Array.isArray(unassignedIssuesResponse.results)) {
        return unassignedIssuesResponse.results;
      }
      // If results is an object (grouped), extract all issues from all groups
      if (typeof unassignedIssuesResponse.results === "object") {
        const allIssues: TIssue[] = [];
        Object.values(unassignedIssuesResponse.results).forEach((group: any) => {
          if (group?.results && Array.isArray(group.results)) {
            allIssues.push(...group.results);
          }
        });
        return allIssues;
      }
    }
    
    return [];
  })();

  // Handle claim issue
  const handleClaimIssue = async (issue: TIssue) => {
    if (!currentUser?.id || !workspaceSlug || !issue.project_id) return;

    setClaimingIssueId(issue.id);
    try {
      // Update issue to assign to current user
      await issues.issueUpdate(workspaceSlug.toString(), issue.project_id, issue.id, {
        assignee_ids: [currentUser.id],
      });

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("issue.claimed_successfully") || "You've volunteered for this work item!",
      });

      // Revalidate the list
      mutate();
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: error?.error ?? t("issue.claim_failed") ?? "Failed to volunteer for this work item",
      });
    } finally {
      setClaimingIssueId(null);
    }
  };


  if (isLoading) {
    return (
      <div ref={ref}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-custom-text-350">Unassigned Works</div>
        </div>
        <UnassignedWorkItemsLoader />
      </div>
    );
  }

  if (!isLoading && issuesList.length === 0) {
    return (
      <div ref={ref}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-custom-text-350">Unassigned Works</div>
        </div>
        <UnassignedWorkItemsEmptyState />
      </div>
    );
  }

  return (
    <ContentOverflowWrapper
      maxHeight={415}
      containerClassName="box-border min-h-[250px]"
      fallback={<></>}
      buttonClassName="bg-custom-background-90/20"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-semibold text-custom-text-350">
          Unassigned Works ({issuesList.length})
        </div>
      </div>
      <div className="min-h-[250px] flex flex-col gap-2">
        {issuesList.map((issue: TIssue) => (
          <UnassignedIssueCard
            key={issue.id}
            issue={issue}
            workspaceSlug={workspaceSlug}
            onClaim={() => handleClaimIssue(issue)}
            isClaiming={claimingIssueId === issue.id}
            getProjectIdentifierById={getProjectIdentifierById}
          />
        ))}
      </div>
    </ContentOverflowWrapper>
  );
});

