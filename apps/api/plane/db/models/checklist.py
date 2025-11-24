# Python imports
from uuid import uuid4

# Django imports
from django.conf import settings
from django.db import models
from django.utils import timezone

# Module imports
from .project import ProjectBaseModel


class ChecklistItem(ProjectBaseModel):
    """
    Checklist item model for issues.
    Represents a single task within a checklist attached to an issue.
    """

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="checklist_items",
        verbose_name="Issue",
    )
    name = models.CharField(max_length=500, verbose_name="Checklist Item Name")
    is_completed = models.BooleanField(default=False, verbose_name="Is Completed")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Completed At")
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_checklist_items",
        verbose_name="Completed By",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_checklist_items",
        verbose_name="Assignee",
    )
    sort_order = models.FloatField(default=65535, verbose_name="Sort Order")

    class Meta:
        verbose_name = "Checklist Item"
        verbose_name_plural = "Checklist Items"
        db_table = "checklist_items"
        ordering = ("sort_order", "created_at")

    def __str__(self):
        return f"{self.issue.sequence_id} - {self.name}"

    def save(self, *args, **kwargs):
        # Set completed_at when item is marked as completed
        if self.is_completed and not self.completed_at:
            self.completed_at = timezone.now()
        # Clear completed_at when item is unmarked
        elif not self.is_completed and self.completed_at:
            self.completed_at = None
            self.completed_by = None

        super(ChecklistItem, self).save(*args, **kwargs)

