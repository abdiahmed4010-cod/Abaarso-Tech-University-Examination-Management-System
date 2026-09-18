from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from .models import Student
from .serializers import StudentSerializer


@ensure_csrf_cookie
def students_page(request):
    return render(
        request,
        "student-management/students.html",
    )


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related(
        "faculty",
        "department",
        "semester",
        "academic_year",
    ).all()

    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "faculty",
        "department",
        "semester",
        "academic_year",
        "status",
        "gender",
    ]

    search_fields = [
        "student_id",
        "first_name",
        "middle_name",
        "last_name",
        "phone",
        "program",
    ]

    ordering_fields = [
        "student_id",
        "first_name",
        "last_name",
        "created_at",
        "updated_at",
    ]

    ordering = ["student_id"]