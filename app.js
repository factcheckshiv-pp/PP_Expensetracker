const formatEuro = (value) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const DEFAULT_CATEGORY = "Uncategorized";
const CONTACT_STORAGE_KEY = "contactMessages";
const USERS_STORAGE_KEY = "expenseTrackerUsers";
const CATEGORIES_STORAGE_KEY = "expenseTrackerCategories";
const CURRENT_USER_STORAGE_KEY = "expenseTrackerCurrentUser";
const initialCategories = [
  DEFAULT_CATEGORY,
  "Housing",
  "Groceries",
  "Transport",
  "Utilities",
  "Entertainment",
];

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw);
      // Ensure admin user always exists
      if (!loaded.admin) {
        loaded.admin = {
          name: "Administrator",
          password: "nimda",
          expenses: [],
        };
      }
      return loaded;
    }
  } catch {}
  return {
    admin: {
      name: "Administrator",
      password: "nimda",
      expenses: [],
    },
  };
}

function saveUsers(usersData) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...initialCategories];
}

function saveCategories(cats) {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
}

function loadCurrentUser() {
  try {
    return localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, user);
  } else {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

let categories = loadCategories();
let users = loadUsers();
let currentUser = loadCurrentUser();
let editingExpenseId = null;
let editingCategory = null;
let expenseChart = null;

const elements = {
  currentDate: document.getElementById("currentDate"),
  nav: document.getElementById("primaryNav"),
  sections: {
    dashboard: document.getElementById("dashboardSection"),
    expense: document.getElementById("expenseSection"),
    category: document.getElementById("categorySection"),
    report: document.getElementById("reportSection"),
  },
  monthTotal: document.getElementById("monthTotal"),
  entryCount: document.getElementById("entryCount"),
  categoryTotal: document.getElementById("categoryTotal"),
  dashboardFilter: document.getElementById("dashboardCategoryFilter"),
  expenseForm: document.getElementById("expenseForm"),
  expenseCategory: document.getElementById("expenseCategory"),
  expenseDescription: document.getElementById("expenseDescription"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseTableBody: document.querySelector("#expenseTable tbody"),
  tableFilter: document.getElementById("tableCategoryFilter"),
  categoryForm: document.getElementById("categoryForm"),
  categoryList: document.getElementById("categoryList"),
  newCategoryInput: document.getElementById("newCategoryName"),
  reportForm: document.getElementById("reportForm"),
  reportCategory: document.getElementById("reportCategory"),
  reportStart: document.getElementById("reportStart"),
  reportEnd: document.getElementById("reportEnd"),
  navItems: () => document.querySelectorAll(".nav-item"),
  signupForm: document.getElementById("signupForm"),
  signupName: document.getElementById("signupName"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  logoutBtn: document.getElementById("logoutBtn"),
  userGreeting: document.getElementById("userGreeting"),
  dashboardSection: document.getElementById("dashboardSection"),
  expenseSection: document.getElementById("expenseSection"),
  categorySection: document.getElementById("categorySection"),
  reportSection: document.getElementById("reportSection"),
  authPanel: document.getElementById("authPanel"),
  showSignupBtn: document.getElementById("showSignupBtn"),
  signupModal: document.getElementById("signupModal"),
  passwordModal: document.getElementById("passwordModal"),
  modalCloseButtons: document.querySelectorAll("[data-close-modal]"),
  changePasswordBtn: document.getElementById("changePasswordBtn"),
  passwordForm: document.getElementById("passwordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  contactLink: document.getElementById("contactLink"),
  contactLogSection: document.getElementById("contactLogSection"),
  contactTableBody: document.querySelector("#contactTable tbody"),
};

const getTodayISO = () => new Date().toISOString().split("T")[0];

function init() {
  elements.currentDate.textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date());

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  elements.reportStart.value = firstOfMonth.toISOString().split("T")[0];
  elements.reportEnd.value = getTodayISO();

  initChart();
  renderCategoryOptions();
  renderCategoryList();
  renderExpenses();
  updateDashboard();
  updateAccessState();
  attachEvents();
}

function attachEvents() {
  elements.nav.addEventListener("click", (event) => {
    if (!event.target.matches(".nav-item")) return;
    const target = event.target.dataset.target;
    elements.navItems().forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    showSection(target);
  });

  elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
  elements.tableFilter.addEventListener("change", renderExpenses);
  elements.dashboardFilter.addEventListener("change", updateDashboard);

  elements.signupForm.addEventListener("submit", handleSignup);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutBtn.addEventListener("click", handleLogout);
  elements.changePasswordBtn.addEventListener("click", () => openModal("passwordModal"));
  elements.passwordForm.addEventListener("submit", handlePasswordChange);
  elements.showSignupBtn.addEventListener("click", () => openModal("signupModal"));
  elements.modalCloseButtons.forEach((btn) =>
    btn.addEventListener("click", (event) => closeModal(event.currentTarget.dataset.closeModal)),
  );

  elements.categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.newCategoryInput.value.trim();
    if (!name || categories.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    categories.push(name);
    saveCategories(categories);
    elements.newCategoryInput.value = "";
    renderCategoryOptions();
    renderCategoryList();
    renderExpenses();
    updateDashboard();
  });

  elements.reportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const filtered = filterExpensesForReport();
    if (!filtered.length) return;
    generatePdf(filtered);
  });
}

