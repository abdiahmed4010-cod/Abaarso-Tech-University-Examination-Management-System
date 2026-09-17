"use strict";


/* =========================================================
   FACULTIES API
   ========================================================= */

const FACULTIES_API_URL = "/api/faculties/";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const facultyModal = document.getElementById("facultyModal");
const deleteFacultyModal = document.getElementById("deleteFacultyModal");

const facultyForm = document.getElementById("facultyForm");

const facultyDatabaseId = document.getElementById("facultyDatabaseId");
const facultyId = document.getElementById("facultyId");
const facultyName = document.getElementById("facultyName");
const facultyCode = document.getElementById("facultyCode");
const facultyDescription = document.getElementById("facultyDescription");
const facultyStatus = document.getElementById("facultyStatus");

const facultiesTableBody = document.getElementById("facultiesTableBody");
const facultiesEmptyState = document.getElementById("facultiesEmptyState");

const facultySearch = document.getElementById("facultySearch");
const facultyCount = document.getElementById("facultyCount");

const facultyModalTitle = document.getElementById("facultyModalTitle");
const facultyModalSubtitle = document.getElementById("facultyModalSubtitle");

const facultyFormError = document.getElementById("facultyFormError");

const saveFacultyBtn = document.getElementById("saveFacultyBtn");

const deleteFacultyName = document.getElementById("deleteFacultyName");


/* =========================================================
   STATE
   ========================================================= */

let faculties = [];
let editingFacultyId = null;
let deletingFacultyId = null;


/* =========================================================
   CSRF TOKEN
   ========================================================= */

function getCSRFToken() {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="));

    if (cookie) {
        return decodeURIComponent(
            cookie.split("=")[1]
        );
    }

    const csrfInput = document.querySelector(
        'input[name="csrfmiddlewaretoken"]'
    );

    if (csrfInput) {
        return csrfInput.value;
    }

    const csrfMeta = document.querySelector(
        'meta[name="csrf-token"]'
    );

    if (csrfMeta) {
        return csrfMeta.getAttribute("content");
    }

    return null;
}


/* =========================================================
   API ERROR HANDLER
   ========================================================= */

async function getErrorMessage(response) {
    try {
        const data = await response.json();

        if (data.detail) {
            return data.detail;
        }

        if (typeof data === "object") {
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

            if (messages.length > 0) {
                return messages.join(" | ");
            }
        }

        return "An unexpected server error occurred.";

    } catch (error) {
        return `Request failed with status ${response.status}.`;
    }
}


/* =========================================================
   LOAD FACULTIES
   ========================================================= */

async function loadFaculties() {
    try {
        const response = await fetch(
            FACULTIES_API_URL,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
                credentials: "same-origin",
            }
        );

        if (!response.ok) {
            const message = await getErrorMessage(response);

            throw new Error(message);
        }

        const data = await response.json();

        /*
         * DRF may return either:
         *
         * [
         *     {...}
         * ]
         *
         * or:
         *
         * {
         *     "results": [...]
         * }
         */

        if (Array.isArray(data)) {
            faculties = data;
        } else if (Array.isArray(data.results)) {
            faculties = data.results;
        } else {
            faculties = [];
        }

        renderFaculties();

    } catch (error) {
        console.error(
            "Failed to load faculties:",
            error
        );

        faculties = [];

        renderFaculties();

        showFacultyError(
            `Unable to load faculties. ${error.message}`
        );
    }
}


/* =========================================================
   RENDER FACULTIES
   ========================================================= */

function renderFaculties() {
    const searchTerm = facultySearch
        ? facultySearch.value.trim().toLowerCase()
        : "";

    const filteredFaculties = faculties.filter(
        (faculty) => {
            const facultyIdValue =
                String(faculty.faculty_id || "").toLowerCase();

            const nameValue =
                String(faculty.name || "").toLowerCase();

            const codeValue =
                String(faculty.code || "").toLowerCase();

            const descriptionValue =
                String(faculty.description || "").toLowerCase();

            return (
                facultyIdValue.includes(searchTerm) ||
                nameValue.includes(searchTerm) ||
                codeValue.includes(searchTerm) ||
                descriptionValue.includes(searchTerm)
            );
        }
    );


    /* Clear table */

    facultiesTableBody.innerHTML = "";


    /* Update count */

    updateFacultyCount(
        filteredFaculties.length,
        faculties.length
    );


    /* Empty state */

    if (filteredFaculties.length === 0) {
        facultiesEmptyState.hidden = false;
        return;
    }

    facultiesEmptyState.hidden = true;


    /* Render rows */

    filteredFaculties.forEach(
        (faculty) => {
            const row = createFacultyRow(faculty);

            facultiesTableBody.appendChild(row);
        }
    );
}


