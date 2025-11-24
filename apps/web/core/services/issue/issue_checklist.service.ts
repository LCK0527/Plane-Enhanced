import { API_BASE_URL } from "@plane/constants";
import type { TChecklistItem, TChecklistResponse, TChecklistItemCreate, TChecklistItemUpdate } from "@plane/types";
import { APIService } from "@/services/api.service";

export class IssueChecklistService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getChecklist(workspaceSlug: string, projectId: string, issueId: string): Promise<TChecklistResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/checklist/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: TChecklistItemCreate
  ): Promise<TChecklistItem> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/checklist/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        console.error("Checklist API Error:", {
          error,
          response: error?.response,
          data: error?.response?.data,
          status: error?.response?.status,
            url: `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/checklist/`,
        });
        // Return the error data if available, otherwise return a formatted error object
        if (error?.response?.data) {
          throw error.response.data;
        }
        // Handle network errors or other non-HTTP errors
        throw {
          error: error?.message || "Network error",
          message: error?.message || "Failed to create checklist item",
        };
      });
  }

  async updateChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string,
    data: TChecklistItemUpdate
  ): Promise<TChecklistItem> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/checklist/${checklistItemId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/checklist/${checklistItemId}/`
    )
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

