const urlbase = "http://localhost:8000";

//Startup code
if(localStorage.getItem("token") == null){
    alert("You are not logged in");
    window.location = "/";
} else {
    document.getElementById("user_text").innerHTML = localStorage.getItem("username");
    showAdminLink();
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
        document.getElementById("adminLink").classList.remove("hidden");
    };
  } else {
    console.log('Error checking admin status.');
    console.log(data2);
  };
};