/* =========================================================
   CREATE TABLE ROW
   ========================================================= */

function createFacultyRow(faculty) {
    const row = document.createElement("tr");

    const facultyIdCell =
        document.createElement("td");

    facultyIdCell.className =
        "faculty-id-cell";

    facultyIdCell.textContent =
        faculty.faculty_id || "—";


    const nameCell =
        document.createElement("td");

    nameCell.className =
        "faculty-name-cell";

    nameCell.textContent =
        faculty.name || "—";


    const codeCell =
        document.createElement("td");

    const codeBadge =
        document.createElement("span");

    codeBadge.className =
        "faculty-code-cell";

    codeBadge.textContent =
        faculty.code || "—";

    codeCell.appendChild(codeBadge);


    const departmentCell =
        document.createElement("td");

    const departmentCount =
        Number(faculty.department_count || 0);

    departmentCell.className =
        "faculty-department-count";

    departmentCell.textContent =
        departmentCount;


    const statusCell =
        document.createElement("td");

    const statusBadge =
        document.createElement("span");

    statusBadge.className =
        "faculty-status-badge";

    if (faculty.is_active) {
        statusBadge.classList.add(
            "faculty-status-active"
        );

        statusBadge.textContent =
            "Active";
    } else {
        statusBadge.classList.add(
            "faculty-status-inactive"
        );

        statusBadge.textContent =
            "Inactive";
    }

    statusCell.appendChild(statusBadge);


    const actionsCell =
        document.createElement("td");

    const actions =
        document.createElement("div");

    actions.className =
        "faculty-actions";


    /* Edit */

    const editButton =
        document.createElement("button");

    editButton.type = "button";
    editButton.className =
        "faculty-action-btn faculty-edit-btn";

    editButton.textContent =
        "Edit";

    editButton.dataset.action =
        "edit";

    editButton.dataset.id =
        faculty.id;


    /* Delete */

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className =
        "faculty-action-btn faculty-delete-btn";

    deleteButton.textContent =
        "Delete";

    deleteButton.dataset.action =
        "delete";

    deleteButton.dataset.id =
        faculty.id;


    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    actionsCell.appendChild(actions);


    row.appendChild(facultyIdCell);
    row.appendChild(nameCell);
    row.appendChild(codeCell);
    row.appendChild(departmentCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
}


/* =========================================================
   FACULTY COUNT
   ========================================================= */

function updateFacultyCount(
    visibleCount,
    totalCount
) {
    if (!facultyCount) {
        return;
    }

    if (facultySearch.value.trim()) {
        facultyCount.textContent =
            `${visibleCount} of ${totalCount} Faculties`;

        return;
    }

    facultyCount.textContent =
        `${totalCount} Faculties`;
}


/* =========================================================
   OPEN ADD MODAL
   ========================================================= */

function openAddFacultyModal() {
    editingFacultyId = null;

    facultyForm.reset();

    facultyDatabaseId.value = "";
    facultyId.value = "Auto-generated";

    facultyStatus.value = "true";

    facultyModalTitle.textContent =
        "Add Faculty";

    facultyModalSubtitle.textContent =
        "Create a new university faculty.";

    saveFacultyBtn.textContent =
        "Save Faculty";

    clearFacultyError();

    facultyModal.hidden = false;

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        facultyName.focus();
    }, 50);
}


/* =========================================================
   OPEN EDIT MODAL
   ========================================================= */

