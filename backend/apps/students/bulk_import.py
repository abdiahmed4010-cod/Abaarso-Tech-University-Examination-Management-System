import csv
import io
import re

from django.db import transaction

from apps.academics.models import AcademicYear, Department, Semester

from .models import Student


REQUIRED_COLUMNS = [
    "Student ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Gender",
    "Department",
    "Semester",
    "Academic Year",
    "Status",
]

ALLOWED_GENDERS = {
    "male": Student.Gender.MALE,
    "female": Student.Gender.FEMALE,
}

ALLOWED_STATUSES = {
    "active": Student.Status.ACTIVE,
    "inactive": Student.Status.INACTIVE,
    "graduated": Student.Status.GRADUATED,
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def normalize_header(value):
    """
    Normalize Excel/CSV column headers so small differences
    in spaces/capitalization do not cause unnecessary failures.
    """
    if value is None:
        return ""

    value = str(value).replace("\ufeff", "")
    value = value.strip()
    value = re.sub(r"\s+", " ", value)

    return value.lower()


def normalize_text(value):
    """
    Normalize ordinary cell values.
    """
    if value is None:
        return ""

    return str(value).strip()


def normalize_lookup(value):
    """
    Normalize values used for database lookups.
    """
    return normalize_text(value).casefold()


def normalize_student_id(value):
    """
    Student IDs are preserved exactly as entered after trimming
    surrounding whitespace.
    """
    return normalize_text(value)


def read_csv_file(uploaded_file):
    """
    Read CSV file and return:
        headers, rows
    """
    try:
        raw = uploaded_file.read()
    except Exception as exc:
        raise ValueError(
            "Unable to read the uploaded CSV file."
        ) from exc

    if not raw:
        raise ValueError("The uploaded file is empty.")

    decoded = None

    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            decoded = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if decoded is None:
        raise ValueError(
            "The CSV file encoding could not be read. "
            "Please save the file as UTF-8 CSV."
        )

    reader = csv.reader(io.StringIO(decoded))

    rows = list(reader)

    if not rows:
        raise ValueError("The uploaded CSV file is empty.")

    headers = rows[0]

    data_rows = []

    for row_number, row in enumerate(rows[1:], start=2):
        if not any(normalize_text(cell) for cell in row):
            continue

        data_rows.append(
            {
                "row_number": row_number,
                "values": row,
            }
        )

    return headers, data_rows


def read_xlsx_file(uploaded_file):
    """
    Read modern Excel .xlsx files.
    """
    try:
        import openpyxl
    except ImportError as exc:
        raise ValueError(
            "openpyxl is not installed. "
            "Run: python -m pip install openpyxl"
        ) from exc

    try:
        workbook = openpyxl.load_workbook(
            uploaded_file,
            read_only=True,
            data_only=True,
        )
    except Exception as exc:
        raise ValueError(
            "Unable to read the XLSX file. "
            "Please make sure the file is a valid Excel workbook."
        ) from exc

    try:
        worksheet = workbook.active

        all_rows = list(
            worksheet.iter_rows(values_only=True)
        )

        if not all_rows:
            raise ValueError(
                "The uploaded Excel file is empty."
            )

        headers = list(all_rows[0])

        data_rows = []

        for row_number, row in enumerate(
            all_rows[1:],
            start=2,
        ):
            values = list(row)

            if not any(
                normalize_text(cell)
                for cell in values
            ):
                continue

            data_rows.append(
                {
                    "row_number": row_number,
                    "values": values,
                }
            )

        return headers, data_rows

    finally:
        workbook.close()


def read_xls_file(uploaded_file):
    """
    Read legacy Excel .xls files.
    """
    try:
        import xlrd
    except ImportError as exc:
        raise ValueError(
            "xlrd is not installed. "
            "Run: python -m pip install xlrd"
        ) from exc

    try:
        workbook = xlrd.open_workbook(
            file_contents=uploaded_file.read()
        )
    except Exception as exc:
        raise ValueError(
            "Unable to read the XLS file. "
            "Please make sure the file is a valid Excel workbook."
        ) from exc

    if workbook.nsheets == 0:
        raise ValueError(
            "The uploaded XLS file contains no worksheets."
        )

    worksheet = workbook.sheet_by_index(0)

    if worksheet.nrows == 0:
        raise ValueError(
            "The uploaded XLS file is empty."
        )

    headers = worksheet.row_values(0)

    data_rows = []

    for row_index in range(1, worksheet.nrows):
        values = worksheet.row_values(row_index)

        if not any(
            normalize_text(cell)
            for cell in values
        ):
            continue

        data_rows.append(
            {
                "row_number": row_index + 1,
                "values": values,
            }
        )

    return headers, data_rows


def read_uploaded_file(uploaded_file):
    """
    Detect and read CSV, XLSX, or XLS.
    """
    if uploaded_file is None:
        raise ValueError(
            "No file was uploaded."
        )

    if uploaded_file.size > MAX_FILE_SIZE:
        raise ValueError(
            "The uploaded file is too large. "
            "Maximum allowed size is 10 MB."
        )

    filename = (
        getattr(uploaded_file, "name", "") or ""
    )

    extension = (
        filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    if extension == "csv":
        return read_csv_file(uploaded_file)

    if extension == "xlsx":
        return read_xlsx_file(uploaded_file)

    if extension == "xls":
        return read_xls_file(uploaded_file)

    raise ValueError(
        "Unsupported file type. "
        "Please upload CSV, XLSX, or XLS."
    )


def build_column_map(headers):
    """
    Validate the header row.

    The import requires exactly these 9 columns.
    Extra columns are rejected intentionally.
    """
    normalized_headers = []

    for header in headers:
        normalized_headers.append(
            normalize_header(header)
        )

    expected_map = {
        normalize_header(column): column
        for column in REQUIRED_COLUMNS
    }

    duplicate_headers = []

    seen = set()

    for header in normalized_headers:
        if not header:
            continue

        if header in seen:
            duplicate_headers.append(header)

        seen.add(header)

    if duplicate_headers:
        duplicate_display = ", ".join(
            sorted(set(duplicate_headers))
        )

        raise ValueError(
            "Duplicate column headers found: "
            f"{duplicate_display}"
        )

    missing = []

    for required_column in REQUIRED_COLUMNS:
        if (
            normalize_header(required_column)
            not in normalized_headers
        ):
            missing.append(required_column)

    unexpected = []

    for header in normalized_headers:
        if not header:
            continue

        if header not in expected_map:
            unexpected.append(header)

    errors = []

    if missing:
        errors.append(
            "Missing required columns: "
            + ", ".join(missing)
        )

    if unexpected:
        errors.append(
            "Unexpected columns: "
            + ", ".join(unexpected)
            + ". Only the 9 required columns are allowed."
        )

    if errors:
        raise ValueError(" ".join(errors))

    column_indexes = {}

    for index, normalized in enumerate(
        normalized_headers
    ):
        if normalized in expected_map:
            column_indexes[
                expected_map[normalized]
            ] = index

    return column_indexes


def row_to_dict(values, column_map):
    """
    Convert a raw Excel/CSV row into a named dictionary.
    """
    result = {}

    for column in REQUIRED_COLUMNS:
        index = column_map[column]

        value = (
            values[index]
            if index < len(values)
            else ""
        )

        result[column] = normalize_text(value)

    return result


def validate_file_rows(uploaded_file):
    """
    Validate the uploaded file and return a preview.

    This function does NOT insert anything into the database.
    """
    headers, raw_rows = read_uploaded_file(
        uploaded_file
    )

    column_map = build_column_map(headers)

    if not raw_rows:
        raise ValueError(
            "The uploaded file contains no student records."
        )

    departments = list(
        Department.objects.select_related("faculty")
        .all()
    )

    semesters = list(
        Semester.objects.all()
    )

    academic_years = list(
        AcademicYear.objects.all()
    )

    department_map = {}

    for department in departments:
        key = normalize_lookup(
            department.name
        )

        department_map.setdefault(
            key,
            [],
        ).append(department)

    semester_map = {}

    for semester in semesters:
        key = normalize_lookup(
            semester.name
        )

        semester_map.setdefault(
            key,
            [],
        ).append(semester)

    academic_year_map = {}

    for academic_year in academic_years:
        key = normalize_lookup(
            academic_year.name
        )

        academic_year_map.setdefault(
            key,
            [],
        ).append(academic_year)

    existing_ids = {
        normalize_student_id(student_id).casefold()
        for student_id in (
            Student.objects
            .values_list(
                "student_id",
                flat=True,
            )
        )
        if normalize_student_id(student_id)
    }

    seen_ids = set()

    preview_rows = []

    total_rows = 0
    valid_rows = 0
    invalid_rows = 0
    warning_count = 0

    for raw_row in raw_rows:
        total_rows += 1

        row_number = raw_row["row_number"]

        data = row_to_dict(
            raw_row["values"],
            column_map,
        )

        row_errors = []
        row_warnings = []

        student_id = normalize_student_id(
            data["Student ID"]
        )

        first_name = normalize_text(
            data["First Name"]
        )

        middle_name = normalize_text(
            data["Middle Name"]
        )

        last_name = normalize_text(
            data["Last Name"]
        )

        gender_input = normalize_text(
            data["Gender"]
        )

        department_input = normalize_text(
            data["Department"]
        )

        semester_input = normalize_text(
            data["Semester"]
        )

        academic_year_input = normalize_text(
            data["Academic Year"]
        )

        status_input = normalize_text(
            data["Status"]
        )

        department = None
        semester = None
        academic_year = None

        # --------------------------------------------------
        # Student ID
        # --------------------------------------------------

        if not student_id:
            row_errors.append(
                "Student ID is required."
            )
        else:
            normalized_id = student_id.casefold()

            if normalized_id in seen_ids:
                row_errors.append(
                    "Duplicate Student ID in this file."
                )
            else:
                seen_ids.add(normalized_id)

            if normalized_id in existing_ids:
                row_errors.append(
                    "Student ID already exists in the database."
                )

        # --------------------------------------------------
        # Names
        # --------------------------------------------------

        if not first_name:
            row_errors.append(
                "First Name is required."
            )

        if not last_name:
            row_errors.append(
                "Last Name is required."
            )

        # --------------------------------------------------
        # Gender
        # --------------------------------------------------

        gender = ALLOWED_GENDERS.get(
            gender_input.casefold()
        )

        if not gender:
            row_errors.append(
                "Gender must be Male or Female."
            )

        # --------------------------------------------------
        # Department
        # --------------------------------------------------

        if not department_input:
            row_errors.append(
                "Department is required."
            )
        else:
            matches = department_map.get(
                normalize_lookup(
                    department_input
                ),
                [],
            )

            if not matches:
                row_errors.append(
                    f"Department '{department_input}' "
                    "was not found."
                )

            elif len(matches) > 1:
                row_errors.append(
                    f"Department '{department_input}' "
                    "is ambiguous because multiple departments "
                    "have the same name."
                )

            else:
                department = matches[0]

        # --------------------------------------------------
        # Semester
        # --------------------------------------------------

        if not semester_input:
            row_errors.append(
                "Semester is required."
            )
        else:
            matches = semester_map.get(
                normalize_lookup(
                    semester_input
                ),
                [],
            )

            if not matches:
                row_errors.append(
                    f"Semester '{semester_input}' "
                    "was not found."
                )

            elif len(matches) > 1:
                row_errors.append(
                    f"Semester '{semester_input}' "
                    "is ambiguous."
                )

            else:
                semester = matches[0]

        # --------------------------------------------------
        # Academic Year
        # --------------------------------------------------

        if not academic_year_input:
            row_errors.append(
                "Academic Year is required."
            )
        else:
            matches = academic_year_map.get(
                normalize_lookup(
                    academic_year_input
                ),
                [],
            )

            if not matches:
                row_errors.append(
                    f"Academic Year '{academic_year_input}' "
                    "was not found."
                )

            elif len(matches) > 1:
                row_errors.append(
                    f"Academic Year '{academic_year_input}' "
                    "is ambiguous."
                )

            else:
                academic_year = matches[0]

        # --------------------------------------------------
        # Status
        # --------------------------------------------------

        status = ALLOWED_STATUSES.get(
            status_input.casefold()
        )

        if not status:
            row_errors.append(
                "Status must be Active, Inactive, "
                "or Graduated."
            )

        # --------------------------------------------------
        # Graduated warning
        # --------------------------------------------------

        if (
            status == Student.Status.GRADUATED
            and academic_year is not None
        ):
            if "2026/2027" not in (
                academic_year.name or ""
            ):
                row_warnings.append(
                    "Graduated student is linked to "
                    f"Academic Year '{academic_year.name}'. "
                    "Please verify this year."
                )

        # --------------------------------------------------
        # Build preview
        # --------------------------------------------------

        if row_errors:
            invalid_rows += 1
        else:
            valid_rows += 1

        warning_count += len(
            row_warnings
        )

        full_name = " ".join(
            part
            for part in [
                first_name,
                middle_name,
                last_name,
            ]
            if part
        )

        preview_rows.append(
            {
                "row_number": row_number,
                "student_id": student_id,
                "first_name": first_name,
                "middle_name": middle_name,
                "last_name": last_name,
                "full_name": full_name,
                "gender": gender or "",
                "gender_label": (
                    "Male"
                    if gender == Student.Gender.MALE
                    else "Female"
                    if gender == Student.Gender.FEMALE
                    else gender_input
                ),
                "department": (
                    department.id
                    if department
                    else None
                ),
                "department_name": (
                    department.name
                    if department
                    else department_input
                ),
                "faculty": (
                    department.faculty.id
                    if department
                    else None
                ),
                "faculty_name": (
                    department.faculty.name
                    if department
                    else ""
                ),
                "semester": (
                    semester.id
                    if semester
                    else None
                ),
                "semester_name": (
                    semester.name
                    if semester
                    else semester_input
                ),
                "academic_year": (
                    academic_year.id
                    if academic_year
                    else None
                ),
                "academic_year_name": (
                    academic_year.name
                    if academic_year
                    else academic_year_input
                ),
                "status": status or "",
                "status_label": (
                    status.replace(
                        "_",
                        " ",
                    ).title()
                    if status
                    else status_input
                ),
                "errors": row_errors,
                "warnings": row_warnings,
                "valid": not bool(row_errors),
            }
        )

    return {
        "valid": (
            total_rows > 0
            and invalid_rows == 0
        ),
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "warning_count": warning_count,
        "rows": preview_rows,
    }


@transaction.atomic
def import_validated_rows(rows):
    """
    Import previously validated rows.

    Historical Academic Years are intentionally preserved.
    Student IDs supplied by the file are also preserved.
    """
    if not rows:
        raise ValueError(
            "There are no rows to import."
        )

    invalid_rows = [
        row
        for row in rows
        if not row.get("valid")
    ]

    if invalid_rows:
        raise ValueError(
            "The file contains invalid rows. "
            "Please correct the errors before importing."
        )

    student_ids = [
        normalize_student_id(
            row.get("student_id")
        )
        for row in rows
    ]

    normalized_ids = [
        student_id.casefold()
        for student_id in student_ids
        if student_id
    ]

    if len(normalized_ids) != len(
        set(normalized_ids)
    ):
        raise ValueError(
            "Duplicate Student IDs were detected "
            "during import."
        )

    existing_ids = {
        normalize_student_id(student_id).casefold()
        for student_id in (
            Student.objects
            .filter(
                student_id__in=student_ids
            )
            .values_list(
                "student_id",
                flat=True,
            )
        )
    }

    if existing_ids:
        duplicate = ", ".join(
            sorted(existing_ids)
        )

        raise ValueError(
            "The following Student ID(s) already "
            f"exist: {duplicate}"
        )

    created_students = []

    for row in rows:
        student_id = normalize_student_id(
            row["student_id"]
        )

        department_id = row.get(
            "department"
        )

        semester_id = row.get(
            "semester"
        )

        academic_year_id = row.get(
            "academic_year"
        )

        if not department_id:
            raise ValueError(
                f"Row {row.get('row_number')}: "
                "Department is required."
            )

        if not semester_id:
            raise ValueError(
                f"Row {row.get('row_number')}: "
                "Semester is required."
            )

        if not academic_year_id:
            raise ValueError(
                f"Row {row.get('row_number')}: "
                "Academic Year is required."
            )

        try:
            department = (
                Department.objects
                .select_related("faculty")
                .get(pk=department_id)
            )

            semester = Semester.objects.get(
                pk=semester_id
            )

            academic_year = (
                AcademicYear.objects.get(
                    pk=academic_year_id
                )
            )

        except (
            Department.DoesNotExist,
            Semester.DoesNotExist,
            AcademicYear.DoesNotExist,
        ) as exc:
            raise ValueError(
                f"Row {row.get('row_number')}: "
                "A referenced academic record no longer exists."
            ) from exc

        student = Student(
            student_id=student_id,
            first_name=normalize_text(
                row.get("first_name")
            ),
            middle_name=normalize_text(
                row.get("middle_name")
            ),
            last_name=normalize_text(
                row.get("last_name")
            ),
            gender=row["gender"],
            department=department,
            faculty=department.faculty,
            semester=semester,
            academic_year=academic_year,
            program=department.name,
            status=row["status"],
        )

        try:
            student.save()
        except Exception as exc:
            raise ValueError(
                f"Row {row.get('row_number')}: "
                f"Unable to create Student '{student_id}'."
            ) from exc

        created_students.append(student)

    return created_students