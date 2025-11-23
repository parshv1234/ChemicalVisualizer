from django.db import models
from django.contrib.auth.models import User

class EquipmentDataset(models.Model):
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Stats fields
    total_count = models.IntegerField(default=0)
    avg_flowrate = models.FloatField(default=0.0)
    avg_pressure = models.FloatField(default=0.0)
    avg_temperature = models.FloatField(default=0.0)
    type_distribution = models.JSONField(default=dict) 

    def __str__(self):
        return f"Dataset {self.id} - {self.uploaded_at}"