const urlbase = "http://localhost:8000";
document.getElementById("login_form").addEventListener("submit", async function(event) {
        event.preventDefault();
        const data = new FormData(event.target);
        const body = {
            username: data.get("username"),
            password: data.get("password")
        };
        const response = await fetch(`${urlbase}/api/login/`, { //send data to server
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data2 = await response.json();
  console.log(data2);
  if (response.ok) {
    localStorage.setItem("token", data2.token);
    localStorage.setItem("username", data2.username);
    localStorage.setItem("permissions", data2.permissions);
    localStorage.setItem("groups", data2.groups[0].name);
    adminOrViewer();
  } else {
    alert(`Error ${response.status}: ${data2.error}`);
  };
});

if(localStorage.getItem("token") != null) {
  adminOrViewer();
} else {
  localStorage.removeItem("username");
  localStorage.removeItem("permissions");
  localStorage.removeItem("groups");
};

async function adminOrViewer(){
  const response = await fetch(`${urlbase}/api/canAccessAdmin/`, { //send data to server
    method: "GET",
    headers: {
      "Authorization": `Token ${localStorage.getItem("token")}`
    }
  });
  const data2 = await response.json();
  if(response.ok) {
    if(data2.has_access != true){
        window.location = "/viewer";
    } else {
      window.location = "/admin";
    };
  } else {
    console.log(data2);
    console.log(`Error ${response.status} while checking if user is admin.`);
    window.location = "/viewer";
  };
};