//declaration of identifiers
const urlbase = "http://localhost:8000";
let current_id = 0;
let g_data;
let edit = false;
let allItems = [];
let isAdmin = false;

//Startup code
if(localStorage.getItem("token") == null){
    alert("You are not logged in");
    window.location = "/";
} else {
    document.getElementById("user_text").innerHTML = localStorage.getItem("username");
    showAdminLink();
    fetchItems();
}


//========SIDEBAR RELATED CODE===================

document.querySelectorAll('.nav-link[data-target]').forEach(link => {
  link.addEventListener('click', function(e) {
    if(this.dataset.target != "page-redir"){
        e.preventDefault();

        // Hide all content divs
        document.querySelectorAll('[id^="page-"]').forEach(div => div.style.display = 'none');

        // Show the target div
        document.getElementById(this.dataset.target).style.display = 'block';

        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    };
  });
});

function toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const main     = document.getElementById('main-content');
    const btn      = document.getElementById('sidebarToggle');
    const overlay  = document.getElementById('sidebar-overlay');
    const isMoble = window.innerWidth <= 768;

    if (isMoble) {
      sidebar.classList.toggle('open');
      btn.classList.toggle('sidebar-open');
      overlay.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('expanded');
      btn.classList.toggle('sidebar-hidden');
    };
  };

//========END SIDEBAR RELATED CODE===================

//token removal and redirect to login page
function logOut(){
    localStorage.removeItem("token");
    window.location = "/";
};

//determines if admin option is shown
async function showAdminLink(){
    const response = await fetch(`${urlbase}/api/canAccessAdmin/`, { //send data to server
    method: "GET",
    headers: {
      "Authorization": `Token ${localStorage.getItem("token")}`
    }
  });
  const data2 = await response.json();
  if(response.ok) {
    if(data2.has_access == true){
      isAdmin = true;
      document.getElementById("adminLink").classList.remove("hidden");
    };
  } else {
    console.log('Error checking admin status.');
    console.log(data2);
  };
};

//create book function
document.getElementById("creation").addEventListener("submit", async function(event) { //will trigger when button is hit
    event.preventDefault(); //prevents reloading of page
    const data = new FormData(event.target);
    const body = {
            title: data.get("title"),
            author: data.get("author"),
            price: data.get("price")
    };
    const response = await fetch(`${urlbase}/api/books/`, { //send data to server
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(body)
  });
  const data2 = await response.json();
  if (response.ok) {
    alert(`Success!, ID Assigned: ${data2.id}`);
    //clearing all text boxes
    document.getElementById("title").value = "";
    document.getElementById("author").value = "";
    document.getElementById("price").value = "";
} else {
    alert(`Error ${response.status}: ${data2.detail}`);
};
});

//===========GET ITEMS FUNCTIONS (DISPLAY)==============