function showSection(targetId) {
  Object.values(elements.sections).forEach((section) => section.classList.add("hidden"));
  const section = document.getElementById(targetId);
  if (section) section.classList.remove("hidden");
}

function handleSignup(event) {
  event.preventDefault();
  const name = elements.signupName.value.trim();
  const email = elements.signupEmail.value.trim().toLowerCase();
  const password = elements.signupPassword.value.trim();

  if (!name || !email || !password) return;
  if (users[email]) {
    alert("Account already exists. Please log in.");
    return;
  }

  users[email] = { name, password, expenses: [] };
  saveUsers(users);
  currentUser = email;
  saveCurrentUser(currentUser);
  elements.signupForm.reset();
  closeModal("signupModal");
  updateAccessState();
  renderExpenses();
  updateDashboard();
  alert("Account created. You are now logged in.");
}

function handleLogin(event) {
  event.preventDefault();
  const email = elements.loginEmail.value.trim().toLowerCase();
  const password = elements.loginPassword.value.trim();
  const user = users[email];
  if (!user) {
    alert("No account found. Please sign up.");
    return;
  }
  if (user.password !== password) {
    alert("Invalid credentials.");
    return;
  }
  currentUser = email;
  saveCurrentUser(currentUser);
  elements.loginForm.reset();
  updateAccessState();
  renderExpenses();
  updateDashboard();
}

function handleLogout() {
  currentUser = null;
  saveCurrentUser(null);
  editingExpenseId = null;
  updateAccessState();
  renderExpenses();
  updateDashboard();
}

function handlePasswordChange(event) {
  event.preventDefault();
  if (!currentUser) return;
  const current = elements.currentPassword.value.trim();
  const next = elements.newPassword.value.trim();
  const confirm = elements.confirmPassword.value.trim();
  const user = users[currentUser];
  if (user.password !== current) {
    alert("Current password is incorrect.");
    return;
  }
  if (!next || next !== confirm) {
    alert("New passwords do not match.");
    return;
  }
  user.password = next;
  saveUsers(users);
  elements.passwordForm.reset();
  closeModal("passwordModal");
  alert("Password updated.");
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
}

function updateAccessState() {
  const loggedIn = Boolean(currentUser);
  const greeting = loggedIn ? `Hello, ${users[currentUser].name}` : "Guest";
  elements.userGreeting.textContent = greeting;
  elements.logoutBtn.disabled = !loggedIn;
  elements.changePasswordBtn.disabled = !loggedIn;
  if (elements.contactLink) {
    elements.contactLink.classList.toggle("hidden", !loggedIn);
  }

  [elements.dashboardSection, elements.expenseSection, elements.categorySection, elements.reportSection].forEach(
    (section) => {
      section.classList.toggle("disabled", !loggedIn);
    },
  );

  const isAdmin = loggedIn && currentUser === "admin";
  if (elements.contactLogSection) {
    elements.contactLogSection.classList.toggle("hidden", !isAdmin);
  }
  if (isAdmin) {
    renderContactLog();
  }

  elements.authPanel.classList.toggle("hidden", loggedIn);
  if (!loggedIn) {
    closeModal("passwordModal");
  }
}

function getUserExpenses() {
  if (!currentUser) return [];
  return users[currentUser].expenses;
}

function setUserExpenses(updater) {
  if (!currentUser) return;
  const current = users[currentUser].expenses;
  users[currentUser].expenses = typeof updater === "function" ? updater(current) : updater;
  saveUsers(users);
}

