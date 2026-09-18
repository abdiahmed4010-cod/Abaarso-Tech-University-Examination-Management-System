/* =========================================================
   ATU EMS — STUDENT MANAGEMENT
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       API
       ===================================================== */

    const API = {
        students: "/api/students/",
        faculties: "/api/faculties/",
        departments: "/api/departments/",
        semesters: "/api/semesters/",
        academicYears: "/api/academic-years/",
    };

    /* =====================================================
       STATE
       ===================================================== */

    let students = [];
    let faculties = [];
    let departments = [];
    let semesters = [];
    let academicYears = [];

    let editingStudentId = null;
    let deletingStudentId = null;

    /* =====================================================
       DOM
       ===================================================== */

    const $ = id => document.getElementById(id);

    const elements = {
        tableBody: $("studentsTableBody"),
        emptyState: $("studentsEmptyState"),
        loadingState: $("studentsLoadingState"),

        /* Search & Filters */
        search: $("studentSearch"),
        departmentFilter: $("studentDepartmentFilter"),
        semesterFilter: $("studentSemesterFilter"),
        statusFilter: $("studentStatusFilter"),
        resetFiltersBtn: $("resetStudentFiltersBtn"),

        /* Summary */
        resultCount: $("studentResultCount"),
        totalCount: $("totalStudentsCount"),
        activeCount: $("activeStudentsCount"),
        inactiveCount: $("inactiveStudentsCount"),
        graduatedCount: $("graduatedStudentsCount"),

        /* Add / Edit */
        addStudentBtn: $("addStudentBtn"),
        studentModal: $("studentModal"),
        studentModalTitle: $("studentModalTitle"),
        closeStudentModalBtn: $("closeStudentModalBtn"),
        cancelStudentBtn: $("cancelStudentBtn"),
        studentForm: $("studentForm"),
        saveStudentBtn: $("saveStudentBtn"),

        studentId: $("studentId"),
        firstName: $("firstName"),
        middleName: $("middleName"),
        lastName: $("lastName"),
        gender: $("studentGender"),
        dateOfBirth: $("studentDateOfBirth"),
        phone: $("studentPhone"),
        address: $("studentAddress"),

        faculty: $("studentFaculty"),
        department: $("studentDepartment"),
        semester: $("studentSemester"),
        academicYear: $("studentAcademicYear"),
        program: $("studentProgram"),
        admissionDate: $("studentAdmissionDate"),
        status: $("studentStatus"),

        /* Delete */
        deleteModal: $("deleteStudentModal"),
        deleteStudentName: $("deleteStudentName"),
        cancelDeleteBtn: $("cancelDeleteStudentBtn"),
        confirmDeleteBtn: $("confirmDeleteStudentBtn"),

        /* Upload */
        uploadBtn: $("uploadStudentsBtn"),
        uploadModal: $("uploadStudentsModal"),
        closeUploadModalBtn: $("closeUploadStudentsModalBtn"),
        cancelUploadBtn: $("cancelUploadStudentsBtn"),
        processUploadBtn: $("processStudentUploadBtn"),
        uploadFile: $("studentUploadFile"),
    };

    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    async function init() {
        bindEvents();

        setLoading(true);

        try {
            await Promise.all([
                loadFaculties(),
                loadDepartments(),
                loadSemesters(),
                loadAcademicYears(),
            ]);

            await loadStudents();
        } catch (error) {
            console.error(
                "Student Management initialization error:",
                error
            );

            showError(
                "Unable to load Student Management data."
            );
        } finally {
            setLoading(false);
        }
    }

    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {
        /* Add Student */
        elements.addStudentBtn?.addEventListener(
            "click",
            () => openStudentModal()
        );

        /* Student Modal */
        elements.closeStudentModalBtn?.addEventListener(
            "click",
            closeStudentModal
        );

        elements.cancelStudentBtn?.addEventListener(
            "click",
            closeStudentModal
        );

        elements.studentForm?.addEventListener(
            "submit",
            handleStudentSubmit
        );

        /* Faculty → Department */
        elements.faculty?.addEventListener(
            "change",
            handleFacultyChange
        );

        /* Search */
        elements.search?.addEventListener(
            "input",
            renderStudents
        );

        /* Filters */
        elements.departmentFilter?.addEventListener(
            "change",
            renderStudents
        );

        elements.semesterFilter?.addEventListener(
            "change",
            renderStudents
        );

        elements.statusFilter?.addEventListener(
            "change",
            renderStudents
        );

        /* Reset */
        elements.resetFiltersBtn?.addEventListener(
            "click",
            resetFilters
        );

        /* Table Actions */
        elements.tableBody?.addEventListener(
            "click",
            handleTableAction
        );

        /* Delete */
        elements.cancelDeleteBtn?.addEventListener(
            "click",
            closeDeleteModal
        );

        elements.confirmDeleteBtn?.addEventListener(
            "click",
            confirmDelete
        );

        /* Upload */
        elements.uploadBtn?.addEventListener(
            "click",
            openUploadModal
        );

        elements.closeUploadModalBtn?.addEventListener(
            "click",
            closeUploadModal
        );

        elements.cancelUploadBtn?.addEventListener(
            "click",
            closeUploadModal
        );

        elements.processUploadBtn?.addEventListener(
            "click",
            processUpload
        );

        /* Escape */
        document.addEventListener(
            "keydown",
            handleEscapeKey
        );
    }

    /* =====================================================
       CSRF
       ===================================================== */

    function getCSRFToken() {
        const cookie = document.cookie
            .split("; ")
            .find(
                row =>
                    row.startsWith(
                        "csrftoken="
                    )
            );

        return cookie
            ? decodeURIComponent(
                cookie.split("=")[1]
            )
            : "";
    }

    /* =====================================================
       API REQUEST
       ===================================================== */

    async function apiRequest(
        url,
        options = {}
    ) {
        const headers = {
            Accept:
                "application/json",
            ...(options.headers || {}),
        };

        if (
            options.body &&
            !(options.body instanceof FormData)
        ) {
            headers["Content-Type"] =
                "application/json";
        }

        const method = (
            options.method ||
            "GET"
        ).toUpperCase();

        if (
            [
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
            ].includes(method)
        ) {
            headers["X-CSRFToken"] =
                getCSRFToken();
        }

        const response =
            await fetch(
                url,
                {
                    ...options,
                    headers,
                    credentials:
                        "same-origin",
                }
            );

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        let data;

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            data =
                await response.json();
        } else {
            const text =
                await response.text();

            data =
                text || null;
        }

        if (!response.ok) {
            const error =
                new Error(
                    `Request failed: ${response.status}`
                );

            error.status =
                response.status;

            error.data =
                data;

            throw error;
        }

        return data;
    }

    /* =====================================================
       LOAD STUDENTS
       ===================================================== */

    async function loadStudents() {
        try {
            const data =
                await apiRequest(
                    API.students
                );

            students =
                normalizeListResponse(
                    data
                );

            updateSummary();

            renderStudents();
        } catch (error) {
            console.error(
                "Failed to load students:",
                error
            );

            showApiError(
                error,
                "Failed to load students."
            );
        }
    }

    /* =====================================================
       LOAD FACULTIES
       ===================================================== */

    async function loadFaculties() {
        const data =
            await apiRequest(
                API.faculties
            );

        faculties =
            normalizeListResponse(
                data
            );

        populateSelect(
            elements.faculty,
            faculties,
            "Select Faculty"
        );
    }

    /* =====================================================
       LOAD DEPARTMENTS
       ===================================================== */

    async function loadDepartments() {
        const data =
            await apiRequest(
                API.departments
            );

        departments =
            normalizeListResponse(
                data
            );

        populateSelect(
            elements.departmentFilter,
            departments,
            "All Departments"
        );
    }

    /* =====================================================
       LOAD SEMESTERS
       ===================================================== */

    async function loadSemesters() {
        const data =
            await apiRequest(
                API.semesters
            );

        semesters =
            normalizeListResponse(
                data
            );

        populateSelect(
            elements.semesterFilter,
            semesters,
            "All Semesters"
        );

        populateSelect(
            elements.semester,
            semesters,
            "Select Semester"
        );
    }

    /* =====================================================
       LOAD ACADEMIC YEARS
       ===================================================== */

    async function loadAcademicYears() {
        const data =
            await apiRequest(
                API.academicYears
            );

        academicYears =
            normalizeListResponse(
                data
            );

        populateSelect(
            elements.academicYear,
            academicYears,
            "Select Academic Year"
        );
    }

    /* =====================================================
       NORMALIZE API RESPONSE
       ===================================================== */

    function normalizeListResponse(
        data
    ) {
        if (
            Array.isArray(data)
        ) {
            return data;
        }

        if (
            data &&
            Array.isArray(
                data.results
            )
        ) {
            return data.results;
        }

        return [];
    }

    /* =====================================================
       POPULATE SELECT
       ===================================================== */

    function populateSelect(
        select,
        items,
        placeholder
    ) {
        if (!select) {
            return;
        }

        select.innerHTML = "";

        const option =
            document.createElement(
                "option"
            );

        option.value = "";

        option.textContent =
            placeholder;

        select.appendChild(
            option
        );

        items.forEach(
            item => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    item.id;

                option.textContent =
                    getDisplayName(
                        item
                    );

                select.appendChild(
                    option
                );
            }
        );
    }

    function getDisplayName(
        item
    ) {
        if (!item) {
            return "";
        }

        if (
            item.name &&
            item.code
        ) {
            return `${item.name} (${item.code})`;
        }

        return (
            item.name ||
            `ID ${item.id}`
        );
    }

    /* =====================================================
       FACULTY → DEPARTMENT
       ===================================================== */

    function handleFacultyChange() {
        if (
            !elements.department
        ) {
            return;
        }

        const facultyId =
            elements.faculty?.value ||
            "";

        elements.department.innerHTML =
            "";

        const option =
            document.createElement(
                "option"
            );

        option.value = "";

        option.textContent =
            facultyId
                ? "Select Department"
                : "Select Faculty First";

        elements.department.appendChild(
            option
        );

        elements.department.disabled =
            !facultyId;

        if (!facultyId) {
            return;
        }

        departments
            .filter(
                department =>
                    String(
                        department.faculty
                    ) ===
                    String(
                        facultyId
                    )
            )
            .forEach(
                department => {
                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        department.id;

                    option.textContent =
                        getDisplayName(
                            department
                        );

                    elements.department.appendChild(
                        option
                    );
                }
            );
    }

    /* =====================================================
       FILTERING
       ===================================================== */

    function getFilteredStudents() {
        const search =
            (
                elements.search?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const departmentId =
            elements.departmentFilter
                ?.value || "";

        const semesterId =
            elements.semesterFilter
                ?.value || "";

        const status =
            elements.statusFilter
                ?.value || "";

        return students.filter(
            student => {

                /*
                 * SEARCH ONLY:
                 * Student ID + Name
                 */

                const searchableText = [
                    student.student_id,
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                    student.full_name,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                if (
                    search &&
                    !searchableText.includes(
                        search
                    )
                ) {
                    return false;
                }

                /*
                 * DEPARTMENT
                 */

                if (
                    departmentId &&
                    String(
                        student.department
                    ) !==
                    String(
                        departmentId
                    )
                ) {
                    return false;
                }

                /*
                 * SEMESTER
                 */

                if (
                    semesterId &&
                    String(
                        student.semester
                    ) !==
                    String(
                        semesterId
                    )
                ) {
                    return false;
                }

                /*
                 * STATUS
                 */

                if (
                    status &&
                    student.status !==
                    status
                ) {
                    return false;
                }

                return true;
            }
        );
    }

    /* =====================================================
       RENDER STUDENT TABLE
       ===================================================== */

    function renderStudents() {
        if (
            !elements.tableBody
        ) {
            return;
        }

        const filtered =
            getFilteredStudents();

        elements.tableBody.innerHTML =
            "";

        if (
            elements.resultCount
        ) {
            elements.resultCount.textContent =
                filtered.length;
        }

        if (
            filtered.length ===
            0
        ) {
            showEmptyState(true);
            return;
        }

        showEmptyState(false);

        filtered.forEach(
            student => {

                const row =
                    document.createElement(
                        "tr"
                    );

                row.className =
                    "hover:bg-slate-50 dark:hover:bg-slate-700/30";

                /*
                 * STUDENT LIST COLUMNS:
                 *
                 * 1. Student ID
                 * 2. Name
                 * 3. Gender
                 * 4. Department
                 * 5. Semester
                 * 6. Status
                 * 7. Actions
                 *
                 * Removed from table:
                 * Phone
                 * Faculty
                 * Academic Year
                 * Program
                 */

                row.innerHTML = `
                    <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        ${escapeHTML(
                            student.student_id ||
                            "—"
                        )}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap min-w-[220px]">
                        <div class="font-medium">
                            ${escapeHTML(
                                student.full_name ||
                                buildFullName(
                                    student
                                ) ||
                                "—"
                            )}
                        </div>
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ${escapeHTML(
                            formatGender(
                                student.gender
                            )
                        )}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ${escapeHTML(
                            student.department_name ||
                            "—"
                        )}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ${escapeHTML(
                            student.semester_name ||
                            "—"
                        )}
                    </td>

                    <td class="px-4 py-3 text-sm">
                        ${renderStatusBadge(
                            student.status
                        )}
                    </td>

                    <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">

                            <button
                                type="button"
                                class="student-action-btn text-slate-500 hover:text-[#720E24]"
                                data-action="view"
                                data-id="${student.id}"
                                title="View Student"
                            >
                                ${viewIcon()}
                            </button>

                            <button
                                type="button"
                                class="student-action-btn text-slate-500 hover:text-[#720E24]"
                                data-action="edit"
                                data-id="${student.id}"
                                title="Edit Student"
                            >
                                ${editIcon()}
                            </button>

                            <button
                                type="button"
                                class="student-action-btn text-slate-500 hover:text-red-600"
                                data-action="delete"
                                data-id="${student.id}"
                                title="Delete Student"
                            >
                                ${deleteIcon()}
                            </button>

                        </div>
                    </td>
                `;

                elements.tableBody.appendChild(
                    row
                );
            }
        );
    }

    /* =====================================================
       SUMMARY
       ===================================================== */

    function updateSummary() {
        const total =
            students.length;

        const active =
            students.filter(
                student =>
                    student.status ===
                    "ACTIVE"
            ).length;

        const inactive =
            students.filter(
                student =>
                    student.status ===
                    "INACTIVE"
            ).length;

        const graduated =
            students.filter(
                student =>
                    student.status ===
                    "GRADUATED"
            ).length;

        if (
            elements.totalCount
        ) {
            elements.totalCount.textContent =
                total;
        }

        if (
            elements.activeCount
        ) {
            elements.activeCount.textContent =
                active;
        }

        if (
            elements.inactiveCount
        ) {
            elements.inactiveCount.textContent =
                inactive;
        }

        if (
            elements.graduatedCount
        ) {
            elements.graduatedCount.textContent =
                graduated;
        }
    }

    /* =====================================================
       OPEN ADD / EDIT
       ===================================================== */

    function openStudentModal(
        student = null
    ) {
        editingStudentId =
            student?.id ||
            null;

        elements.studentForm?.reset();

        if (
            elements.studentModalTitle
        ) {
            elements.studentModalTitle.textContent =
                student
                    ? "Edit Student"
                    : "Add Student";
        }

        if (
            elements.saveStudentBtn
        ) {
            elements.saveStudentBtn.textContent =
                student
                    ? "Update Student"
                    : "Save Student";
        }

        setEditFieldsVisibility(
            Boolean(student)
        );

        resetDepartmentSelect();

        if (student) {
            fillStudentForm(
                student
            );
        } else if (
            elements.status
        ) {
            elements.status.value =
                "ACTIVE";
        }

        showModal(
            elements.studentModal
        );
    }

    /* =====================================================
       EDIT FIELD VISIBILITY
       ===================================================== */

    function setEditFieldsVisibility(
        isEditing
    ) {
        /*
         * EDIT STUDENT:
         *
         * Visible:
         * Student ID
         * First Name
         * Middle Name
         * Last Name
         * Gender
         * Department
         * Semester
         * Status
         *
         * Hidden:
         * Phone
         * Faculty
         * Academic Year
         * Program
         * Admission Date
         * Date of Birth
         * Address
         */

        const fieldsToHide = [
            elements.phone,
            elements.faculty,
            elements.academicYear,
            elements.program,
            elements.admissionDate,
            elements.dateOfBirth,
            elements.address,
        ];

        fieldsToHide.forEach(
            field => {

                if (!field) {
                    return;
                }

                const wrapper =
                    findFieldWrapper(
                        field
                    );

                if (!wrapper) {
                    return;
                }

                wrapper.style.display =
                    isEditing
                        ? "none"
                        : "";
            }
        );
    }

    /* =====================================================
       FIND FIELD WRAPPER
       ===================================================== */

    function findFieldWrapper(
        field
    ) {
        if (!field) {
            return null;
        }

        let current =
            field.parentElement;

        while (
            current &&
            current !==
                elements.studentForm
        ) {
            const hasLabel =
                Boolean(
                    current.querySelector(
                        "label"
                    )
                );

            if (
                hasLabel &&
                current.contains(
                    field
                )
            ) {
                return current;
            }

            current =
                current.parentElement;
        }

        return field.parentElement;
    }

    /* =====================================================
       FILL EDIT FORM
       ===================================================== */

    function fillStudentForm(
        student
    ) {
        if (
            elements.studentId
        ) {
            elements.studentId.value =
                student.student_id ||
                "";
        }

        if (
            elements.firstName
        ) {
            elements.firstName.value =
                student.first_name ||
                "";
        }

        if (
            elements.middleName
        ) {
            elements.middleName.value =
                student.middle_name ||
                "";
        }

        if (
            elements.lastName
        ) {
            elements.lastName.value =
                student.last_name ||
                "";
        }

        if (
            elements.gender
        ) {
            elements.gender.value =
                student.gender ||
                "";
        }

        if (
            elements.phone
        ) {
            elements.phone.value =
                student.phone ||
                "";
        }

        if (
            elements.faculty
        ) {
            elements.faculty.value =
                student.faculty ||
                "";

            handleFacultyChange();
        }

        if (
            elements.department
        ) {
            elements.department.value =
                student.department ||
                "";
        }

        if (
            elements.semester
        ) {
            elements.semester.value =
                student.semester ||
                "";
        }

        if (
            elements.academicYear
        ) {
            elements.academicYear.value =
                student.academic_year ||
                "";
        }

        if (
            elements.program
        ) {
            elements.program.value =
                student.program ||
                "";
        }

        if (
            elements.status
        ) {
            elements.status.value =
                student.status ||
                "ACTIVE";
        }
    }

    /* =====================================================
       RESET DEPARTMENT
       ===================================================== */

    function resetDepartmentSelect() {
        if (
            !elements.department
        ) {
            return;
        }

        elements.department.innerHTML = `
            <option value="">
                Select Faculty First
            </option>
        `;

        elements.department.disabled =
            true;
    }

    /* =====================================================
       CLOSE STUDENT MODAL
       ===================================================== */

    function closeStudentModal() {
        editingStudentId =
            null;

        hideModal(
            elements.studentModal
        );

        elements.studentForm?.reset();

        resetDepartmentSelect();

        if (
            elements.studentModalTitle
        ) {
            elements.studentModalTitle.textContent =
                "Add Student";
        }

        if (
            elements.saveStudentBtn
        ) {
            elements.saveStudentBtn.textContent =
                "Save Student";
        }

        /*
         * Restore hidden fields for ADD mode.
         */

        const fieldsToRestore = [
            elements.phone,
            elements.faculty,
            elements.academicYear,
            elements.program,
            elements.admissionDate,
            elements.dateOfBirth,
            elements.address,
        ];

        fieldsToRestore.forEach(
            field => {

                if (!field) {
                    return;
                }

                const wrapper =
                    findFieldWrapper(
                        field
                    );

                if (wrapper) {
                    wrapper.style.display =
                        "";
                }
            }
        );
    }

    /* =====================================================
       SUBMIT STUDENT
       ===================================================== */

    async function handleStudentSubmit(
        event
    ) {
        event.preventDefault();

        if (
            !elements.studentForm ||
            !elements.studentForm.checkValidity()
        ) {
            elements.studentForm?.reportValidity();

            return;
        }

        let payload;

        /* =================================================
           ADD STUDENT
           ================================================= */

        if (!editingStudentId) {

            payload = {
                student_id:
                    elements.studentId.value.trim(),

                first_name:
                    elements.firstName.value.trim(),

                middle_name:
                    elements.middleName.value.trim(),

                last_name:
                    elements.lastName.value.trim(),

                gender:
                    elements.gender.value,

                phone:
                    elements.phone?.value.trim() ||
                    "",

                faculty:
                    Number(
                        elements.faculty.value
                    ),

                department:
                    Number(
                        elements.department.value
                    ),

                semester:
                    Number(
                        elements.semester.value
                    ),

                academic_year:
                    Number(
                        elements.academicYear.value
                    ),

                program:
                    elements.program.value.trim(),

                admission_date:
                    elements.admissionDate?.value ||
                    null,

                date_of_birth:
                    elements.dateOfBirth?.value ||
                    null,

                address:
                    elements.address?.value.trim() ||
                    "",

                status:
                    elements.status.value,
            };

        }

        /* =================================================
           EDIT STUDENT
           ================================================= */

        else {

            /*
             * ONLY EDIT THESE:
             *
             * Student ID
             * First Name
             * Middle Name
             * Last Name
             * Gender
             * Department
             * Semester
             * Status
             */

            payload = {
                student_id:
                    elements.studentId.value.trim(),

                first_name:
                    elements.firstName.value.trim(),

                middle_name:
                    elements.middleName.value.trim(),

                last_name:
                    elements.lastName.value.trim(),

                gender:
                    elements.gender.value,

                department:
                    Number(
                        elements.department.value
                    ),

                semester:
                    Number(
                        elements.semester.value
                    ),

                status:
                    elements.status.value,
            };
        }

        setSaveButtonLoading(
            true
        );

        try {

            if (
                editingStudentId
            ) {

                await apiRequest(
                    `${API.students}${editingStudentId}/`,
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

                showSuccess(
                    "Student updated successfully."
                );

            } else {

                await apiRequest(
                    API.students,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

                showSuccess(
                    "Student registered successfully."
                );
            }

            closeStudentModal();

            await loadStudents();

        } catch (error) {

            console.error(
                "Student save error:",
                error
            );

            showApiError(
                error,
                "Unable to save student."
            );

        } finally {

            setSaveButtonLoading(
                false
            );
        }
    }

    /* =====================================================
       TABLE ACTION
       ===================================================== */

    function handleTableAction(
        event
    ) {
        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            Number(
                button.dataset.id
            );

        const student =
            students.find(
                item =>
                    Number(
                        item.id
                    ) === id
            );

        if (!student) {
            return;
        }

        if (
            action ===
            "view"
        ) {
            viewStudent(
                student
            );
        }

        if (
            action ===
            "edit"
        ) {
            openStudentModal(
                student
            );
        }

        if (
            action ===
            "delete"
        ) {
            openDeleteModal(
                student
            );
        }
    }

    /* =====================================================
       VIEW STUDENT
       ===================================================== */

    function viewStudent(
        student
    ) {
        const modal =
            getViewStudentModal();

        const fullName =
            student.full_name ||
            buildFullName(
                student
            ) ||
            "—";

        /*
         * VIEW ONLY:
         *
         * Student ID
         * Full Name
         * Gender
         * Department
         * Semester
         * Status
         *
         * Removed:
         * Phone
         * Faculty
         * Academic Year
         * Program
         * Admission Date
         * Date of Birth
         * Address
         */

        const details = [
            [
                "Student ID",
                student.student_id ||
                "—",
            ],

            [
                "Full Name",
                fullName,
            ],

            [
                "Gender",
                formatGender(
                    student.gender
                ),
            ],

            [
                "Department",
                student.department_name ||
                "—",
            ],

            [
                "Semester",
                student.semester_name ||
                "—",
            ],
        ];

        const detailsHTML =
            details
                .map(
                    ([label, value]) => `
                        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">

                            <div class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                ${escapeHTML(
                                    label
                                )}
                            </div>

                            <div class="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                                ${escapeHTML(
                                    value
                                )}
                            </div>

                        </div>
                    `
                )
                .join("");

        modal.innerHTML = `
            <div
                class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
                data-view-close
            ></div>

            <div
                class="relative z-10 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                role="dialog"
                aria-modal="true"
            >

                <div class="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">

                    <div class="flex min-w-0 items-center gap-4">

                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#720E24] text-white">
                            ${studentIcon()}
                        </div>

                        <div class="min-w-0">

                            <h2 class="truncate text-lg font-bold text-slate-900 dark:text-white">
                                Student Details
                            </h2>

                            <p class="truncate text-sm text-slate-500 dark:text-slate-400">
                                ${escapeHTML(
                                    fullName
                                )}
                            </p>

                        </div>

                    </div>

                    <button
                        type="button"
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-white"
                        data-view-close
                        title="Close"
                    >
                        ${closeIcon()}
                    </button>

                </div>

                <div class="overflow-y-auto px-6 py-6">

                    <div class="mb-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">

                        <div>

                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Student Status
                            </p>

                            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Current registration status
                            </p>

                        </div>

                        <span class="${getViewStatusClass(
                            student.status
                        )}">
                            ${escapeHTML(
                                formatStatus(
                                    student.status
                                )
                            )}
                        </span>

                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        ${detailsHTML}
                    </div>

                </div>

                <div class="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">

                    <button
                        type="button"
                        class="rounded-lg bg-[#720E24] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5A0E24]"
                        data-view-close
                    >
                        Close
                    </button>

                </div>

            </div>
        `;

        showModal(
            modal
        );

        modal
            .querySelectorAll(
                "[data-view-close]"
            )
            .forEach(
                button =>
                    button.addEventListener(
                        "click",
                        closeViewStudentModal
                    )
            );
    }

    /* =====================================================
       VIEW MODAL
       ===================================================== */

    function getViewStudentModal() {
        let modal =
            document.getElementById(
                "viewStudentModal"
            );

        if (modal) {
            return modal;
        }

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "viewStudentModal";

        modal.className =
            "fixed inset-0 hidden items-center justify-center p-4";

        modal.style.display =
            "none";

        modal.style.position =
            "fixed";

        modal.style.inset =
            "0";

        modal.style.zIndex =
            "99999";

        document.body.appendChild(
            modal
        );

        return modal;
    }

    function closeViewStudentModal() {
        const modal =
            document.getElementById(
                "viewStudentModal"
            );

        if (!modal) {
            return;
        }

        hideModal(
            modal
        );
    }

    /* =====================================================
       DELETE MODAL
       ===================================================== */

    function openDeleteModal(
        student
    ) {
        deletingStudentId =
            student.id;

        if (
            elements.deleteStudentName
        ) {
            elements.deleteStudentName.textContent =
                `${
                    student.student_id ||
                    ""
                } — ${
                    student.full_name ||
                    buildFullName(
                        student
                    )
                }`;
        }

        showModal(
            elements.deleteModal
        );
    }

    function closeDeleteModal() {
        deletingStudentId =
            null;

        hideModal(
            elements.deleteModal
        );
    }

    async function confirmDelete() {
        if (
            !deletingStudentId
        ) {
            return;
        }

        const id =
            deletingStudentId;

        if (
            elements.confirmDeleteBtn
        ) {
            elements.confirmDeleteBtn.disabled =
                true;

            elements.confirmDeleteBtn.textContent =
                "Deleting...";
        }

        try {

            await apiRequest(
                `${API.students}${id}/`,
                {
                    method:
                        "DELETE",
                }
            );

            showSuccess(
                "Student deleted successfully."
            );

            closeDeleteModal();

            await loadStudents();

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            showApiError(
                error,
                "Unable to delete student."
            );

        } finally {

            if (
                elements.confirmDeleteBtn
            ) {
                elements.confirmDeleteBtn.disabled =
                    false;

                elements.confirmDeleteBtn.textContent =
                    "Delete Student";
            }
        }
    }

    /* =====================================================
       RESET FILTERS
       ===================================================== */

    function resetFilters() {
        [
            elements.search,
            elements.departmentFilter,
            elements.semesterFilter,
            elements.statusFilter,
        ].forEach(
            element => {
                if (element) {
                    element.value =
                        "";
                }
            }
        );

        renderStudents();
    }

    /* =====================================================
       UPLOAD
       ===================================================== */

    function openUploadModal() {
        if (
            elements.uploadFile
        ) {
            elements.uploadFile.value =
                "";
        }

        showModal(
            elements.uploadModal
        );
    }

    function closeUploadModal() {
        hideModal(
            elements.uploadModal
        );

        if (
            elements.uploadFile
        ) {
            elements.uploadFile.value =
                "";
        }
    }

    function processUpload() {
        const file =
            elements.uploadFile
                ?.files?.[0];

        if (!file) {
            showError(
                "Please select a CSV or Excel file first."
            );

            return;
        }

        showError(
            "Student file import will be enabled in the Bulk Registration step."
        );
    }

    /* =====================================================
       MODAL
       ===================================================== */

    function showModal(
        modal
    ) {
        if (!modal) {
            return;
        }

        modal.classList.remove(
            "hidden"
        );

        modal.classList.add(
            "flex"
        );

        modal.style.display =
            "flex";

        modal.style.position =
            "fixed";

        modal.style.inset =
            "0";

        modal.style.zIndex =
            "99999";

        document.body.style.overflow =
            "hidden";
    }

    function hideModal(
        modal
    ) {
        if (!modal) {
            return;
        }

        modal.classList.remove(
            "flex"
        );

        modal.classList.add(
            "hidden"
        );

        modal.style.display =
            "none";

        const visibleModals =
            document.querySelectorAll(
                ".fixed.flex"
            );

        if (
            visibleModals.length ===
            0
        ) {
            document.body.style.overflow =
                "";
        }
    }

    /* =====================================================
       ESCAPE
       ===================================================== */

    function handleEscapeKey(
        event
    ) {
        if (
            event.key !==
            "Escape"
        ) {
            return;
        }

        const viewModal =
            document.getElementById(
                "viewStudentModal"
            );

        if (
            viewModal &&
            !viewModal.classList.contains(
                "hidden"
            )
        ) {
            closeViewStudentModal();

            return;
        }

        if (
            elements.studentModal &&
            !elements.studentModal.classList.contains(
                "hidden"
            )
        ) {
            closeStudentModal();

            return;
        }

        if (
            elements.deleteModal &&
            !elements.deleteModal.classList.contains(
                "hidden"
            )
        ) {
            closeDeleteModal();

            return;
        }

        if (
            elements.uploadModal &&
            !elements.uploadModal.classList.contains(
                "hidden"
            )
        ) {
            closeUploadModal();
        }
    }

    /* =====================================================
       LOADING
       ===================================================== */

    function setLoading(
        loading
    ) {
        if (
            !elements.loadingState
        ) {
            return;
        }

        if (loading) {

            elements.loadingState.classList.remove(
                "hidden"
            );

            elements.loadingState.classList.add(
                "flex"
            );

            elements.loadingState.style.display =
                "flex";

        } else {

            elements.loadingState.classList.remove(
                "flex"
            );

            elements.loadingState.classList.add(
                "hidden"
            );

            elements.loadingState.style.display =
                "none";
        }
    }

    /* =====================================================
       EMPTY STATE
       ===================================================== */

    function showEmptyState(
        show
    ) {
        if (
            !elements.emptyState
        ) {
            return;
        }

        if (show) {

            elements.emptyState.classList.remove(
                "hidden"
            );

            elements.emptyState.classList.add(
                "flex"
            );

            elements.emptyState.style.display =
                "flex";

        } else {

            elements.emptyState.classList.remove(
                "flex"
            );

            elements.emptyState.classList.add(
                "hidden"
            );

            elements.emptyState.style.display =
                "none";
        }
    }

    /* =====================================================
       SAVE BUTTON
       ===================================================== */

    function setSaveButtonLoading(
        loading
    ) {
        if (
            !elements.saveStudentBtn
        ) {
            return;
        }

        elements.saveStudentBtn.disabled =
            loading;

        if (loading) {

            elements.saveStudentBtn.dataset.originalText =
                elements.saveStudentBtn.textContent;

            elements.saveStudentBtn.textContent =
                "Saving...";

        } else {

            elements.saveStudentBtn.textContent =
                elements.saveStudentBtn.dataset.originalText ||
                (
                    editingStudentId
                        ? "Update Student"
                        : "Save Student"
                );
        }
    }

    /* =====================================================
       STATUS BADGE
       ===================================================== */

    function renderStatusBadge(
        status
    ) {
        let className =
            "student-status-badge";

        if (
            status ===
            "ACTIVE"
        ) {
            className +=
                " student-status-active";
        }

        if (
            status ===
            "INACTIVE"
        ) {
            className +=
                " student-status-inactive";
        }

        if (
            status ===
            "GRADUATED"
        ) {
            className +=
                " student-status-graduated";
        }

        return `
            <span class="${className}">
                ${escapeHTML(
                    formatStatus(
                        status
                    )
                )}
            </span>
        `;
    }

    function getViewStatusClass(
        status
    ) {
        if (
            status ===
            "ACTIVE"
        ) {
            return `
                inline-flex rounded-full
                bg-green-100 px-3 py-1
                text-xs font-semibold text-green-700
                dark:bg-green-900/30
                dark:text-green-300
            `;
        }

        if (
            status ===
            "INACTIVE"
        ) {
            return `
                inline-flex rounded-full
                bg-amber-100 px-3 py-1
                text-xs font-semibold text-amber-700
                dark:bg-amber-900/30
                dark:text-amber-300
            `;
        }

        if (
            status ===
            "GRADUATED"
        ) {
            return `
                inline-flex rounded-full
                bg-blue-100 px-3 py-1
                text-xs font-semibold text-blue-700
                dark:bg-blue-900/30
                dark:text-blue-300
            `;
        }

        return `
            inline-flex rounded-full
            bg-slate-100 px-3 py-1
            text-xs font-semibold text-slate-700
            dark:bg-slate-700
            dark:text-slate-200
        `;
    }

    /* =====================================================
       FORMAT
       ===================================================== */

    function formatStatus(
        status
    ) {
        const labels = {
            ACTIVE:
                "Active",

            INACTIVE:
                "Inactive",

            GRADUATED:
                "Graduated",
        };

        return (
            labels[status] ||
            status ||
            "—"
        );
    }

    function formatGender(
        gender
    ) {
        const labels = {
            MALE:
                "Male",

            FEMALE:
                "Female",
        };

        return (
            labels[gender] ||
            gender ||
            "—"
        );
    }

    function buildFullName(
        student
    ) {
        return [
            student.first_name,
            student.middle_name,
            student.last_name,
        ]
            .filter(
                value =>
                    value &&
                    value.trim()
            )
            .join(" ");
    }

    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(
        value
    ) {
        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    /* =====================================================
       ICONS
       ===================================================== */

    function viewIcon() {
        return `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path>
                <circle
                    cx="12"
                    cy="12"
                    r="3"
                ></circle>
            </svg>
        `;
    }

    function studentIcon() {
        return `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle
                    cx="12"
                    cy="8"
                    r="4"
                ></circle>

                <path
                    d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"
                ></path>
            </svg>
        `;
    }

    function closeIcon() {
        return `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg>
        `;
    }

    function editIcon() {
        return `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
            </svg>
        `;
    }

    function deleteIcon() {
        return `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6v14H5V6"></path>
                <path d="M10 11v5"></path>
                <path d="M14 11v5"></path>
            </svg>
        `;
    }

    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function showSuccess(
        message
    ) {
        showNotification(
            message,
            "success"
        );
    }

    function showError(
        message
    ) {
        showNotification(
            message,
            "error"
        );
    }

    function showNotification(
        message,
        type
    ) {
        const notification =
            document.createElement(
                "div"
            );

        notification.className = [
            "fixed",
            "right-4",
            "top-4",
            "z-[100000]",
            "max-w-sm",
            "rounded-lg",
            "border",
            "px-4",
            "py-3",
            "text-sm",
            "font-medium",
            "shadow-lg",
            "transition-opacity",
        ].join(" ");

        if (
            type ===
            "success"
        ) {
            notification.classList.add(
                "border-green-200",
                "bg-green-50",
                "text-green-800"
            );
        } else {
            notification.classList.add(
                "border-red-200",
                "bg-red-50",
                "text-red-800"
            );
        }

        notification.textContent =
            message;

        document.body.appendChild(
            notification
        );

        setTimeout(
            () => {

                notification.style.opacity =
                    "0";

                setTimeout(
                    () =>
                        notification.remove(),
                    250
                );

            },
            3500
        );
    }

    /* =====================================================
       API ERROR
       ===================================================== */

    function showApiError(
        error,
        fallback
    ) {
        if (
            error?.data &&
            typeof error.data ===
                "object"
        ) {
            const messages = [];

            Object.entries(
                error.data
            ).forEach(
                ([field, value]) => {

                    if (
                        Array.isArray(
                            value
                        )
                    ) {
                        messages.push(
                            `${field}: ${value.join(", ")}`
                        );
                    } else {
                        messages.push(
                            `${field}: ${value}`
                        );
                    }
                }
            );

            if (
                messages.length
            ) {
                showError(
                    messages.join(
                        " | "
                    )
                );

                return;
            }
        }

        showError(
            fallback
        );
    }

})();