"use strict";


/* =========================================================
   API URLS
========================================================= */

const DEPARTMENTS_API_URL = "/api/departments/";
const FACULTIES_API_URL = "/api/faculties/";


/* =========================================================
   STATE
========================================================= */

let departments = [];
let faculties = [];

let editingDepartmentId = null;
let deletingDepartmentId = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const departmentSearch =
    document.getElementById("departmentSearch");

const departmentFacultyFilter =
    document.getElementById("departmentFacultyFilter");

const departmentsTableBody =
    document.getElementById("departmentsTableBody");

const departmentsEmptyState =
    document.getElementById("departmentsEmptyState");

const addDepartmentBtn =
    document.getElementById("addDepartmentBtn");

const departmentModal =
    document.getElementById("departmentModal");

const departmentModalTitle =
    document.getElementById("departmentModalTitle");

const departmentForm =
    document.getElementById("departmentForm");

const departmentId =
    document.getElementById("departmentId");

const departmentFaculty =
    document.getElementById("departmentFaculty");

const departmentName =
    document.getElementById("departmentName");

const departmentCode =
    document.getElementById("departmentCode");

const departmentDescription =
    document.getElementById("departmentDescription");

const departmentIsActive =
    document.getElementById("departmentIsActive");

const closeDepartmentModal =
    document.getElementById("closeDepartmentModal");

const cancelDepartmentBtn =
    document.getElementById("cancelDepartmentBtn");

const deleteDepartmentModal =
    document.getElementById("deleteDepartmentModal");

const deleteDepartmentName =
    document.getElementById("deleteDepartmentName");

const cancelDeleteDepartment =
    document.getElementById("cancelDeleteDepartment");

const confirmDeleteDepartment =
    document.getElementById("confirmDeleteDepartment");


/* =========================================================
   CSRF
========================================================= */

function getCookie(name) {

    const cookies = document.cookie
        ? document.cookie.split(";")
        : [];

    for (let cookie of cookies) {

        cookie = cookie.trim();

        if (cookie.startsWith(name + "=")) {

            return decodeURIComponent(
                cookie.substring(name.length + 1)
            );
        }
    }

    return null;
}


function getCsrfToken() {

    return (
        getCookie("csrftoken") ||
        getCookie("csrfToken") ||
        ""
    );
}


/* =========================================================
   API ERROR
========================================================= */

async function getApiError(response) {

    try {

        const data = await response.json();

        if (typeof data === "string") {
            return data;
        }

        if (data.detail) {
            return data.detail;
        }

        const messages = [];

        Object.entries(data).forEach(
            ([field, errors]) => {

                if (Array.isArray(errors)) {

                    messages.push(
                        `${field}: ${errors.join(", ")}`
                    );

                } else {

                    messages.push(
                        `${field}: ${errors}`
                    );
                }
            }
        );

        return (
            messages.join("\n") ||
            `Request failed (${response.status}).`
        );

    } catch {

        return `Request failed (${response.status}).`;
    }
}


/* =========================================================
   FETCH ALL PAGINATED API DATA
========================================================= */

async function fetchAllPages(url) {

    let allItems = [];
    let nextUrl = url;

    while (nextUrl) {

        const response = await fetch(
            nextUrl,
            {
                method: "GET",

                credentials: "same-origin",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );
        }


        const data =
            await response.json();


        /*
         * DRF paginated response:
         *
         * {
         *   count: 25,
         *   next: "...",
         *   previous: null,
         *   results: [...]
         * }
         */

        if (Array.isArray(data)) {

            allItems =
                allItems.concat(data);

            nextUrl = null;

        } else {

            const results =
                Array.isArray(data.results)
                    ? data.results
                    : [];

            allItems =
                allItems.concat(results);

            nextUrl =
                data.next || null;
        }
    }


    return allItems;
}


/* =========================================================
   LOAD FACULTIES
========================================================= */

