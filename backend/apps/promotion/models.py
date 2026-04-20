from django.db import models
from apps.academics.models import Batch

class BatchPromotionMap(models.Model):
    source_batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='promotion_sources')
    target_batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='promotion_targets')
    academic_year = models.PositiveIntegerField()
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('source_batch', 'academic_year')
