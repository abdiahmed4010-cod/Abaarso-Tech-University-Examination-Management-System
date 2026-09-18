from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    # Django Admin
    path(
        "admin/",
        admin.site.urls,
    ),

    # Academic Management
    path(
        "",
        include("apps.academics.urls"),
    ),

    # Student Management
    path(
        "",
        include("apps.students.urls"),
    ),
]