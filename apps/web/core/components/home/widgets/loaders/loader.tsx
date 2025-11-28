// components
import { QuickLinksWidgetLoader } from "./quick-links";
import { RecentActivityWidgetLoader } from "./recent-activity";
import { UnassignedWorkItemsLoader } from "../unassigned-work-items/loader";

// types

type Props = {
  widgetKey: EWidgetKeys;
};

export enum EWidgetKeys {
  RECENT_ACTIVITY = "recent_activity",
  QUICK_LINKS = "quick_links",
  UNASSIGNED_WORK_ITEMS = "unassigned_work_items",
}

export function WidgetLoader(props: Props) {
  const { widgetKey } = props;

  const loaders = {
    [EWidgetKeys.RECENT_ACTIVITY]: <RecentActivityWidgetLoader />,
    [EWidgetKeys.QUICK_LINKS]: <QuickLinksWidgetLoader />,
    [EWidgetKeys.UNASSIGNED_WORK_ITEMS]: <UnassignedWorkItemsLoader />,
  };

  return loaders[widgetKey];
}
