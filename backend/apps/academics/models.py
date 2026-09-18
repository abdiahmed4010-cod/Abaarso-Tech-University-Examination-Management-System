from django.db import models
import re


# =========================================================
# ACADEMIC YEAR
# =========================================================

class AcademicYear(models.Model):
    name = models.CharField(
        max_length=20,
        unique=True,
    )

    start_date = models.DateField()

    end_date = models.DateField()

    is_current = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


# =========================================================
# FACULTY
# =========================================================

class Faculty(models.Model):
    faculty_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        null=True,
        blank=True,
    )

    name = models.CharField(
        max_length=150,
        unique=True,
    )

    code = models.CharField(
        max_length=20,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        if not self.faculty_id:
            super().save(
                *args,
                **kwargs,
            )

            self.faculty_id = (
                f"FAC-{self.id:03d}"
            )

            super().save(
                update_fields=[
                    "faculty_id",
                ]
            )

            return

        super().save(
            *args,
            **kwargs,
        )

    def __str__(self):
        return (
            f"{self.faculty_id} - "
            f"{self.name}"
        )


# =========================================================
# DEPARTMENT
# =========================================================

class Department(models.Model):
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.PROTECT,
        related_name="departments",
    )

    name = models.CharField(
        max_length=150,
    )

    code = models.CharField(
        max_length=20,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "faculty",
                    "name",
                ],
                name=(
                    "unique_department_name_per_faculty"
                ),
            ),
            models.UniqueConstraint(
                fields=[
                    "faculty",
                    "code",
                ],
                name=(
                    "unique_department_code_per_faculty"
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.code} - "
            f"{self.name}"
        )


# =========================================================
# SEMESTER
# =========================================================

class Semester(models.Model):
    name = models.CharField(
        max_length=50,
        unique=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# =========================================================
# COURSE
# =========================================================

class Course(models.Model):
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    semester = models.ForeignKey(
        Semester,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    course_id = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
        null=True,
        blank=True,
    )

    name = models.CharField(
        max_length=150,
    )

    credit_hours = models.PositiveSmallIntegerField()

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["course_id"]

    def generate_course_prefix(self):
        """
        Generate Course ID prefix from Course Name.

        Examples:

        Introduction to Programming
        -> ITP

        Database Management Systems
        -> DMS

        Web Development
        -> WD

        Software Engineering
        -> SE
        """

        name = (
            self.name or ""
        ).strip()

        if not name:
            return "CRS"

        words = re.findall(
            r"[A-Za-z0-9]+",
            name,
        )

        if not words:
            return "CRS"

        prefix = "".join(
            word[0].upper()
            for word in words
        )

        prefix = prefix[:10]

        return prefix or "CRS"

    def generate_course_id(self):
        """
        Generate a unique Course ID.

        Examples:

        ITP-001
        ITP-002
        ITP-003

        DMS-001
        DMS-002

        WD-001
        WD-002
        """

        prefix = (
            self.generate_course_prefix()
        )

        pattern = (
            rf"^{re.escape(prefix)}-(\d+)$"
        )

        existing_ids = (
            Course.objects
            .filter(
                course_id__startswith=(
                    f"{prefix}-"
                )
            )
            .exclude(
                pk=self.pk
            )
            .values_list(
                "course_id",
                flat=True,
            )
        )

        highest_number = 0

        for existing_id in existing_ids:
            if not existing_id:
                continue

            match = re.match(
                pattern,
                existing_id.upper(),
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
            f"{prefix}-"
            f"{next_number:03d}"
        )

    def save(self, *args, **kwargs):
        """
        Course ID is generated automatically
        by the backend.

        The ID is based on the Course Name,
        not on the Semester.
        """

        if not self.course_id:
            self.course_id = (
                self.generate_course_id()
            )

        super().save(
            *args,
            **kwargs,
        )

    def __str__(self):
        return (
            f"{self.course_id} - "
            f"{self.name}"
        )