from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, ScanViewSet, AIAdvisorView, stream_scan

# Setup the DRF Router
router = DefaultRouter()
router.register(r"devices", DeviceViewSet, basename="device")
router.register(r"scans", ScanViewSet, basename="scan")

urlpatterns = [
    # 1. AI Security Assessment Endpoint
    path("ai-assessment/", AIAdvisorView.as_view(), name="ai-assessment"),
    # 2. Streaming route for Nmap logs
    path("stream/", stream_scan, name="stream_scan"),
    # 3. Standard API routes (devices, scans)
    path("", include(router.urls)),
]
