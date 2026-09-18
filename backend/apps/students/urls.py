from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StudentViewSet, students_page


router = DefaultRouter()

router.register(
    r"students",
    StudentViewSet,
    basename="student",
)


urlpatterns = [
    path(
        "student-management/students/",
        students_page,
        name="students-page",
    ),

    path(
        "api/",
        include(router.urls),
    ),
]