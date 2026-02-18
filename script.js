const PREFIX = "thridwebsite_";

const LEGACY_DAILY_KEY = null;
const LEGACY_ATTENDANCE_KEY = null;
const LEGACY_WRITEUP_KEY = null;
const LEGACY_NOTES_KEY = null;
const LEGACY_THEME_KEY = null;

const DAILY_KEY = `${PREFIX}daily_updates_v1`;
const ATTENDANCE_KEY = `${PREFIX}attendance_records_v1`;
const WRITEUP_KEY = `${PREFIX}writeups_records_v1`;
const NOTES_KEY = `${PREFIX}notes_records_v1`;
const THEME_KEY = `${PREFIX}theme_v1`;

const RESET_KEYS = [
  DAILY_KEY,
  ATTENDANCE_KEY,
  WRITEUP_KEY,
  NOTES_KEY,
  THEME_KEY,
  LEGACY_DAILY_KEY,
  LEGACY_ATTENDANCE_KEY,
  LEGACY_WRITEUP_KEY,
  LEGACY_NOTES_KEY,
  LEGACY_THEME_KEY,
].filter(Boolean);

const page = document.body.dataset.page || "dashboard";
const themeToggle = document.getElementById("themeToggle");
const toast = document.getElementById("toast");
const storageNotice = document.getElementById("storageNotice");

let toastTimer = null;

function getToday() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getNowIso() {
  return new Date().toISOString();
}

function getSortValue(item) {
  return item.createdAt || `${item.date || ""}T00:00:00`;
}

function getDisplayDateTime(item) {
  const dateText = item.date || "";
  if (!item.createdAt) {
    return dateText;
  }

  const stamp = new Date(item.createdAt);
  if (Number.isNaN(stamp.getTime())) {
    return dateText;
  }

  const timeText = stamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateText} • ${timeText}`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createStorage() {
  const memoryStore = new Map();

  function createAdapter(type, target) {
    return {
      type,
      get(key) {
        return target.getItem(key);
      },
      set(key, value) {
        target.setItem(key, value);
      },
      remove(key) {
        target.removeItem(key);
      },
    };
  }

  function validate(adapter) {
    try {
      const testKey = `${PREFIX}storage_test`;
      adapter.set(testKey, "1");
      const ok = adapter.get(testKey) === "1";
      adapter.remove(testKey);
      return ok;
    } catch {
      return false;
    }
  }

  try {
    const localAdapter = createAdapter("localStorage", localStorage);
    if (validate(localAdapter)) {
      return localAdapter;
    }
  } catch {}

  try {
    const sessionAdapter = createAdapter("sessionStorage", sessionStorage);
    if (validate(sessionAdapter)) {
      return sessionAdapter;
    }
  } catch {}

  const cookieAdapter = {
    type: "cookie",
    get(key) {
      const encoded = encodeURIComponent(key);
      const match = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${encoded}=`));
      return match ? decodeURIComponent(match.split("=")[1]) : null;
    },
    set(key, value) {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value);
      const oneYearSeconds = 60 * 60 * 24 * 365;
      document.cookie = `${encodedKey}=${encodedValue}; max-age=${oneYearSeconds}; path=/; SameSite=Lax`;
    },
    remove(key) {
      const encodedKey = encodeURIComponent(key);
      document.cookie = `${encodedKey}=; max-age=0; path=/; SameSite=Lax`;
    },
  };

  if (validate(cookieAdapter)) {
    return cookieAdapter;
  }

  return {
    type: "memory",
    get(key) {
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    set(key, value) {
      memoryStore.set(key, value);
    },
    remove(key) {
      memoryStore.delete(key);
    },
  };
}

const storage = createStorage();

