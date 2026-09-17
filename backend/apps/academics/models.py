from django.db import models


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
            super().save(*args, **kwargs)

            self.faculty_id = f"FAC-{self.id:03d}"

            super().save(
                update_fields=["faculty_id"]
            )

            return

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.faculty_id} - {self.name}"


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
                fields=["faculty", "name"],
                name="unique_department_name_per_faculty",
            ),
            models.UniqueConstraint(
                fields=["faculty", "code"],
                name="unique_department_code_per_faculty",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Semester(models.Model):
    name = models.CharField(
        max_length=50,
        unique=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


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

    course_code = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
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
        ordering = ["course_code"]

    def generate_course_code(self):
        semester_name = self.semester.name.strip()

        # Extract digits from semester name.
        # Example:
        # "Semester 1" -> "1"
        # "Semester 2" -> "2"
        digits = "".join(
            character
            for character in semester_name
            if character.isdigit()
        )

        if digits:
            semester_code = f"SEM{digits}"
        else:
            # Fallback if the semester has no number.
            semester_code = (
                semester_name
                .upper()
                .replace(" ", "")[:10]
            )

        existing_count = (
            Course.objects
            .filter(
                semester=self.semester
            )
            .exclude(
                pk=self.pk
            )
            .count()
        )

        next_number = existing_count + 1

        return (
            f"{semester_code}-"
            f"{next_number:03d}"
        )

    def save(self, *args, **kwargs):

        if self.semester_id:
            self.course_code = (
                self.generate_course_code()
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.course_code} - "
            f"{self.name}"
        )