from rest_framework import serializers

from .models import Student


class StudentSerializer(
    serializers.ModelSerializer
):
    full_name = serializers.ReadOnlyField()

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

    academic_year_name = serializers.CharField(
        source="academic_year.name",
        read_only=True,
    )

    class Meta:
        model = Student

        fields = [
            "id",

            "student_id",

            "first_name",
            "middle_name",
            "last_name",
            "full_name",

            "gender",
            "date_of_birth",

            "phone",
            "address",

            "faculty",
            "faculty_name",
            "faculty_code",

            "department",
            "department_name",
            "department_code",

            "semester",
            "semester_name",

            "academic_year",
            "academic_year_name",

            "program",

            "admission_date",

            "status",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",

            "full_name",

            "faculty_name",
            "faculty_code",

            "department_name",
            "department_code",

            "semester_name",
            "academic_year_name",

            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "student_id": {
                "required": False,
                "allow_blank": True,
            },
        }

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