# Django imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from .user import UserLiteSerializer
from plane.db.models import ChecklistItem, Issue


class ChecklistItemSerializer(BaseSerializer):
    """Serializer for ChecklistItem model"""

    assignee_detail = UserLiteSerializer(source="assignee", read_only=True)
    completed_by_detail = UserLiteSerializer(source="completed_by", read_only=True)
    issue_id = serializers.UUIDField(source="issue.id", read_only=True)

    class Meta:
        model = ChecklistItem
        fields = [
            "id",
            "issue_id",
            "name",
            "is_completed",
            "completed_at",
            "completed_by",
            "completed_by_detail",
            "assignee",
            "assignee_detail",
            "sort_order",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "issue_id",
            "completed_at",
            "completed_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class ChecklistItemCreateSerializer(BaseSerializer):
    """Serializer for creating ChecklistItem"""

    assignee_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = ChecklistItem
        fields = [
            "id",
            "name",
            "is_completed",
            "assignee_id",
            "sort_order",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        # Issue should always come from context (passed from view)
        issue = self.context.get("issue")
        if not issue:
            raise serializers.ValidationError({"issue": "Issue is required in context"})

        validated_data["issue"] = issue
        # ProjectBaseModel requires project and workspace
        # Get them from the issue since Issue also inherits from ProjectBaseModel
        validated_data["project"] = issue.project
        validated_data["workspace"] = issue.workspace

        # Handle assignee if provided
        assignee_id = validated_data.pop("assignee_id", None)
        if assignee_id:
            from plane.db.models import User

            try:
                assignee = User.objects.get(id=assignee_id)
                validated_data["assignee"] = assignee
            except User.DoesNotExist:
                raise serializers.ValidationError({"assignee_id": "User not found"})
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError({"assignee_id": f"Invalid user ID format: {str(e)}"})

        return super().create(validated_data)


class ChecklistItemUpdateSerializer(BaseSerializer):
    """Serializer for updating ChecklistItem"""

    assignee_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = ChecklistItem
        fields = [
            "name",
            "is_completed",
            "assignee_id",
            "sort_order",
        ]

    def update(self, instance, validated_data):
        assignee_id = validated_data.pop("assignee_id", None)

        if assignee_id is not None:
            from plane.db.models import User

            if assignee_id:
                try:
                    assignee = User.objects.get(id=assignee_id)
                    validated_data["assignee"] = assignee
                except User.DoesNotExist:
                    raise serializers.ValidationError({"assignee_id": "User not found"})
            else:
                validated_data["assignee"] = None

        # Set completed_by when marking as completed
        if validated_data.get("is_completed") and not instance.is_completed:
            validated_data["completed_by"] = self.context["request"].user

        return super().update(instance, validated_data)

