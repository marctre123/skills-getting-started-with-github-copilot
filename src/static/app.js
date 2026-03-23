document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build static part of the activity card
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Build participants section safely using DOM APIs
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsLabel = document.createElement("strong");
        participantsLabel.textContent = "Participants:";
        participantsSection.appendChild(participantsLabel);

        if (details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;
            li.appendChild(span);

            const button = document.createElement("button");
            button.className = "delete-btn";
            button.title = "Unregister participant";
            button.textContent = "\u00d7";
            button.dataset.email = p;
            button.dataset.activity = name;
            li.appendChild(button);

            ul.appendChild(li);
          });

          participantsSection.appendChild(ul);
        } else {
          const noParticipants = document.createElement("p");
          noParticipants.className = "no-participants";
          noParticipants.textContent = "No participants yet \u2014 be the first!";
          participantsSection.appendChild(noParticipants);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Attach unregister handlers to delete buttons
        activityCard.querySelectorAll(".delete-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const email = btn.dataset.email;
            const activity = btn.dataset.activity;
            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );
              if (response.ok) {
                fetchActivities();
              } else {
                const result = await response.json();
                console.error("Error unregistering:", result.detail);
              }
            } catch (error) {
              console.error("Error unregistering participant:", error);
            }
          });
        });

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
        await fetchActivities();
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
});
