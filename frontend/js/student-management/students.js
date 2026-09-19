/* ATU EMS — Student Management */
(() => {
  "use strict";

  const API = {
    students: "/api/students/",
    departments: "/api/departments/",
    semesters: "/api/semesters/",
    academicYears: "/api/academic-years/",
    bulkUpload: "/api/students/bulk-upload/",
    exportStudents: "/api/students/export/"
  };

  const $ = id => document.getElementById(id);

  const el = {
    table: $("studentsTableBody"),
    empty: $("studentsEmptyState"),
    loading: $("studentsLoadingState"),

    search: $("studentSearch"),
    deptFilter: $("studentDepartmentFilter"),
    semFilter: $("studentSemesterFilter"),
    statusFilter: $("studentStatusFilter"),
    reset: $("resetStudentFiltersBtn"),

    resultCount: $("studentResultCount"),
    total: $("totalStudentsCount"),
    active: $("activeStudentsCount"),
    inactive: $("inactiveStudentsCount"),
    graduated: $("graduatedStudentsCount"),

    add: $("addStudentBtn"),
    modal: $("studentModal"),
    modalTitle: $("studentModalTitle"),
    closeModal: $("closeStudentModalBtn"),
    cancel: $("cancelStudentBtn"),
    form: $("studentForm"),
    save: $("saveStudentBtn"),

    id: $("studentId"),
    first: $("firstName"),
    middle: $("middleName"),
    last: $("lastName"),
    gender: $("studentGender"),
    dept: $("studentDepartment"),
    sem: $("studentSemester"),
    year: $("studentAcademicYear"),
    status: $("studentStatus"),

    upload: $("uploadStudentsBtn"),
    uploadModal: $("uploadStudentsModal"),
    closeUpload: $("closeUploadStudentsModalBtn"),
    cancelUpload: $("cancelUploadStudentsBtn"),
    processUpload: $("processStudentUploadBtn"),
    uploadFile: $("studentUploadFile"),

    deleteModal: $("deleteStudentModal"),
    deleteName: $("deleteStudentName"),
    cancelDelete: $("cancelDeleteStudentBtn"),
    confirmDelete: $("confirmDeleteStudentBtn"),

    export: $("exportStudentsBtn")
  };

  let students = [];
  let departments = [];
  let semesters = [];
  let academicYears = [];

  let editingId = null;
  let deletingId = null;

  let uploadFile = null;
  let uploadPreview = null;

  let busy = false;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    moveStaticModalsToBody();
    bindEvents();

    setLoading(true);

    try {
      await Promise.all([
        loadDepartments(),
        loadSemesters(),
        loadAcademicYears()
      ]);

      await loadStudents();

      populateFilters();
      prepareAcademicYear();

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

  function moveStaticModalsToBody() {
    [
      el.modal,
      el.deleteModal,
      el.uploadModal
    ].forEach(modal => {
      if (!modal) {
        return;
      }

      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
    });
  }

  function bindEvents() {
    el.add?.addEventListener(
      "click",
      () => openStudentModal()
    );

    el.closeModal?.addEventListener(
      "click",
      closeStudentModal
    );

    el.cancel?.addEventListener(
      "click",
      closeStudentModal
    );

    el.form?.addEventListener(
      "submit",
      saveStudent
    );

    el.dept?.addEventListener(
      "change",
      updateStudentSemesters
    );

    el.search?.addEventListener(
      "input",
      renderStudents
    );

    el.deptFilter?.addEventListener(
      "change",
      renderStudents
    );

    el.semFilter?.addEventListener(
      "change",
      renderStudents
    );

    el.statusFilter?.addEventListener(
      "change",
      renderStudents
    );

    el.reset?.addEventListener(
      "click",
      resetFilters
    );

    el.table?.addEventListener(
      "click",
      tableAction
    );

    el.cancelDelete?.addEventListener(
      "click",
      closeDeleteModal
    );

    el.confirmDelete?.addEventListener(
      "click",
      deleteStudent
    );

    el.upload?.addEventListener(
      "click",
      openUploadModal
    );

    el.closeUpload?.addEventListener(
      "click",
      closeUploadModal
    );

    el.cancelUpload?.addEventListener(
      "click",
      closeUploadModal
    );

    el.processUpload?.addEventListener(
      "click",
      processUpload
    );

    el.uploadFile?.addEventListener(
      "change",
      () => {
        uploadFile =
          el.uploadFile.files?.[0] || null;
      }
    );

    /*
     * Export is now a direct button.
     * No export popup/modal is used.
     */
    el.export?.addEventListener(
      "click",
      exportStudents
    );

    document.addEventListener(
      "keydown",
      event => {
        if (event.key !== "Escape") {
          return;
        }

        closeStudentModal();
        closeDeleteModal();
        closeUploadModal();

        document
          .querySelectorAll(
            ".atu-dynamic-modal"
          )
          .forEach(hideModal);
      }
    );
  }

  function csrf() {
    const row = document.cookie
      .split("; ")
      .find(
        value =>
          value.startsWith(
            "csrftoken="
          )
      );

    if (!row) {
      return "";
    }

    return decodeURIComponent(
      row
        .split("=")
        .slice(1)
        .join("=")
    );
  }

  async function request(
    url,
    options = {}
  ) {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    const method = (
      options.method || "GET"
    ).toUpperCase();

    if (
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    if (
      [
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ].includes(method)
    ) {
      headers["X-CSRFToken"] =
        csrf();
    }

    const response =
      await fetch(
        url,
        {
          ...options,
          headers,
          credentials:
            "same-origin"
        }
      );

    const type =
      response.headers.get(
        "content-type"
      ) || "";

    let data;

    if (
      type.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      data =
        await response.text();
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

  function list(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (
      Array.isArray(
        data?.results
      )
    ) {
      return data.results;
    }

    return [];
  }

  async function loadStudents() {
    students =
      list(
        await request(
          API.students
        )
      );

    updateSummary();
    renderStudents();
  }

  async function loadDepartments() {
    departments =
      list(
        await request(
          API.departments
        )
      );

    fillSelect(
      el.deptFilter,
      departments,
      "All Departments"
    );

    fillSelect(
      el.dept,
      departments,
      "Select Department",
      false,
      true
    );
  }

  async function loadSemesters() {
    semesters =
      list(
        await request(
          API.semesters
        )
      );

    fillSelect(
      el.semFilter,
      semesters,
      "All Semesters"
    );

    fillSelect(
      el.sem,
      semesters,
      "Select Semester",
      false,
      true
    );
  }

  async function loadAcademicYears() {
    academicYears =
      list(
        await request(
          API.academicYears
        )
      );
  }

  function fillSelect(
    select,
    data,
    placeholder,
    includeAll = true,
    required = false
  ) {
    if (!select) {
      return;
    }

    select.innerHTML =
      `<option value="">${placeholder}</option>` +
      data
        .map(
          item =>
            `<option value="${esc(
              item.id
            )}">
              ${esc(
                item.name ||
                item.title ||
                ""
              )}
              ${
                item.code
                  ? ` (${esc(
                      item.code
                    )})`
                  : ""
              }
            </option>`
        )
        .join("");

    select.required =
      required;
  }

  function populateFilters() {
    fillSelect(
      el.deptFilter,
      departments,
      "All Departments"
    );

    fillSelect(
      el.semFilter,
      semesters,
      "All Semesters"
    );
  }

  function prepareAcademicYear() {
    if (!el.year) {
      return;
    }

    const current =
      academicYears.find(
        item =>
          item.is_current
      ) ||
      academicYears[0];

    if (current) {
      el.year.innerHTML =
        `<option value="${esc(
          current.id
        )}">
          ${esc(current.name)}
        </option>`;

      el.year.value =
        current.id;
    } else {
      el.year.innerHTML =
        `<option value="">
          Not configured
        </option>`;

      el.year.value =
        "";
    }

    el.year.disabled =
      true;
  }

  function updateStudentSemesters() {
    /*
     * Semester is currently a reusable
     * global academic entity in the backend.
     *
     * Therefore all semesters remain
     * available when Department changes.
     */
  }

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

    setText(
      el.total,
      total
    );

    setText(
      el.active,
      active
    );

    setText(
      el.inactive,
      inactive
    );

    setText(
      el.graduated,
      graduated
    );
  }

  function filteredStudents() {
    const search =
      (
        el.search?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const department =
      el.deptFilter?.value ||
      "";

    const semester =
      el.semFilter?.value ||
      "";

    const status =
      el.statusFilter?.value ||
      "";

    return students.filter(
      student => {
        const name =
          fullName(student)
            .toLowerCase();

        const matchesSearch =
          !search ||
          String(
            student.student_id ||
            ""
          )
            .toLowerCase()
            .includes(search) ||
          name.includes(search);

        const matchesDepartment =
          !department ||
          String(
            student.department
          ) ===
            department;

        const matchesSemester =
          !semester ||
          String(
            student.semester
          ) ===
            semester;

        const matchesStatus =
          !status ||
          student.status ===
            status;

        return (
          matchesSearch &&
          matchesDepartment &&
          matchesSemester &&
          matchesStatus
        );
      }
    );
  }

  function renderStudents() {
    if (!el.table) {
      return;
    }

    const rows =
      filteredStudents();

    setText(
      el.resultCount,
      rows.length
    );

    el.table.innerHTML =
      rows
        .map(studentRow)
        .join("");

    if (el.empty) {
      el.empty.classList.toggle(
        "hidden",
        rows.length !== 0
      );
    }

    if (el.loading) {
      el.loading.classList.add(
        "hidden"
      );
    }
  }

  function studentRow(
    student
  ) {
    return `
      <tr
        class="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
      >

        <td
          class="px-4 py-3 font-medium text-gray-900 dark:text-slate-100"
        >
          ${esc(
            student.student_id ||
            "—"
          )}
        </td>

        <td
          class="px-4 py-3 text-gray-800 dark:text-slate-200"
        >
          ${esc(
            fullName(student) ||
            "—"
          )}
        </td>

        <td
          class="px-4 py-3 text-gray-600 dark:text-slate-300"
        >
          ${esc(
            displayGender(
              student.gender
            )
          )}
        </td>

        <td
          class="px-4 py-3 text-gray-600 dark:text-slate-300"
        >
          ${esc(
            student.department_name ||
            lookup(
              departments,
              student.department
            ) ||
            "—"
          )}
        </td>

        <td
          class="px-4 py-3 text-gray-600 dark:text-slate-300"
        >
          ${esc(
            student.semester_name ||
            lookup(
              semesters,
              student.semester
            ) ||
            "—"
          )}
        </td>

        <td
          class="px-4 py-3 text-gray-600 dark:text-slate-300"
        >
          ${esc(
            student.academic_year_name ||
            lookup(
              academicYears,
              student.academic_year
            ) ||
            "—"
          )}
        </td>

        <td class="px-4 py-3">
          ${statusBadge(
            student.status
          )}
        </td>

        <td class="px-4 py-3">

          <div
            class="flex items-center gap-1"
          >

            <button
              type="button"
              data-action="view"
              data-id="${esc(
                student.id
              )}"
              class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="View"
            >
              ${eyeIcon()}
            </button>

            <button
              type="button"
              data-action="edit"
              data-id="${esc(
                student.id
              )}"
              class="rounded p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700"
              title="Edit"
            >
              ${editIcon()}
            </button>

            <button
              type="button"
              data-action="delete"
              data-id="${esc(
                student.id
              )}"
              class="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-700"
              title="Delete"
            >
              ${deleteIcon()}
            </button>

          </div>

        </td>

      </tr>
    `;
  }

  function tableAction(event) {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) {
      return;
    }

    const student =
      students.find(
        item =>
          String(item.id) ===
          String(
            button.dataset.id
          )
      );

    if (!student) {
      return;
    }

    if (
      button.dataset.action ===
      "view"
    ) {
      openViewModal(
        student
      );
    }

    if (
      button.dataset.action ===
      "edit"
    ) {
      openStudentModal(
        student
      );
    }

    if (
      button.dataset.action ===
      "delete"
    ) {
      openDeleteModal(
        student
      );
    }
  }

  function openStudentModal(
    student = null
  ) {
    editingId =
      student?.id || null;

    if (el.modalTitle) {
      el.modalTitle.textContent =
        student
          ? "Edit Student"
          : "Add Student";
    }

    if (el.form) {
      el.form.reset();
    }

    setVal(
      el.id,
      student?.student_id ||
        "Automatic"
    );

    if (el.id) {
      el.id.readOnly =
        true;
    }

    setVal(
      el.first,
      student?.first_name ||
        ""
    );

    setVal(
      el.middle,
      student?.middle_name ||
        ""
    );

    setVal(
      el.last,
      student?.last_name ||
        ""
    );

    setVal(
      el.gender,
      student?.gender ||
        ""
    );

    setVal(
      el.dept,
      student?.department ||
        ""
    );

    setVal(
      el.sem,
      student?.semester ||
        ""
    );

    setVal(
      el.status,
      student?.status ||
        "ACTIVE"
    );

    prepareAcademicYear();

    /*
     * ONLY EDIT MODAL:
     * Make the Edit Student panel smaller.
     *
     * Delete modal is not changed.
     */
    if (el.modal) {
      const panel =
        el.modal.querySelector(
          ".student-modal-panel"
        );

      if (panel) {
        if (student) {
          panel.style.width =
            "760px";

          panel.style.maxWidth =
            "calc(100vw - 40px)";
        } else {
          panel.style.width =
            "";

          panel.style.maxWidth =
            "";
        }
      }

      showModal(
        el.modal
      );
    }
  }

  function closeStudentModal() {
    if (el.modal) {
      hideModal(
        el.modal
      );
    }

    editingId =
      null;
  }

  async function saveStudent(
    event
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const first =
      val(el.first);

    const middle =
      val(el.middle);

    const last =
      val(el.last);

    const gender =
      val(el.gender);

    const department =
      val(el.dept);

    const semester =
      val(el.sem);

    const status =
      val(el.status);

    const errors =
      [];

    if (!first) {
      errors.push(
        "First Name is required."
      );
    }

    if (!last) {
      errors.push(
        "Last Name is required."
      );
    }

    if (!gender) {
      errors.push(
        "Gender is required."
      );
    }

    if (!department) {
      errors.push(
        "Department is required."
      );
    }

    if (!semester) {
      errors.push(
        "Semester is required."
      );
    }

    if (!status) {
      errors.push(
        "Status is required."
      );
    }

    if (errors.length) {
      showError(
        errors.join(" ")
      );

      return;
    }

    const payload = {
      first_name:
        first,
      middle_name:
        middle,
      last_name:
        last,
      gender,
      department:
        Number(
          department
        ),
      semester:
        Number(
          semester
        ),
      status
    };

    const wasEditing =
      Boolean(
        editingId
      );

    busy = true;

    setButtonBusy(
      el.save,
      true,
      wasEditing
        ? "Saving..."
        : "Creating..."
    );

    try {
      if (wasEditing) {
        await request(
          `${API.students}${editingId}/`,
          {
            method:
              "PATCH",
            body:
              JSON.stringify(
                payload
              )
          }
        );

      } else {
        await request(
          API.students,
          {
            method:
              "POST",
            body:
              JSON.stringify(
                payload
              )
          }
        );
      }

      closeStudentModal();

      await loadStudents();

      populateFilters();

      showSuccess(
        wasEditing
          ? "Student updated successfully."
          : "Student created successfully."
      );

    } catch (error) {
      console.error(
        "Save student error:",
        error
      );

      showApiError(
        error,
        "Unable to save student."
      );

    } finally {
      busy = false;

      setButtonBusy(
        el.save,
        false,
        "Save Student"
      );
    }
  }

  function openViewModal(
    student
  ) {
    const modal =
      dynamicModal(`
        <div
          class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >

          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700"
          >

            <h3
              class="text-lg font-semibold text-gray-900 dark:text-slate-100"
            >
              Student Details
            </h3>

            <button
              type="button"
              data-close
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"
            >
              ${closeIcon()}
            </button>

          </div>

          <div
            class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          >

            ${detail(
              "Student ID",
              student.student_id
            )}

            ${detail(
              "Full Name",
              fullName(student)
            )}

            ${detail(
              "Gender",
              displayGender(
                student.gender
              )
            )}

            ${detail(
              "Department",
              student.department_name ||
                lookup(
                  departments,
                  student.department
                )
            )}

            ${detail(
              "Semester",
              student.semester_name ||
                lookup(
                  semesters,
                  student.semester
                )
            )}

            ${detail(
              "Academic Year",
              student.academic_year_name ||
                lookup(
                  academicYears,
                  student.academic_year
                )
            )}

            ${detail(
              "Status",
              displayStatus(
                student.status
              )
            )}

          </div>

          <div
            class="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end"
          >

            <button
              type="button"
              data-close
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-100"
            >
              Close
            </button>

          </div>

        </div>
      `);

    showModal(
      modal
    );
  }

  function openDeleteModal(
    student
  ) {
    deletingId =
      student.id;

    if (el.deleteName) {
      el.deleteName.textContent =
        fullName(student);
    }

    if (el.deleteModal) {
      showModal(
        el.deleteModal
      );
    }
  }

  function closeDeleteModal() {
    if (el.deleteModal) {
      hideModal(
        el.deleteModal
      );
    }

    deletingId =
      null;
  }

  async function deleteStudent() {
    if (
      !deletingId ||
      busy
    ) {
      return;
    }

    busy = true;

    setButtonBusy(
      el.confirmDelete,
      true,
      "Deleting..."
    );

    try {
      await request(
        `${API.students}${deletingId}/`,
        {
          method:
            "DELETE"
        }
      );

      closeDeleteModal();

      await loadStudents();

      showSuccess(
        "Student deleted successfully."
      );

    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      showApiError(
        error,
        "Unable to delete student."
      );

    } finally {
      busy = false;

      setButtonBusy(
        el.confirmDelete,
        false,
        "Delete Student"
      );
    }
  }

  function openUploadModal() {
    if (!el.uploadModal) {
      return;
    }

    el.uploadModal
      .querySelector(
        "[data-upload-preview]"
      )
      ?.remove();

    if (el.uploadFile) {
      el.uploadFile.value =
        "";
    }

    uploadFile =
      null;

    uploadPreview =
      null;

    showModal(
      el.uploadModal
    );
  }

  function closeUploadModal() {
    if (el.uploadModal) {
      hideModal(
        el.uploadModal
      );
    }
  }

  async function processUpload() {
    if (busy) {
      return;
    }

    if (
      !el.uploadFile?.files?.[0]
    ) {
      showError(
        "Please select a CSV or Excel file first."
      );

      return;
    }

    uploadFile =
      el.uploadFile.files[0];

    const extension =
      uploadFile.name
        .split(".")
        .pop()
        .toLowerCase();

    if (
      ![
        "csv",
        "xlsx",
        "xls"
      ].includes(
        extension
      )
    ) {
      showError(
        "Please select a valid CSV or Excel file."
      );

      return;
    }

    busy = true;

    setButtonBusy(
      el.processUpload,
      true,
      "Checking file..."
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        uploadFile
      );

      formData.append(
        "confirm",
        "false"
      );

      uploadPreview =
        await request(
          API.bulkUpload,
          {
            method:
              "POST",
            body:
              formData
          }
        );

      closeUploadModal();

      showUploadPreview(
        uploadPreview
      );

    } catch (error) {
      console.error(
        "Upload preview error:",
        error
      );

      showApiError(
        error,
        "Unable to process student file."
      );

    } finally {
      busy = false;

      setButtonBusy(
        el.processUpload,
        false,
        "Continue"
      );
    }
  }

  function showUploadPreview(
    data
  ) {
    const rows =
      Array.isArray(
        data?.rows
      )
        ? data.rows
        : [];

    const valid =
      data?.valid === true;

    const validRows =
      rows.filter(
        row =>
          !(
            row.errors &&
            row.errors.length
          )
      ).length;

    const errorRows =
      rows.filter(
        row =>
          row.errors &&
          row.errors.length
      ).length;

    const warningCount =
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          (
            row.warnings?.length ||
            0
          ),
        0
      );

    const modal =
      dynamicModal(`
        <div
          data-upload-preview
          class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        >

          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700"
          >

            <div>

              <h3
                class="text-lg font-semibold text-gray-900 dark:text-slate-100"
              >
                Student Import Preview
              </h3>

              <p
                class="text-sm text-gray-500 dark:text-slate-400 mt-1"
              >
                ${esc(
                  data?.message ||
                    `${rows.length} row(s) checked.`
                )}
              </p>

            </div>

            <button
              type="button"
              data-close
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"
            >
              ${closeIcon()}
            </button>

          </div>

          <div
            class="px-6 py-3 bg-gray-50 dark:bg-slate-900/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
          >

            <div>
              <b
                class="text-gray-900 dark:text-slate-100"
              >
                ${rows.length}
              </b>

              <span
                class="text-gray-500 dark:text-slate-400 ml-1"
              >
                Rows
              </span>
            </div>

            <div>
              <b
                class="text-gray-900 dark:text-slate-100"
              >
                ${validRows}
              </b>

              <span
                class="text-gray-500 dark:text-slate-400 ml-1"
              >
                Valid
              </span>
            </div>

            <div>
              <b
                class="text-gray-900 dark:text-slate-100"
              >
                ${errorRows}
              </b>

              <span
                class="text-gray-500 dark:text-slate-400 ml-1"
              >
                Errors
              </span>
            </div>

            <div>
              <b
                class="text-gray-900 dark:text-slate-100"
              >
                ${warningCount}
              </b>

              <span
                class="text-gray-500 dark:text-slate-400 ml-1"
              >
                Warnings
              </span>
            </div>

          </div>

          <div
            class="overflow-auto flex-1"
          >

            <table
              class="min-w-full text-sm"
            >

              <thead
                class="sticky top-0 bg-gray-100 dark:bg-slate-900"
              >

                <tr>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Row
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Student ID
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Name
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Department
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Semester
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Academic Year
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Status
                  </th>

                  <th
                    class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200"
                  >
                    Validation
                  </th>

                </tr>

              </thead>

              <tbody>

                ${
                  rows.length
                    ? rows
                        .map(
                          (
                            row,
                            index
                          ) => `
                            <tr
                              class="border-b border-gray-100 dark:border-slate-700"
                            >

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${
                                  index +
                                  2
                                }
                              </td>

                              <td
                                class="px-4 py-3 font-medium text-gray-900 dark:text-slate-100"
                              >
                                ${esc(
                                  row.student_id
                                )}
                              </td>

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${esc(
                                  [
                                    row.first_name,
                                    row.middle_name,
                                    row.last_name
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      " "
                                    )
                                )}
                              </td>

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${esc(
                                  row.department_name ||
                                    row.department ||
                                    ""
                                )}
                              </td>

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${esc(
                                  row.semester_name ||
                                    row.semester ||
                                    ""
                                )}
                              </td>

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${esc(
                                  row.academic_year_name ||
                                    row.academic_year ||
                                    ""
                                )}
                              </td>

                              <td
                                class="px-4 py-3 text-gray-700 dark:text-slate-200"
                              >
                                ${esc(
                                  displayStatus(
                                    row.status
                                  )
                                )}
                              </td>

                              <td
                                class="px-4 py-3"
                              >
                                ${validation(
                                  row
                                )}
                              </td>

                            </tr>
                          `
                        )
                        .join("")
                    : `
                        <tr>
                          <td
                            colspan="8"
                            class="px-4 py-8 text-center text-gray-500 dark:text-slate-400"
                          >
                            No rows found.
                          </td>
                        </tr>
                      `
                }

              </tbody>

            </table>

          </div>

          <div
            class="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2"
          >

            <button
              type="button"
              data-close
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              data-confirm-upload
              class="px-4 py-2 rounded-lg text-white ${
                valid
                  ? "bg-[#8B1538] hover:bg-[#720E24]"
                  : "bg-gray-300 cursor-not-allowed"
              }"
              ${
                valid
                  ? ""
                  : "disabled"
              }
            >
              Confirm Import
            </button>

          </div>

        </div>
      `);

    modal
      .querySelector(
        "[data-confirm-upload]"
      )
      ?.addEventListener(
        "click",
        () =>
          confirmUpload(
            modal
          )
      );

    showModal(
      modal
    );
  }

  async function confirmUpload(
    modal
  ) {
    if (
      !uploadFile ||
      !uploadPreview?.valid ||
      busy
    ) {
      return;
    }

    const button =
      modal.querySelector(
        "[data-confirm-upload]"
      );

    busy = true;

    if (button) {
      button.disabled =
        true;

      button.textContent =
        "Importing...";
    }

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        uploadFile
      );

      formData.append(
        "confirm",
        "true"
      );

      const result =
        await request(
          API.bulkUpload,
          {
            method:
              "POST",
            body:
              formData
          }
        );

      hideModal(
        modal
      );

      uploadFile =
        null;

      uploadPreview =
        null;

      await loadStudents();

      showSuccess(
        result?.message ||
          `${
            result?.created ??
            result?.count ??
            "Students"
          } imported successfully.`
      );

    } catch (error) {
      console.error(
        "Student import error:",
        error
      );

      showApiError(
        error,
        "Unable to import students."
      );

      if (button) {
        button.disabled =
          false;

        button.textContent =
          "Confirm Import";
      }

    } finally {
      busy = false;
    }
  }

  /*
   * Direct Student Export
   *
   * No export modal.
   *
   * If Search / Department / Semester / Status
   * has a value, only the current filtered
   * records are exported.
   *
   * If nothing is selected, all students
   * are exported.
   *
   * IMPORTANT:
   * Do not send an Excel MIME type in the
   * Accept header. Django REST Framework
   * otherwise returns HTTP 406.
   */
  async function exportStudents() {
    if (busy) {
      return;
    }

    const button =
      el.export;

    const search =
      val(el.search);

    const department =
      el.deptFilter?.value ||
      "";

    const semester =
      el.semFilter?.value ||
      "";

    const status =
      el.statusFilter?.value ||
      "";

    const hasFilters =
      Boolean(
        search ||
        department ||
        semester ||
        status
      );

    busy = true;

    setButtonBusy(
      button,
      true,
      "Exporting..."
    );

    try {
      const params =
        new URLSearchParams();

      params.set(
        "scope",
        hasFilters
          ? "filtered"
          : "all"
      );

      if (search) {
        params.set(
          "search",
          search
        );
      }

      if (department) {
        params.set(
          "department",
          department
        );

        const departmentObject =
          departments.find(
            item =>
              String(item.id) ===
              String(department)
          );

        if (
          departmentObject?.name
        ) {
          params.set(
            "department_name",
            departmentObject.name
          );
        }
      }

      if (semester) {
        params.set(
          "semester",
          semester
        );

        const semesterObject =
          semesters.find(
            item =>
              String(item.id) ===
              String(semester)
          );

        if (
          semesterObject?.name
        ) {
          params.set(
            "semester_name",
            semesterObject.name
          );
        }
      }

      if (status) {
        params.set(
          "status",
          status
        );
      }

      const response =
        await fetch(
          `${API.exportStudents}?${params.toString()}`,
          {
            method:
              "GET",
            credentials:
              "same-origin"
          }
        );

      if (!response.ok) {
        let message =
          "Unable to export students.";

        try {
          const data =
            await response.json();

          message =
            data?.detail ||
            data?.message ||
            message;

        } catch (_) {
          // Keep fallback message.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const disposition =
        response.headers.get(
          "Content-Disposition"
        ) || "";

      const filenameMatch =
        disposition.match(
          /filename="?([^";]+)"?/i
        );

      const filename =
        filenameMatch?.[1] ||
        (
          hasFilters
            ? "ATU_Students_Filtered.xlsx"
            : "ATU_Students_All.xlsx"
        );

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;

      anchor.download =
        filename;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );

      showSuccess(
        hasFilters
          ? "Current search/filter results exported successfully."
          : "All students exported successfully."
      );

    } catch (error) {
      console.error(
        "Student export error:",
        error
      );

      showError(
        error.message ||
          "Unable to export students."
      );

    } finally {
      busy = false;

      setButtonBusy(
        button,
        false,
        "Export Students"
      );
    }
  }

  function resetFilters() {
    if (el.search) {
      el.search.value =
        "";
    }

    if (el.deptFilter) {
      el.deptFilter.value =
        "";
    }

    if (el.semFilter) {
      el.semFilter.value =
        "";
    }

    if (el.statusFilter) {
      el.statusFilter.value =
        "";
    }

    renderStudents();
  }

  function setLoading(
    value
  ) {
    el.loading?.classList.toggle(
      "hidden",
      !value
    );

    if (value) {
      el.empty?.classList.add(
        "hidden"
      );
    }
  }

  function setText(
    element,
    value
  ) {
    if (element) {
      element.textContent =
        String(value);
    }
  }

  function val(
    element
  ) {
    return (
      element?.value
        ?.trim?.() ??
      ""
    );
  }

  function setVal(
    element,
    value
  ) {
    if (element) {
      element.value =
        value ?? "";
    }
  }

  function setButtonBusy(
    button,
    isBusy,
    text
  ) {
    if (!button) {
      return;
    }

    button.disabled =
      isBusy;

    if (isBusy) {
      button.dataset.originalText =
        button.innerHTML;

      button.innerHTML =
        text;

    } else if (
      button.dataset.originalText
    ) {
      button.innerHTML =
        button.dataset.originalText;

      delete button
        .dataset
        .originalText;
    }
  }

  function fullName(
    student
  ) {
    return [
      student.first_name,
      student.middle_name,
      student.last_name
    ]
      .filter(
        value =>
          value &&
          String(
            value
          ).trim()
      )
      .join(" ");
  }

  function lookup(
    array,
    id
  ) {
    const item =
      array.find(
        value =>
          String(
            value.id
          ) ===
          String(id)
      );

    return (
      item?.name ||
      ""
    );
  }

  function displayGender(
    value
  ) {
    if (
      value ===
      "MALE"
    ) {
      return "Male";
    }

    if (
      value ===
      "FEMALE"
    ) {
      return "Female";
    }

    return value ||
      "—";
  }

  function displayStatus(
    value
  ) {
    if (
      value ===
      "ACTIVE"
    ) {
      return "Active";
    }

    if (
      value ===
      "INACTIVE"
    ) {
      return "Inactive";
    }

    if (
      value ===
      "GRADUATED"
    ) {
      return "Graduated";
    }

    return value ||
      "—";
  }

  function statusBadge(
    value
  ) {
    const className =
      value ===
      "ACTIVE"
        ? "bg-green-100 text-green-700"
        : value ===
          "GRADUATED"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-700";

    return `
      <span
        class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}"
      >
        ${esc(
          displayStatus(
            value
          )
        )}
      </span>
    `;
  }

  function validation(
    row
  ) {
    const errors =
      row.errors ||
      [];

    const warnings =
      row.warnings ||
      [];

    if (
      errors.length
    ) {
      return `
        <div
          class="text-red-600 dark:text-red-400"
        >
          ${errors
            .map(
              error =>
                `<div>
                  • ${esc(error)}
                </div>`
            )
            .join("")}
        </div>
      `;
    }

    if (
      warnings.length
    ) {
      return `
        <div
          class="text-amber-600 dark:text-amber-400"
        >
          ${warnings
            .map(
              warning =>
                `<div>
                  • ${esc(
                    warning
                  )}
                </div>`
            )
            .join("")}
        </div>
      `;
    }

    return `
      <span
        class="text-green-600 dark:text-green-400"
      >
        Valid
      </span>
    `;
  }

  function detail(
    label,
    value
  ) {
    return `
      <div
        class="rounded-lg bg-gray-50 dark:bg-slate-900/60 p-4"
      >

        <div
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          ${esc(
            label
          )}
        </div>

        <div
          class="mt-1 font-medium text-gray-900 dark:text-slate-100"
        >
          ${esc(
            value ||
            "—"
          )}
        </div>

      </div>
    `;
  }

  function dynamicModal(
    content
  ) {
    const modal =
      document.createElement(
        "div"
      );

    modal.className =
      "atu-dynamic-modal fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4";

    modal.innerHTML =
      content;

    modal.addEventListener(
      "click",
      event => {
        if (
          event.target ===
          modal ||
          event.target.closest(
            "[data-close]"
          )
        ) {
          hideModal(
            modal
          );
        }
      }
    );

    document.body.appendChild(
      modal
    );

    return modal;
  }

  function showModal(
    modal
  ) {
    if (!modal) {
      return;
    }

    /*
     * Static modals must be direct
     * children of <body>.
     *
     * This prevents transformed or
     * overflow parents from changing
     * the fixed modal position.
     */
    if (
      !modal.classList.contains(
        "atu-dynamic-modal"
      ) &&
      modal.parentElement !==
        document.body
    ) {
      document.body.appendChild(
        modal
      );
    }

    modal.classList.remove(
      "hidden"
    );

    /*
     * The static modal already has:
     *
     * items-center
     * justify-center
     *
     * but these only work when the
     * overlay is a flex container.
     */
    if (
      !modal.classList.contains(
        "atu-dynamic-modal"
      )
    ) {
      modal.classList.add(
        "flex"
      );
    }

    modal.removeAttribute(
      "aria-hidden"
    );

    document.body.classList.add(
      "overflow-hidden"
    );
  }

  function hideModal(
    modal
  ) {
    if (!modal) {
      return;
    }

    if (
      modal.classList.contains(
        "atu-dynamic-modal"
      )
    ) {
      modal.remove();

      document.body.classList.remove(
        "overflow-hidden"
      );

      return;
    }

    modal.classList.add(
      "hidden"
    );

    modal.classList.remove(
      "flex"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    const visibleModal =
      document.querySelector(
        ".atu-dynamic-modal:not(.hidden)"
      ) ||
      document.querySelector(
        "#studentModal:not(.hidden), #viewStudentModal:not(.hidden), #deleteStudentModal:not(.hidden), #uploadStudentsModal:not(.hidden)"
      );

    if (!visibleModal) {
      document.body.classList.remove(
        "overflow-hidden"
      );
    }
  }

  function showApiError(
    error,
    fallback
  ) {
    const data =
      error?.data;

    if (
      data &&
      typeof data ===
        "object"
    ) {
      const messages =
        [];

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
              `${field}: ${value.join(
                ", "
              )}`
            );

          } else if (
            value &&
            typeof value ===
              "object"
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

  function showSuccess(
    message
  ) {
    notify(
      message,
      "success"
    );
  }

  function showError(
    message
  ) {
    notify(
      message,
      "error"
    );
  }

  function notify(
    message,
    type
  ) {
    const notification =
      document.createElement(
        "div"
      );

    notification.className =
      `fixed right-4 top-4 z-[100000] max-w-md rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
        type ===
        "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`;

    notification.textContent =
      message;

    document.body.appendChild(
      notification
    );

    setTimeout(
      () => {
        notification.style.opacity =
          "0";

        notification.style.transition =
          "opacity 250ms ease";

        setTimeout(
          () =>
            notification.remove(),
          250
        );
      },
      3500
    );
  }

  function esc(
    value
  ) {
    return String(
      value ?? ""
    ).replace(
      /[&<>'"]/g,
      character =>
        ({
          "&":
            "&amp;",
          "<":
            "&lt;",
          ">":
            "&gt;",
          "'":
            "&#39;",
          '"':
            "&quot;"
        }[
          character
        ])
    );
  }

  function eyeIcon() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        />

        <circle
          cx="12"
          cy="12"
          r="3"
        />
      </svg>
    `;
  }

  function editIcon() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 20h9"
        />

        <path
          d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"
        />
      </svg>
    `;
  }

  function deleteIcon() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M3 6h18"
        />

        <path
          d="M8 6V4h8v2"
        />

        <path
          d="M19 6v14H5V6"
        />

        <path
          d="M10 11v5M14 11v5"
        />
      </svg>
    `;
  }

  function closeIcon() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          d="m18 6-12 12M6 6l12 12"
        />
      </svg>
    `;
  }

  function downloadIcon() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3v12"
        />

        <path
          d="m7 10 5 5 5-5"
        />

        <path
          d="M5 21h14"
        />
      </svg>
    `;
  }
})();