/* =========================================================
   COURSES MANAGEMENT
   ATU EXAMINATION MANAGEMENT SYSTEM

   Course ID examples:
   Introduction to Programming -> ITP-001
   Database Management Systems -> DMS-001
   Web Development -> WD-001
   Software Engineering -> SE-001
========================================================= */

"use strict";


/* =========================================================
   API URLS
========================================================= */

const COURSES_API_URL = "/api/courses/";
const FACULTIES_API_URL = "/api/faculties/";
const DEPARTMENTS_API_URL = "/api/departments/";
const SEMESTERS_API_URL = "/api/semesters/";


/* =========================================================
   APPLICATION STATE
========================================================= */

let courses = [];
let faculties = [];
let departments = [];
let semesters = [];

let currentCourseId = null;


/* =========================================================
   DOM REFERENCES
========================================================= */

let courseSearch;
let coursesTableBody;
let coursesEmptyState;

let addCourseBtn;

let courseModal;
let courseModalTitle;
let closeCourseModal;
let cancelCourseBtn;
let courseForm;

let courseIdInput;
let courseIdDisplay;
let courseNameInput;
let courseFacultyInput;
let courseDepartmentInput;
let courseSemesterInput;
let courseCreditHoursInput;
let courseIsActiveInput;
let saveCourseBtn;

let courseFacultyFilter;
let courseDepartmentFilter;
let courseSemesterFilter;

let deleteCourseModal;
let deleteCourseName;
let cancelDeleteCourse;
let confirmDeleteCourse;


/* =========================================================
   DOM INITIALIZATION
========================================================= */

function initializeDomReferences() {

    courseSearch =
        document.getElementById(
            "courseSearch"
        );

    coursesTableBody =
        document.getElementById(
            "coursesTableBody"
        );

    coursesEmptyState =
        document.getElementById(
            "coursesEmptyState"
        );

    addCourseBtn =
        document.getElementById(
            "addCourseBtn"
        );

    courseModal =
        document.getElementById(
            "courseModal"
        );

    courseModalTitle =
        document.getElementById(
            "courseModalTitle"
        );

    closeCourseModal =
        document.getElementById(
            "closeCourseModal"
        );

    cancelCourseBtn =
        document.getElementById(
            "cancelCourseBtn"
        );

    courseForm =
        document.getElementById(
            "courseForm"
        );

    courseIdInput =
        document.getElementById(
            "courseId"
        );

    courseIdDisplay =
        document.getElementById(
            "courseIdDisplay"
        );

    courseNameInput =
        document.getElementById(
            "courseName"
        );

    courseFacultyInput =
        document.getElementById(
            "courseFaculty"
        );

    courseDepartmentInput =
        document.getElementById(
            "courseDepartment"
        );

    courseSemesterInput =
        document.getElementById(
            "courseSemester"
        );

    courseCreditHoursInput =
        document.getElementById(
            "courseCreditHours"
        );

    courseIsActiveInput =
        document.getElementById(
            "courseIsActive"
        );

    saveCourseBtn =
        document.getElementById(
            "saveCourseBtn"
        );

    courseFacultyFilter =
        document.getElementById(
            "courseFacultyFilter"
        );

    courseDepartmentFilter =
        document.getElementById(
            "courseDepartmentFilter"
        );

    courseSemesterFilter =
        document.getElementById(
            "courseSemesterFilter"
        );

    deleteCourseModal =
        document.getElementById(
            "deleteCourseModal"
        );

    deleteCourseName =
        document.getElementById(
            "deleteCourseName"
        );

    cancelDeleteCourse =
        document.getElementById(
            "cancelDeleteCourse"
        );

    confirmDeleteCourse =
        document.getElementById(
            "confirmDeleteCourse"
        );
}


/* =========================================================
   CSRF
========================================================= */

