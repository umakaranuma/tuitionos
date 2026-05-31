from django.db import models
from apps.academics.models import Batch
from apps.institutes.models import Institute

class BatchPromotionMap(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='batch_promotion_maps', null=True)
    batch_code = models.CharField(max_length=100)
    academic_year = models.PositiveIntegerField()
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='mapped_promotions', null=True, blank=True)
    is_passout = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'batch_promotion_maps'
        unique_together = ('institute', 'batch_code', 'academic_year')
