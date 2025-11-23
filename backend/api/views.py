import pandas as pd
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from .models import EquipmentDataset
from .serializers import EquipmentDatasetSerializer

class EquipmentDatasetViewSet(viewsets.ModelViewSet):
    queryset = EquipmentDataset.objects.all().order_by('-uploaded_at')
    serializer_class = EquipmentDatasetSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        file_obj = self.request.data.get('file')
        try:
            df = pd.read_csv(file_obj)
            
            # 1. Validate exact columns from your CSV
            required_cols = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']
            missing = [col for col in required_cols if col not in df.columns]
            if missing:
                raise serializers.ValidationError(f"Missing columns: {missing}")

            # 2. Calculate Stats based on your data ranges
            stats = {
                'total_count': len(df),
                'avg_flowrate': df['Flowrate'].mean(),
                'avg_pressure': df['Pressure'].mean(),
                'avg_temperature': df['Temperature'].mean(),
                'type_distribution': df['Type'].value_counts().to_dict(),
                'uploader': self.request.user if self.request.user.is_authenticated else None
            }
            serializer.save(**stats)
            
        except Exception as e:
            raise serializers.ValidationError(f"Error processing CSV: {str(e)}")

    @action(detail=True, methods=['get'])
    def raw_data(self, request, pk=None):
        dataset = self.get_object()
        try:
            df = pd.read_csv(dataset.file.path)
            # Return first 50 rows, handling NaNs
            data = df.head(50).where(pd.notnull(df), None).to_dict(orient='records') 
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        dataset = self.get_object()
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_{pk}.pdf"'

        p = canvas.Canvas(response, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, f"Chemical Equipment Report - ID {dataset.id}")
        
        p.setFont("Helvetica", 12)
        p.drawString(100, 730, f"Uploaded: {dataset.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        p.line(100, 720, 500, 720)
        
        p.drawString(100, 700, "Summary Statistics:")
        p.drawString(120, 680, f"Total Equipment Count: {dataset.total_count}")
        p.drawString(120, 665, f"Avg Flowrate: {dataset.avg_flowrate:.2f}")
        p.drawString(120, 650, f"Avg Pressure: {dataset.avg_pressure:.2f}")
        p.drawString(120, 635, f"Avg Temperature: {dataset.avg_temperature:.2f}")

        p.drawString(100, 600, "Equipment Type Distribution:")
        y = 580
        for eq_type, count in dataset.type_distribution.items():
            p.drawString(120, y, f"- {eq_type}: {count}")
            y -= 15

        p.showPage()
        p.save()
        return response