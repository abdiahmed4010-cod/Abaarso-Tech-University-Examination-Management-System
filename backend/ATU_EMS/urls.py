from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    # Academic Management
    path("", include("apps.academics.urls")),
]