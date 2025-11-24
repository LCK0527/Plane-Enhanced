import { observer } from "mobx-react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { Collapsible } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { ChecklistCollapsibleContent } from "./content";
import { ChecklistCollapsibleTitle } from "./title";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export const ChecklistCollapsible = observer(function ChecklistCollapsible(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled = false, issueServiceType } = props;
  // store hooks
  const { openWidgets, toggleOpenWidget } = useIssueDetail(issueServiceType);
  // derived values
  const isCollapsibleOpen = openWidgets.includes("checklist");

  return (
    <Collapsible
      isOpen={isCollapsibleOpen}
      onToggle={() => toggleOpenWidget("checklist")}
      title={
        <ChecklistCollapsibleTitle
          isOpen={isCollapsibleOpen}
          issueId={issueId}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
        />
      }
      buttonClassName="w-full"
    >
      <ChecklistCollapsibleContent
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        issueId={issueId}
        disabled={disabled}
      />
    </Collapsible>
  );
});

