/* =========================================================
   COURSES MANAGEMENT
   ATU Examination Management System
========================================================= */

const COURSES_API_URL = "/api/courses/";
const FACULTIES_API_URL = "/api/faculties/";
const DEPARTMENTS_API_URL = "/api/departments/";
const SEMESTERS_API_URL = "/api/semesters/";

let courses = [];
let faculties = [];
let departments = [];
let semesters = [];

let currentCourseId = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const courseSearch =
    document.getElementById("courseSearch");

const coursesTableBody =
    document.getElementById("coursesTableBody");

const coursesEmptyState =
    document.getElementById("coursesEmptyState");

const addCourseBtn =
    document.getElementById("addCourseBtn");

const courseModal =
    document.getElementById("courseModal");

const courseModalTitle =
    document.getElementById("courseModalTitle");

const closeCourseModal =
    document.getElementById("closeCourseModal");

const cancelCourseBtn =
    document.getElementById("cancelCourseBtn");

const courseForm =
    document.getElementById("courseForm");

const courseIdInput =
    document.getElementById("courseId");

const courseCodeDisplay =
    document.getElementById("courseCode");

const courseNameInput =
    document.getElementById("courseName");

const courseFacultyInput =
    document.getElementById("courseFaculty");

const courseDepartmentInput =
    document.getElementById("courseDepartment");

const courseSemesterInput =
    document.getElementById("courseSemester");

const courseCreditHoursInput =
    document.getElementById("courseCreditHours");

const courseIsActiveInput =
    document.getElementById("courseIsActive");

const saveCourseBtn =
    document.getElementById("saveCourseBtn");

const courseFacultyFilter =
    document.getElementById("courseFacultyFilter");

const courseDepartmentFilter =
    document.getElementById("courseDepartmentFilter");

const courseSemesterFilter =
    document.getElementById("courseSemesterFilter");

const courseCodePreview =
    document.getElementById("courseCodePreview");

const generatedCourseCode =
    document.getElementById("generatedCourseCode");

const deleteCourseModal =
    document.getElementById("deleteCourseModal");

const deleteCourseName =
    document.getElementById("deleteCourseName");

const cancelDeleteCourse =
    document.getElementById("cancelDeleteCourse");

const confirmDeleteCourse =
    document.getElementById("confirmDeleteCourse");


/* =========================================================
   CSRF TOKEN
========================================================= */

function getCookie(name) {

    const cookies =
        document.cookie.split(";");

    for (let cookie of cookies) {

        cookie = cookie.trim();

        if (
            cookie.startsWith(
                name + "="
            )
        ) {

            return decodeURIComponent(
                cookie.substring(
                    name.length + 1
                )
            );
        }
    }

    return null;
}

const csrfToken =
    getCookie("csrftoken");


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   FETCH ALL PAGINATED DATA
========================================================= */