function getCookie(name) {

    const cookies =
        document.cookie.split(";");

    for (
        let cookie of cookies
    ) {

        cookie =
            cookie.trim();

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


function getCsrfToken() {

    return (
        getCookie("csrftoken") ||
        ""
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

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


/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(value) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        );
}


/* =========================================================
   COURSE ID PREFIX
========================================================= */

function generateCoursePrefix(
    courseName
) {

    const name =
        normalizeText(
            courseName
        );

    if (!name) {
        return "";
    }

    const words =
        name
            .replace(
                /[^A-Za-z0-9\s]/g,
                " "
            )
            .split(/\s+/)
            .filter(Boolean);

    if (
        words.length === 0
    ) {
        return "";
    }

    /*
       First letter of every word.

       Introduction to Programming
       -> ITP

       Database Management Systems
       -> DMS

       Web Development
       -> WD

       Software Engineering
       -> SE
    */

    const prefix =
        words
            .map(
                word =>
                    word
                        .charAt(0)
                        .toUpperCase()
            )
            .join("");

    return prefix.substring(
        0,
        10
    );
}


/* =========================================================
   GET NEXT COURSE NUMBER
========================================================= */

function getNextCourseNumber(
    prefix,
    ignoreCourseId = null
) {

    if (!prefix) {
        return 1;
    }

    const usedNumbers =
        new Set();

    courses.forEach(
        course => {

            if (
                ignoreCourseId !== null &&
                Number(course.id) ===
                    Number(
                        ignoreCourseId
                    )
            ) {

                return;
            }

            const existingId =
                String(
                    course.course_id ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (!existingId) {
                return;
            }

            const escapedPrefix =
                prefix.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            const pattern =
                new RegExp(
                    `^${escapedPrefix}-(\\d+)$`
                );

            const match =
                existingId.match(
                    pattern
                );

            if (!match) {
                return;
            }

            const number =
                Number(
                    match[1]
                );

            if (
                Number.isInteger(
                    number
                ) &&
                number > 0
            ) {

                usedNumbers.add(
                    number
                );
            }
        }
    );

    let nextNumber = 1;

    while (
        usedNumbers.has(
            nextNumber
        )
    ) {

        nextNumber++;
    }

    return nextNumber;
}


/* =========================================================
   BUILD COURSE ID
========================================================= */

function buildCourseId(
    courseName,
    ignoreCourseId = null
) {

    const prefix =
        generateCoursePrefix(
            courseName
        );

    if (!prefix) {
        return "";
    }

    const number =
        getNextCourseNumber(
            prefix,
            ignoreCourseId
        );

    return (
        `${prefix}-` +
        String(
            number
        ).padStart(
            3,
            "0"
        )
    );
}


/* =========================================================
   UPDATE COURSE ID PREVIEW
========================================================= */

function updateCourseIdPreview() {

    if (!courseIdDisplay) {
        return;
    }

    const courseName =
        normalizeText(
            courseNameInput
                ? courseNameInput.value
                : ""
        );

    if (!courseName) {

        courseIdDisplay.value =
            "Auto-generated";

        return;
    }

    const generatedId =
        buildCourseId(
            courseName,
            currentCourseId
        );

    courseIdDisplay.value =
        generatedId ||
        "Auto-generated";
}


/* =========================================================
   FETCH PAGINATED API
========================================================= */

async function fetchAllPages(
    url
) {

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

        /*
           Non-paginated response.
        */

        if (
            Array.isArray(data)
        ) {

            results.push(
                ...data
            );

            nextUrl = null;

            continue;
        }

        /*
           DRF paginated response.
        */

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
            data.next ||
            null;
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
            Array.isArray(
                coursesData
            )
                ? coursesData
                : [];

        faculties =
            Array.isArray(
                facultiesData
            )
                ? facultiesData
                : [];

        departments =
            Array.isArray(
                departmentsData
            )
                ? departmentsData
                : [];

        semesters =
            Array.isArray(
                semestersData
            )
                ? semestersData
                : [];

        populateFacultySelects();

        populateSemesterSelects();

        populateDepartmentFilter();

        populateDepartmentForm();

        renderCourses();

        updateCourseIdPreview();

    } catch (error) {

        console.error(
            "Courses page loading error:",
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

    if (coursesEmptyState) {

        coursesEmptyState.classList.add(
            "hidden"
        );
    }

    if (!coursesTableBody) {
        return;
    }

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

function showErrorState(
    message
) {

    if (coursesEmptyState) {

        coursesEmptyState.classList.add(
            "hidden"
        );
    }

    if (!coursesTableBody) {
        return;
    }

    coursesTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="course-error"
            >
                <i class="fa-solid fa-circle-exclamation"></i>
                ${escapeHtml(
                    message
                )}
            </td>
        </tr>
    `;
}


/* =========================================================
   FACULTY SELECTS
========================================================= */

function populateFacultySelects() {

    if (courseFacultyInput) {

        courseFacultyInput.innerHTML = `
            <option value="">
                Select Faculty
            </option>
        `;
    }

    if (courseFacultyFilter) {

        courseFacultyFilter.innerHTML = `
            <option value="">
                All Faculties
            </option>
        `;
    }

    faculties.forEach(
        faculty => {

            if (courseFacultyInput) {

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
            }

            if (courseFacultyFilter) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    faculty.id;

                option.textContent =
                    `${faculty.code} - ${faculty.name}`;

                courseFacultyFilter.appendChild(
                    option
                );
            }
        }
    );
}


/* =========================================================
   SEMESTER SELECTS
========================================================= */

function populateSemesterSelects() {

    if (courseSemesterInput) {

        courseSemesterInput.innerHTML = `
            <option value="">
                Select Semester
            </option>
        `;
    }

    if (courseSemesterFilter) {

        courseSemesterFilter.innerHTML = `
            <option value="">
                All Semesters
            </option>
        `;
    }

    semesters.forEach(
        semester => {

            if (courseSemesterInput) {

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
            }

            if (courseSemesterFilter) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    semester.id;

                option.textContent =
                    semester.name;

                courseSemesterFilter.appendChild(
                    option
                );
            }
        }
    );
}


/* =========================================================
   DEPARTMENT FORM
========================================================= */

function populateDepartmentForm(
    facultyId = "",
    selectedDepartmentId = ""
) {

    if (!courseDepartmentInput) {
        return;
    }

    courseDepartmentInput.innerHTML = `
        <option value="">
            Select Department
        </option>
    `;

    if (!facultyId) {
        return;
    }

    const filteredDepartments =
        departments.filter(
            department =>
                Number(
                    department.faculty
                ) ===
                Number(
                    facultyId
                )
        );

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
   DEPARTMENT FILTER
========================================================= */

function populateDepartmentFilter(
    facultyId = "",
    selectedDepartmentId = ""
) {

    if (!courseDepartmentFilter) {
        return;
    }

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
                    Number(
                        facultyId
                    )
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
   COURSE ID
========================================================= */

function getCourseDisplayId(
    course
) {

    if (
        course &&
        course.course_id
    ) {

        return String(
            course.course_id
        ).trim();
    }

    return "-";
}


/* =========================================================
   RENDER COURSES
========================================================= */

function renderCourses() {

    if (!coursesTableBody) {
        return;
    }

    const searchValue =
        courseSearch
            ? courseSearch.value
                .trim()
                .toLowerCase()
            : "";

    const selectedFaculty =
        courseFacultyFilter
            ? courseFacultyFilter.value
            : "";

    const selectedDepartment =
        courseDepartmentFilter
            ? courseDepartmentFilter.value
            : "";

    const selectedSemester =
        courseSemesterFilter
            ? courseSemesterFilter.value
            : "";

    const filteredCourses =
        courses.filter(
            course => {

                const courseId =
                    getCourseDisplayId(
                        course
                    );

                const searchText = [

                    courseId,

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

        if (coursesEmptyState) {

            coursesEmptyState.classList.remove(
                "hidden"
            );
        }

        return;
    }

    if (coursesEmptyState) {

        coursesEmptyState.classList.add(
            "hidden"
        );
    }

    filteredCourses.forEach(
        course => {

            const row =
                document.createElement(
                    "tr"
                );

            const courseId =
                getCourseDisplayId(
                    course
                );

            row.innerHTML = `

                <td>
                    <span class="course-code">
                        ${escapeHtml(
                            courseId
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
                            course.credit_hours ??
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
                            data-id="${escapeHtml(
                                course.id
                            )}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="course-action-btn delete"
                            data-action="delete"
                            data-id="${escapeHtml(
                                course.id
                            )}"
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

    if (courseForm) {

        courseForm.reset();
    }

    if (courseIdInput) {

        courseIdInput.value =
            "";
    }

    if (courseModalTitle) {

        courseModalTitle.textContent =
            "Add Course";
    }

    if (courseIsActiveInput) {

        courseIsActiveInput.checked =
            true;
    }

    if (courseIdDisplay) {

        courseIdDisplay.value =
            "Auto-generated";
    }

    populateDepartmentForm();

    if (saveCourseBtn) {

        saveCourseBtn.disabled =
            false;

        saveCourseBtn.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            Save Course
        `;
    }

    /*
       IMPORTANT FIX

       Tailwind's "hidden" class uses:
       display: none;

       Therefore changing only:
       courseModal.hidden = false

       is NOT enough.

       We remove the hidden class AND set
       display:flex.
    */

    if (courseModal) {

        courseModal.classList.remove(
            "hidden"
        );

        courseModal.hidden =
            false;

        courseModal.setAttribute(
            "aria-hidden",
            "false"
        );

        courseModal.style.display =
            "flex";

        document.body.classList.add(
            "overflow-hidden"
        );
    }

    updateCourseIdPreview();

    setTimeout(
        () => {

            if (courseNameInput) {

                courseNameInput.focus();
            }

        },
        50
    );
}


/* =========================================================
   OPEN EDIT COURSE MODAL
========================================================= */

function openEditCourseModal(
    id
) {

    const course =
        courses.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    id
                )
        );

    if (!course) {

        alert(
            "Course not found."
        );

        return;
    }

    currentCourseId =
        course.id;

    if (courseIdInput) {

        courseIdInput.value =
            course.id;
    }

    if (courseIdDisplay) {

        courseIdDisplay.value =
            getCourseDisplayId(
                course
            );
    }

    if (courseNameInput) {

        courseNameInput.value =
            course.name ||
            "";
    }

    if (courseFacultyInput) {

        courseFacultyInput.value =
            course.faculty ||
            "";
    }

    populateDepartmentForm(
        course.faculty,
        course.department
    );

    if (courseSemesterInput) {

        courseSemesterInput.value =
            course.semester ||
            "";
    }

    if (courseCreditHoursInput) {

        courseCreditHoursInput.value =
            course.credit_hours ??
            "";
    }

    if (courseIsActiveInput) {

        courseIsActiveInput.checked =
            Boolean(
                course.is_active
            );
    }

    if (courseModalTitle) {

        courseModalTitle.textContent =
            "Edit Course";
    }

    if (saveCourseBtn) {

        saveCourseBtn.disabled =
            false;

        saveCourseBtn.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            Update Course
        `;
    }

    if (courseModal) {

        courseModal.classList.remove(
            "hidden"
        );

        courseModal.hidden =
            false;

        courseModal.setAttribute(
            "aria-hidden",
            "false"
        );

        courseModal.style.display =
            "flex";

        document.body.classList.add(
            "overflow-hidden"
        );
    }

    setTimeout(
        () => {

            if (courseNameInput) {

                courseNameInput.focus();
            }

        },
        50
    );
}


/* =========================================================
   CLOSE COURSE MODAL
========================================================= */

function closeCourseFormModal() {

    if (courseModal) {

        courseModal.classList.add(
            "hidden"
        );

        courseModal.hidden =
            true;

        courseModal.setAttribute(
            "aria-hidden",
            "true"
        );

        courseModal.style.display =
            "none";
    }

    document.body.classList.remove(
        "overflow-hidden"
    );

    if (courseForm) {

        courseForm.reset();
    }

    if (courseIdInput) {

        courseIdInput.value =
            "";
    }

    if (courseIdDisplay) {

        courseIdDisplay.value =
            "Auto-generated";
    }

    currentCourseId =
        null;
}


/* =========================================================
   OPEN DELETE MODAL
========================================================= */

function openDeleteCourseModal(
    id
) {

    const course =
        courses.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    id
                )
        );

    if (!course) {

        alert(
            "Course not found."
        );

        return;
    }

    currentCourseId =
        course.id;

    if (deleteCourseName) {

        deleteCourseName.textContent =
            `${getCourseDisplayId(
                course
            )} - ${course.name || ""}`;
    }

    if (deleteCourseModal) {

        deleteCourseModal.classList.remove(
            "hidden"
        );

        deleteCourseModal.hidden =
            false;

        deleteCourseModal.setAttribute(
            "aria-hidden",
            "false"
        );

        deleteCourseModal.style.display =
            "flex";

        document.body.classList.add(
            "overflow-hidden"
        );
    }
}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteCourseModal() {

    if (deleteCourseModal) {

        deleteCourseModal.classList.add(
            "hidden"
        );

        deleteCourseModal.hidden =
            true;

        deleteCourseModal.setAttribute(
            "aria-hidden",
            "true"
        );

        deleteCourseModal.style.display =
            "none";
    }

    document.body.classList.remove(
        "overflow-hidden"
    );

    currentCourseId =
        null;
}


/* =========================================================
   VALIDATE FORM
========================================================= */

function validateCourseForm() {

    const courseName =
        courseNameInput
            ? normalizeText(
                courseNameInput.value
            )
            : "";

    const faculty =
        courseFacultyInput
            ? courseFacultyInput.value
            : "";

    const department =
        courseDepartmentInput
            ? courseDepartmentInput.value
            : "";

    const semester =
        courseSemesterInput
            ? courseSemesterInput.value
            : "";

    const creditHours =
        courseCreditHoursInput
            ? Number(
                courseCreditHoursInput.value
            )
            : 0;

    if (!courseName) {

        alert(
            "Please enter the course name."
        );

        if (courseNameInput) {

            courseNameInput.focus();
        }

        return null;
    }

    if (!faculty) {

        alert(
            "Please select a faculty."
        );

        if (courseFacultyInput) {

            courseFacultyInput.focus();
        }

        return null;
    }

    if (!department) {

        alert(
            "Please select a department."
        );

        if (courseDepartmentInput) {

            courseDepartmentInput.focus();
        }

        return null;
    }

    if (!semester) {

        alert(
            "Please select a semester."
        );

        if (courseSemesterInput) {

            courseSemesterInput.focus();
        }

        return null;
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

        if (courseCreditHoursInput) {

            courseCreditHoursInput.focus();
        }

        return null;
    }

    const selectedDepartment =
        departments.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    department
                )
        );

    if (
        selectedDepartment &&
        Number(
            selectedDepartment.faculty
        ) !==
        Number(
            faculty
        )
    ) {

        alert(
            "The selected department does not belong to the selected faculty."
        );

        return null;
    }

    return {
        courseName,
        faculty,
        department,
        semester,
        creditHours
    };
}


