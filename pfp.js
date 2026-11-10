
import { supabase } from "./superbase.js";

// ELEMENTS
const nicknameHeading = document.getElementById("profileNickname");
const nicknameValue = document.getElementById("nicknameValue");
const emailValue = document.getElementById("emailValue");
const profileAvatar = document.getElementById("profileAvatar");
const profileMessage = document.getElementById("profileMessage");

const signOutButton = document.getElementById("signOutButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");


// SHOW MESSAGE
function showMessage(message, color = "#75D6C4") {
    profileMessage.textContent = message;
    profileMessage.style.color = color;
}


// LOAD MEMBER PROFILE
async function loadProfile() {
    showMessage("Loading your profile...");

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    const user = data.user;

    const nickname = user.user_metadata?.nickname || "Member";
    const email = user.email || "Email unavailable";

    nicknameHeading.textContent = nickname;
    nicknameValue.textContent = nickname;
    emailValue.textContent = email;

    // USE FIRST LETTER AS AVATAR
    profileAvatar.textContent =
        nickname.charAt(0).toUpperCase() || "✦";

    showMessage("Your profile is up to date. ✦");
}


// SIGN OUT
signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;

    showMessage("Signing you out...");

    const { error } = await supabase.auth.signOut();

    if (error) {
        showMessage(
            "Couldn't sign you out. Please try again.",
            "#F2A6A0"
        );

        signOutButton.disabled = false;
        return;
    }

    window.location.href = "login.html";
});


// DELETE ACCOUNT
deleteAccountButton.addEventListener("click", async () => {

    const confirmation = prompt(
        "Deleting your account is permanent.\n\nType DELETE to confirm:"
    );

    if (confirmation !== "DELETE") {
        showMessage("Account deletion cancelled.");
        return;
    }

    const finalConfirmation = confirm(
        "Are you absolutely sure you want to permanently delete your account?"
    );

    if (!finalConfirmation) {
        showMessage("Account deletion cancelled.");
        return;
    }

    deleteAccountButton.disabled = true;

    showMessage("Processing your deletion request...");

    try {

        // CALL SECURE SUPABASE EDGE FUNCTION
        const { data, error } = await supabase.functions.invoke(
            "delete_account"
        );

        if (error) {
            throw error;
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        // SIGN OUT AFTER SUCCESSFUL DELETION
        await supabase.auth.signOut();

        window.location.href = "index.html";

    } catch (error) {

        console.error("Account deletion error:", error);

        // READ THE ACTUAL SERVER ERROR
        if (error.context) {

            try {
                const details = await error.context.json();

                console.log("FULL SERVER ERROR:", JSON.stringify(details, null, 2));

                showMessage(
                    details.error || "Account deletion failed.",
                    "#F2A6A0"
                );

            } catch {
                showMessage(
                    "Couldn't read the server error.",
                    "#F2A6A0"
                );
            }

        } else {

            showMessage(
                error.message || "Account deletion failed.",
                "#F2A6A0"
            );
        }

        deleteAccountButton.disabled = false;
    }

});


// START
loadProfile();