async function fetchAllPages(url) {

    let nextUrl = url;

    const results = [];


    while (nextUrl) {

        const response =
            await fetch(
                nextUrl,
                {
                    method: "GET",

                    credentials:
                        "same-origin",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Request failed (${response.status})`
            );
        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            results.push(...data);

            nextUrl = null;

        } else {

            if (
                Array.isArray(
                    data.results
                )
            ) {

                results.push(
                    ...data.results
                );
            }

            nextUrl =
                data.next || null;
        }
    }


    return results;
}


/* =========================================================
   LOAD PAGE DATA
========================================================= */

async function loadCoursesPageData() {

    try {

        showLoadingState();


        const [
            coursesData,
            facultiesData,
            departmentsData,
            semestersData
        ] = await Promise.all([
            fetchAllPages(
                COURSES_API_URL
            ),

            fetchAllPages(
                FACULTIES_API_URL
            ),

            fetchAllPages(
                DEPARTMENTS_API_URL
            ),

            fetchAllPages(
                SEMESTERS_API_URL
            )
        ]);


        courses =
            Array.isArray(coursesData)
                ? coursesData
                : [];

        faculties =
            Array.isArray(facultiesData)
                ? facultiesData
                : [];

        departments =
            Array.isArray(departmentsData)
                ? departmentsData
                : [];

        semesters =
            Array.isArray(semestersData)
                ? semestersData
                : [];


        populateFacultySelects();

        populateSemesterSelects();

        populateDepartmentFilter(
            courseFacultyFilter.value
        );

        populateDepartmentForm(
            courseFacultyInput.value
        );

        renderCourses();


    } catch (error) {

        console.error(
            "Error loading course data:",
            error
        );


        showErrorState(
            error.message ||
            "Failed to load course data."
        );
    }
}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {

    coursesEmptyState.classList.add(
        "hidden"
    );


    coursesTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="course-loading"
            >
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading courses...
            </td>
        </tr>
    `;
}


/* =========================================================
   ERROR STATE
========================================================= */

function showErrorState(message) {

    coursesEmptyState.classList.add(
        "hidden"
    );


    coursesTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="course-error"
            >
                <i class="fa-solid fa-circle-exclamation"></i>
                ${escapeHtml(message)}
            </td>
        </tr>
    `;
}


/* =========================================================
   POPULATE FACULTY SELECTS
========================================================= */

function populateFacultySelects() {

    courseFacultyInput.innerHTML = `
        <option value="">
            Select Faculty
        </option>
    `;


    courseFacultyFilter.innerHTML = `
        <option value="">
            All Faculties
        </option>
    `;


    faculties.forEach(
        faculty => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                faculty.id;


            option.textContent =
                `${faculty.code} - ${faculty.name}`;


            courseFacultyInput.appendChild(
                option
            );


            const filterOption =
                document.createElement(
                    "option"
                );


            filterOption.value =
                faculty.id;


            filterOption.textContent =
                `${faculty.code} - ${faculty.name}`;


            courseFacultyFilter.appendChild(
                filterOption
            );
        }
    );
}


/* =========================================================
   POPULATE SEMESTER SELECTS
========================================================= */

function populateSemesterSelects() {

    courseSemesterInput.innerHTML = `
        <option value="">
            Select Semester
        </option>
    `;


    courseSemesterFilter.innerHTML = `
        <option value="">
            All Semesters
        </option>
    `;


    semesters.forEach(
        semester => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                semester.id;


            option.textContent =
                semester.name;


            courseSemesterInput.appendChild(
                option
            );


            const filterOption =
                document.createElement(
                    "option"
                );


            filterOption.value =
                semester.id;


            filterOption.textContent =
                semester.name;


            courseSemesterFilter.appendChild(
                filterOption
            );
        }
    );
}


/* =========================================================
   POPULATE DEPARTMENT FORM
   Only departments belonging to selected faculty
========================================================= */

function populateDepartmentForm(
    facultyId = "",
    selectedDepartmentId = ""
) {

    courseDepartmentInput.innerHTML = `
        <option value="">
            Select Department
        </option>
    `;


    const filteredDepartments =
        facultyId
            ? departments.filter(
                department =>
                    Number(
                        department.faculty
                    ) ===
                    Number(facultyId)
            )
            : [];


    filteredDepartments.forEach(
        department => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                department.id;


            option.textContent =
                `${department.code} - ${department.name}`;


            courseDepartmentInput.appendChild(
                option
            );
        }
    );


    if (selectedDepartmentId) {

        const exists =
            filteredDepartments.some(
                department =>
                    Number(
                        department.id
                    ) ===
                    Number(
                        selectedDepartmentId
                    )
            );


        if (exists) {

            courseDepartmentInput.value =
                selectedDepartmentId;
        }
    }
}


/* =========================================================
   POPULATE DEPARTMENT FILTER
========================================================= */

function populateDepartmentFilter(
    facultyId = "",
    selectedDepartmentId = ""
) {

    courseDepartmentFilter.innerHTML = `
        <option value="">
            All Departments
        </option>
    `;


    const filteredDepartments =
        facultyId
            ? departments.filter(
                department =>
                    Number(
                        department.faculty
                    ) ===
                    Number(facultyId)
            )
            : departments;


    filteredDepartments.forEach(
        department => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                department.id;


            option.textContent =
                `${department.code} - ${department.name}`;


            courseDepartmentFilter.appendChild(
                option
            );
        }
    );


    if (selectedDepartmentId) {

        const exists =
            filteredDepartments.some(
                department =>
                    Number(
                        department.id
                    ) ===
                    Number(
                        selectedDepartmentId
                    )
            );


        if (exists) {

            courseDepartmentFilter.value =
                selectedDepartmentId;
        }
    }
}


/* =========================================================
   GENERATE COURSE CODE PREVIEW
   This is a PREVIEW only.
   Final code is generated by Django backend.
========================================================= */

function getSemesterPrefix(
    semesterName
) {

    if (!semesterName) {
        return "";
    }


    const name =
        semesterName
            .trim()
            .toUpperCase();


    /*
       Example:
       Semester 1 -> SEM1
       Semester 2 -> SEM2
       Semester 10 -> SEM10
    */

    const numberMatch =
        name.match(/\d+/);


    if (numberMatch) {

        return `SEM${numberMatch[0]}`;
    }


    /*
       Fallback:
       If semester has no number,
       use the first 10 letters.
    */

    return name
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10);
}


/* =========================================================
   UPDATE COURSE CODE PREVIEW
========================================================= */

function updateCourseCodePreview() {

    const semesterId =
        courseSemesterInput.value;


    if (!semesterId) {

        courseCodeDisplay.textContent =
            "Auto-generated";

        generatedCourseCode.textContent =
            "---";

        courseCodePreview.hidden =
            true;

        return;
    }


    const semester =
        semesters.find(
            item =>
                Number(item.id) ===
                Number(semesterId)
        );


    if (!semester) {

        courseCodeDisplay.textContent =
            "Auto-generated";

        generatedCourseCode.textContent =
            "---";

        courseCodePreview.hidden =
            true;

        return;
    }


    const prefix =
        getSemesterPrefix(
            semester.name
        );


    /*
       For a NEW course we show the
       next available number.

       Backend remains the final authority.
    */

    const coursesInSemester =
        courses.filter(
            course =>
                Number(
                    course.semester
                ) ===
                Number(semesterId)
        );


    let nextNumber =
        coursesInSemester.length + 1;


    /*
       Protect against gaps in IDs/codes.
       Find existing numeric suffixes.
    */

    const usedNumbers = [];


    coursesInSemester.forEach(
        course => {

            const code =
                String(
                    course.course_code ||
                    ""
                );


            const match =
                code.match(
                    /-(\d+)$/
                );


            if (match) {

                usedNumbers.push(
                    Number(
                        match[1]
                    )
                );
            }
        }
    );


    while (
        usedNumbers.includes(
            nextNumber
        )
    ) {

        nextNumber++;
    }


    const previewCode =
        `${prefix}-${String(
            nextNumber
        ).padStart(3, "0")}`;


    courseCodeDisplay.textContent =
        previewCode;


    generatedCourseCode.textContent =
        previewCode;


    courseCodePreview.hidden =
        false;
}


/* =========================================================
   RENDER COURSES
========================================================= */

function renderCourses() {

    const searchValue =
        courseSearch.value
            .trim()
            .toLowerCase();


    const selectedFaculty =
        courseFacultyFilter.value;


    const selectedDepartment =
        courseDepartmentFilter.value;


    const selectedSemester =
        courseSemesterFilter.value;


    const filteredCourses =
        courses.filter(
            course => {

                const searchText = [
                    course.course_code,
                    course.name,
                    course.faculty_name,
                    course.faculty_code,
                    course.department_name,
                    course.department_code,
                    course.semester_name
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !searchValue ||
                    searchText.includes(
                        searchValue
                    );


                const matchesFaculty =
                    !selectedFaculty ||
                    Number(
                        course.faculty
                    ) ===
                    Number(
                        selectedFaculty
                    );


                const matchesDepartment =
                    !selectedDepartment ||
                    Number(
                        course.department
                    ) ===
                    Number(
                        selectedDepartment
                    );


                const matchesSemester =
                    !selectedSemester ||
                    Number(
                        course.semester
                    ) ===
                    Number(
                        selectedSemester
                    );


                return (
                    matchesSearch &&
                    matchesFaculty &&
                    matchesDepartment &&
                    matchesSemester
                );
            }
        );


    coursesTableBody.innerHTML = "";


    if (
        filteredCourses.length === 0
    ) {

        coursesEmptyState.classList.remove(
            "hidden"
        );

        return;
    }


    coursesEmptyState.classList.add(
        "hidden"
    );


    filteredCourses.forEach(
        course => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <span class="course-code">
                        ${escapeHtml(
                            course.course_code ||
                            "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="course-name">
                        ${escapeHtml(
                            course.name ||
                            "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="course-secondary-text">
                        ${escapeHtml(
                            course.faculty_code ||
                            course.faculty_name ||
                            "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="course-secondary-text">
                        ${escapeHtml(
                            course.department_code ||
                            course.department_name ||
                            "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="course-secondary-text">
                        ${escapeHtml(
                            course.semester_name ||
                            "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="course-credit-hours">
                        ${escapeHtml(
                            course.credit_hours ||
                            "-"
                        )}
                    </span>
                </td>

                <td>

                    <div class="course-actions">

                        <button
                            type="button"
                            class="course-action-btn edit"
                            data-action="edit"
                            data-id="${course.id}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="course-action-btn delete"
                            data-action="delete"
                            data-id="${course.id}"
                        >
                            Delete
                        </button>

                    </div>

                </td>
            `;


            coursesTableBody.appendChild(
                row
            );
        }
    );
}


/* =========================================================
   OPEN ADD COURSE MODAL
========================================================= */

function openAddCourseModal() {

    currentCourseId = null;


    courseForm.reset();


    courseIdInput.value = "";


    courseModalTitle.textContent =
        "Add Course";


    courseIsActiveInput.checked =
        true;


    courseCodeDisplay.textContent =
        "Auto-generated";


    generatedCourseCode.textContent =
        "---";


    courseCodePreview.hidden =
        true;


    populateDepartmentForm();


    saveCourseBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Course
    `;


    courseModal.hidden =
        false;


    setTimeout(
        () => {

            courseNameInput.focus();

        },
        50
    );
}


/* =========================================================
   OPEN EDIT COURSE MODAL
========================================================= */

function openEditCourseModal(id) {

    const course =
        courses.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!course) {
        return;
    }


    currentCourseId =
        course.id;


    courseIdInput.value =
        course.id;


    courseNameInput.value =
        course.name || "";


    courseFacultyInput.value =
        course.faculty || "";


    populateDepartmentForm(
        course.faculty,
        course.department
    );


    courseSemesterInput.value =
        course.semester || "";


    courseCreditHoursInput.value =
        course.credit_hours || "";


    courseIsActiveInput.checked =
        Boolean(
            course.is_active
        );


    /*
       Show the existing backend-generated
       course code while editing.
    */

    courseCodeDisplay.textContent =
        course.course_code ||
        "Auto-generated";


    generatedCourseCode.textContent =
        course.course_code ||
        "---";


    courseCodePreview.hidden =
        !course.course_code;


    courseModalTitle.textContent =
        "Edit Course";


    saveCourseBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Update Course
    `;


    courseModal.hidden =
        false;


    setTimeout(
        () => {

            courseNameInput.focus();

        },
        50
    );
}


/* =========================================================
   CLOSE COURSE MODAL
========================================================= */

function closeCourseFormModal() {

    courseModal.hidden =
        true;


    courseForm.reset();


    courseIdInput.value =
        "";


    courseCodeDisplay.textContent =
        "Auto-generated";


    generatedCourseCode.textContent =
        "---";


    courseCodePreview.hidden =
        true;


    currentCourseId =
        null;
}


/* =========================================================
   OPEN DELETE MODAL
========================================================= */

function openDeleteCourseModal(id) {

    const course =
        courses.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!course) {
        return;
    }


    currentCourseId =
        course.id;


    deleteCourseName.textContent =
        `${course.course_code || ""} - ${course.name || ""}`;


    deleteCourseModal.hidden =
        false;
}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteCourseModal() {

    deleteCourseModal.hidden =
        true;


    currentCourseId =
        null;
}


