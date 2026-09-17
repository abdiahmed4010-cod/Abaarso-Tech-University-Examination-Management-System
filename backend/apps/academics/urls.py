from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicYearViewSet,
    FacultyViewSet,
    DepartmentViewSet,
    SemesterViewSet,
    CourseViewSet,
    academic_years_page,
    faculties_page,
    departments_page,
    semesters_page,
    courses_page,
)


router = DefaultRouter()


router.register(
    r"academic-years",
    AcademicYearViewSet,
    basename="academic-year",
)

router.register(
    r"faculties",
    FacultyViewSet,
    basename="faculty",
)

router.register(
    r"departments",
    DepartmentViewSet,
    basename="department",
)

router.register(
    r"semesters",
    SemesterViewSet,
    basename="semester",
)

router.register(
    r"courses",
    CourseViewSet,
    basename="course",
)


urlpatterns = [

    path(
        "academic-management/academic-years/",
        academic_years_page,
        name="academic-years-page",
    ),

    path(
        "academic-management/faculties/",
        faculties_page,
        name="faculties-page",
    ),

    path(
        "academic-management/departments/",
        departments_page,
        name="departments-page",
    ),

    path(
        "academic-management/semesters/",
        semesters_page,
        name="semesters-page",
    ),

    path(
        "academic-management/courses/",
        courses_page,
        name="courses-page",
    ),

    path(
        "api/",
        include(router.urls),
    ),
]