function parseArray(raw) {
  if (!raw) {
    return [];
  }
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadData(key, legacyKey) {
  const current = parseArray(storage.get(key));
  if (current.length > 0 || !legacyKey) {
    return current;
  }

  const legacy = parseArray(storage.get(legacyKey));
  if (legacy.length > 0) {
    saveData(key, legacy);
  }
  return legacy;
}

function loadTheme() {
  return storage.get(THEME_KEY) || storage.get(LEGACY_THEME_KEY) || "light";
}

function saveData(key, data) {
  storage.set(key, JSON.stringify(data));
}

function removeData(key) {
  storage.remove(key);
}

function showToast(message) {
  if (!toast) {
    return;
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function confirmDelete(itemLabel) {
  return confirm(`Delete this ${itemLabel}?`);
}

function generateCaptchaCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function resetAllDataWithVerification() {
  const shouldReset = confirm(
    "This will reset all saved data from all pages. Continue?",
  );
  if (!shouldReset) {
    return;
  }

  const captcha = generateCaptchaCode();
  const entered = prompt(
    `Captcha verification required.\nType this code exactly to reset: ${captcha}`,
  );

  if (entered === null) {
    return;
  }

  if (entered.trim().toUpperCase() !== captcha) {
    alert("Captcha verification failed. Reset cancelled.");
    return;
  }

  RESET_KEYS.forEach((key) => removeData(key));
  updates = [];
  attendance = [];
  writeups = [];
  notes = [];

  alert("All data has been reset successfully.");
  location.reload();
}

function setupResetButton() {
  const topbarRow = document.querySelector(".topbar-row");
  if (!topbarRow || document.getElementById("resetAllDataBtn")) {
    return;
  }

  let actions = topbarRow.querySelector(".topbar-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "topbar-actions";
    topbarRow.appendChild(actions);
  }

  if (themeToggle && themeToggle.parentElement !== actions) {
    actions.appendChild(themeToggle);
  }

  const resetButton = document.createElement("button");
  resetButton.id = "resetAllDataBtn";
  resetButton.type = "button";
  resetButton.className = "btn danger reset-btn";
  resetButton.textContent = "Reset All Data";
  resetButton.addEventListener("click", resetAllDataWithVerification);
  actions.appendChild(resetButton);
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

let updates = loadData(DAILY_KEY, LEGACY_DAILY_KEY);
let attendance = loadData(ATTENDANCE_KEY, LEGACY_ATTENDANCE_KEY);
let writeups = loadData(WRITEUP_KEY, LEGACY_WRITEUP_KEY);
let notes = loadData(NOTES_KEY, LEGACY_NOTES_KEY);

function updateAttendanceSummary() {
  const total = attendance.length;
  const present = attendance.filter((item) => item.status === "Present").length;
  const absent = total - present;
  const percent = total ? ((present / total) * 100).toFixed(2) : "0.00";

  const totalClasses = document.getElementById("totalClasses");
  const presentCount = document.getElementById("presentCount");
  const absentCount = document.getElementById("absentCount");
  const attendancePercent = document.getElementById("attendancePercent");

  if (totalClasses) {
    totalClasses.textContent = String(total);
  }
  if (presentCount) {
    presentCount.textContent = String(present);
  }
  if (absentCount) {
    absentCount.textContent = String(absent);
  }
  if (attendancePercent) {
    attendancePercent.textContent = `${percent}%`;
  }
}

function updateWriteupSummary() {
  const total = writeups.length;
  const checked = writeups.filter((item) => item.status === "Checked").length;
  const pending = total - checked;

  const totalWriteups = document.getElementById("totalWriteups");
  const pendingWriteups = document.getElementById("pendingWriteups");
  const checkedWriteups = document.getElementById("checkedWriteups");

  if (totalWriteups) {
    totalWriteups.textContent = String(total);
  }
  if (pendingWriteups) {
    pendingWriteups.textContent = String(pending);
  }
  if (checkedWriteups) {
    checkedWriteups.textContent = String(checked);
  }
}

function updateNotesSummary() {
  const total = notes.length;
  const totalNotes = document.getElementById("totalNotes");
  if (totalNotes) {
    totalNotes.textContent = String(total);
  }
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  if (themeToggle) {
    themeToggle.textContent = dark ? "Light Mode" : "Dark Mode";
  }
  storage.set(THEME_KEY, dark ? "dark" : "light");
}

function renderUpdates() {
  const dailyList = document.getElementById("dailyList");
  if (!dailyList) {
    return;
  }

  const updateSearch = document.getElementById("updateSearch");
  const query = (updateSearch?.value || "").trim().toLowerCase();
  const filtered = [...updates]
    .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
    .filter((item) => {
      if (!query) {
        return true;
      }
      const haystack = `${item.title} ${item.notes || ""}`.toLowerCase();
      return haystack.includes(query);
    });

  if (!filtered.length) {
    dailyList.innerHTML = '<p class="empty">No matching daily updates.</p>';
    return;
  }

  dailyList.innerHTML = filtered
    .map((item) => {
      const note = item.notes?.trim()
        ? `<p class="item-note">${escapeHtml(item.notes)}</p>`
        : "";
      return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${escapeHtml(item.title)}</span>
          <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
        </div>
        ${note}
        <div class="item-actions">
          <button class="action-btn" data-update-id="${item.id}">Delete</button>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderAttendance() {
  const attendanceBody = document.getElementById("attendanceBody");
  if (!attendanceBody) {
    renderSubjectAttendanceSummary();
    updateAttendanceSummary();
    return;
  }

  const attendanceFilter = document.getElementById("attendanceFilter");
  const filterValue = attendanceFilter?.value || "All";
  const filtered = [...attendance]
    .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
    .filter((item) =>
      filterValue === "All" ? true : item.status === filterValue,
    );

  if (!filtered.length) {
    attendanceBody.innerHTML =
      '<tr><td colspan="4" class="empty">No attendance records for this filter.</td></tr>';
    renderSubjectAttendanceSummary();
    updateAttendanceSummary();
    return;
  }

  attendanceBody.innerHTML = filtered
    .map((item) => {
      const statusClass =
        item.status === "Present" ? "status-present" : "status-absent";
      return `
      <tr>
        <td>${escapeHtml(getDisplayDateTime(item))}</td>
        <td>${escapeHtml(item.subject)}</td>
        <td class="${statusClass}">${item.status}</td>
        <td><button class="action-btn" data-attendance-id="${item.id}">Delete</button></td>
      </tr>
    `;
    })
    .join("");

  renderSubjectAttendanceSummary();
  updateAttendanceSummary();
}

function renderSubjectAttendanceSummary() {
  const subjectAttendanceBody = document.getElementById(
    "subjectAttendanceBody",
  );
  if (!subjectAttendanceBody) {
    return;
  }

  if (!attendance.length) {
    subjectAttendanceBody.innerHTML =
      '<tr><td colspan="5" class="empty">No attendance records yet.</td></tr>';
    return;
  }

  const subjectMap = new Map();

  for (const item of attendance) {
    const subjectText = (item.subject || "").trim();
    if (!subjectText) {
      continue;
    }

    const key = subjectText.toLowerCase();
    const current = subjectMap.get(key) || {
      subject: subjectText,
      present: 0,
      total: 0,
    };

    current.total += 1;
    if (item.status === "Present") {
      current.present += 1;
    }

    subjectMap.set(key, current);
  }

  const subjects = [...subjectMap.values()].sort((a, b) =>
    a.subject.localeCompare(b.subject),
  );

  if (!subjects.length) {
    subjectAttendanceBody.innerHTML =
      '<tr><td colspan="5" class="empty">No attendance records yet.</td></tr>';
    return;
  }

  subjectAttendanceBody.innerHTML = subjects
    .map((item, index) => {
      const percent = ((item.present / item.total) * 100).toFixed(2);
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.subject)}</td>
        <td>${item.present}</td>
        <td>${item.total}</td>
        <td>${percent}%</td>
      </tr>
    `;
    })
    .join("");
}

function renderWriteups() {
  const writeupList = document.getElementById("writeupList");
  if (!writeupList) {
    updateWriteupSummary();
    return;
  }

  const writeupSearch = document.getElementById("writeupSearch");
  const writeupFilter = document.getElementById("writeupFilter");
  const query = (writeupSearch?.value || "").trim().toLowerCase();
  const statusFilter = writeupFilter?.value || "All";

  const filtered = [...writeups]
    .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
    .filter((item) =>
      statusFilter === "All" ? true : item.status === statusFilter,
    )
    .filter((item) => {
      if (!query) {
        return true;
      }
      const haystack =
        `${item.topic} ${item.writeup} ${item.teacher || ""} ${item.remarks || ""}`.toLowerCase();
      return haystack.includes(query);
    });

  if (!filtered.length) {
    writeupList.innerHTML = '<p class="empty">No writeups found.</p>';
    updateWriteupSummary();
    return;
  }

  writeupList.innerHTML = filtered
    .map((item) => {
      const statusClass = item.status === "Checked" ? "checked" : "pending";
      const teacher = item.teacher
        ? `Teacher: ${escapeHtml(item.teacher)}`
        : "Teacher: Not assigned";
      const remarks = item.remarks
        ? `Remarks: ${escapeHtml(item.remarks)}`
        : "Remarks: No remarks yet";

      return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${escapeHtml(item.topic)}</span>
          <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
        </div>
        <p class="item-note">${escapeHtml(item.writeup)}</p>
        <div class="item-meta">
          <span class="status-badge ${statusClass}">${item.status}</span>
          <span>${teacher}</span>
          <span>${remarks}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn secondary" data-mark-id="${item.id}">Mark ${item.status === "Checked" ? "Pending" : "Checked"}</button>
          <button class="action-btn" data-writeup-id="${item.id}">Delete</button>
        </div>
      </article>
    `;
    })
    .join("");

  updateWriteupSummary();
}

function renderNotes() {
  const noteList = document.getElementById("noteList");
  if (!noteList) {
    updateNotesSummary();
    return;
  }

  const noteSearch = document.getElementById("noteSearch");
  const query = (noteSearch?.value || "").trim().toLowerCase();
  const filtered = [...notes]
    .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
    .filter((item) => {
      if (!query) {
        return true;
      }
      const haystack = `${item.title} ${item.text}`.toLowerCase();
      return haystack.includes(query);
    });

  if (!filtered.length) {
    noteList.innerHTML = '<p class="empty">No saved notes found.</p>';
    updateNotesSummary();
    return;
  }

  noteList.innerHTML = filtered
    .map(
      (item) => `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${escapeHtml(item.title)}</span>
          <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
        </div>
        <p class="item-note">${escapeHtml(item.text)}</p>
        <div class="item-actions">
          <button class="action-btn" data-note-id="${item.id}">Delete</button>
        </div>
      </article>
    `,
    )
    .join("");

  updateNotesSummary();
}

function renderDashboard() {
  updateAttendanceSummary();
  updateWriteupSummary();
  updateNotesSummary();

  const dashboardUpdates = document.getElementById("dashboardUpdates");
  if (dashboardUpdates) {
    const recentUpdates = [...updates]
      .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
      .slice(0, 5);

    dashboardUpdates.innerHTML = recentUpdates.length
      ? recentUpdates
          .map(
            (item) => `
        <article class="item compact">
          <div class="item-head">
            <span class="item-title">${escapeHtml(item.title)}</span>
            <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
          </div>
        </article>
      `,
          )
          .join("")
      : '<p class="empty">No updates yet. Open Daily Updates page to add.</p>';
  }

  const dashboardWriteups = document.getElementById("dashboardWriteups");
  if (dashboardWriteups) {
    const recentWriteups = [...writeups]
      .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
      .slice(0, 5);

    dashboardWriteups.innerHTML = recentWriteups.length
      ? recentWriteups
          .map(
            (item) => `
        <article class="item compact">
          <div class="item-head">
            <span class="item-title">${escapeHtml(item.topic)}</span>
            <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
          </div>
          <span class="status-badge ${item.status === "Checked" ? "checked" : "pending"}">${item.status}</span>
        </article>
      `,
          )
          .join("")
      : '<p class="empty">No writeups yet. Open Writeups page to add.</p>';
  }

  const dashboardNotes = document.getElementById("dashboardNotes");
  if (dashboardNotes) {
    const recentNotes = [...notes]
      .sort((a, b) => getSortValue(b).localeCompare(getSortValue(a)))
      .slice(0, 5);

    dashboardNotes.innerHTML = recentNotes.length
      ? recentNotes
          .map(
            (item) => `
        <article class="item compact">
          <div class="item-head">
            <span class="item-title">${escapeHtml(item.title)}</span>
            <span class="item-date">${escapeHtml(getDisplayDateTime(item))}</span>
          </div>
          <p class="item-note">${escapeHtml(item.text)}</p>
        </article>
      `,
          )
          .join("")
      : '<p class="empty">No notes yet. Open Notes page to add.</p>';
  }
}

function setupUpdatesPage() {
  const dailyForm = document.getElementById("dailyForm");
  const updateDate = document.getElementById("updateDate");
  const updateTitle = document.getElementById("updateTitle");
  const updateNotes = document.getElementById("updateNotes");
  const clearUpdates = document.getElementById("clearUpdates");
  const dailyList = document.getElementById("dailyList");
  const updateSearch = document.getElementById("updateSearch");

  if (updateDate) {
    updateDate.value = getToday();
  }

  dailyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const entry = {
      id: createId(),
      date: updateDate?.value,
      createdAt: getNowIso(),
      title: updateTitle?.value.trim(),
      notes: updateNotes?.value.trim() || "",
    };

    if (!entry.date || !entry.title) {
      return;
    }

    updates.push(entry);
    saveData(DAILY_KEY, updates);
    renderUpdates();
    dailyForm.reset();
    updateDate.value = getToday();
    showToast("Daily update saved");
  });

  dailyList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const id = target.dataset.updateId;
    if (!id) {
      return;
    }

    updates = updates.filter((item) => item.id !== id);
    saveData(DAILY_KEY, updates);
    renderUpdates();
    showToast("Daily update deleted");
  });

  clearUpdates?.addEventListener("click", () => {
    if (!updates.length) {
      return;
    }
    const ok = confirm("Clear all daily updates?");
    if (!ok) {
      return;
    }

    updates = [];
    removeData(DAILY_KEY);
    renderUpdates();
    showToast("All daily updates cleared");
  });

  updateSearch?.addEventListener("input", renderUpdates);
  renderUpdates();
}

function setupAttendancePage() {
  const attendanceForm = document.getElementById("attendanceForm");
  const attendanceDate = document.getElementById("attendanceDate");
  const subjectName = document.getElementById("subjectName");
  const attendanceStatus = document.getElementById("attendanceStatus");
  const toggleAttendanceHistory = document.getElementById(
    "toggleAttendanceHistory",
  );
  const attendanceHistoryContent = document.getElementById(
    "attendanceHistoryContent",
  );
  const clearAttendance = document.getElementById("clearAttendance");
  const attendanceBody = document.getElementById("attendanceBody");
  const attendanceFilter = document.getElementById("attendanceFilter");

  toggleAttendanceHistory?.addEventListener("click", () => {
    if (!attendanceHistoryContent) {
      return;
    }

    const shouldShow = attendanceHistoryContent.hidden;
    attendanceHistoryContent.hidden = !shouldShow;
    toggleAttendanceHistory.textContent = shouldShow
      ? "Hide History"
      : "Show History";
    toggleAttendanceHistory.setAttribute("aria-expanded", String(shouldShow));
  });

  if (attendanceDate) {
    attendanceDate.value = getToday();
  }

  attendanceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: createId(),
      date: attendanceDate?.value,
      createdAt: getNowIso(),
      subject: subjectName?.value.trim(),
      status: attendanceStatus?.value,
    };

    if (!record.date || !record.subject || !record.status) {
      return;
    }

    attendance.push(record);
    saveData(ATTENDANCE_KEY, attendance);
    renderAttendance();
    attendanceForm.reset();
    attendanceDate.value = getToday();
    showToast("Attendance saved");
  });

  attendanceBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const id = target.dataset.attendanceId;
    if (!id) {
      return;
    }

    if (!confirmDelete("attendance record")) {
      return;
    }

    attendance = attendance.filter((item) => item.id !== id);
    saveData(ATTENDANCE_KEY, attendance);
    renderAttendance();
    showToast("Attendance deleted");
  });

  clearAttendance?.addEventListener("click", () => {
    if (!attendance.length) {
      return;
    }
    const ok = confirm("Clear all attendance records?");
    if (!ok) {
      return;
    }

    attendance = [];
    removeData(ATTENDANCE_KEY);
    renderAttendance();
    showToast("All attendance records cleared");
  });

  attendanceFilter?.addEventListener("change", renderAttendance);
  renderAttendance();
}

