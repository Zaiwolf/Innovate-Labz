
import { supabase } from "./superbase.js";

// =================================
// ELEMENTS
// =================================

const projectForm = document.getElementById("projectForm");

const titleInput = document.getElementById("projectTitle");
const descriptionInput = document.getElementById("projectDescription");
const categoryInput = document.getElementById("projectCategory");
const imageInput = document.getElementById("projectImage");
const videoInput = document.getElementById("projectVideo");
const urlInput = document.getElementById("projectUrl");

const projectMessage = document.getElementById("projectMessage");
const publishButton = document.getElementById("publishButton");

const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const removeImageButton = document.getElementById("removeImage");

const videoPreview = document.getElementById("videoPreview");
const previewVideo = document.getElementById("previewVideo");
const removeVideoButton = document.getElementById("removeVideo");

let selectedImage = null;
let imagePreviewUrl = null;

let selectedVideo = null;
let videoPreviewUrl = null;


// =================================
// MESSAGE HELPER
// =================================

function showMessage(message, color) {
    projectMessage.textContent = message;
    projectMessage.style.color = color;
}


// =================================
// IMAGE PREVIEW
// =================================

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showMessage(
            "Please choose a PNG, JPG or WEBP image.",
            "#F2A6A0"
        );

        imageInput.value = "";
        selectedImage = null;
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showMessage(
            "Your image must be smaller than 5 MB.",
            "#F2A6A0"
        );

        imageInput.value = "";
        selectedImage = null;
        return;
    }

    selectedImage = file;

    if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
    }

    imagePreviewUrl = URL.createObjectURL(file);

    previewImage.src = imagePreviewUrl;
    imagePreview.classList.add("show");

    showMessage("", "");
});


// =================================
// REMOVE IMAGE
// =================================

removeImageButton.addEventListener("click", () => {
    selectedImage = null;
    imageInput.value = "";

    if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        imagePreviewUrl = null;
    }

    previewImage.removeAttribute("src");
    imagePreview.classList.remove("show");
});


// =================================
// VIDEO PREVIEW
// =================================

videoInput.addEventListener("change", () => {
    const file = videoInput.files[0];

    if (!file) return;

    const allowedTypes = [
        "video/mp4",
        "video/webm"
    ];

    if (!allowedTypes.includes(file.type)) {
        showMessage(
            "Please choose an MP4 or WebM video.",
            "#F2A6A0"
        );

        videoInput.value = "";
        selectedVideo = null;
        return;
    }

    if (file.size > 25 * 1024 * 1024) {
        showMessage(
            "Your video must be smaller than 25 MB.",
            "#F2A6A0"
        );

        videoInput.value = "";
        selectedVideo = null;
        return;
    }

    selectedVideo = file;

    if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
    }

    videoPreviewUrl = URL.createObjectURL(file);

    previewVideo.src = videoPreviewUrl;
    videoPreview.classList.add("show");

    showMessage("", "");
});


// =================================
// REMOVE VIDEO
// =================================

removeVideoButton.addEventListener("click", () => {
    selectedVideo = null;
    videoInput.value = "";

    if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        videoPreviewUrl = null;
    }

    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();

    videoPreview.classList.remove("show");
});


// =================================
// UPLOAD IMAGE
// =================================

async function uploadProjectImage(file, userId) {
    const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp"
    };

    const extension = extensions[file.type];

    const filePath =
        `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
        .from("project-images")
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        throw error;
    }

    return filePath;
}


// =================================
// UPLOAD VIDEO
// =================================

async function uploadProjectVideo(file, userId) {
    const extensions = {
        "video/mp4": "mp4",
        "video/webm": "webm"
    };

    const extension = extensions[file.type];

    const filePath =
        `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
        .from("project-videos")
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        throw error;
    }

    return filePath;
}


// =================================
// SUBMIT PROJECT
// =================================

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";

    try {
        // CHECK LOGIN
        const { data, error: authError } =
            await supabase.auth.getUser();

        if (authError || !data.user) {
            showMessage(
                "You need to log in before publishing a project.",
                "#F2A6A0"
            );
            return;
        }

        const user = data.user;

        // COLLECT FORM INFORMATION
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const category = categoryInput.value;
        const projectUrl = urlInput.value.trim();

        if (!title || !description || !category) {
            showMessage(
                "Please complete all required fields.",
                "#F2A6A0"
            );
            return;
        }

        // VALIDATE PROJECT URL
        if (projectUrl) {
            try {
                const parsedUrl = new URL(projectUrl);

                if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                    throw new Error("Invalid URL");
                }

            } catch {
                showMessage(
                    "Please enter a valid project link.",
                    "#F2A6A0"
                );
                return;
            }
        }

        // UPLOAD IMAGE IF SELECTED
        let imagePath = null;

        if (selectedImage) {
            imagePath = await uploadProjectImage(
                selectedImage,
                user.id
            );
        }

        // UPLOAD VIDEO IF SELECTED
        let videoPath = null;

        if (selectedVideo) {
            videoPath = await uploadProjectVideo(
                selectedVideo,
                user.id
            );
        }

        // SAVE PROJECT TO SUPABASE
        const { error: insertError } = await supabase
            .from("projects")
            .insert({
                user_id: user.id,
                title: title,
                description: description,
                category: category,
                image_path: imagePath,
                video_path: videoPath,
                project_url: projectUrl || null,
                status: "approved"
            });

        if (insertError) {
            throw insertError;
        }

        showMessage(
            "Your project has been published successfully! ✦",
            "#75D6C4"
        );

        // RESET FORM
        projectForm.reset();

        selectedImage = null;
        selectedVideo = null;

        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            imagePreviewUrl = null;
        }

        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
            videoPreviewUrl = null;
        }

        previewImage.removeAttribute("src");
        imagePreview.classList.remove("show");

        previewVideo.pause();
        previewVideo.removeAttribute("src");
        previewVideo.load();
        videoPreview.classList.remove("show");

    } catch (error) {
        console.error("Project publishing error:", error);

        showMessage(
            error.message || "Something went wrong. Please try again.",
            "#F2A6A0"
        );

    } finally {
        publishButton.disabled = false;
        publishButton.innerHTML =
            'Publish Project <span>↗</span>';
    }
});