function openEditFacultyModal(id) {
    const faculty = faculties.find(
        (item) => Number(item.id) === Number(id)
    );

    if (!faculty) {
        showFacultyError(
            "The selected faculty could not be found."
        );

        return;
    }

    editingFacultyId = faculty.id;

    facultyDatabaseId.value =
        faculty.id;

    /*
     * Faculty ID comes directly from
     * the database/API.
     */

    facultyId.value =
        faculty.faculty_id || "";

    facultyName.value =
        faculty.name || "";

    facultyCode.value =
        faculty.code || "";

    facultyDescription.value =
        faculty.description || "";

    facultyStatus.value =
        faculty.is_active ? "true" : "false";

    facultyModalTitle.textContent =
        "Edit Faculty";

    facultyModalSubtitle.textContent =
        "Update faculty information.";

    saveFacultyBtn.textContent =
        "Update Faculty";

    clearFacultyError();

    facultyModal.hidden = false;

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        facultyName.focus();
    }, 50);
}


/* =========================================================
   CLOSE FACULTY MODAL
   ========================================================= */

function closeFacultyModal() {
    facultyModal.hidden = true;

    editingFacultyId = null;

    facultyForm.reset();

    facultyDatabaseId.value = "";
    facultyId.value = "";

    clearFacultyError();

    document.body.style.overflow = "";
}


/* =========================================================
   SAVE FACULTY
   ========================================================= */

async function saveFaculty(event) {
    event.preventDefault();

    clearFacultyError();

    const name =
        facultyName.value.trim();

    const code =
        facultyCode.value.trim();

    const description =
        facultyDescription.value.trim();

    const isActive =
        facultyStatus.value === "true";


    /* Client-side validation */

    if (!name) {
        showFacultyFormError(
            "Faculty name is required."
        );

        facultyName.focus();

        return;
    }

    if (!code) {
        showFacultyFormError(
            "Faculty code is required."
        );

        facultyCode.focus();

        return;
    }


    const payload = {
        name: name,
        code: code,
        description: description,
        is_active: isActive,
    };


    const csrfToken =
        getCSRFToken();


    if (!csrfToken) {
        showFacultyFormError(
            "CSRF token was not found. Refresh the page and try again."
        );

        return;
    }


    const isEditing =
        editingFacultyId !== null;

    const url = isEditing
        ? `${FACULTIES_API_URL}${editingFacultyId}/`
        : FACULTIES_API_URL;

    const method =
        isEditing ? "PATCH" : "POST";


    saveFacultyBtn.disabled = true;

    saveFacultyBtn.textContent =
        isEditing
            ? "Updating..."
            : "Saving...";


    try {
        const response = await fetch(
            url,
            {
                method: method,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "X-CSRFToken":
                        csrfToken,
                },

                credentials:
                    "same-origin",

                body:
                    JSON.stringify(payload),
            }
        );


        if (!response.ok) {
            const message =
                await getErrorMessage(response);

            throw new Error(message);
        }


        await response.json();


        closeFacultyModal();

        await loadFaculties();


    } catch (error) {
        console.error(
            "Failed to save faculty:",
            error
        );

        showFacultyFormError(
            `Unable to save faculty. ${error.message}`
        );


    } finally {
        saveFacultyBtn.disabled = false;

        saveFacultyBtn.textContent =
            isEditing
                ? "Update Faculty"
                : "Save Faculty";
    }
}


/* =========================================================
   OPEN DELETE MODAL
   ========================================================= */