/* =========================================================
   SAVE COURSE
========================================================= */

async function saveCourse(event) {

    event.preventDefault();


    const courseName =
        courseNameInput.value.trim();


    const faculty =
        courseFacultyInput.value;


    const department =
        courseDepartmentInput.value;


    const semester =
        courseSemesterInput.value;


    const creditHours =
        Number(
            courseCreditHoursInput.value
        );


    const isActive =
        courseIsActiveInput.checked;


    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

    if (!courseName) {

        alert(
            "Please enter the course name."
        );

        courseNameInput.focus();

        return;
    }


    if (!faculty) {

        alert(
            "Please select a faculty."
        );

        courseFacultyInput.focus();

        return;
    }


    if (!department) {

        alert(
            "Please select a department."
        );

        courseDepartmentInput.focus();

        return;
    }


    if (!semester) {

        alert(
            "Please select a semester."
        );

        courseSemesterInput.focus();

        return;
    }


    if (
        !Number.isInteger(
            creditHours
        ) ||
        creditHours < 1
    ) {

        alert(
            "Credit Hours must be a positive whole number."
        );

        courseCreditHoursInput.focus();

        return;
    }


    /* -----------------------------------------------------
       VALIDATE DEPARTMENT / FACULTY RELATION
    ----------------------------------------------------- */

    const selectedDepartment =
        departments.find(
            item =>
                Number(item.id) ===
                Number(department)
        );


    if (
        selectedDepartment &&
        Number(
            selectedDepartment.faculty
        ) !==
        Number(faculty)
    ) {

        alert(
            "The selected department does not belong to the selected faculty."
        );

        return;
    }


    /* -----------------------------------------------------
       URL / METHOD
    ----------------------------------------------------- */

    const isEditing =
        Boolean(
            currentCourseId
        );


    const url =
        isEditing
            ? `${COURSES_API_URL}${currentCourseId}/`
            : COURSES_API_URL;


    const method =
        isEditing
            ? "PATCH"
            : "POST";


    const originalButtonText =
        saveCourseBtn.innerHTML;


    saveCourseBtn.disabled =
        true;


    saveCourseBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
    `;


    try {

        /*
           IMPORTANT:
           course_code is NOT sent.

           Django generates it automatically
           from the selected semester.
        */

        const payload = {

            name:
                courseName,

            faculty:
                Number(faculty),

            department:
                Number(department),

            semester:
                Number(semester),

            credit_hours:
                creditHours,

            is_active:
                isActive
        };


        const response =
            await fetch(
                url,
                {
                    method,

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "X-CSRFToken":
                            csrfToken || ""
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data
                )
            );
        }


        closeCourseFormModal();


        await loadCoursesPageData();


    } catch (error) {

        console.error(
            "Error saving course:",
            error
        );


        alert(
            error.message ||
            "Failed to save course."
        );


    } finally {

        saveCourseBtn.disabled =
            false;


        saveCourseBtn.innerHTML =
            originalButtonText;
    }
}


/* =========================================================
   DELETE COURSE
========================================================= */

async function deleteCourse() {

    if (!currentCourseId) {
        return;
    }


    const id =
        currentCourseId;


    const originalButtonText =
        confirmDeleteCourse.innerHTML;


    confirmDeleteCourse.disabled =
        true;


    confirmDeleteCourse.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Deleting...
    `;


    try {

        const response =
            await fetch(
                `${COURSES_API_URL}${id}/`,
                {
                    method: "DELETE",

                    credentials:
                        "same-origin",

                    headers: {

                        "Accept":
                            "application/json",

                        "X-CSRFToken":
                            csrfToken || ""
                    }
                }
            );


        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                getApiErrorMessage(
                    data
                )
            );
        }


        closeDeleteCourseModal();


        await loadCoursesPageData();


    } catch (error) {

        console.error(
            "Error deleting course:",
            error
        );


        alert(
            error.message ||
            "Failed to delete course."
        );


    } finally {

        confirmDeleteCourse.disabled =
            false;


        confirmDeleteCourse.innerHTML =
            originalButtonText;
    }
}