async function fetchItems() {
    const list   = document.getElementById('items-list');
    const status = document.getElementById('fetch_status');

    list.innerHTML   = '<p class="text-muted">Loading...</p>';
    status.style.display = 'none';

    try {
        const res  = await fetch(`${urlbase}/api/books/`,{
          method: "GET",
          headers: {
            "Authorization": `Token ${localStorage.getItem("token")}`
          }
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        allItems = data;
        if (!data.length) {
            list.innerHTML = '<p class="text-muted">No items found.</p>';
            return;
        }
        
        populateFieldDropdown(allItems[0]);
        renderItems(allItems);

    } catch (err) {
        list.innerHTML = '';
        status.textContent = `Failed to load items: ${err.message}`;
        status.style.display = 'block';
    }
};

function renderItems(items) {
    const list = document.getElementById('items-list');

    if (!items.length) {
        list.innerHTML = '<p class="text-muted">No items match your search.</p>';
        return;
    }
    console.log(items);
    list.innerHTML = items.map((item, i) => `
            <div class="card mb-3">
                <div class="card-header fw-bold">#${item.id} — ${item.title}</div>
                <ul class="list-group list-group-flush">
                        <li class="list-group-item">
                            <span class="text-muted me-2">Author:</span>
                            ${item.author}
                        </li>
                        <li class="list-group-item">
                            <span class="text-muted me-2">Price:</span>
                            $${item.price}
                        </li>
                        ${isAdmin ? `
                        <li class="list-group-item">
                            <span class="text-muted me-2">Added by:</span>
                            ${item.owner}
                        </li>` : ''}
                  </ul>
                        <div class="card-footer">
                        <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#infoModal" onclick="getMoreInfo(${item.id})">
                        Get more info
                        </button>
                        </div>
            </div>
        `).join('');
};

//===========END GET ITEMS FUNCTIONS (DISPLAY)==============

//===========GET ITEMS FUNCTIONS (SEARCH)==============

function populateFieldDropdown(sampleItem) {
    const select = document.getElementById('filterField');
    // Clear all options except the first placeholder
    select.innerHTML = '<option value="">Select field...</option>';

    Object.keys(sampleItem).forEach(key => {
        const opt   = document.createElement('option');
        opt.value   = key;
        opt.textContent = key;
        select.appendChild(opt);
    });

    select.addEventListener('change', applyFilter);
};

function applyFilter() {
    const field = document.getElementById('filterField').value;
    const query = document.getElementById('filterValue').value.toLowerCase().trim();

    if (!field || !query) {
        renderItems(allItems);
        return;
    }

    const filtered = allItems.filter(item => {
        const val = item[field];
        if (val === undefined || val === null) return false;
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return str.toLowerCase().includes(query);
    });

    renderItems(filtered);

    // Show a count of results
    document.getElementById('items-list').insertAdjacentHTML(
        'afterbegin',
        `<p class="text-muted small mb-3">${filtered.length} result${filtered.length !== 1 ? 's' : ''} found</p>`
    );
};

function clearFilter() {
    document.getElementById('filterField').value  = '';
    document.getElementById('filterValue').value  = '';
    renderItems(allItems);
};

//===========END GET ITEMS FUNCTIONS (SEARCH)==============

//===========ITEM MODEL DISPLAY FUNCTION==============

async function getMoreInfo(id) {
    const modalEl   = document.getElementById('infoModal');
    const modal     = new bootstrap.Modal(modalEl);
    const modalBody = document.getElementById('infoModalBody');
    const modalLabel = document.getElementById('infoModalLabel');
    let api_success = false;
    modalLabel.textContent = "Item Details";
    modalBody.innerHTML = '<p class="text-muted">Loading...</p>';
    modal.show();
    current_id = id
//close properly
    modalEl.addEventListener('hidden.bs.modal', () => {
        current_id = 0;
        g_data = null;
        if(edit) {
            document.getElementById("edit_item").removeEventListener("submit", editItemSubmit);
            edit = false;
        };
        modal.dispose();
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }, { once: true });

    try {
        const res  = await fetch(`${urlbase}/api/books/${id}/`,{
          method: "GET",
          headers: {"Authorization": `Token ${localStorage.getItem("token")}`}
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        g_data = await res.json();
        api_success = true;
    } catch (err) {
        modalBody.innerHTML = `<p class="text-danger">Failed to load: ${err.message}</p>`;
    };
    if(api_success) {
        modalLabel.textContent = `Item #${id}`;
        modalBody.innerHTML = `
            <ul class="list-group list-group-flush">
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book Title:</span>
                        ${g_data.title}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Author:</span>
                        ${g_data.author}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Price:</span>
                        $${g_data.price}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book added by:</span>
                        ${g_data.owner}
                    </li>
            </ul>
        `;
    };
};

//===========END ITEM MODEL DISPLAY FUNCTION==============

//===========ITEM EDIT FUNCTIONS==============

function editItem() {
    if(edit != true) {
    edit = true;
    const modalBody = document.getElementById('infoModalBody');
    modalBody.innerHTML = `
    <form id="edit_item">
            <ul class="list-group list-group-flush">
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book Title:</span>
                        <input type="text" id="etitle" name="title" value="${g_data.title}" required>
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Author:</span>
                        <input type="text" id="eauthor" name="author" value="${g_data.author}" required>
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Price:</span>
                        <input type="number" id="eprice" name="price" value="${g_data.price}" required>
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book added by:</span>
                        ${g_data.owner}
                    </li>
            </ul>
            <button class="btn btn-danger mt-2" onclick="unEdit()">Cancel</button>
            <button type="submit" class="btn btn-primary mt-2">Edit Book</button>
          </form>
        `;
        document.getElementById("edit_item").addEventListener("submit", editItemSubmit);
    } else {
        unEdit();
    };
};

function unEdit() {
    edit = false;
    document.getElementById('infoModalBody').innerHTML = `
            <ul class="list-group list-group-flush">
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book Title:</span>
                        ${g_data.title}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Author:</span>
                        ${g_data.author}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Price:</span>
                        $${g_data.price}
                    </li>
                    <li class="list-group-item">
                        <span class="text-muted me-2">Book added by:</span>
                        ${g_data.owner}
                    </li>
            </ul>
        `;
};

async function editItemSubmit(event){
                event.preventDefault();
                const data = new FormData(event.target);
                const body = { //api structure
                    title: data.get("title"),
                    author: data.get("author"),
                    price: data.get("price")
                };
                const response = await fetch(`${urlbase}/api/books/${current_id}/`, {
                method: "PUT",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(body)
            });
            const data2 = await response.json();
            console.log(data2);
            if (response.ok) {
                alert("Success! Item edited!");
                document.getElementById('modal_button_close').click();
                document.getElementById('filterValue').value  = '';
                fetchItems();
            } else {
                alert(`Error ${response.status}: ${data2.detail}`);
            };
};

//===========END ITEM EDIT FUNCTIONS==============

//Delete item function

async function deleteItem() {
    if(current_id != 0){
    const confirmation = confirm(`Are you sure you would like to delete item ${current_id} ?`);
    if(confirmation){
        const response = await fetch(`${urlbase}/api/books/${current_id}/`, {
    method: "DELETE",
    headers: {"Authorization": `Token ${localStorage.getItem("token")}`}
  });
    if (response.ok) {
        alert("Success! Item deleted.");
        document.getElementById('modal_button_close').click();
        document.getElementById('filterValue').value  = '';
        fetchItems();
    } else {
        alert(`Error ${response.status}`);
    };
    };
    } else {
        console.log("NO modal opened (current_id = 0)");
    };
    
};