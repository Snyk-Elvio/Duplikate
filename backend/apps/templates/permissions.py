from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Template


class TemplatePermission(BasePermission):
    """
    Read/write rules per visibility level:
    - global:   any authenticated user can read; is_staff only can write
    - shared:   creator + explicitly granted users can read; creator only can write
    - personal: creator only can read/write
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if request.method in SAFE_METHODS:
            if obj.visibility == Template.GLOBAL:
                return True
            if obj.visibility == Template.PERSONAL:
                return obj.created_by_id == user.pk
            # shared
            if obj.created_by_id == user.pk:
                return True
            return obj.visibility_shares.filter(shared_with=user).exists()
        else:
            if obj.visibility == Template.GLOBAL:
                return user.is_staff
            return obj.created_by_id == user.pk


# Keep the old name as an alias so existing imports don't break until cleaned up.
IsManagerOrReadOnly = TemplatePermission
