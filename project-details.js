
import { supabase } from "./superbase.js";

const projectDetails = document.getElementById("projectDetails");
const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");
const commentButton = document.getElementById("commentButton");
const commentMessage = document.getElementById("commentMessage");
const commentsList = document.getElementById("commentsList");

// Get the project ID from the page URL
const params = new URLSearchParams(window.location.search);
const projectId = params.get("id");

let currentUser = null;

// Get the logged-in member
async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error("Could not check login:", error.message);
        return null;
    }

    return data.user;
}

// Load the project
async function loadProject() {
    if (!projectId) {
        projectDetails.textContent = "No project was selected.";
        return;
    }

    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("status", "approved")
        .maybeSingle();

    if (error || !project) {
        projectDetails.textContent = "Project not found.";
        console.error("Project error:", error);
        return;
    }

    const card = document.createElement("article");
    card.className = "project-detail-card";

    if (project.image_path) {
        const { data } = supabase.storage
            .from("project-images")
            .getPublicUrl(project.image_path);

        const image = document.createElement("img");
        image.src = data.publicUrl;
        image.alt = "Project image";
        card.appendChild(image);
    }

    const title = document.createElement("h1");
    title.textContent = project.title;

    const creator = document.createElement("p");
    creator.className = "project-creator";
    creator.textContent = "Created by a club member";

    const category = document.createElement("p");
    category.className = "project-category";
    category.textContent = project.category || "Uncategorised";

    const description = document.createElement("p");
    description.className = "project-description";
    description.textContent = project.description || "No description provided.";

    card.append(title, creator, category, description);

    if (project.project_url) {
        try {
            const url = new URL(project.project_url);

            if (url.protocol === "https:" || url.protocol === "http:") {
                const link = document.createElement("a");
                link.href = url.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "View Project ↗";
                link.style.color = "#75D6C4";
                card.appendChild(link);
            }
        } catch {
            console.warn("This project has an invalid link.");
        }
    }

    projectDetails.replaceChildren(card);
}

// Show or hide the comment form
function setupCommentForm() {
    if (!currentUser) {
        commentForm.style.display = "none";

        const loginNotice = document.createElement("p");
        loginNotice.textContent =
            "Log in to your club account to join the conversation.";

        loginNotice.style.color = "#F2A6A0";
        commentForm.after(loginNotice);
    }
}

// Load comments
async function loadComments() {
    commentsList.textContent = "Loading comments...";

    const { data: comments, error } = await supabase
        .from("comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (error) {
        commentsList.textContent = "Could not load comments.";
        console.error("Comments error:", error);
        return;
    }

    commentsList.replaceChildren();

    if (!comments || comments.length === 0) {
        commentsList.textContent = "No comments yet. Be the first to share an idea! ✦";
        return;
    }

    comments.forEach((comment) => {
        const card = document.createElement("article");
        card.className = "comment-card";

        const author = document.createElement("h3");
        author.textContent =
            currentUser && comment.user_id === currentUser.id
                ? "You"
                : "Club member";

        const content = document.createElement("p");
        content.textContent = comment.content;

        const date = document.createElement("p");
        date.className = "comment-date";
        date.textContent = new Date(comment.created_at).toLocaleString();

        card.append(author, content, date);

        // Only show the delete button for the comment's owner
        if (currentUser && comment.user_id === currentUser.id) {
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-comment";
            deleteButton.textContent = "Delete comment";
            deleteButton.type = "button";

            deleteButton.addEventListener("click", () => {
                deleteComment(comment.id);
            });

            card.appendChild(deleteButton);
        }

        commentsList.appendChild(card);
    });
}

// Post a comment
commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        commentMessage.textContent = "Please log in first.";
        return;
    }

    const content = commentInput.value.trim();

    if (!content) {
        commentMessage.textContent = "Please write a comment first.";
        return;
    }

    commentButton.disabled = true;
    commentMessage.textContent = "Posting your comment...";

    const { error } = await supabase
        .from("comments")
        .insert({
            project_id: projectId,
            user_id: currentUser.id,
            content: content
        });

    commentButton.disabled = false;

    if (error) {
        commentMessage.textContent = "Could not post your comment. Please try again.";
        console.error("Post comment error:", error);
        return;
    }

    commentInput.value = "";
    commentMessage.textContent = "Comment posted! ✦";

    await loadComments();
});

// Delete your own comment
async function deleteComment(commentId) {
    const confirmed = confirm("Are you sure you want to delete this comment?");

    if (!confirmed) return;

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", currentUser.id);

    if (error) {
        alert("Could not delete comment. Please try again.");
        console.error("Delete comment error:", error);
        return;
    }

    await loadComments();
}

// Start everything
async function startPage() {
    currentUser = await getCurrentUser();

    await loadProject();

    if (projectId) {
        setupCommentForm();
        await loadComments();
    }
}

startPage();