function renderCategoryOptions() {
  const selects = [
    { el: elements.expenseCategory, includeAll: false },
    { el: elements.tableFilter, includeAll: true },
    { el: elements.dashboardFilter, includeAll: true },
    { el: elements.reportCategory, includeAll: true },
  ];

  selects.forEach(({ el, includeAll }) => {
    const prevValue = el.value;
    el.innerHTML = "";
    if (includeAll) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "All categories";
      el.appendChild(option);
    }
    categories.forEach((category) => {
      const opt = document.createElement("option");
      opt.value = category;
      opt.textContent = category;
      el.appendChild(opt);
    });

    if (prevValue && (prevValue === "" || categories.includes(prevValue))) {
      el.value = prevValue;
    } else if (!includeAll && categories.length) {
      el.value = categories[0];
    } else {
      el.value = "";
    }
  });

  if (!elements.expenseCategory.value && categories.length) {
    elements.expenseCategory.value = categories[0];
  }

  updateChart(getCurrentMonthExpenses());
}

function renderCategoryList() {
  elements.categoryList.innerHTML = "";
  categories.forEach((category) => {
    const li = document.createElement("li");
    li.className = "category-chip";
    if (editingCategory === category) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = category;
      input.className = "category-edit-input";
      li.appendChild(input);

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", () => saveCategoryEdit(category, input.value));

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        editingCategory = null;
        renderCategoryList();
      });

      li.append(saveBtn, cancelBtn);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = category;
      li.appendChild(nameSpan);

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        editingCategory = category;
        renderCategoryList();
      });
      li.appendChild(editBtn);

      if (!(category === DEFAULT_CATEGORY && categories.length === 1)) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => removeCategory(category));
        li.appendChild(deleteBtn);
      }
    }

    elements.categoryList.appendChild(li);
  });
}

function saveCategoryEdit(oldName, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const normalized = trimmed.toLowerCase();
  const duplicate = categories.some(
    (category) => category.toLowerCase() === normalized && category !== oldName,
  );
  if (duplicate) return;

  if (normalized === oldName.toLowerCase()) {
    editingCategory = null;
    renderCategoryList();
    return;
  }

  categories = categories.map((category) => (category === oldName ? trimmed : category));
  saveCategories(categories);
  Object.values(users).forEach((user) => {
    user.expenses = user.expenses.map((expense) =>
      expense.category === oldName ? { ...expense, category: trimmed } : expense,
    );
  });
  saveUsers(users);
  editingCategory = null;
  renderCategoryOptions();
  renderCategoryList();
  renderExpenses();
  updateDashboard();
}

function removeCategory(name) {
  if (categories.length === 1) return;
  categories = categories.filter((category) => category !== name);
  if (!categories.includes(DEFAULT_CATEGORY)) {
    categories.unshift(DEFAULT_CATEGORY);
  }
  saveCategories(categories);
  Object.values(users).forEach((user) => {
    user.expenses = user.expenses.map((expense) =>
      expense.category === name ? { ...expense, category: DEFAULT_CATEGORY } : expense,
    );
  });
  saveUsers(users);
  editingCategory = null;
  renderCategoryOptions();
  renderCategoryList();
  renderExpenses();
  updateDashboard();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  if (!currentUser) return;
  const category = elements.expenseCategory.value;
  const description = elements.expenseDescription.value.trim();
  const amount = Number.parseFloat(elements.expenseAmount.value);

  if (!category || !description || Number.isNaN(amount) || amount <= 0) return;

  if (editingExpenseId) {
    setUserExpenses((list) =>
      list.map((expense) =>
        expense.id === editingExpenseId ? { ...expense, category, description, amount } : expense,
      ),
    );
    editingExpenseId = null;
  } else {
    setUserExpenses((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        date: getTodayISO(),
        category,
        description,
        amount,
      },
    ]);
  }

  elements.expenseForm.reset();
  if (categories.length) elements.expenseCategory.value = categories[0];
  renderExpenses();
  updateDashboard();
}

