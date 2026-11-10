
import { supabase } from "./superbase.js";

// ELEMENTS
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = loginForm.querySelector('button[type="submit"]');


// LOGIN
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    // GET FORM VALUES
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginMessage.textContent = "Connecting to the system...";
    loginMessage.style.color = "#75D6C4";

    loginButton.disabled = true;

    try {

        // SIGN IN WITH SUPABASE
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        // HANDLE ERRORS
        if (error) {
            throw error;
        }

        // GET MEMBER NICKNAME
        const nickname = data.user.user_metadata?.nickname || "Member";

        // SAVE NICKNAME FOR HOMEPAGE
        sessionStorage.setItem("welcomeNickname", nickname);

        // REDIRECT
        window.location.href = "index.html";

    } catch (error) {

        console.error("Login error:", error);

        loginMessage.textContent =
            error.message || "Login failed. Please try again.";

        loginMessage.style.color = "#F2A6A0";

        loginButton.disabled = false;
    }

});
