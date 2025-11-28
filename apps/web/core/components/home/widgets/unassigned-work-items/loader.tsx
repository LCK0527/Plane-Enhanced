import { range } from "lodash-es";
// ui
import { Loader } from "@plane/ui";

export function UnassignedWorkItemsLoader() {
  return (
    <Loader className="bg-custom-background-100 rounded-xl px-2 space-y-4">
      {range(3).map((index) => (
        <div key={index} className="flex items-start gap-3.5">
          <div className="flex-shrink-0">
            <Loader.Item height="32px" width="32px" />
          </div>
          <div className="space-y-3 flex-shrink-0 w-full my-auto">
            <Loader.Item height="15px" width="70%" />
            <Loader.Item height="12px" width="50%" />
          </div>
          <div className="flex-shrink-0">
            <Loader.Item height="24px" width="60px" />
          </div>
        </div>
      ))}
    </Loader>
  );
}

