
import { supabase } from "./superbase.js";

// ELEMENTS
const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");


// SIGN UP
signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    // GET FORM VALUES
    const nickname = document.getElementById("nickname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // CHECK NICKNAME
    if (!nickname) {
        signupMessage.textContent = "Please enter a club nickname.";
        signupMessage.style.color = "#F2A6A0";
        return;
    }

    signupMessage.textContent = "Creating your account...";
    signupMessage.style.color = "#75D6C4";

    // CREATE SUPABASE ACCOUNT
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                nickname: nickname
            }
        }
    });

    // HANDLE ERRORS
    if (error) {
        signupMessage.textContent = error.message;
        signupMessage.style.color = "#F2A6A0";
        return;
    }

    // SUCCESS
    if (data.session) {

        sessionStorage.setItem("welcomeNickname", nickname);

        window.location.href = "index.html";

    } else {

        signupMessage.textContent =
            "Account created! Check your email to confirm your account.";

        signupMessage.style.color = "#75D6C4";
    }

});
