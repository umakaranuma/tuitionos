from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly


class InstituteBaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that enforces tenant-level data isolation.
    All institute-scoped ViewSets should inherit from this.
    """
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        """Override in subclass to filter by institute."""
        raise NotImplementedError("Subclasses must implement get_queryset()")
