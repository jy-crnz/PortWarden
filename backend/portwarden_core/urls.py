from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # Hand off all versioned API requests to the scanner app
    path("api/v1/", include("scanner.urls")),
]
