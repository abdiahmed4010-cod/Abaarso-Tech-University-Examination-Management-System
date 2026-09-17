/* =========================================================
   SEMESTERS MANAGEMENT
   ATU Examination Management System
========================================================= */

const SEMESTERS_API_URL = "/api/semesters/";


let semesters = [];
let currentSemesterId = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const semesterSearch = document.getElementById(
    "semesterSearch"
);

const semestersTableBody = document.getElementById(
    "semestersTableBody"
);

const semestersEmptyState = document.getElementById(
    "semestersEmptyState"
);

const addSemesterBtn = document.getElementById(
    "addSemesterBtn"
);

const semesterModal = document.getElementById(
    "semesterModal"
);

const semesterModalTitle = document.getElementById(
    "semesterModalTitle"
);

const closeSemesterModal = document.getElementById(
    "closeSemesterModal"
);

const cancelSemesterBtn = document.getElementById(
    "cancelSemesterBtn"
);

const semesterForm = document.getElementById(
    "semesterForm"
);

const semesterIdInput = document.getElementById(
    "semesterId"
);

const semesterNameInput = document.getElementById(
    "semesterName"
);

const saveSemesterBtn = document.getElementById(
    "saveSemesterBtn"
);

const deleteSemesterModal = document.getElementById(
    "deleteSemesterModal"
);

const deleteSemesterName = document.getElementById(
    "deleteSemesterName"
);

const cancelDeleteSemester = document.getElementById(
    "cancelDeleteSemester"
);

const confirmDeleteSemester = document.getElementById(
    "confirmDeleteSemester"
);


/* =========================================================
   CSRF
========================================================= */

function getCookie(name) {

    const cookies = document.cookie.split(";");

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


const csrfToken = getCookie("csrftoken");


/* =========================================================
   FETCH ALL PAGINATED DATA
========================================================= */

async function fetchAllSemesters() {

    let url = SEMESTERS_API_URL;

    const allResults = [];

    while (url) {

        const response = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Failed to load semesters (${response.status})`
            );
        }

        const data = await response.json();

        if (Array.isArray(data)) {

            allResults.push(...data);

            url = null;

        } else {

            if (Array.isArray(data.results)) {
                allResults.push(...data.results);
            }

            url = data.next;
        }
    }

    return allResults;
}


/* =========================================================
   LOAD SEMESTERS
========================================================= */

async function loadSemesters() {

    try {

        semestersTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="semester-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading semesters...
                </td>
            </tr>
        `;

        const data = await fetchAllSemesters();

        semesters = data;

        renderSemesters();

    } catch (error) {

        console.error(
            "Error loading semesters:",
            error
        );

        semestersTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="semester-error">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    Failed to load semesters.
                </td>
            </tr>
        `;

        semestersEmptyState.classList.add("hidden");
    }
}


/* =========================================================
   RENDER SEMESTERS
========================================================= */

function renderSemesters() {

    const searchValue =
        semesterSearch.value
            .trim()
            .toLowerCase();


    const filteredSemesters = semesters.filter(
        semester => {

            const name =
                String(
                    semester.name || ""
                ).toLowerCase();

            const id =
                String(
                    semester.id || ""
                ).toLowerCase();

            const formattedId =
                formatSemesterId(
                    semester.id
                ).toLowerCase();

            return (
                name.includes(searchValue) ||
                id.includes(searchValue) ||
                formattedId.includes(searchValue)
            );
        }
    );


    semestersTableBody.innerHTML = "";


    if (filteredSemesters.length === 0) {

        semestersEmptyState.classList.remove(
            "hidden"
        );

        return;
    }


    semestersEmptyState.classList.add(
        "hidden"
    );


    filteredSemesters.forEach(
        semester => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <span class="semester-id">
                        ${escapeHtml(
                            formatSemesterId(
                                semester.id
                            )
                        )}
                    </span>
                </td>

                <td>
                    <span class="semester-name">
                        ${escapeHtml(
                            semester.name
                        )}
                    </span>
                </td>

                <td>

                    <div class="semester-actions">

                        <button
                            type="button"
                            class="semester-action-btn edit"
                            data-action="edit"
                            data-id="${semester.id}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="semester-action-btn delete"
                            data-action="delete"
                            data-id="${semester.id}"
                        >
                            Delete
                        </button>

                    </div>

                </td>
            `;


            semestersTableBody.appendChild(row);
        }
    );
}


/* =========================================================
   FORMAT SEMESTER ID
========================================================= */

function formatSemesterId(id) {

    const number =
        Number(id);

    if (!Number.isFinite(number)) {
        return `SEM-${id}`;
    }

    return `SEM-${String(number).padStart(3, "0")}`;
}


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
   OPEN ADD MODAL
========================================================= */

function openAddSemesterModal() {

    currentSemesterId = null;

    semesterIdInput.value = "";

    semesterNameInput.value = "";

    semesterModalTitle.textContent =
        "Add Semester";

    saveSemesterBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Semester
    `;

    semesterModal.hidden = false;

    setTimeout(() => {
        semesterNameInput.focus();
    }, 50);
}


/* =========================================================
   OPEN EDIT MODAL
========================================================= */

function openEditSemesterModal(id) {

    const semester =
        semesters.find(
            item => Number(item.id) === Number(id)
        );


    if (!semester) {
        return;
    }


    currentSemesterId =
        semester.id;

    semesterIdInput.value =
        semester.id;

    semesterNameInput.value =
        semester.name || "";

    semesterModalTitle.textContent =
        "Edit Semester";

    saveSemesterBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Update Semester
    `;

    semesterModal.hidden = false;

    setTimeout(() => {
        semesterNameInput.focus();
    }, 50);
}


