const urlbase = "http://localhost:8000";
if(localStorage.getItem("token") == null) {
    alert("You are not logged in");
    window.location = "/";
} else {
    checkIfAdmin();
    document.getElementById("user_text").innerHTML = localStorage.getItem("username");
};

async function checkIfAdmin(){
    const response = await fetch(`${urlbase}/api/canAccessAdmin/`, { //send data to server
    method: "GET",
    headers: {
      "Authorization": `Token ${localStorage.getItem("token")}`
    }
  });
  const data2 = await response.json();
  if(response.ok) {
    if(data2.has_access != true){
        alert("You are not permitted to access the admin panel.");
        window.location = "/viewer";
    };
  } else {
    console.log(data2)
    alert(`Error ${response.status} while checking if user is admin.`);
    window.location = "/viewer";
  };
};

function toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const main     = document.getElementById('main-content');
    const btn      = document.getElementById('sidebarToggle');
    const overlay  = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
    sidebar.classList.toggle('open');
    btn.classList.toggle('sidebar-open');
    overlay.classList.toggle('show');
    } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
    btn.classList.toggle('sidebar-hidden');
};
};

document.querySelectorAll('.nav-link[data-target]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();

    // Hide all content divs
    document.querySelectorAll('[id^="page-"]').forEach(div => div.style.display = 'none');

    // Show the target div
    document.getElementById(this.dataset.target).style.display = 'block';

    // Update active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

async function fetchUsers() {
  const statusEl = document.getElementById("users_status");
  const listEl   = document.getElementById("users-list");

  statusEl.style.display = "none";
  listEl.innerHTML = `
    <div class="text-center py-5 text-muted">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      Loading…
    </div>`;

  try {
    const res = await fetch(`${urlbase}/api/users/`, {
        headers: {
            "Authorization": `Token ${localStorage.getItem("token")}`
        }
        });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const users = await res.json();

    if (!users.length) {
      listEl.innerHTML = `<p class="text-muted">No users found.</p>`;
      return;
    }

    listEl.innerHTML = `
      <ul class="list-group">
        ${users.map(u => {
          const groups  = u.groups.map(g => g.name).join(", ") || "No groups";
          const joined  = new Date(u.date_joined).toLocaleDateString();
          const login   = u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never";
          const badge   = u.is_active
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

          return `
        <li class="list-group-item d-flex align-items-center gap-3 py-3">
        <i class="bi bi-person-circle fs-3 text-secondary flex-shrink-0"></i>
        <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-1">
            <span class="fw-semibold">${u.username}</span>
            ${badge}
            <span class="text-muted small ms-1">${groups}</span>
            </div>
            <div class="text-muted small">
            <i class="bi bi-calendar-plus me-1"></i>Joined ${joined}
            &nbsp;·&nbsp;
            <i class="bi bi-box-arrow-in-right me-1"></i>Last login: ${login}
            </div>
        </div>
        <span class="text-muted small me-2">#${u.id}</span>
        <button class="btn btn-sm btn-outline-secondary" onclick='openUserModal(${JSON.stringify(u)})'>
            <i class="bi bi-info-circle"></i>
        </button>
        </li>`;
        }).join("")}
      </ul>`;

  } catch (err) {
    statusEl.textContent = `Failed to load users: ${err.message}`;
    statusEl.style.display = "block";
    listEl.innerHTML = "";
  };
};

function openUserModal(u) {
  document.getElementById("userModalLabel").textContent = `User — ${u.username}`;

  const joined  = new Date(u.date_joined).toLocaleString();
  const login   = u.last_login ? new Date(u.last_login).toLocaleString() : "Never";
  const badge   = u.is_active
    ? `<span class="badge bg-success">Active</span>`
    : `<span class="badge bg-secondary">Inactive</span>`;

  const groupsHtml = u.groups.length ? u.groups.map(g => `
    <div class="card mb-2">
      <div class="card-body py-2">
        <div class="fw-semibold mb-1"><i class="bi bi-people-fill me-1"></i>${g.name} <span class="text-muted small">(#${g.id})</span></div>
        ${g.profile.description ? `<div class="text-muted small mb-1">${g.profile.description}</div>` : ""}
        <div class="text-muted small mb-1"><i class="bi bi-clock me-1"></i>Created ${new Date(g.profile.created_at).toLocaleString()}</div>
        <div class="d-flex flex-wrap gap-1 mt-1">
          ${g.permissions.map(p => `<span class="badge bg-light text-dark border">${p}</span>`).join("")}
        </div>
      </div>
    </div>`).join("") : `<p class="text-muted">No groups.</p>`;

  document.getElementById("userModalBody").innerHTML = `
    <table class="table table-bordered table-sm mb-4">
      <tbody>
        <tr><th style="width:140px">ID</th><td>#${u.id}</td></tr>
        <tr><th>Username</th><td>${u.username}</td></tr>
        <tr><th>Email</th><td>${u.email || "<span class='text-muted'>—</span>"}</td></tr>
        <tr><th>Status</th><td>${badge}</td></tr>
        <tr><th>Date Joined</th><td>${joined}</td></tr>
        <tr><th>Last Login</th><td>${login}</td></tr>
      </tbody>
    </table>
    <h6 class="mb-2">Groups & Permissions</h6>
    ${groupsHtml}`;

  new bootstrap.Modal(document.getElementById("userModal")).show();
};

async function fetchGroups() {
  const statusEl = document.getElementById("groups_status");
  const listEl   = document.getElementById("groups-list");

  statusEl.style.display = "none";
  listEl.innerHTML = `
    <div class="text-center py-5 text-muted">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      Loading…
    </div>`;

  try {
    const res = await fetch(`${urlbase}/api/groups/`, {
      headers: {
        "Authorization": `Token ${localStorage.getItem("token")}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const groups = await res.json();

    if (!groups.length) {
      listEl.innerHTML = `<p class="text-muted">No groups found.</p>`;
      return;
    }

    listEl.innerHTML = `
      <ul class="list-group">
        ${groups.map(g => {
          const created = new Date(g.profile.created_at).toLocaleDateString();

          return `
            <li class="list-group-item d-flex align-items-center gap-3 py-3">
              <i class="bi bi-people-fill fs-3 text-secondary flex-shrink-0"></i>
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="fw-semibold">${g.name}</span>
                  <span class="badge bg-primary">${g.permissions.length} permission${g.permissions.length !== 1 ? "s" : ""}</span>
                </div>
                <div class="text-muted small">
                  <i class="bi bi-calendar-plus me-1"></i>Created ${created}
                  ${g.profile.description ? `&nbsp;·&nbsp;${g.profile.description}` : ""}
                </div>
              </div>
              <span class="text-muted small me-2">#${g.id}</span>
              <button class="btn btn-sm btn-outline-secondary" onclick='openGroupModal(${JSON.stringify(g)})'>
                <i class="bi bi-info-circle"></i>
              </button>
            </li>`;
        }).join("")}
      </ul>`;

  } catch (err) {
    statusEl.textContent = `Failed to load groups: ${err.message}`;
    statusEl.style.display = "block";
    listEl.innerHTML = "";
  };
};

function openGroupModal(g) {
  document.getElementById("groupModalLabel").textContent = `Group — ${g.name}`;

  const created = new Date(g.profile.created_at).toLocaleString();

  const permissionsHtml = g.permissions.length
    ? `<div class="d-flex flex-wrap gap-1">${g.permissions.map(p => `<span class="badge bg-light text-dark border">${p}</span>`).join("")}</div>`
    : `<p class="text-muted">No permissions.</p>`;

  document.getElementById("groupModalBody").innerHTML = `
    <table class="table table-bordered table-sm mb-4">
      <tbody>
        <tr><th style="width:140px">ID</th><td>#${g.id}</td></tr>
        <tr><th>Name</th><td>${g.name}</td></tr>
        <tr><th>Description</th><td>${g.profile.description || "<span class='text-muted'>—</span>"}</td></tr>
        <tr><th>Created</th><td>${created}</td></tr>
      </tbody>
    </table>
    <h6 class="mb-2">Permissions</h6>
    ${permissionsHtml}`;

  new bootstrap.Modal(document.getElementById("groupModal")).show();
};

function logOut(){
    localStorage.removeItem("token");
    window.location = "/";
};