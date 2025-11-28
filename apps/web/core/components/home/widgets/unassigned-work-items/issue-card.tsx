import { observer } from "mobx-react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { PriorityIcon, StateGroupIcon, WorkItemsIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssue } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { calculateTimeAgo, generateWorkItemLink } from "@plane/utils";
import { cn } from "@plane/utils";
// components
import { ListItem } from "@/components/core/list";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProjectState } from "@/hooks/store/use-project-state";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";

type UnassignedIssueCardProps = {
  issue: TIssue;
  workspaceSlug: string;
  onClaim: () => void;
  isClaiming: boolean;
  getProjectIdentifierById: (projectId: string) => string | undefined;
};

export const UnassignedIssueCard = observer(function UnassignedIssueCard(props: UnassignedIssueCardProps) {
  const { issue, workspaceSlug, onClaim, isClaiming, getProjectIdentifierById } = props;
  const { t } = useTranslation();
  const { getStateById } = useProjectState();
  const { setPeekIssue } = useIssueDetail();
  const { setPeekIssue: setPeekEpic } = useIssueDetail(EIssueServiceType.EPICS);

  const projectIdentifier = getProjectIdentifierById(issue.project_id);
  const state = getStateById(issue.state_id);

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug?.toString(),
    projectId: issue.project_id,
    issueId: issue.id,
    projectIdentifier,
    sequenceId: issue.sequence_id,
    isEpic: issue.is_epic || false,
  });

  const handlePeekOverview = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const peekDetails = {
      workspaceSlug,
      projectId: issue.project_id,
      issueId: issue.id,
    };
    if (issue.is_epic) setPeekEpic(peekDetails);
    else setPeekIssue(peekDetails);
  };

  const handleClaimClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClaim();
  };

  return (
    <div className="relative group">
      <ListItem
        key={issue.id}
        id={`unassigned-issue-${issue.id}`}
        itemLink={workItemLink}
        title={issue.name}
        prependTitleElement={
          <div className="flex-shrink-0 flex items-center gap-2">
            {issue.type_id ? (
              <IssueIdentifier
                size="lg"
                issueTypeId={issue.type_id}
                projectId={issue.project_id || ""}
                projectIdentifier={projectIdentifier || ""}
                issueSequenceId={issue.sequence_id || ""}
                textContainerClassName="text-custom-sidebar-text-400 text-sm whitespace-nowrap"
              />
            ) : (
              <div className="flex gap-2 items-center justify-center">
                <div className="flex-shrink-0 grid place-items-center rounded bg-custom-background-80 size-8">
                  <WorkItemsIcon className="size-4 text-custom-text-350" />
                </div>
                <div className="font-medium text-custom-text-400 text-sm whitespace-nowrap">
                  {projectIdentifier}-{issue.sequence_id}
                </div>
              </div>
            )}
          </div>
        }
        appendTitleElement={
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <div className="flex items-center gap-2">
              <Tooltip tooltipHeading={t("common.state")} tooltipContent={state?.name ?? t("common.state")}>
                <div>
                  <StateGroupIcon
                    stateGroup={state?.group ?? "backlog"}
                    color={state?.color}
                    className="h-4 w-4 my-auto"
                    percentage={state?.order}
                  />
                </div>
              </Tooltip>
              <Tooltip tooltipHeading={t("common.priority")} tooltipContent={issue.priority ?? t("common.priority")}>
                <div>
                  <PriorityIcon priority={issue.priority} withContainer size={12} />
                </div>
              </Tooltip>
            </div>
            <div className="flex-shrink-0 font-medium text-xs text-custom-text-400 whitespace-nowrap">
              {calculateTimeAgo(issue.created_at)}
            </div>
            <Tooltip tooltipContent={isClaiming ? "Claiming..." : "Volunteer to work on this"}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleClaimClick}
                disabled={isClaiming}
                className={cn(
                  "gap-1.5 text-xs h-7 px-3 font-medium whitespace-nowrap",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  isClaiming && "opacity-100"
                )}
              >
                <UserPlus className="size-3.5" />
                {isClaiming ? "Claiming..." : "Claim"}
              </Button>
            </Tooltip>
          </div>
        }
        quickActionElement={null}
        parentRef={null}
        disableLink={false}
        className="bg-transparent my-auto !px-2 border-none py-3 hover:bg-custom-background-80 rounded transition-colors"
        itemClassName="my-auto"
        onItemClick={handlePeekOverview}
        preventDefaultProgress
        rightElementClassName="ml-auto"
      />
    </div>
  );
});

