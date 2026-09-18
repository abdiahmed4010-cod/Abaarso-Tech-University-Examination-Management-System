from rest_framework import serializers

from .models import (
    AcademicYear,
    Faculty,
    Department,
    Semester,
    Course,
)


# =========================================================
# ACADEMIC YEAR SERIALIZER
# =========================================================

class AcademicYearSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = AcademicYear

        fields = [
            "id",
            "name",
            "start_date",
            "end_date",
            "is_current",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# FACULTY SERIALIZER
# =========================================================

class FacultySerializer(
    serializers.ModelSerializer
):
    department_count = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = Faculty

        fields = [
            "id",
            "faculty_id",
            "name",
            "code",
            "description",
            "is_active",
            "department_count",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "faculty_id",
            "department_count",
            "created_at",
            "updated_at",
        ]

    def get_department_count(
        self,
        obj,
    ):
        return obj.departments.count()


# =========================================================
# DEPARTMENT SERIALIZER
# =========================================================

class DepartmentSerializer(
    serializers.ModelSerializer
):
    faculty_name = serializers.CharField(
        source="faculty.name",
        read_only=True,
    )

    faculty_code = serializers.CharField(
        source="faculty.code",
        read_only=True,
    )

    class Meta:
        model = Department

        fields = [
            "id",
            "faculty",
            "faculty_name",
            "faculty_code",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "faculty_name",
            "faculty_code",
            "created_at",
            "updated_at",
        ]


# =========================================================
# SEMESTER SERIALIZER
# =========================================================

class SemesterSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Semester

        fields = [
            "id",
            "name",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# COURSE SERIALIZER
# =========================================================

class CourseSerializer(
    serializers.ModelSerializer
):
    faculty_name = serializers.CharField(
        source="faculty.name",
        read_only=True,
    )

    faculty_code = serializers.CharField(
        source="faculty.code",
        read_only=True,
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    department_code = serializers.CharField(
        source="department.code",
        read_only=True,
    )

    semester_name = serializers.CharField(
        source="semester.name",
        read_only=True,
    )

    class Meta:
        model = Course

        fields = [
            "id",
            "course_id",

            "faculty",
            "faculty_name",
            "faculty_code",

            "department",
            "department_name",
            "department_code",

            "semester",
            "semester_name",

            "name",
            "credit_hours",
            "is_active",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "course_id",

            "faculty_name",
            "faculty_code",

            "department_name",
            "department_code",

            "semester_name",

            "created_at",
            "updated_at",
        ]

    def validate(
        self,
        attrs,
    ):
        faculty = attrs.get(
            "faculty",
            getattr(
                self.instance,
                "faculty",
                None,
            ),
        )

        department = attrs.get(
            "department",
            getattr(
                self.instance,
                "department",
                None,
            ),
        )

        if (
            faculty is not None
            and department is not None
            and department.faculty_id
            != faculty.id
        ):
            raise serializers.ValidationError(
                {
                    "department": (
                        "The selected department "
                        "does not belong to the "
                        "selected faculty."
                    )
                }
            )

        return attrs