from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly


class InstituteBaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that enforces tenant-level data isolation.
    All institute-scoped ViewSets should inherit from this.

    Also logs create/update/delete to the Activity Log by default, keyed off
    the model name — a subclass that needs a richer message (or wants to
    skip logging on a high-frequency endpoint, e.g. bulk attendance marking
    which bypasses these hooks entirely by design) just overrides
    perform_create/update/destroy itself, which shadows this default.
    """
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        """Override in subclass to filter by institute."""
        raise NotImplementedError("Subclasses must implement get_queryset()")

    def _actor_name(self):
        user = self.request.user
        return user.get_full_name() or user.username

    def _log_activity(self, verb, model_name, label, text):
        from apps.core.models import log_activity
        log_activity(
            self.request.institute, self.request.user, f'{model_name}_{verb}',
            f'{self._actor_name()} {verb} {label} "{text}"',
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_activity('added', instance._meta.model_name, instance._meta.verbose_name, str(instance))

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_activity('updated', instance._meta.model_name, instance._meta.verbose_name, str(instance))

    def perform_destroy(self, instance):
        model_name, label, text = instance._meta.model_name, instance._meta.verbose_name, str(instance)
        instance.delete()
        self._log_activity('deleted', model_name, label, text)