/* =========================================================
   API ERROR MESSAGE
========================================================= */

function getApiErrorMessage(data) {

    if (!data) {
        return "An unexpected error occurred.";
    }


    if (
        typeof data.detail ===
        "string"
    ) {

        return data.detail;
    }


    if (
        typeof data ===
        "string"
    ) {

        return data;
    }


    if (
        typeof data ===
        "object"
    ) {

        const messages = [];


        Object.entries(data).forEach(
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
            messages.length > 0
        ) {

            return messages.join(
                "\n"
            );
        }
    }


    return "An unexpected error occurred.";
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

coursesTableBody.addEventListener(
    "click",
    event => {

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
            button.dataset.id;


        if (
            action === "edit"
        ) {

            openEditCourseModal(id);

        } else if (
            action === "delete"
        ) {

            openDeleteCourseModal(id);
        }
    }
);


/* =========================================================
   ADD COURSE BUTTON
========================================================= */

addCourseBtn.addEventListener(
    "click",
    openAddCourseModal
);


/* =========================================================
   FORM SUBMIT
========================================================= */

courseForm.addEventListener(
    "submit",
    saveCourse
);


/* =========================================================
   FACULTY CHANGE IN FORM
========================================================= */

courseFacultyInput.addEventListener(
    "change",
    () => {

        populateDepartmentForm(
            courseFacultyInput.value
        );


        updateCourseCodePreview();
    }
);


/* =========================================================
   SEMESTER CHANGE IN FORM
========================================================= */

courseSemesterInput.addEventListener(
    "change",
    () => {

        updateCourseCodePreview();
    }
);


/* =========================================================
   FACULTY FILTER CHANGE
========================================================= */

courseFacultyFilter.addEventListener(
    "change",
    () => {

        populateDepartmentFilter(
            courseFacultyFilter.value
        );


        renderCourses();
    }
);


/* =========================================================
   DEPARTMENT FILTER CHANGE
========================================================= */

courseDepartmentFilter.addEventListener(
    "change",
    renderCourses
);


/* =========================================================
   SEMESTER FILTER CHANGE
========================================================= */

courseSemesterFilter.addEventListener(
    "change",
    renderCourses
);


/* =========================================================
   SEARCH
========================================================= */

courseSearch.addEventListener(
    "input",
    renderCourses
);


/* =========================================================
   CLOSE COURSE MODAL
========================================================= */

closeCourseModal.addEventListener(
    "click",
    closeCourseFormModal
);


cancelCourseBtn.addEventListener(
    "click",
    closeCourseFormModal
);


/* =========================================================
   COURSE MODAL BACKDROP
========================================================= */

courseModal
    .querySelector(
        ".course-modal-overlay"
    )
    .addEventListener(
        "click",
        closeCourseFormModal
    );


/* =========================================================
   DELETE MODAL
========================================================= */

cancelDeleteCourse.addEventListener(
    "click",
    closeDeleteCourseModal
);


confirmDeleteCourse.addEventListener(
    "click",
    deleteCourse
);


/* =========================================================
   DELETE MODAL BACKDROP
========================================================= */

deleteCourseModal
    .querySelector(
        ".course-modal-overlay"
    )
    .addEventListener(
        "click",
        closeDeleteCourseModal
    );


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        if (
            !courseModal.hidden
        ) {

            closeCourseFormModal();

        } else if (
            !deleteCourseModal.hidden
        ) {

            closeDeleteCourseModal();
        }
    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCoursesPageData();

    }
);