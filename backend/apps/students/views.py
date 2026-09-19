import logging
import re
from django.db import models

from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

from django_filters.rest_framework import (
    DjangoFilterBackend,
)

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from rest_framework import (
    filters,
    status,
    viewsets,
)

from rest_framework.decorators import (
    action,
)

from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)

from rest_framework.permissions import (
    AllowAny,
)

from rest_framework.response import Response

from .bulk_import import (
    import_validated_rows,
    validate_file_rows,
)

from .models import Student
from .serializers import StudentSerializer


logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def students_page(request):
    return render(
        request,
        "student-management/students.html",
    )


class StudentViewSet(viewsets.ModelViewSet):

    queryset = (
        Student.objects
        .select_related(
            "faculty",
            "department",
            "semester",
            "academic_year",
        )
        .all()
        .order_by("student_id")
    )

    serializer_class = StudentSerializer

    permission_classes = [
        AllowAny,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
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
    ]

    ordering_fields = [
        "student_id",
        "first_name",
        "last_name",
        "status",
        "created_at",
    ]

    ordering = [
        "student_id",
    ]

    # =========================================================
    # BULK STUDENT UPLOAD
    # =========================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-upload",
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
    )
    def bulk_upload(self, request):

        uploaded_file = request.FILES.get(
            "file"
        )

        if not uploaded_file:
            return Response(
                {
                    "detail": (
                        "Please select a student "
                        "file to upload."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 10 * 1024 * 1024

        if uploaded_file.size > max_size:
            return Response(
                {
                    "detail": (
                        "The uploaded file is "
                        "larger than 10 MB."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = (
            uploaded_file.name
            .rsplit(".", 1)[-1]
            .lower()
            if "." in uploaded_file.name
            else ""
        )

        allowed_extensions = {
            "csv",
            "xlsx",
            "xls",
        }

        if extension not in allowed_extensions:
            return Response(
                {
                    "detail": (
                        "Unsupported file type. "
                        "Please upload CSV, XLSX, "
                        "or XLS."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        confirm_value = str(
            request.data.get(
                "confirm",
                "false",
            )
        ).strip().lower()

        confirm = confirm_value in {
            "true",
            "1",
            "yes",
            "on",
        }

        try:
            preview = validate_file_rows(
                uploaded_file
            )

            if not confirm:
                return Response(
                    preview,
                    status=status.HTTP_200_OK,
                )

            if not preview.get("valid"):
                return Response(
                    preview,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = import_validated_rows(
                preview
            )

            return Response(
                result,
                status=status.HTTP_201_CREATED,
            )

        except ValueError as exc:
            logger.warning(
                "Student bulk upload validation "
                "error: %s",
                exc,
            )

            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception(
                "Unexpected student bulk "
                "upload error."
            )

            return Response(
                {
                    "detail": (
                        "Unable to process the "
                        "student file."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # =========================================================
    # EXPORT STUDENTS TO EXCEL
    # =========================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="export",
    )
    def export_students(self, request):
        """
        Export students as an Excel XLSX file.

        Supported query parameters:

        scope:
            all
            filtered

        department:
            Department primary key.

        semester:
            Semester primary key.

        academic_year:
            Academic Year primary key.

        status:
            ACTIVE
            INACTIVE
            GRADUATED

        gender:
            MALE
            FEMALE

        search:
            Student ID or student name.

        ordering:
            Optional ordering field.
        """

        try:
            scope = (
                str(
                    request.query_params.get(
                        "scope",
                        "all",
                    )
                )
                .strip()
                .lower()
            )

            queryset = self.get_queryset()

            if scope == "filtered":
                queryset = self.filter_queryset(
                    queryset
                )

            else:
                # -------------------------------------------------
                # Even when exporting "all", support explicit
                # filter parameters. This makes the endpoint
                # flexible for future export controls.
                # -------------------------------------------------

                department = (
                    request.query_params.get(
                        "department"
                    )
                )

                semester = (
                    request.query_params.get(
                        "semester"
                    )
                )

                academic_year = (
                    request.query_params.get(
                        "academic_year"
                    )
                )

                student_status = (
                    request.query_params.get(
                        "status"
                    )
                )

                gender = (
                    request.query_params.get(
                        "gender"
                    )
                )

                search = (
                    request.query_params.get(
                        "search"
                    )
                )

                if department:
                    queryset = queryset.filter(
                        department_id=department
                    )

                if semester:
                    queryset = queryset.filter(
                        semester_id=semester
                    )

                if academic_year:
                    queryset = queryset.filter(
                        academic_year_id=academic_year
                    )

                if student_status:
                    queryset = queryset.filter(
                        status=student_status
                    )

                if gender:
                    queryset = queryset.filter(
                        gender=gender
                    )

                if search:
                    search = search.strip()

                    queryset = queryset.filter(
                        models.Q(
                            student_id__icontains=search
                        )
                        | models.Q(
                            first_name__icontains=search
                        )
                        | models.Q(
                            middle_name__icontains=search
                        )
                        | models.Q(
                            last_name__icontains=search
                        )
                    )

            queryset = queryset.select_related(
                "faculty",
                "department",
                "semester",
                "academic_year",
            )

            students = list(
                queryset.order_by(
                    "student_id"
                )
            )

            workbook = Workbook()

            worksheet = workbook.active

            worksheet.title = (
                "Students"
            )

            headers = [
                "Student ID",
                "First Name",
                "Middle Name",
                "Last Name",
                "Full Name",
                "Gender",
                "Department",
                "Semester",
                "Academic Year",
                "Status",
            ]

            worksheet.append(headers)

            # -----------------------------------------------------
            # Header formatting
            # -----------------------------------------------------

            header_fill = PatternFill(
                fill_type="solid",
                fgColor="720E24",
            )

            header_font = Font(
                bold=True,
                color="FFFFFF",
            )

            header_alignment = Alignment(
                horizontal="center",
                vertical="center",
            )

            for cell in worksheet[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = (
                    header_alignment
                )

            # -----------------------------------------------------
            # Student rows
            # -----------------------------------------------------

            for student in students:

                worksheet.append(
                    [
                        student.student_id or "",
                        student.first_name or "",
                        student.middle_name or "",
                        student.last_name or "",
                        student.full_name or "",
                        (
                            student.get_gender_display()
                            if student.gender
                            else ""
                        ),
                        (
                            student.department.name
                            if student.department
                            else ""
                        ),
                        (
                            student.semester.name
                            if student.semester
                            else ""
                        ),
                        (
                            student.academic_year.name
                            if student.academic_year
                            else ""
                        ),
                        (
                            student.get_status_display()
                            if student.status
                            else ""
                        ),
                    ]
                )

            # -----------------------------------------------------
            # Formatting
            # -----------------------------------------------------

            worksheet.freeze_panes = "A2"

            worksheet.auto_filter.ref = (
                worksheet.dimensions
            )

            column_widths = [
                18,
                18,
                18,
                18,
                28,
                12,
                28,
                18,
                18,
                16,
            ]

            for index, width in enumerate(
                column_widths,
                start=1,
            ):
                worksheet.column_dimensions[
                    get_column_letter(index)
                ].width = width

            for row in worksheet.iter_rows():
                for cell in row:
                    cell.alignment = (
                        Alignment(
                            vertical="center"
                        )
                    )

            # -----------------------------------------------------
            # Filename
            # -----------------------------------------------------

            department_name = (
                request.query_params.get(
                    "department_name"
                )
                or ""
            ).strip()

            semester_name = (
                request.query_params.get(
                    "semester_name"
                )
                or ""
            ).strip()

            if (
                department_name
                and semester_name
            ):
                filename_base = (
                    "ATU_Students_"
                    f"{department_name}_"
                    f"{semester_name}"
                )

            elif department_name:
                filename_base = (
                    "ATU_Students_"
                    f"{department_name}"
                )

            elif semester_name:
                filename_base = (
                    "ATU_Students_"
                    f"{semester_name}"
                )

            elif scope == "filtered":
                filename_base = (
                    "ATU_Students_Filtered"
                )

            else:
                filename_base = (
                    "ATU_Students_All"
                )

            filename_base = re.sub(
                r"[^A-Za-z0-9_-]+",
                "_",
                filename_base,
            ).strip("_")

            if not filename_base:
                filename_base = (
                    "ATU_Students"
                )

            filename = (
                f"{filename_base}.xlsx"
            )

            # -----------------------------------------------------
            # HTTP response
            # -----------------------------------------------------

            response = HttpResponse(
                content_type=(
                    "application/vnd.openxmlformats-officedocument."
                    "spreadsheetml.sheet"
                )
            )

            response[
                "Content-Disposition"
            ] = (
                "attachment; "
                f'filename="{filename}"'
            )

            workbook.save(response)

            return response

        except Exception:
            logger.exception(
                "Unexpected student export error."
            )

            return Response(
                {
                    "detail": (
                        "Unable to export "
                        "students."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )