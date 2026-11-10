
import { supabase } from "./superbase.js";

const featuredGallery = document.getElementById("featuredProjects");

const FEATURED_COUNT = 3;

// GET WEEKLY SEED
function getWeeklySeed() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);

    const week = Math.floor(
        (now - start) / (7 * 24 * 60 * 60 * 1000)
    );

    return now.getFullYear() * 100 + week;
}

// CONSISTENT WEEKLY SHUFFLE
function seededShuffle(projects, seed) {
    const shuffled = [...projects];

    function random() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

// LOAD PROJECTS
async function loadFeaturedProjects() {

    featuredGallery.textContent = "Loading projects...";

    const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Projects error:", error);

        featuredGallery.textContent =
            "Couldn't load featured projects.";

        return;
    }

    if (!projects || projects.length === 0) {
        featuredGallery.textContent =
            "No projects yet. Be the first to share one!";

        return;
    }

    // PICK THREE PROJECTS FOR THIS WEEK
    const featured = seededShuffle(
        projects,
        getWeeklySeed()
    ).slice(0, FEATURED_COUNT);

    // GET MEMBER NICKNAMES
    const userIds = [...new Set(
        featured.map(project => project.user_id)
    )];

    const { data: members, error: memberError } = await supabase
        .from("public_profiles")
        .select("user_id, nickname")
        .in("user_id", userIds);

    if (memberError) {
        console.error("Nickname error:", memberError);
    }

    const memberNames = {};

    members?.forEach(member => {
        memberNames[member.user_id] = member.nickname;
    });

    // CLEAR OLD PROJECTS
    featuredGallery.replaceChildren();

    // CREATE PROJECT CARDS
    featured.forEach(project => {

        const card = document.createElement("article");
        card.className = "project-card";

        // IMAGE
        if (project.image_path) {

            const { data } = supabase.storage
                .from("project-images")
                .getPublicUrl(project.image_path);

            const image = document.createElement("img");

            image.className = "project-image";
            image.src = data.publicUrl;
            image.alt = project.title || "Project image";

            card.appendChild(image);
        }

        // PROJECT INFORMATION
        const info = document.createElement("div");
        info.className = "project-info";

        const category = document.createElement("span");
        category.textContent = project.category || "CREATION";

        const title = document.createElement("h3");
        title.textContent = project.title;

        const description = document.createElement("p");
        description.textContent =
            project.description || "No description added yet.";

        const creator = document.createElement("small");
        creator.textContent =
            `Created by ${memberNames[project.user_id] || "Club member"}`;

        info.append(category, title, description, creator);

        card.appendChild(info);

        // OPEN PROJECT DETAILS
        card.style.cursor = "pointer";

        card.addEventListener("click", () => {
            window.location.href =
                `project-details.html?id=${encodeURIComponent(project.id)}`;
        });

        featuredGallery.appendChild(card);
    });
}

// START
loadFeaturedProjects();