function renderExpenses() {
  if (!currentUser) {
    elements.expenseTableBody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Log in to manage expenses.</td></tr>';
    elements.entryCount.textContent = "0";
    return;
  }

  const expenses = getUserExpenses();
  const filterValue = elements.tableFilter.value;
  const filteredExpenses = filterValue ? expenses.filter((e) => e.category === filterValue) : expenses;

  elements.expenseTableBody.innerHTML = "";
  filteredExpenses.forEach((expense) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.category}</td>
      <td>${expense.description}</td>
      <td>${formatEuro(expense.amount)}</td>
    `;

    const actionsCell = document.createElement("td");
    actionsCell.className = "expense-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(expense));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteExpense(expense.id));

    actionsCell.append(editBtn, deleteBtn);
    row.appendChild(actionsCell);
    elements.expenseTableBody.appendChild(row);
  });

  elements.entryCount.textContent = expenses.length;
}

function startEdit(expense) {
  showSection("expenseSection");
  elements.navItems().forEach((btn) => btn.classList.remove("active"));
  document.querySelector('[data-target="expenseSection"]').classList.add("active");
  editingExpenseId = expense.id;
  elements.expenseCategory.value = expense.category;
  elements.expenseDescription.value = expense.description;
  elements.expenseAmount.value = expense.amount;
}

function deleteExpense(id) {
  setUserExpenses((expenses) => expenses.filter((expense) => expense.id !== id));
  renderExpenses();
  updateDashboard();
}

function updateDashboard() {
  const monthExpenses = getCurrentMonthExpenses();
  const expenses = getUserExpenses();
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  elements.monthTotal.textContent = formatEuro(monthTotal);

  const filterValue = elements.dashboardFilter.value;
  const categoryExpenses = filterValue
    ? monthExpenses.filter((expense) => expense.category === filterValue)
    : monthExpenses;
  const categoryTotal = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  elements.categoryTotal.textContent = formatEuro(categoryTotal);
  updateChart(monthExpenses);

  if (!currentUser) {
    elements.entryCount.textContent = "0";
  }
}

function filterExpensesForReport() {
  if (!currentUser) return [];
  const expenses = getUserExpenses();
  const category = elements.reportCategory.value;
  const start = elements.reportStart.value;
  const end = elements.reportEnd.value;
  if (!start || !end) return [];

  return expenses.filter((expense) => {
    const inCategory = category ? expense.category === category : true;
    return inCategory && expense.date >= start && expense.date <= end;
  });
}

function generatePdf(list) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const title = "Expense Report";

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(11);
  doc.text(
    `Period: ${elements.reportStart.value} to ${elements.reportEnd.value} | Category: ${
      elements.reportCategory.value || "All"
    }`,
    14,
    28,
  );

  const headers = ["Date", "Category", "Description", "Amount (€)"];
  let y = 40;

  doc.setFont(undefined, "bold");
  headers.forEach((header, idx) => doc.text(header, 14 + idx * 45, y));
  doc.setFont(undefined, "normal");
  y += 8;

  list.forEach((expense) => {
    doc.text(expense.date, 14, y);
    doc.text(expense.category, 59, y);
    doc.text(expense.description, 104, y);
    doc.text(expense.amount.toFixed(2), 149, y, { align: "right" });
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const total = list.reduce((sum, expense) => sum + expense.amount, 0);
  doc.text(`Total: ${total.toFixed(2)} €`, 14, y + 10);
  doc.save("expense-report.pdf");
}

function initChart() {
  const ctx = document.getElementById("expenseChart");
  if (!ctx) return;
  expenseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Monthly Expenses (€)",
          data: [],
          backgroundColor: "#d4af37",
        },
      ],
    },
    options: {
      scales: {
        x: {
          ticks: { color: "#f8f1d2" },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#f8f1d2" },
          grid: { color: "rgba(212,175,55,0.2)" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#f8f1d2" },
        },
      },
    },
  });
}

function updateChart(monthExpenses) {
  if (!expenseChart) return;
  const totalsByCategory = categories.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  monthExpenses.forEach((expense) => {
    totalsByCategory[expense.category] = (totalsByCategory[expense.category] || 0) + expense.amount;
  });

  const labels = Object.keys(totalsByCategory);
  const data = labels.map((label) => Number(totalsByCategory[label].toFixed(2)));

  expenseChart.data.labels = labels;
  expenseChart.data.datasets[0].data = data;
  expenseChart.update();
}

function getCurrentMonthExpenses() {
  if (!currentUser) return [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  return getUserExpenses().filter((expense) => expense.date.startsWith(currentMonth));
}

function loadContactMessages() {
  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function renderContactLog() {
  if (!elements.contactTableBody) return;
  const messages = loadContactMessages().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  elements.contactTableBody.innerHTML = "";
  if (!messages.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No contact requests yet.";
    row.appendChild(cell);
    elements.contactTableBody.appendChild(row);
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${message.timestamp ? new Date(message.timestamp).toLocaleString() : "-"}</td>
      <td>${message.name || "-"}</td>
      <td>${message.email || "-"}</td>
      <td>${message.phone || "-"}</td>
      <td>${message.purpose || "-"}</td>
    `;
    elements.contactTableBody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", init);

