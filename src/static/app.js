document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to prevent HTML injection when inserting participant names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicate options when reloading
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHtml = '<div class="participants-section"><strong>Participants:</strong>';

        if (participants.length > 0) {
          participantsHtml += '<ul class="participants-list">';
          participantsHtml += participants
            .map(
              (p) =>
                `<li class="participant-item"><span class="participant-name">${escapeHtml(
                  p
                )}</span><button class="participant-delete" data-activity="${escapeHtml(
                  name
                )}" data-email="${escapeHtml(p)}" title="Remove participant">\u2716</button></li>`
            )
            .join("");
          participantsHtml += "</ul>";
        } else {
          participantsHtml += '<p class="no-participants">No participants yet</p>';
        }
        participantsHtml += "</div>";

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly registered participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegate click handler for delete buttons
  activitiesList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".participant-delete");
    if (!btn) return;

    const activity = btn.getAttribute("data-activity");
    const email = btn.getAttribute("data-email");

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        // Refresh activities to reflect change
        fetchActivities();
      } else {
        console.error("Failed to unregister:", result);
        alert(result.detail || "Failed to unregister participant");
      }
    } catch (err) {
      console.error("Error unregistering participant:", err);
      alert("Error unregistering participant. Check console for details.");
    }
  });
});