async function loadFaculties() {

    try {

        faculties =
            await fetchAllPages(
                FACULTIES_API_URL
            );


        console.log(
            "Faculties loaded:",
            faculties
        );


        populateFacultySelects();

    } catch (error) {

        console.error(
            "Unable to load faculties:",
            error
        );


        faculties = [];

        populateFacultySelects();


        alert(
            "Unable to load faculties.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   POPULATE FACULTY SELECTS
========================================================= */

function populateFacultySelects() {

    if (departmentFaculty) {

        const currentValue =
            departmentFaculty.value;


        departmentFaculty.innerHTML =
            `
                <option value="">
                    Select Faculty
                </option>
            `;


        faculties.forEach(
            (faculty) => {

                const option =
                    document.createElement("option");


                option.value =
                    faculty.id;


                option.textContent =
                    `${faculty.code} - ${faculty.name}`;


                departmentFaculty.appendChild(
                    option
                );
            }
        );


        if (currentValue) {

            departmentFaculty.value =
                currentValue;
        }
    }


    if (departmentFacultyFilter) {

        const currentValue =
            departmentFacultyFilter.value;


        departmentFacultyFilter.innerHTML =
            `
                <option value="">
                    All Faculties
                </option>
            `;


        faculties.forEach(
            (faculty) => {

                const option =
                    document.createElement("option");


                option.value =
                    faculty.id;


                option.textContent =
                    `${faculty.code} - ${faculty.name}`;


                departmentFacultyFilter.appendChild(
                    option
                );
            }
        );


        if (currentValue) {

            departmentFacultyFilter.value =
                currentValue;
        }
    }
}


/* =========================================================
   LOAD DEPARTMENTS
========================================================= */

async function loadDepartments() {

    try {

        departments =
            await fetchAllPages(
                DEPARTMENTS_API_URL
            );


        console.log(
            "Departments loaded:",
            departments
        );


        renderDepartments();

    } catch (error) {

        console.error(
            "Unable to load departments:",
            error
        );


        departments = [];

        renderDepartments();


        alert(
            "Unable to load departments.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   FILTER DEPARTMENTS
========================================================= */

function getFilteredDepartments() {

    const search =
        (
            departmentSearch?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const facultyId =
        departmentFacultyFilter?.value ||
        "";


    return departments.filter(
        (department) => {

            const matchesSearch =
                !search ||

                String(
                    department.id || ""
                )
                .toLowerCase()
                .includes(search) ||

                String(
                    department.name || ""
                )
                .toLowerCase()
                .includes(search) ||

                String(
                    department.code || ""
                )
                .toLowerCase()
                .includes(search) ||

                String(
                    department.faculty_name || ""
                )
                .toLowerCase()
                .includes(search);


            const matchesFaculty =
                !facultyId ||

                String(
                    department.faculty
                ) === String(facultyId);


            return (
                matchesSearch &&
                matchesFaculty
            );
        }
    );
}


/* =========================================================
   RENDER DEPARTMENTS
========================================================= */

function renderDepartments() {

    if (!departmentsTableBody) {
        return;
    }


    const filtered =
        getFilteredDepartments();


    departmentsTableBody.innerHTML = "";


    if (filtered.length === 0) {

        departmentsEmptyState?.classList.remove(
            "hidden"
        );

        return;
    }


    departmentsEmptyState?.classList.add(
        "hidden"
    );


    filtered.forEach(
        (department) => {

            const row =
                document.createElement("tr");


            const departmentIdentifier =
                `DEP-${String(
                    department.id
                ).padStart(3, "0")}`;


            const statusClass =
                department.is_active
                    ? "active"
                    : "inactive";


            const statusText =
                department.is_active
                    ? "Active"
                    : "Inactive";


            const description =
                department.description
                    ? escapeHtml(
                        department.description
                    )
                    : "";


            row.innerHTML = `

                <td>
                    <span class="department-id">
                        ${departmentIdentifier}
                    </span>
                </td>


                <td>

                    <div class="department-name">
                        ${escapeHtml(
                            department.name || "—"
                        )}
                    </div>

                    ${
                        description
                            ? `
                                <div class="department-description">
                                    ${description}
                                </div>
                              `
                            : ""
                    }

                </td>


                <td>

                    <span class="department-code">
                        ${escapeHtml(
                            department.code || "—"
                        )}
                    </span>

                </td>


                <td>

                    <div class="department-faculty">

                        ${escapeHtml(
                            department.faculty_name ||
                            "—"
                        )}

                        ${
                            department.faculty_code
                                ? `
                                    <span class="department-faculty-code">
                                        (${escapeHtml(
                                            department.faculty_code
                                        )})
                                    </span>
                                  `
                                : ""
                        }

                    </div>

                </td>


                <td>

                    <span class="department-status ${statusClass}">
                        ${statusText}
                    </span>

                </td>


                <td>

                    <div class="department-actions">

                        <button
                            type="button"
                            class="department-action-btn edit"
                            title="Edit Department"
                            data-action="edit"
                            data-id="${department.id}"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="department-action-btn delete"
                            title="Delete Department"
                            data-action="delete"
                            data-id="${department.id}"
                        >
                            Delete
                        </button>

                    </div>

                </td>
            `;


            departmentsTableBody.appendChild(
                row
            );
        }
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   OPEN ADD MODAL
========================================================= */

function openAddDepartmentModal() {

    editingDepartmentId = null;


    departmentModalTitle.textContent =
        "Add Department";


    departmentId.value = "";


    departmentForm.reset();


    departmentIsActive.checked =
        true;


    departmentFaculty.value =
        "";


    departmentModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {
            departmentFaculty.focus();
        },
        50
    );
}


/* =========================================================
   OPEN EDIT MODAL
========================================================= */

function openEditDepartmentModal(id) {

    const department =
        departments.find(
            (item) =>
                String(item.id) ===
                String(id)
        );


    if (!department) {
        return;
    }


    editingDepartmentId =
        department.id;


    departmentModalTitle.textContent =
        "Edit Department";


    departmentId.value =
        department.id;


    departmentFaculty.value =
        department.faculty || "";


    departmentName.value =
        department.name || "";


    departmentCode.value =
        department.code || "";


    departmentDescription.value =
        department.description || "";


    departmentIsActive.checked =
        Boolean(
            department.is_active
        );


    departmentModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {
            departmentName.focus();
        },
        50
    );
}


/* =========================================================
   CLOSE DEPARTMENT MODAL
========================================================= */

function closeDepartmentModalHandler() {

    departmentModal.hidden =
        true;


    document.body.style.overflow =
        "";


    editingDepartmentId =
        null;


    departmentForm.reset();


    departmentIsActive.checked =
        true;
}


/* =========================================================
   SAVE DEPARTMENT
========================================================= */

async function saveDepartment(event) {

    event.preventDefault();


    const faculty =
        departmentFaculty.value;


    const name =
        departmentName.value.trim();


    const code =
        departmentCode.value.trim();


    const description =
        departmentDescription.value.trim();


    const isActive =
        departmentIsActive.checked;


    if (!faculty) {

        alert(
            "Please select a faculty."
        );

        departmentFaculty.focus();

        return;
    }


    if (!name) {

        alert(
            "Please enter the department name."
        );

        departmentName.focus();

        return;
    }


    if (!code) {

        alert(
            "Please enter the department code."
        );

        departmentCode.focus();

        return;
    }


    const payload = {

        faculty:
            Number(faculty),

        name:
            name,

        code:
            code,

        description:
            description,

        is_active:
            isActive
    };


    const isEditing =
        Boolean(
            editingDepartmentId
        );


    const url =
        isEditing
            ? `${DEPARTMENTS_API_URL}${editingDepartmentId}/`
            : DEPARTMENTS_API_URL;


    const method =
        isEditing
            ? "PATCH"
            : "POST";


    const saveButton =
        document.getElementById(
            "saveDepartmentBtn"
        );


    const originalButtonText =
        saveButton.innerHTML;


    saveButton.disabled =
        true;


    saveButton.innerHTML =
        `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;


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


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );
        }


        closeDepartmentModalHandler();


        await loadDepartments();


        /*
         * Refresh faculties so the
         * department count stays current.
         */

        await loadFaculties();

    } catch (error) {

        console.error(
            "Unable to save department:",
            error
        );


        alert(
            "Unable to save department.\n\n" +
            error.message
        );

    } finally {

        saveButton.disabled =
            false;


        saveButton.innerHTML =
            originalButtonText;
    }
}


/* =========================================================
   OPEN DELETE MODAL
========================================================= */

function openDeleteDepartmentModal(id) {

    const department =
        departments.find(
            (item) =>
                String(item.id) ===
                String(id)
        );


    if (!department) {
        return;
    }


    deletingDepartmentId =
        department.id;


    deleteDepartmentName.textContent =
        department.name ||
        "this department";


    deleteDepartmentModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteDepartmentModal() {

    deleteDepartmentModal.hidden =
        true;


    document.body.style.overflow =
        "";


    deletingDepartmentId =
        null;
}


/* =========================================================
   DELETE DEPARTMENT
========================================================= */

async function deleteDepartment() {

    if (!deletingDepartmentId) {
        return;
    }


    const originalButtonText =
        confirmDeleteDepartment.innerHTML;


    confirmDeleteDepartment.disabled =
        true;


    confirmDeleteDepartment.innerHTML =
        `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Deleting...
        `;


    try {

        const response =
            await fetch(
                `${DEPARTMENTS_API_URL}${deletingDepartmentId}/`,
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


        if (
            !response.ok &&
            response.status !== 204
        ) {

            throw new Error(
                await getApiError(response)
            );
        }


        closeDeleteDepartmentModal();


        await loadDepartments();


        await loadFaculties();

    } catch (error) {

        console.error(
            "Unable to delete department:",
            error
        );


        alert(
            "Unable to delete department.\n\n" +
            error.message
        );

    } finally {

        confirmDeleteDepartment.disabled =
            false;


        confirmDeleteDepartment.innerHTML =
            originalButtonText;
    }
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

departmentsTableBody?.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.id;


        const action =
            button.dataset.action;


        if (action === "edit") {

            openEditDepartmentModal(id);

        } else if (action === "delete") {

            openDeleteDepartmentModal(id);
        }
    }
);


/* =========================================================
   SEARCH
========================================================= */

departmentSearch?.addEventListener(
    "input",
    renderDepartments
);


/* =========================================================
   FACULTY FILTER
========================================================= */

departmentFacultyFilter?.addEventListener(
    "change",
    renderDepartments
);


/* =========================================================
   BUTTON EVENTS
========================================================= */

addDepartmentBtn?.addEventListener(
    "click",
    openAddDepartmentModal
);


closeDepartmentModal?.addEventListener(
    "click",
    closeDepartmentModalHandler
);


cancelDepartmentBtn?.addEventListener(
    "click",
    closeDepartmentModalHandler
);


departmentModal
    ?.querySelector(
        ".department-modal-overlay"
    )
    ?.addEventListener(
        "click",
        closeDepartmentModalHandler
    );


cancelDeleteDepartment?.addEventListener(
    "click",
    closeDeleteDepartmentModal
);


deleteDepartmentModal
    ?.querySelector(
        ".department-modal-overlay"
    )
    ?.addEventListener(
        "click",
        closeDeleteDepartmentModal
    );


confirmDeleteDepartment?.addEventListener(
    "click",
    deleteDepartment
);


departmentForm?.addEventListener(
    "submit",
    saveDepartment
);


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key !== "Escape") {
            return;
        }


        if (
            departmentModal &&
            !departmentModal.hidden
        ) {

            closeDepartmentModalHandler();
        }


        if (
            deleteDepartmentModal &&
            !deleteDepartmentModal.hidden
        ) {

            closeDeleteDepartmentModal();
        }
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeDepartmentsPage() {

    console.log(
        "Initializing Departments page..."
    );


    /*
     * Load both independently.
     * If one fails, the other can still load.
     */

    await Promise.allSettled([
        loadFaculties(),
        loadDepartments()
    ]);


    console.log(
        "Departments page initialized."
    );
}


initializeDepartmentsPage();