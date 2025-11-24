import { useState, useCallback } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TChecklistItem, TChecklistItemCreate, TChecklistItemUpdate } from "@plane/types";
import { Button, Input, Loader } from "@plane/ui";
// hooks
import { useMember } from "@/hooks/store/use-member";
import useSWR, { mutate } from "swr";
// services
import { IssueChecklistService } from "@/services/issue/issue_checklist.service";
// components
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
// icons
import { CheckCircle2, Circle, Plus, Trash2, X } from "lucide-react";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
};

const checklistService = new IssueChecklistService();

export const ChecklistCollapsibleContent = observer(function ChecklistCollapsibleContent(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled } = props;
  const { t } = useTranslation();
  const { getUserDetails } = useMember();

  // Debug: Log props to check if issueId is valid
  if (!issueId) {
    console.warn("ChecklistCollapsibleContent: issueId is missing", { workspaceSlug, projectId, issueId });
  }

  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");

  const checklistKey = `CHECKLIST_${workspaceSlug}_${projectId}_${issueId}`;
  const { data: checklistData, isLoading } = useSWR(
    issueId ? checklistKey : null,
    () => checklistService.getChecklist(workspaceSlug, projectId, issueId),
    {
      revalidateOnFocus: false,
    }
  );

  const checklistItems = checklistData?.checklist_items ?? [];

  const handleCreateItem = useCallback(async () => {
    const trimmedName = newItemName.trim();
    const MAX_LENGTH = 500;
    
    if (!trimmedName || isCreating || !issueId) {
      if (!issueId) {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error",
          message: "Issue ID is missing",
        });
      }
      return;
    }
    
    if (trimmedName.length > MAX_LENGTH) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message: `Checklist item name must be less than ${MAX_LENGTH} characters`,
      });
      return;
    }

    setIsCreating(true);
    try {
      // Debug: Log the values being sent
      console.log("Creating checklist item with:", {
        workspaceSlug,
        projectId,
        issueId,
        name: trimmedName,
      });
      
      const payload: TChecklistItemCreate = {
        name: trimmedName,
        is_completed: false,
      };
      await checklistService.createChecklistItem(workspaceSlug, projectId, issueId, payload);
      setNewItemName("");
      await mutate(checklistKey);
    } catch (error: any) {
      console.error("Error creating checklist item:", error);
      console.error("Error details:", {
        error,
        type: typeof error,
        keys: error ? Object.keys(error) : [],
        stringified: JSON.stringify(error, null, 2),
      });
      
      // Parse Django REST framework error format
      // The service throws error?.response?.data, so error is already the Django response data
      let errorMessage = "Failed to create checklist item";
      
      if (error) {
        // If error is a string, use it directly
        if (typeof error === "string") {
          errorMessage = error;
        }
        // If error is an object (Django serializer errors)
        else if (typeof error === "object") {
          // Check for top-level error message
          if (error.error) {
            errorMessage = Array.isArray(error.error) ? error.error[0] : String(error.error);
          } else if (error.message) {
            errorMessage = Array.isArray(error.message) ? error.message[0] : String(error.message);
          } else if (error.detail) {
            // Django REST framework sometimes uses 'detail' field
            errorMessage = Array.isArray(error.detail) ? error.detail[0] : String(error.detail);
          } else {
            // Check for field-specific errors (e.g., { name: ["This field is required."] })
            const fieldErrors = Object.keys(error)
              .filter((key) => key !== "error" && key !== "message" && key !== "detail")
              .map((field) => {
                const fieldError = error[field];
                if (Array.isArray(fieldError)) {
                  return `${field}: ${fieldError[0]}`;
                }
                return `${field}: ${fieldError}`;
              })
              .join(", ");
            
            if (fieldErrors) {
              errorMessage = fieldErrors;
            } else {
              // Last resort: try to stringify the error
              errorMessage = JSON.stringify(error);
            }
          }
        }
      }
      
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  }, [newItemName, isCreating, workspaceSlug, projectId, issueId, checklistKey, t]);

  const handleToggleItem = useCallback(
    async (item: TChecklistItem) => {
      if (disabled) return;

      try {
        const payload: TChecklistItemUpdate = {
          is_completed: !item.is_completed,
        };
        await checklistService.updateChecklistItem(workspaceSlug, projectId, issueId, item.id, payload);
        await mutate(checklistKey);
      } catch (error) {
        console.error("Error updating checklist item:", error);
      }
    },
    [disabled, workspaceSlug, projectId, issueId, checklistKey]
  );

  const handleUpdateItemName = useCallback(
    async (item: TChecklistItem) => {
      const trimmedName = editingItemName.trim();
      const MAX_LENGTH = 500;
      
      if (!trimmedName || trimmedName === item.name) {
        setEditingItemId(null);
        setEditingItemName("");
        return;
      }
      
      if (trimmedName.length > MAX_LENGTH) {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error",
          message: `Checklist item name must be less than ${MAX_LENGTH} characters`,
        });
        return;
      }

      try {
        const payload: TChecklistItemUpdate = {
          name: trimmedName,
        };
        await checklistService.updateChecklistItem(workspaceSlug, projectId, issueId, item.id, payload);
        setEditingItemId(null);
        setEditingItemName("");
        await mutate(checklistKey);
      } catch (error) {
        console.error("Error updating checklist item:", error);
      }
    },
    [editingItemName, workspaceSlug, projectId, issueId, checklistKey]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (disabled) return;

      try {
        await checklistService.deleteChecklistItem(workspaceSlug, projectId, issueId, itemId);
        await mutate(checklistKey);
      } catch (error) {
        console.error("Error deleting checklist item:", error);
      }
    },
    [disabled, workspaceSlug, projectId, issueId, checklistKey]
  );

  const handleAssignItem = useCallback(
    async (item: TChecklistItem, assigneeId: string | null) => {
      if (disabled) return;

      try {
        const payload: TChecklistItemUpdate = {
          assignee_id: assigneeId,
        };
        await checklistService.updateChecklistItem(workspaceSlug, projectId, issueId, item.id, payload);
        await mutate(checklistKey);
      } catch (error) {
        console.error("Error assigning checklist item:", error);
      }
    },
    [disabled, workspaceSlug, projectId, issueId, checklistKey]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Checklist Items List */}
      <div className="flex flex-col gap-2">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-md border border-custom-border-200 bg-custom-background-90 p-2.5 hover:bg-custom-background-100"
          >
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => handleToggleItem(item)}
              disabled={disabled}
              className="flex-shrink-0 cursor-pointer text-custom-text-400 hover:text-custom-text-500 disabled:cursor-not-allowed"
            >
              {item.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>

            {/* Item Name */}
            {editingItemId === item.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editingItemName}
                  onChange={(e) => setEditingItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateItemName(item);
                    } else if (e.key === "Escape") {
                      setEditingItemId(null);
                      setEditingItemName("");
                    }
                  }}
                  className="flex-1"
                  autoFocus
                  maxLength={500}
                />
                <Button
                  variant="neutral-primary"
                  size="sm"
                  onClick={() => handleUpdateItemName(item)}
                  disabled={!editingItemName.trim()}
                >
                  {t("common.save")}
                </Button>
                <Button
                  variant="neutral-primary"
                  size="sm"
                  onClick={() => {
                    setEditingItemId(null);
                    setEditingItemName("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    if (!disabled) {
                      setEditingItemId(item.id);
                      setEditingItemName(item.name);
                    }
                  }}
                >
                  <p
                    className={`text-sm ${
                      item.is_completed
                        ? "text-custom-text-400 line-through"
                        : "text-custom-text-200"
                    }`}
                  >
                    {item.name}
                  </p>
                  {item.assignee_detail && (
                    <p className="mt-0.5 text-xs text-custom-text-400">
                      {t("common.assignee")}: {item.assignee_detail.display_name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!disabled && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <MemberDropdown
                      value={item.assignee}
                      onChange={(assigneeId) => handleAssignItem(item, assigneeId)}
                      projectId={projectId}
                      placeholder={t("common.assignee")}
                      buttonClassName="!p-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-custom-text-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add New Item */}
      {!disabled && issueId && (
        <div className="flex items-center gap-2 rounded-md border border-custom-border-200 bg-custom-background-90 p-2.5">
          <Plus className="h-5 w-5 text-custom-text-400" />
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItemName.trim() && !isCreating && issueId) {
                e.preventDefault();
                handleCreateItem();
              }
            }}
            placeholder="Add checklist item..."
            className="flex-1 border-none bg-transparent focus:ring-0"
            disabled={isCreating || !issueId}
            maxLength={500}
          />
          <Button
            variant="neutral-primary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreateItem();
            }}
            disabled={!newItemName.trim() || isCreating || !issueId}
            type="button"
          >
            {isCreating ? <Loader className="h-4 w-4" /> : t("common.add")}
          </Button>
        </div>
      )}
    </div>
  );
});