/* =========================================================
   CLOSE ADD / EDIT MODAL
========================================================= */

function closeSemesterFormModal() {

    semesterModal.hidden = true;

    semesterForm.reset();

    semesterIdInput.value = "";

    currentSemesterId = null;
}


/* =========================================================
   OPEN DELETE MODAL
========================================================= */

function openDeleteSemesterModal(id) {

    const semester =
        semesters.find(
            item => Number(item.id) === Number(id)
        );


    if (!semester) {
        return;
    }


    currentSemesterId =
        semester.id;

    deleteSemesterName.textContent =
        semester.name;


    deleteSemesterModal.hidden = false;
}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteSemesterModal() {

    deleteSemesterModal.hidden = true;

    currentSemesterId = null;
}


/* =========================================================
   CREATE / UPDATE SEMESTER
========================================================= */

async function saveSemester(event) {

    event.preventDefault();


    const name =
        semesterNameInput.value.trim();


    if (!name) {

        semesterNameInput.focus();

        return;
    }


    const isEditing =
        Boolean(currentSemesterId);


    const url =
        isEditing
            ? `${SEMESTERS_API_URL}${currentSemesterId}/`
            : SEMESTERS_API_URL;


    const method =
        isEditing
            ? "PATCH"
            : "POST";


    const originalButtonText =
        saveSemesterBtn.innerHTML;


    saveSemesterBtn.disabled = true;

    saveSemesterBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
    `;


    try {

        const response =
            await fetch(url, {

                method,

                credentials: "same-origin",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "X-CSRFToken":
                        csrfToken || ""
                },

                body: JSON.stringify({
                    name: name
                })
            });


        const data =
            await response.json().catch(
                () => ({})
            );


        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(data)
            );
        }


        closeSemesterFormModal();

        await loadSemesters();


    } catch (error) {

        console.error(
            "Error saving semester:",
            error
        );

        alert(
            error.message ||
            "Failed to save semester."
        );


        saveSemesterBtn.innerHTML =
            originalButtonText;

    } finally {

        saveSemesterBtn.disabled =
            false;

        if (!semesterModal.hidden) {

            saveSemesterBtn.innerHTML =
                originalButtonText;
        }
    }
}


/* =========================================================
   DELETE SEMESTER
========================================================= */

async function deleteSemester() {

    if (!currentSemesterId) {
        return;
    }


    const id =
        currentSemesterId;


    const originalButtonText =
        confirmDeleteSemester.innerHTML;


    confirmDeleteSemester.disabled =
        true;

    confirmDeleteSemester.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Deleting...
    `;


    try {

        const response =
            await fetch(
                `${SEMESTERS_API_URL}${id}/`,
                {
                    method: "DELETE",

                    credentials: "same-origin",

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
                await response.json().catch(
                    () => ({})
                );

            throw new Error(
                getApiErrorMessage(data)
            );
        }


        closeDeleteSemesterModal();

        await loadSemesters();


    } catch (error) {

        console.error(
            "Error deleting semester:",
            error
        );

        alert(
            error.message ||
            "Failed to delete semester."
        );


    } finally {

        confirmDeleteSemester.disabled =
            false;

        confirmDeleteSemester.innerHTML =
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


    if (typeof data.detail === "string") {
        return data.detail;
    }


    if (typeof data === "string") {
        return data;
    }


    if (typeof data === "object") {

        const messages = [];

        Object.entries(data).forEach(
            ([field, value]) => {

                if (Array.isArray(value)) {

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


        if (messages.length > 0) {
            return messages.join("\n");
        }
    }


    return "An unexpected error occurred.";
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

semestersTableBody.addEventListener(
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


        if (action === "edit") {

            openEditSemesterModal(id);

        } else if (action === "delete") {

            openDeleteSemesterModal(id);
        }
    }
);


/* =========================================================
   SEARCH
========================================================= */

semesterSearch.addEventListener(
    "input",
    renderSemesters
);


/* =========================================================
   ADD BUTTON
========================================================= */

addSemesterBtn.addEventListener(
    "click",
    openAddSemesterModal
);


/* =========================================================
   FORM SUBMIT
========================================================= */

semesterForm.addEventListener(
    "submit",
    saveSemester
);


/* =========================================================
   CLOSE MODAL
========================================================= */

closeSemesterModal.addEventListener(
    "click",
    closeSemesterFormModal
);

cancelSemesterBtn.addEventListener(
    "click",
    closeSemesterFormModal
);


/* =========================================================
   DELETE MODAL
========================================================= */

cancelDeleteSemester.addEventListener(
    "click",
    closeDeleteSemesterModal
);

confirmDeleteSemester.addEventListener(
    "click",
    deleteSemester
);


/* =========================================================
   MODAL BACKDROPS
========================================================= */

semesterModal
    .querySelector(".semester-modal-overlay")
    .addEventListener(
        "click",
        closeSemesterFormModal
    );


deleteSemesterModal
    .querySelector(".semester-modal-overlay")
    .addEventListener(
        "click",
        closeDeleteSemesterModal
    );


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        if (!semesterModal.hidden) {

            closeSemesterFormModal();

        } else if (
            !deleteSemesterModal.hidden
        ) {

            closeDeleteSemesterModal();
        }
    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadSemesters();
    }
);