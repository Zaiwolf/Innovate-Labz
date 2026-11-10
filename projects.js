
import { supabase } from "./superbase.js";

const projectGallery = document.getElementById("projectGallery");
const searchInput = document.getElementById("projectSearch");
const categoryFilter = document.getElementById("categoryFilter");

const reactionOptions = ["❤️", "🔥", "😍", "👏", "🤯", "⭐"];

let allProjects = [];
let currentUser = null;
let reactionCounts = {};
let myReactions = {};
let memberNames = {};

// CHECK WHO IS LOGGED IN
async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error("Login check:", error);
        return null;
    }

    return data.user;
}

// LOAD MEMBER NICKNAMES
async function loadMemberNames() {
    memberNames = {};

    const userIds = [
        ...new Set(allProjects.map(project => project.user_id))
    ];

    if (userIds.length === 0) return;

    const { data, error } = await supabase
        .from("public_profiles")
        .select("user_id, nickname")
        .in("user_id", userIds);

    if (error) {
        console.error("Nickname loading error:", error);
        return;
    }

    data.forEach(member => {
        memberNames[member.user_id] = member.nickname;
    });
}

// LOAD REACTION COUNTS
async function loadReactions() {
    reactionCounts = {};
    myReactions = {};

    const projectIds = allProjects.map(project => project.id);

    if (projectIds.length === 0) return;

    const { data: counts, error: countsError } = await supabase
        .rpc("get_project_reaction_counts", {
            p_project_ids: projectIds
        });

    if (countsError) {
        console.error("Reaction counts error:", countsError);
    } else {
        counts?.forEach(item => {
            const key = `${item.project_id}:${item.reaction}`;
            reactionCounts[key] = Number(item.reaction_count);
        });
    }

    if (currentUser) {
        const { data: mine, error: mineError } = await supabase
            .from("project_reactions")
            .select("project_id, reaction")
            .in("project_id", projectIds)
            .eq("user_id", currentUser.id);

        if (mineError) {
            console.error("My reactions error:", mineError);
        } else {
            mine?.forEach(item => {
                myReactions[item.project_id] = item.reaction;
            });
        }
    }
}

// ADD, CHANGE OR REMOVE A REACTION
async function handleReaction(projectId, reaction, button) {
    if (!currentUser) {
        alert("Please log in to react to projects!");
        return;
    }

    button.disabled = true;

    const existingReaction = myReactions[projectId];

    let result;

    if (existingReaction === reaction) {
        result = await supabase
            .from("project_reactions")
            .delete()
            .eq("project_id", projectId)
            .eq("user_id", currentUser.id);
    } else {
        result = await supabase
            .from("project_reactions")
            .upsert(
                {
                    project_id: projectId,
                    user_id: currentUser.id,
                    reaction: reaction
                },
                {
                    onConflict: "project_id,user_id"
                }
            );
    }

    if (result.error) {
        console.error("Reaction error:", result.error);
        alert("Couldn't save your reaction. Please try again.");
        button.disabled = false;
        return;
    }

    await loadReactions();
    displayProjects();
}

// LOAD PROJECTS FROM SUPABASE
async function loadProjects() {
    projectGallery.textContent = "Loading projects...";

    currentUser = await getCurrentUser();

    const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

    if (error) {
        projectGallery.textContent =
            "Couldn't load projects. Please try again.";

        console.error("Projects error:", error);
        return;
    }

    allProjects = projects || [];

    // Display projects even if extra data has a problem
    displayProjects();

    await Promise.all([
        loadMemberNames(),
        loadReactions()
    ]);

    displayProjects();
}

// DISPLAY PROJECTS
function displayProjects() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filteredProjects = allProjects.filter(project => {
        const matchesSearch =
            (project.title || "").toLowerCase().includes(searchTerm) ||
            (project.description || "").toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            project.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    projectGallery.replaceChildren();

    if (filteredProjects.length === 0) {
        projectGallery.textContent =
            "No projects found. Try another search!";
        return;
    }

    filteredProjects.forEach(project => {

        const card = document.createElement("article");
        card.className = "project-card";
        card.style.cursor = "pointer";
        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `View ${project.title}`);

        function openProject() {
            window.location.href =
                `project-details.html?id=${encodeURIComponent(project.id)}`;
        }

        card.addEventListener("click", openProject);

        card.addEventListener("keydown", event => {
            if (event.target.closest(".project-reactions")) return;

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openProject();
            }
        });

        // CATEGORY
        const category = document.createElement("span");
        category.textContent = project.category || "CREATION";

        // CREATOR NAME
        const creator = document.createElement("p");
        creator.className = "project-creator";
        creator.textContent =
            `Created by ${memberNames[project.user_id] || "Club member"}`;

        // TITLE
        const title = document.createElement("h3");
        title.textContent = project.title;

        // DESCRIPTION
        const description = document.createElement("p");
        description.textContent =
            project.description || "No description added yet.";

        card.append(category, creator, title, description);

        // PROJECT IMAGE
        if (project.image_path) {
            const { data } = supabase.storage
                .from("project-images")
                .getPublicUrl(project.image_path);

            const image = document.createElement("img");
            image.src = data.publicUrl;
            image.alt = project.title || "Project image";

            card.prepend(image);
        }

        // REACTIONS
        const reactionContainer = document.createElement("div");
        reactionContainer.className = "project-reactions";

        reactionContainer.addEventListener("click", event => {
            event.stopPropagation();
        });

        reactionOptions.forEach(emoji => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "reaction-button";

            const count =
                reactionCounts[`${project.id}:${emoji}`] || 0;

            const selected = myReactions[project.id] === emoji;

            button.textContent = `${emoji} ${count}`;
            button.classList.toggle("active", selected);

            button.title = currentUser
                ? `React with ${emoji}`
                : "Log in to react";

            button.addEventListener("click", event => {
                event.stopPropagation();
                handleReaction(project.id, emoji, button);
            });

            reactionContainer.appendChild(button);
        });

        card.appendChild(reactionContainer);
        projectGallery.appendChild(card);
    });
}

// SEARCH PROJECTS
searchInput.addEventListener("input", displayProjects);

// FILTER BY CATEGORY
categoryFilter.addEventListener("change", displayProjects);

// START
loadProjects();
