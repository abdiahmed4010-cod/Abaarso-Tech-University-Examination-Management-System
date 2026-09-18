import re

from django.core.exceptions import ValidationError
from django.db import models, transaction

from apps.academics.models import (
    AcademicYear,
    Faculty,
    Department,
    Semester,
)


class Student(models.Model):

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        GRADUATED = "GRADUATED", "Graduated"

    student_id = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
    )

    first_name = models.CharField(
        max_length=100,
    )

    middle_name = models.CharField(
        max_length=100,
        blank=True,
    )

    last_name = models.CharField(
        max_length=100,
    )

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    address = models.CharField(
        max_length=255,
        blank=True,
    )

    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.PROTECT,
        related_name="students",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="students",
    )

    semester = models.ForeignKey(
        Semester,
        on_delete=models.PROTECT,
        related_name="students",
    )

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.PROTECT,
        related_name="students",
    )

    program = models.CharField(
        max_length=150,
    )

    admission_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "student_id",
        ]

    def clean(self):
        """
        Make sure the selected department
        belongs to the selected faculty.
        """

        if (
            self.faculty_id
            and self.department_id
        ):
            if (
                self.department.faculty_id
                != self.faculty_id
            ):
                raise ValidationError(
                    {
                        "department": (
                            "The selected department "
                            "does not belong to the "
                            "selected faculty."
                        )
                    }
                )

    def generate_department_prefix(self):
        """
        Generate the Student ID prefix
        from the Department name.

        Examples:

        Software Engineering
        -> SE

        Computer Science
        -> CS

        Information Technology
        -> IT

        Business Administration
        -> BA

        Law
        -> L
        """

        if not self.department_id:
            raise ValidationError(
                {
                    "department": (
                        "Department is required "
                        "to generate Student ID."
                    )
                }
            )

        department_name = (
            self.department.name or ""
        ).strip()

        if not department_name:
            raise ValidationError(
                {
                    "department": (
                        "Department name is required "
                        "to generate Student ID."
                    )
                }
            )

        words = re.findall(
            r"[A-Za-z0-9]+",
            department_name,
        )

        if not words:
            raise ValidationError(
                {
                    "department": (
                        "Could not generate a Student ID "
                        "prefix from the department name."
                    )
                }
            )

        prefix = "".join(
            word[0].upper()
            for word in words
        )

        return prefix[:10]

    def get_current_academic_year(self):
        """
        Return the Academic Year marked
        as current.
        """

        current_year = (
            AcademicYear.objects
            .filter(is_current=True)
            .order_by("-id")
            .first()
        )

        if not current_year:
            raise ValidationError(
                {
                    "academic_year": (
                        "No current Academic Year "
                        "has been configured."
                    )
                }
            )

        return current_year

    def get_student_year(self):
        """
        Get the year part from the current
        Academic Year.

        Example:

        2026/2027 -> 2026
        2027/2028 -> 2027
        """

        current_year = (
            self.get_current_academic_year()
        )

        year_match = re.search(
            r"\b(20\d{2})\b",
            current_year.name,
        )

        if not year_match:
            raise ValidationError(
                {
                    "academic_year": (
                        "The current Academic Year "
                        "must contain a valid year, "
                        "for example 2027/2028."
                    )
                }
            )

        return year_match.group(1)

    def generate_student_id(self):
        """
        Generate the next Student ID.

        Format:

        PREFIX-YEAR-SEQUENCE

        Examples:

        SE-2026-0001
        SE-2026-0002
        SE-2026-0003

        IT-2026-0001
        CS-2026-0001
        """

        prefix = (
            self.generate_department_prefix()
        )

        year = self.get_student_year()

        id_prefix = f"{prefix}-{year}-"

        existing_ids = (
            Student.objects
            .filter(
                student_id__startswith=id_prefix
            )
            .exclude(pk=self.pk)
            .values_list(
                "student_id",
                flat=True,
            )
        )

        highest_number = 0

        pattern = re.compile(
            rf"^{re.escape(id_prefix)}(\d+)$",
            re.IGNORECASE,
        )

        for existing_id in existing_ids:

            if not existing_id:
                continue

            match = pattern.match(
                existing_id
            )

            if not match:
                continue

            number = int(
                match.group(1)
            )

            if number > highest_number:
                highest_number = number

        next_number = (
            highest_number + 1
        )

        return (
            f"{id_prefix}"
            f"{next_number:04d}"
        )

    def save(self, *args, **kwargs):
        """
        Save Student.

        Important behavior:

        1. If student_id already exists,
           keep it unchanged.

        2. If student_id is empty,
           generate it automatically.

        This allows uploaded students
        to keep the ID they already have.
        """

        self.full_clean()

        if self.student_id:
            super().save(
                *args,
                **kwargs,
            )
            return

        with transaction.atomic():

            generated_id = (
                self.generate_student_id()
            )

            self.student_id = generated_id

            try:
                super().save(
                    *args,
                    **kwargs,
                )

            except Exception:
                self.student_id = ""

                raise

    @property
    def full_name(self):

        parts = [
            self.first_name,
            self.middle_name,
            self.last_name,
        ]

        return " ".join(
            part.strip()
            for part in parts
            if part and part.strip()
        )

    def __str__(self):
        return (
            f"{self.student_id} - "
            f"{self.full_name}"
        )