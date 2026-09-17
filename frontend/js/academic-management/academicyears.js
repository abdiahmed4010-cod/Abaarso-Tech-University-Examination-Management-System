document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "http://127.0.0.1:8000/api/academic-years/";

    // =========================================================
    // ELEMENTS
    // =========================================================

    const tableBody = document.getElementById("academicYearsTableBody");
    const emptyState = document.getElementById("academicYearsEmptyState");
    const searchInput = document.getElementById("academicYearSearch");

    // Add / Edit Modal
    const modal = document.getElementById("academicYearModal");
    const form = document.getElementById("academicYearForm");
    const addButton = document.getElementById("addAcademicYearBtn");

    // Delete Modal
    const deleteModal = document.getElementById("deleteAcademicYearModal");
    const deleteYearName = document.getElementById("deleteAcademicYearName");
    const cancelDeleteButton = document.getElementById("cancelDeleteAcademicYear");
    const confirmDeleteButton = document.getElementById("confirmDeleteAcademicYear");

    let academicYears = [];
    let selectedDeleteId = null;


    // =========================================================
    // CSRF TOKEN
    // =========================================================

    function getCSRFToken() {

        // First try Django cookie
        const cookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="));

        if (cookie) {
            return decodeURIComponent(cookie.split("=")[1]);
        }

        // Fallback: try hidden CSRF input
        const csrfInput = document.querySelector(
            'input[name="csrfmiddlewaretoken"]'
        );

        if (csrfInput) {
            return csrfInput.value;
        }

        // Fallback: try meta tag
        const csrfMeta = document.querySelector(
            'meta[name="csrf-token"]'
        );

        if (csrfMeta) {
            return csrfMeta.getAttribute("content");
        }

        return null;
    }


    // =========================================================
    // LOAD ACADEMIC YEARS
    // =========================================================

    async function loadAcademicYears() {

        try {

            const response = await fetch(API_URL, {
                method: "GET",
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to load academic years (${response.status})`
                );
            }

            const data = await response.json();

            academicYears = data.results || data;

            renderAcademicYears(academicYears);

        } catch (error) {

            console.error("Academic Years Error:", error);

            showEmptyState(
                "Unable to load academic years."
            );
        }
    }


    // =========================================================
    // RENDER
    // =========================================================

    function renderAcademicYears(items) {

        if (!tableBody) return;

        tableBody.innerHTML = "";

        if (!items.length) {

            showEmptyState(
                "No academic years found."
            );

            return;
        }

        if (emptyState) {
            emptyState.classList.add("hidden");
        }


        items.forEach((year) => {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td class="px-4 py-3">
                    ${year.id}
                </td>

                <td class="px-4 py-3 font-medium">
                    ${escapeHtml(year.name)}
                </td>

                <td class="px-4 py-3">
                    ${year.start_date}
                </td>

                <td class="px-4 py-3">
                    ${year.end_date}
                </td>

                <td class="px-4 py-3">

                    ${
                        year.is_current

                        ? `
                            <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Current
                            </span>
                          `

                        : `
                            <span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Inactive
                            </span>
                          `
                    }

                </td>

                <td class="px-4 py-3">

                    <div class="flex gap-2">

                        <button
                            type="button"
                            class="edit-year-btn px-3 py-1 text-sm rounded"
                            data-id="${year.id}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="delete-year-btn px-3 py-1 text-sm rounded"
                            data-id="${year.id}">
                            Delete
                        </button>

                    </div>

                </td>
            `;

            tableBody.appendChild(row);
        });
    }


    // =========================================================
    // SEARCH
    // =========================================================

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            const query = searchInput.value
                .toLowerCase()
                .trim();

            const filtered = academicYears.filter((year) => {

                const name =
                    String(year.name || "").toLowerCase();

                return name.includes(query);
            });

            renderAcademicYears(filtered);
        });
    }


    // =========================================================
    // OPEN ADD MODAL
    // =========================================================

    if (addButton) {

        addButton.addEventListener("click", () => {

            if (form) {
                form.reset();
            }

            const idField =
                document.getElementById("academicYearId");

            const methodField =
                document.getElementById("academicYearMethod");

            if (idField) {
                idField.value = "";
            }

            if (methodField) {
                methodField.value = "POST";
            }

            if (modal) {
                modal.classList.remove("hidden");
            }
        });
    }


    // =========================================================
    // CLOSE ADD / EDIT MODAL
    // =========================================================

    function closeModal() {

        if (modal) {
            modal.classList.add("hidden");
        }

        if (form) {
            form.reset();
        }

        const idField =
            document.getElementById("academicYearId");

        const methodField =
            document.getElementById("academicYearMethod");

        if (idField) {
            idField.value = "";
        }

        if (methodField) {
            methodField.value = "POST";
        }
    }


    document
        .querySelectorAll("[data-close-academic-year]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                closeModal
            );

        });


    // =========================================================
    // CREATE / UPDATE
    // =========================================================

    if (form) {

        form.addEventListener("submit", async (event) => {

            event.preventDefault();


            const id =
                document.getElementById("academicYearId")?.value.trim();

            const name =
                document.getElementById("academicYearName")?.value.trim();

            const startDate =
                document.getElementById("startDate")?.value;

            const endDate =
                document.getElementById("endDate")?.value;

            const isCurrent =
                document.getElementById("isCurrent")?.checked || false;


            // Basic validation
            if (!name) {

                alert("Please enter the academic year.");

                return;
            }

            if (!startDate) {

                alert("Please select the start date.");

                return;
            }

            if (!endDate) {

                alert("Please select the end date.");

                return;
            }

            if (startDate > endDate) {

                alert(
                    "Start date cannot be after end date."
                );

                return;
            }


            const payload = {

                name: name,

                start_date: startDate,

                end_date: endDate,

                is_current: isCurrent

            };


            try {

                // =================================================
                // CSRF
                // =================================================

                const csrfToken = getCSRFToken();

                if (!csrfToken) {

                    throw new Error(
                        "CSRF token was not found. Please refresh the page."
                    );
                }


                // =================================================
                // URL
                // =================================================

                const url = id
                    ? `${API_URL}${id}/`
                    : API_URL;


                // =================================================
                // METHOD
                // =================================================

                const method = id
                    ? "PATCH"
                    : "POST";


                // =================================================
                // SAVE REQUEST
                // =================================================

                const response = await fetch(url, {

                    method: method,

                    credentials: "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "X-CSRFToken":
                            csrfToken

                    },

                    body:
                        JSON.stringify(payload)

                });


                // =================================================
                // RESPONSE
                // =================================================

                if (!response.ok) {

                    let errorData = null;

                    try {

                        errorData =
                            await response.json();

                    } catch {

                        errorData = null;
                    }


                    console.error(
                        "Academic Year API Error:",
                        response.status,
                        errorData
                    );


                    // Django / DRF error message
                    let message =
                        `Unable to save academic year. Server returned ${response.status}.`;


                    if (errorData) {

                        if (typeof errorData === "object") {

                            const messages = [];

                            Object.entries(errorData)
                                .forEach(([field, errors]) => {

                                    if (Array.isArray(errors)) {

                                        messages.push(
                                            `${field}: ${errors.join(", ")}`
                                        );

                                    } else {

                                        messages.push(
                                            `${field}: ${errors}`
                                        );
                                    }

                                });

                            if (messages.length) {

                                message =
                                    messages.join("\n");
                            }
                        }
                    }


                    throw new Error(message);
                }


                // =================================================
                // SUCCESS
                // =================================================

                closeModal();

                await loadAcademicYears();


            } catch (error) {

                console.error(
                    "Save Academic Year Error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to save academic year."
                );
            }

        });
    }


    // =========================================================
    // OPEN DELETE MODAL
    // =========================================================

    function openDeleteModal(id) {

        const year = academicYears.find(
            item =>
                String(item.id) === String(id)
        );

        if (!year) {
            return;
        }


        selectedDeleteId = year.id;


        if (deleteYearName) {

            deleteYearName.textContent =
                year.name;
        }


        if (deleteModal) {

            deleteModal.classList.remove("hidden");
        }
    }


    // =========================================================
    // CLOSE DELETE MODAL
    // =========================================================

    function closeDeleteModal() {

        selectedDeleteId = null;


        if (deleteModal) {

            deleteModal.classList.add("hidden");
        }


        if (deleteYearName) {

            deleteYearName.textContent = "";
        }
    }


    // =========================================================
    // CANCEL DELETE
    // =========================================================

    if (cancelDeleteButton) {

        cancelDeleteButton.addEventListener(
            "click",
            closeDeleteModal
        );
    }


    // =========================================================
    // CONFIRM DELETE
    // =========================================================

    if (confirmDeleteButton) {

        confirmDeleteButton.addEventListener(
            "click",
            async () => {

                if (!selectedDeleteId) {
                    return;
                }


                const id =
                    selectedDeleteId;


                try {

                    confirmDeleteButton.disabled =
                        true;


                    // Get CSRF
                    const csrfToken =
                        getCSRFToken();


                    if (!csrfToken) {

                        throw new Error(
                            "CSRF token was not found. Please refresh the page."
                        );
                    }


                    const response =
                        await fetch(
                            `${API_URL}${id}/`,
                            {

                                method:
                                    "DELETE",

                                credentials:
                                    "same-origin",

                                headers: {

                                    "Accept":
                                        "application/json",

                                    "X-CSRFToken":
                                        csrfToken

                                }

                            }
                        );


                    if (!response.ok) {

                        let errorData = null;

                        try {

                            errorData =
                                await response.json();

                        } catch {

                            errorData = null;
                        }


                        console.error(
                            "Delete Academic Year Error:",
                            response.status,
                            errorData
                        );


                        throw new Error(
                            `Unable to delete academic year. Server returned ${response.status}.`
                        );
                    }


                    // Success
                    closeDeleteModal();

                    await loadAcademicYears();


                } catch (error) {

                    console.error(
                        "Delete Error:",
                        error
                    );

                    alert(
                        error.message ||
                        "Unable to delete academic year."
                    );


                } finally {

                    confirmDeleteButton.disabled =
                        false;
                }

            }
        );
    }


    // =========================================================
    // EDIT / DELETE BUTTONS
    // =========================================================

    document.addEventListener(
        "click",
        (event) => {


            // =================================================
            // EDIT
            // =================================================

            const editButton =
                event.target.closest(
                    ".edit-year-btn"
                );


            if (editButton) {

                const id =
                    editButton.dataset.id;


                const year =
                    academicYears.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );


                if (!year) {
                    return;
                }


                const idField =
                    document.getElementById(
                        "academicYearId"
                    );

                const methodField =
                    document.getElementById(
                        "academicYearMethod"
                    );

                const nameField =
                    document.getElementById(
                        "academicYearName"
                    );

                const startDateField =
                    document.getElementById(
                        "startDate"
                    );

                const endDateField =
                    document.getElementById(
                        "endDate"
                    );

                const currentField =
                    document.getElementById(
                        "isCurrent"
                    );


                if (idField) {

                    idField.value =
                        year.id;
                }


                if (methodField) {

                    methodField.value =
                        "PATCH";
                }


                if (nameField) {

                    nameField.value =
                        year.name;
                }


                if (startDateField) {

                    startDateField.value =
                        year.start_date;
                }


                if (endDateField) {

                    endDateField.value =
                        year.end_date;
                }


                if (currentField) {

                    currentField.checked =
                        Boolean(
                            year.is_current
                        );
                }


                if (modal) {

                    modal.classList.remove(
                        "hidden"
                    );
                }


                return;
            }


            // =================================================
            // DELETE
            // =================================================

            const deleteButton =
                event.target.closest(
                    ".delete-year-btn"
                );


            if (deleteButton) {

                const id =
                    deleteButton.dataset.id;

                openDeleteModal(id);
            }

        }
    );


    // =========================================================
    // EMPTY STATE
    // =========================================================

    function showEmptyState(message) {

        if (!tableBody || !emptyState) {
            return;
        }


        tableBody.innerHTML = "";


        emptyState.textContent =
            message;


        emptyState.classList.remove(
            "hidden"
        );
    }


    // =========================================================
    // SECURITY
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                "div"
            );

        div.textContent =
            value ?? "";

        return div.innerHTML;
    }


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadAcademicYears();

});