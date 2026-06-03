from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsManagerOrReadOnly(BasePermission):
    """
    Read access for any authenticated user; write access for managers only.

    Engineers (is_manager=False) can list/retrieve templates but get 403 on
    create/update/delete.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_manager)