function setupWriteupsPage() {
  const writeupForm = document.getElementById("writeupForm");
  const writeupDate = document.getElementById("writeupDate");
  const writeupTopic = document.getElementById("writeupTopic");
  const writeupText = document.getElementById("writeupText");
  const teacherName = document.getElementById("teacherName");
  const teacherStatus = document.getElementById("teacherStatus");
  const teacherRemarks = document.getElementById("teacherRemarks");
  const clearWriteups = document.getElementById("clearWriteups");
  const writeupList = document.getElementById("writeupList");
  const writeupSearch = document.getElementById("writeupSearch");
  const writeupFilter = document.getElementById("writeupFilter");

  if (writeupDate) {
    writeupDate.value = getToday();
  }

  writeupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: createId(),
      date: writeupDate?.value,
      createdAt: getNowIso(),
      topic: writeupTopic?.value.trim(),
      writeup: writeupText?.value.trim(),
      teacher: teacherName?.value.trim() || "",
      status: teacherStatus?.value,
      remarks: teacherRemarks?.value.trim() || "",
    };

    if (!record.date || !record.topic || !record.writeup || !record.status) {
      return;
    }

    writeups.push(record);
    saveData(WRITEUP_KEY, writeups);
    renderWriteups();
    writeupForm.reset();
    writeupDate.value = getToday();
    if (teacherStatus) {
      teacherStatus.value = "Pending";
    }
    showToast("Writeup saved");
  });

  writeupList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const deleteId = target.dataset.writeupId;
    if (deleteId) {
      writeups = writeups.filter((item) => item.id !== deleteId);
      saveData(WRITEUP_KEY, writeups);
      renderWriteups();
      showToast("Writeup deleted");
      return;
    }

    const markId = target.dataset.markId;
    if (!markId) {
      return;
    }

    writeups = writeups.map((item) => {
      if (item.id !== markId) {
        return item;
      }
      return {
        ...item,
        status: item.status === "Checked" ? "Pending" : "Checked",
      };
    });
    saveData(WRITEUP_KEY, writeups);
    renderWriteups();
    showToast("Writeup status updated");
  });

  clearWriteups?.addEventListener("click", () => {
    if (!writeups.length) {
      return;
    }
    const ok = confirm("Clear all writeups?");
    if (!ok) {
      return;
    }

    writeups = [];
    removeData(WRITEUP_KEY);
    renderWriteups();
    showToast("All writeups cleared");
  });

  writeupSearch?.addEventListener("input", renderWriteups);
  writeupFilter?.addEventListener("change", renderWriteups);
  renderWriteups();
}

