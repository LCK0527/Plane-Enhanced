import type { TUserLite } from "../users";

export type TChecklistItem = {
  id: string;
  issue_id: string;
  name: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_detail: TUserLite | null;
  assignee: string | null;
  assignee_detail: TUserLite | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
};

export type TChecklistProgress = {
  total: number;
  completed: number;
  percentage: number;
};

export type TChecklistResponse = {
  checklist_items: TChecklistItem[];
  progress: TChecklistProgress;
};

export type TChecklistItemCreate = {
  name: string;
  is_completed?: boolean;
  assignee_id?: string | null;
  sort_order?: number;
};

export type TChecklistItemUpdate = {
  name?: string;
  is_completed?: boolean;
  assignee_id?: string | null;
  sort_order?: number;
};