/* =========================================================
   SAVE COURSE
========================================================= */

async function saveCourse(
    event
) {

    event.preventDefault();

    const formData =
        validateCourseForm();

    if (!formData) {
        return;
    }

    const {
        courseName,
        faculty,
        department,
        semester,
        creditHours
    } = formData;

    const isActive =
        courseIsActiveInput
            ? courseIsActiveInput.checked
            : true;

    const isEditing =
        currentCourseId !== null;

    const url =
        isEditing
            ? `${COURSES_API_URL}${currentCourseId}/`
            : COURSES_API_URL;

    const method =
        isEditing
            ? "PATCH"
            : "POST";

    /*
       IMPORTANT:

       Do NOT send course_id here.

       Django's Course.save() generates:

       ITP-001
       DMS-001
       WD-001
       SE-001

       The frontend only previews the ID.
    */

    const payload = {

        name:
            courseName,

        faculty:
            Number(
                faculty
            ),

        department:
            Number(
                department
            ),

        semester:
            Number(
                semester
            ),

        credit_hours:
            creditHours,

        is_active:
            isActive
    };

    const originalButtonText =
        saveCourseBtn
            ? saveCourseBtn.innerHTML
            : "";

    if (saveCourseBtn) {

        saveCourseBtn.disabled =
            true;

        saveCourseBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;
    }

    try {

        const response =
            await fetch(
                url,
                {
                    method:
                        method,

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken()
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

        if (saveCourseBtn) {

            saveCourseBtn.disabled =
                false;

            saveCourseBtn.innerHTML =
                originalButtonText;
        }
    }
}


/* =========================================================
   DELETE COURSE
========================================================= */

async function deleteCourse() {

    if (
        currentCourseId === null
    ) {

        return;
    }

    const id =
        currentCourseId;

    const originalButtonText =
        confirmDeleteCourse
            ? confirmDeleteCourse.innerHTML
            : "";

    if (confirmDeleteCourse) {

        confirmDeleteCourse.disabled =
            true;

        confirmDeleteCourse.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Deleting...
        `;
    }

    try {

        const response =
            await fetch(
                `${COURSES_API_URL}${id}/`,
                {
                    method:
                        "DELETE",

                    credentials:
                        "same-origin",

                    headers: {

                        "Accept":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken()
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

        if (confirmDeleteCourse) {

            confirmDeleteCourse.disabled =
                false;

            confirmDeleteCourse.innerHTML =
                originalButtonText;
        }
    }
}


/* =========================================================
   API ERROR MESSAGE
========================================================= */

function getApiErrorMessage(
    data
) {

    if (!data) {

        return (
            "An unexpected error occurred."
        );
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

        Object.entries(
            data
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

                } else if (
                    typeof value ===
                        "object" &&
                    value !== null
                ) {

                    messages.push(
                        `${field}: ${JSON.stringify(
                            value
                        )}`
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

    return (
        "An unexpected error occurred."
    );
}


/* =========================================================
   TABLE ACTION HANDLER
========================================================= */

function handleCourseTableAction(
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
        button.dataset.id;

    if (!id) {
        return;
    }

    if (
        action ===
        "edit"
    ) {

        openEditCourseModal(
            id
        );

        return;
    }

    if (
        action ===
        "delete"
    ) {

        openDeleteCourseModal(
            id
        );
    }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function initializeCoursePage() {

    initializeDomReferences();


    /* =====================================================
       ADD COURSE BUTTON

       Event delegation is used intentionally.

       This means Add Course still works even if the
       button is rendered/replaced after JavaScript loads.
    ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "#addCourseBtn"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            openAddCourseModal();
        }
    );


    /* =====================================================
       COURSE TABLE ACTIONS
    ===================================================== */

    if (coursesTableBody) {

        coursesTableBody.addEventListener(
            "click",
            handleCourseTableAction
        );
    }


    /* =====================================================
       FORM SUBMIT
    ===================================================== */

    if (courseForm) {

        courseForm.addEventListener(
            "submit",
            saveCourse
        );
    }


    /* =====================================================
       COURSE NAME
    ===================================================== */

    if (courseNameInput) {

        courseNameInput.addEventListener(
            "input",
            updateCourseIdPreview
        );
    }


    /* =====================================================
       FACULTY FORM CHANGE
    ===================================================== */

    if (courseFacultyInput) {

        courseFacultyInput.addEventListener(
            "change",
            () => {

                populateDepartmentForm(
                    courseFacultyInput.value
                );

            }
        );
    }


    /* =====================================================
       FACULTY FILTER CHANGE
    ===================================================== */

    if (courseFacultyFilter) {

        courseFacultyFilter.addEventListener(
            "change",
            () => {

                populateDepartmentFilter(
                    courseFacultyFilter.value
                );

                renderCourses();
            }
        );
    }


    /* =====================================================
       DEPARTMENT FILTER
    ===================================================== */

    if (courseDepartmentFilter) {

        courseDepartmentFilter.addEventListener(
            "change",
            renderCourses
        );
    }


    /* =====================================================
       SEMESTER FILTER
    ===================================================== */

    if (courseSemesterFilter) {

        courseSemesterFilter.addEventListener(
            "change",
            renderCourses
        );
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    if (courseSearch) {

        courseSearch.addEventListener(
            "input",
            renderCourses
        );
    }


    /* =====================================================
       CLOSE COURSE MODAL
    ===================================================== */

    if (closeCourseModal) {

        closeCourseModal.addEventListener(
            "click",
            closeCourseFormModal
        );
    }


    /* =====================================================
       CANCEL COURSE
    ===================================================== */

    if (cancelCourseBtn) {

        cancelCourseBtn.addEventListener(
            "click",
            closeCourseFormModal
        );
    }


    /* =====================================================
       COURSE MODAL BACKDROP
    ===================================================== */

    if (courseModal) {

        courseModal.addEventListener(
            "click",
            event => {

                /*
                   Close only when clicking directly
                   on the modal background.

                   Do not close when clicking inside
                   the actual form.
                */

                if (
                    event.target ===
                    courseModal
                ) {

                    closeCourseFormModal();
                }
            }
        );
    }


    /* =====================================================
       CANCEL DELETE
    ===================================================== */

    if (cancelDeleteCourse) {

        cancelDeleteCourse.addEventListener(
            "click",
            closeDeleteCourseModal
        );
    }


    /* =====================================================
       CONFIRM DELETE
    ===================================================== */

    if (confirmDeleteCourse) {

        confirmDeleteCourse.addEventListener(
            "click",
            deleteCourse
        );
    }


    /* =====================================================
       DELETE MODAL BACKDROP
    ===================================================== */

    if (deleteCourseModal) {

        deleteCourseModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    deleteCourseModal
                ) {

                    closeDeleteCourseModal();
                }
            }
        );
    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

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
                courseModal &&
                !courseModal.classList.contains(
                    "hidden"
                )
            ) {

                closeCourseFormModal();

                return;
            }

            if (
                deleteCourseModal &&
                !deleteCourseModal.classList.contains(
                    "hidden"
                )
            ) {

                closeDeleteCourseModal();
            }
        }
    );


    /* =====================================================
       LOAD DATA
    ===================================================== */

    loadCoursesPageData();
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCoursePage,
        {
            once: true
        }
    );

} else {

    initializeCoursePage();
}