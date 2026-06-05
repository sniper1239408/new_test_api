//declaration of identifiers
const urlbase = "http://localhost:8000";

//startup code
if(localStorage.getItem("token") != null) {
  window.location = "/viewer/"
} else {
  localStorage.removeItem("username");
};

//register function
document.getElementById("register_form").addEventListener("submit", async function(event) {
        event.preventDefault();
        const data = new FormData(event.target);
        if(data.get("password") == data.get("password_conf")){
            const body = {
            username: data.get("username"),
            password: data.get("password"),
            email: data.get("email")
            };
                const response = await fetch(`${urlbase}/api/register/`, { //send data to server
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
            window.location = "/viewer/"
        } else {
            alert(`Error ${response.status}: ${data2.error}`);
        };

        } else {
            alert("Passwords don't match. Try again.")
        }
        
});