function setupNotesPage() {
  const noteForm = document.getElementById("noteForm");
  const noteDate = document.getElementById("noteDate");
  const noteTitle = document.getElementById("noteTitle");
  const noteText = document.getElementById("noteText");
  const clearNotes = document.getElementById("clearNotes");
  const noteList = document.getElementById("noteList");
  const noteSearch = document.getElementById("noteSearch");

  if (noteDate) {
    noteDate.value = getToday();
  }

  noteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: createId(),
      date: noteDate?.value,
      createdAt: getNowIso(),
      title: noteTitle?.value.trim(),
      text: noteText?.value.trim(),
    };

    if (!record.date || !record.title || !record.text) {
      return;
    }

    notes.push(record);
    saveData(NOTES_KEY, notes);
    renderNotes();
    noteForm.reset();
    noteDate.value = getToday();
    showToast("Note saved");
  });

  noteList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const id = target.dataset.noteId;
    if (!id) {
      return;
    }

    notes = notes.filter((item) => item.id !== id);
    saveData(NOTES_KEY, notes);
    renderNotes();
    showToast("Note deleted");
  });

  clearNotes?.addEventListener("click", () => {
    if (!notes.length) {
      return;
    }

    const ok = confirm("Clear all notes?");
    if (!ok) {
      return;
    }

    notes = [];
    removeData(NOTES_KEY);
    renderNotes();
    showToast("All notes cleared");
  });

  noteSearch?.addEventListener("input", renderNotes);
  renderNotes();
}

function setupSharedUi() {
  if (storageNotice) {
    storageNotice.hidden = true;
    storageNotice.textContent = "";
  }

  setupResetButton();

  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  themeToggle?.addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
  });
}

setupSharedUi();

if (page === "dashboard") {
  renderDashboard();
}
if (page === "updates") {
  setupUpdatesPage();
}
if (page === "attendance") {
  setupAttendancePage();
}
if (page === "writeups") {
  setupWriteupsPage();
}
if (page === "notes") {
  setupNotesPage();
}