function openDeleteFacultyModal(id) {
    const faculty = faculties.find(
        (item) => Number(item.id) === Number(id)
    );

    if (!faculty) {
        showFacultyError(
            "The selected faculty could not be found."
        );

        return;
    }

    deletingFacultyId =
        faculty.id;

    deleteFacultyName.textContent =
        `${faculty.faculty_id} - ${faculty.name}`;

    deleteFacultyModal.hidden =
        false;

    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE DELETE MODAL
   ========================================================= */

function closeDeleteFacultyModal() {
    deleteFacultyModal.hidden =
        true;

    deletingFacultyId =
        null;

    deleteFacultyName.textContent =
        "";

    document.body.style.overflow =
        "";
}


/* =========================================================
   DELETE FACULTY
   ========================================================= */

async function deleteFaculty() {
    if (deletingFacultyId === null) {
        return;
    }

    const csrfToken =
        getCSRFToken();

    if (!csrfToken) {
        closeDeleteFacultyModal();

        showFacultyError(
            "CSRF token was not found. Refresh the page and try again."
        );

        return;
    }


    const deleteButton =
        document.getElementById(
            "confirmDeleteFaculty"
        );

    deleteButton.disabled = true;

    deleteButton.textContent =
        "Deleting...";


    try {
        const response = await fetch(
            `${FACULTIES_API_URL}${deletingFacultyId}/`,
            {
                method: "DELETE",

                headers: {
                    "Accept":
                        "application/json",

                    "X-CSRFToken":
                        csrfToken,
                },

                credentials:
                    "same-origin",
            }
        );


        if (!response.ok) {
            const message =
                await getErrorMessage(response);

            throw new Error(message);
        }


        closeDeleteFacultyModal();

        await loadFaculties();


    } catch (error) {
        console.error(
            "Failed to delete faculty:",
            error
        );

        closeDeleteFacultyModal();

        showFacultyError(
            `Unable to delete faculty. ${error.message}`
        );


    } finally {
        deleteButton.disabled =
            false;

        deleteButton.textContent =
            "Delete Faculty";
    }
}


/* =========================================================
   ERROR DISPLAY
   ========================================================= */

function showFacultyFormError(message) {
    facultyFormError.textContent =
        message;

    facultyFormError.hidden =
        false;
}


function clearFacultyError() {
    facultyFormError.textContent =
        "";

    facultyFormError.hidden =
        true;
}


function showFacultyError(message) {
    console.error(message);

    /*
     * Use the existing form error area
     * if the modal is available.
     */

    if (
        facultyModal &&
        !facultyModal.hidden
    ) {
        showFacultyFormError(message);

        return;
    }

    /*
     * Simple browser notification for
     * page-level API errors.
     */

    window.alert(message);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */


/* Add buttons */

const addFacultyBtn =
    document.getElementById(
        "addFacultyBtn"
    );

const emptyAddFacultyBtn =
    document.getElementById(
        "emptyAddFacultyBtn"
    );


if (addFacultyBtn) {
    addFacultyBtn.addEventListener(
        "click",
        openAddFacultyModal
    );
}


if (emptyAddFacultyBtn) {
    emptyAddFacultyBtn.addEventListener(
        "click",
        openAddFacultyModal
    );
}


/* Search */

if (facultySearch) {
    facultySearch.addEventListener(
        "input",
        renderFaculties
    );
}


/* Form */

if (facultyForm) {
    facultyForm.addEventListener(
        "submit",
        saveFaculty
    );
}


/* Close modal */

const closeFacultyModalBtn =
    document.getElementById(
        "closeFacultyModal"
    );

const cancelFacultyBtn =
    document.getElementById(
        "cancelFacultyBtn"
    );


if (closeFacultyModalBtn) {
    closeFacultyModalBtn.addEventListener(
        "click",
        closeFacultyModal
    );
}


if (cancelFacultyBtn) {
    cancelFacultyBtn.addEventListener(
        "click",
        closeFacultyModal
    );
}


/* Delete modal buttons */

const cancelDeleteFacultyBtn =
    document.getElementById(
        "cancelDeleteFaculty"
    );

const confirmDeleteFacultyBtn =
    document.getElementById(
        "confirmDeleteFaculty"
    );


if (cancelDeleteFacultyBtn) {
    cancelDeleteFacultyBtn.addEventListener(
        "click",
        closeDeleteFacultyModal
    );
}


if (confirmDeleteFacultyBtn) {
    confirmDeleteFacultyBtn.addEventListener(
        "click",
        deleteFaculty
    );
}


/* Backdrops */

document
    .querySelectorAll(
        "[data-close-faculty-modal]"
    )
    .forEach((element) => {
        element.addEventListener(
            "click",
            closeFacultyModal
        );
    });


document
    .querySelectorAll(
        "[data-close-delete-modal]"
    )
    .forEach((element) => {
        element.addEventListener(
            "click",
            closeDeleteFacultyModal
        );
    });


/* Table actions */

if (facultiesTableBody) {
    facultiesTableBody.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;


            if (action === "edit") {
                openEditFacultyModal(id);
            }


            if (action === "delete") {
                openDeleteFacultyModal(id);
            }
        }
    );
}


/* Escape key */

document.addEventListener(
    "keydown",
    (event) => {
        if (event.key !== "Escape") {
            return;
        }

        if (
            facultyModal &&
            !facultyModal.hidden
        ) {
            closeFacultyModal();
        }

        if (
            deleteFacultyModal &&
            !deleteFacultyModal.hidden
        ) {
            closeDeleteFacultyModal();
        }
    }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadFaculties();
    }
);