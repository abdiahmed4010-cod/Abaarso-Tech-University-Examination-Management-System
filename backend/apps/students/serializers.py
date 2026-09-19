from rest_framework import serializers

from apps.academics.models import AcademicYear

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

            "faculty",
            "faculty_name",
            "faculty_code",

            "department_name",
            "department_code",

            "academic_year",
            "academic_year_name",

            "program",

            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "student_id": {
                "required": False,
                "allow_blank": True,
            },
            "middle_name": {
                "required": False,
                "allow_blank": True,
            },
        }

    def validate(self, attrs):
        department = attrs.get(
            "department",
            getattr(
                self.instance,
                "department",
                None,
            ),
        )

        faculty = attrs.get(
            "faculty",
            getattr(
                self.instance,
                "faculty",
                None,
            ),
        )

        if (
            faculty is not None
            and department is not None
            and department.faculty_id != faculty.id
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

        if department is None:
            raise serializers.ValidationError(
                {
                    "department": (
                        "Department is required."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        department = validated_data["department"]

        # Faculty is automatically taken from
        # the selected Department.
        validated_data["faculty"] = department.faculty

        # Academic Year is automatically taken
        # from the current Academic Year.
        current_academic_year = (
            AcademicYear.objects
            .filter(is_current=True)
            .order_by("-id")
            .first()
        )

        if current_academic_year is None:
            raise serializers.ValidationError(
                {
                    "academic_year": (
                        "No current Academic Year "
                        "has been configured."
                    )
                }
            )

        validated_data["academic_year"] = (
            current_academic_year
        )

        # Program is not entered from the Student UI.
        # Use the selected Department name.
        validated_data["program"] = (
            department.name
        )

        return Student.objects.create(
            **validated_data
        )

    def update(
        self,
        instance,
        validated_data,
    ):
        # Faculty must always follow Department.
        department = validated_data.get(
            "department",
            instance.department,
        )

        if department is not None:
            validated_data["faculty"] = (
                department.faculty
            )

        # Keep Academic Year controlled by the
        # backend instead of the Student UI.
        validated_data.pop(
            "academic_year",
            None,
        )

        # Program is also controlled by the
        # selected Department.
        validated_data["program"] = (
            department.name
        )

        return super().update(
            instance,
            validated_data,
        )