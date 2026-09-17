from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import (
    AcademicYear,
    Faculty,
    Department,
    Semester,
    Course,
)

from .serializers import (
    AcademicYearSerializer,
    FacultySerializer,
    DepartmentSerializer,
    SemesterSerializer,
    CourseSerializer,
)


@ensure_csrf_cookie
def academic_years_page(request):
    return render(
        request,
        "academic-management/academicyears.html",
    )


@ensure_csrf_cookie
def faculties_page(request):
    return render(
        request,
        "academic-management/faculties.html",
    )


@ensure_csrf_cookie
def departments_page(request):
    return render(
        request,
        "academic-management/departments.html",
    )


@ensure_csrf_cookie
def semesters_page(request):
    return render(
        request,
        "academic-management/semesters.html",
    )


@ensure_csrf_cookie
def courses_page(request):
    return render(
        request,
        "academic-management/courses.html",
    )


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [AllowAny]


class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer
    permission_classes = [AllowAny]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related(
        "faculty"
    ).all()

    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [AllowAny]


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related(
        "faculty",
        "department",
        "semester",
    ).all()

    serializer_class = CourseSerializer
    permission_classes = [AllowAny]