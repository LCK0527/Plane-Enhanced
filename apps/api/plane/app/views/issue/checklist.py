# Python imports
import json
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from .. import BaseAPIView
from plane.app.serializers.checklist import (
    ChecklistItemSerializer,
    ChecklistItemCreateSerializer,
    ChecklistItemUpdateSerializer,
)
from plane.app.permissions import ProjectEntityPermission
from plane.db.models import ChecklistItem, Issue
from plane.bgtasks.issue_activities_task import issue_activity
from plane.utils.host import base_host


class ChecklistEndpoint(BaseAPIView):
    permission_classes = [ProjectEntityPermission]

    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to add debug logging"""
        import logging
        logger = logging.getLogger("plane.api.request")
        logger.info(f"DEBUG: ChecklistEndpoint.dispatch called - method={request.method}, path={request.path}")
        return super().dispatch(request, *args, **kwargs)

    def get(self, request, slug, project_id, **kwargs):
        """Get all checklist items for an issue"""
        # Support both issue_id and work_item_id (work_item_id is used in work-items URL path)
        issue_id = kwargs.get('issue_id') or kwargs.get('work_item_id')
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use Issue.objects (not issue_objects) to allow all issues
            issue = Issue.objects.get(id=issue_id, project_id=project_id, workspace__slug=slug)
        except Issue.DoesNotExist:
            return Response({"error": "Issue not found"}, status=status.HTTP_404_NOT_FOUND)

        checklist_items = ChecklistItem.objects.filter(
            issue=issue, deleted_at__isnull=True
        ).select_related("assignee", "completed_by").order_by("sort_order", "created_at")

        serializer = ChecklistItemSerializer(checklist_items, many=True)

        # Calculate progress
        total_items = checklist_items.count()
        completed_items = checklist_items.filter(is_completed=True).count()
        progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0

        return Response(
            {
                "checklist_items": serializer.data,
                "progress": {
                    "total": total_items,
                    "completed": completed_items,
                    "percentage": round(progress_percentage, 2),
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, slug, project_id, **kwargs):
        """Create a new checklist item"""
        import logging
        from django.shortcuts import get_object_or_404
        
        logger = logging.getLogger("plane.api.request")
        
        # Support both issue_id and work_item_id (work_item_id is used in work-items URL path)
        issue_id = kwargs.get('issue_id') or kwargs.get('work_item_id')
        
        logger.info(f"DEBUG: Checklist POST reached view for issue={issue_id}, slug={slug}, project_id={project_id}, kwargs={kwargs}")
        logger.info(
            "POST checklist: workspace=%s project=%s issue=%s user=%s",
            slug, project_id, issue_id, request.user.id
        )
        
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use get_object_or_404 to get issue with proper error handling
        issue_qs = Issue.objects.filter(
            id=issue_id,
            project_id=project_id,
            workspace__slug=slug
        )
        logger.info("Issue queryset SQL: %s", str(issue_qs.query))
        
        issue = get_object_or_404(issue_qs, id=issue_id)

        serializer = ChecklistItemCreateSerializer(
            data=request.data, context={"request": request, "issue": issue}
        )
        
        serializer.is_valid(raise_exception=True)
        checklist_item = serializer.save(created_by=request.user, updated_by=request.user)

        # Track activity
        issue_activity.delay(
            type="issue.activity.updated",
            requested_data=json.dumps({"checklist_item": {"name": checklist_item.name, "action": "created"}}),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=json.dumps({"checklist_item_id": str(checklist_item.id)}),
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )

        response_serializer = ChecklistItemSerializer(checklist_item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ChecklistItemEndpoint(BaseAPIView):
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id, checklist_item_id, **kwargs):
        """Get a specific checklist item"""
        # Support both issue_id and work_item_id (work_item_id is used in work-items URL path)
        issue_id = kwargs.get('issue_id') or kwargs.get('work_item_id')
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            checklist_item = ChecklistItem.objects.get(
                id=checklist_item_id,
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__workspace__slug=slug,
                deleted_at__isnull=True,
            )
        except ChecklistItem.DoesNotExist:
            return Response({"error": "Checklist item not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChecklistItemSerializer(checklist_item)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, project_id, checklist_item_id, **kwargs):
        """Update a checklist item"""
        # Support both issue_id and work_item_id (work_item_id is used in work-items URL path)
        issue_id = kwargs.get('issue_id') or kwargs.get('work_item_id')
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            checklist_item = ChecklistItem.objects.get(
                id=checklist_item_id,
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__workspace__slug=slug,
                deleted_at__isnull=True,
            )
        except ChecklistItem.DoesNotExist:
            return Response({"error": "Checklist item not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChecklistItemUpdateSerializer(
            checklist_item, data=request.data, partial=True, context={"request": request}
        )

        if serializer.is_valid():
            old_is_completed = checklist_item.is_completed
            updated_item = serializer.save(updated_by=request.user)

            # Track activity
            activity_data = {
                "checklist_item": {
                    "id": str(checklist_item.id),
                    "name": checklist_item.name,
                    "action": "updated",
                }
            }

            # If completion status changed, track it
            if old_is_completed != updated_item.is_completed:
                activity_data["checklist_item"]["completed"] = updated_item.is_completed

            issue_activity.delay(
                type="issue.activity.updated",
                requested_data=json.dumps(activity_data),
                actor_id=str(request.user.id),
                issue_id=str(issue_id),
                project_id=str(project_id),
                current_instance=json.dumps({"checklist_item_id": str(checklist_item.id)}),
                epoch=int(timezone.now().timestamp()),
                notification=updated_item.is_completed and not old_is_completed,  # Notify only when completed
                origin=base_host(request=request, is_app=True),
            )

            response_serializer = ChecklistItemSerializer(updated_item)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, project_id, checklist_item_id, **kwargs):
        """Delete a checklist item"""
        # Support both issue_id and work_item_id (work_item_id is used in work-items URL path)
        issue_id = kwargs.get('issue_id') or kwargs.get('work_item_id')
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            checklist_item = ChecklistItem.objects.get(
                id=checklist_item_id,
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__workspace__slug=slug,
                deleted_at__isnull=True,
            )
        except ChecklistItem.DoesNotExist:
            return Response({"error": "Checklist item not found"}, status=status.HTTP_404_NOT_FOUND)

        # Track activity
        issue_activity.delay(
            type="issue.activity.updated",
            requested_data=json.dumps(
                {"checklist_item": {"id": str(checklist_item.id), "name": checklist_item.name, "action": "deleted"}}
            ),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=json.dumps({"checklist_item_id": str(checklist_item.id)}),
            epoch=int(timezone.now().timestamp()),
            notification=False,
            origin=base_host(request=request, is_app=True),
        )

        checklist_item.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

