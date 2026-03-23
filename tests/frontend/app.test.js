/**
 * Frontend unit tests for src/static/app.js
 * Uses jsdom (via jest-environment-jsdom) to simulate browser behavior.
 */

const fs = require("fs");
const path = require("path");

// Minimal activities fixture mirroring the backend data structure
const ACTIVITIES_FIXTURE = {
  "Chess Club": {
    description: "Learn and play chess",
    schedule: "Fridays 3-5pm",
    max_participants: 12,
    participants: ["michael@mergington.edu"],
  },
  "Programming Club": {
    description: "Code together",
    schedule: "Tuesdays 3-5pm",
    max_participants: 20,
    participants: [],
  },
};

function setupDocument() {
  document.body.innerHTML = `
    <div id="activities-list"><p>Loading...</p></div>
    <form id="signup-form">
      <select id="activity"><option value="">-- Select an activity --</option></select>
      <input id="email" type="email" value="" />
      <button type="submit">Sign up</button>
    </form>
    <div id="message" class="hidden"></div>
  `;
}

function loadAppScript() {
  const appPath = path.resolve(__dirname, "../../src/static/app.js");
  const code = fs.readFileSync(appPath, "utf8");
  // Execute inside the current jsdom window context
  const scriptEl = document.createElement("script");
  scriptEl.textContent = code;
  document.head.appendChild(scriptEl);
}

beforeEach(() => {
  // Reset fetch mock and DOM before each test
  jest.resetAllMocks();
  setupDocument();

  global.fetch = jest.fn();

  // Default: GET /activities returns the fixture
  global.fetch.mockImplementation((url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();

    if (url === "/activities" && method === "GET") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(ACTIVITIES_FIXTURE),
      });
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  loadAppScript();
});

// Helper: wait for all pending promises / microtasks to settle
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// fetchActivities
// ---------------------------------------------------------------------------

describe("fetchActivities – activity card rendering", () => {
  test("renders one card per activity", async () => {
    // DOMContentLoaded fires automatically when the script is injected while
    // the document is already loaded, but we need to dispatch it manually in
    // the test environment.
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const cards = document.querySelectorAll(".activity-card");
    expect(cards.length).toBe(Object.keys(ACTIVITIES_FIXTURE).length);
  });

  test("shows activity name, description and schedule in each card", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const firstCard = document.querySelector(".activity-card");
    expect(firstCard.textContent).toMatch("Chess Club");
    expect(firstCard.textContent).toMatch("Learn and play chess");
    expect(firstCard.textContent).toMatch("Fridays 3-5pm");
  });

  test("shows correct spots-left count", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const firstCard = document.querySelector(".activity-card");
    // Chess Club: max 12, 1 participant → 11 spots left
    expect(firstCard.textContent).toMatch("11 spots left");
  });

  test("lists existing participants in the card", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const firstCard = document.querySelector(".activity-card");
    expect(firstCard.textContent).toContain("michael@mergington.edu");
  });

  test("shows empty-state message when activity has no participants", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const cards = Array.from(document.querySelectorAll(".activity-card"));
    const programmingCard = cards.find((c) =>
      c.textContent.includes("Programming Club")
    );
    expect(programmingCard).toBeDefined();
    expect(programmingCard.textContent).toMatch(/be the first/i);
  });

  test("populates the activity select dropdown", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const select = document.getElementById("activity");
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("Chess Club");
    expect(options).toContain("Programming Club");
  });

  test("shows error message when fetch fails", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const list = document.getElementById("activities-list");
    expect(list.textContent).toMatch(/failed to load/i);
  });
});

// ---------------------------------------------------------------------------
// Signup form submission
// ---------------------------------------------------------------------------

describe("signup form submission", () => {
  test("POSTs to the correct endpoint with email and activity", async () => {
    global.fetch.mockImplementation((url, options = {}) => {
      const method = (options.method || "GET").toUpperCase();
      if (url === "/activities" && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(ACTIVITIES_FIXTURE),
        });
      }
      // Signup endpoint
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ message: "Signed up test@example.edu for Chess Club" }),
      });
    });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    document.getElementById("email").value = "test@example.edu";
    const select = document.getElementById("activity");
    select.value = "Chess Club";

    document.getElementById("signup-form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await flushPromises();

    const postCall = global.fetch.mock.calls.find(
      ([url, opts]) =>
        opts && opts.method === "POST" && url.includes("Chess%20Club")
    );
    expect(postCall).toBeDefined();
    expect(postCall[0]).toContain("test%40example.edu");
  });

  test("displays success message after successful signup", async () => {
    global.fetch.mockImplementation((url, options = {}) => {
      const method = (options.method || "GET").toUpperCase();
      if (url === "/activities" && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(ACTIVITIES_FIXTURE),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ message: "Signed up test@example.edu for Chess Club" }),
      });
    });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    document.getElementById("email").value = "test@example.edu";
    document.getElementById("activity").value = "Chess Club";

    document.getElementById("signup-form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await flushPromises();

    const messageDiv = document.getElementById("message");
    expect(messageDiv.classList.contains("hidden")).toBe(false);
    expect(messageDiv.classList.contains("success")).toBe(true);
  });

  test("displays error message when signup fails", async () => {
    global.fetch.mockImplementation((url, options = {}) => {
      const method = (options.method || "GET").toUpperCase();
      if (url === "/activities" && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(ACTIVITIES_FIXTURE),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: "Student already signed up" }),
      });
    });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    document.getElementById("email").value = "michael@mergington.edu";
    document.getElementById("activity").value = "Chess Club";

    document.getElementById("signup-form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await flushPromises();

    const messageDiv = document.getElementById("message");
    expect(messageDiv.classList.contains("error")).toBe(true);
    expect(messageDiv.textContent).toMatch(/Student already signed up/);
  });
});

// ---------------------------------------------------------------------------
// Unregister button
// ---------------------------------------------------------------------------

describe("unregister (delete) button", () => {
  test("sends DELETE request to the correct endpoint when clicked", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const deleteBtn = document.querySelector(".delete-btn");
    expect(deleteBtn).not.toBeNull();

    deleteBtn.click();
    await flushPromises();

    const deleteCall = global.fetch.mock.calls.find(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall[0]).toContain("michael%40mergington.edu");
    expect(deleteCall[0]).toContain("Chess%20Club");
  });

  test("re-fetches activities after successful unregistration", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    const callsBefore = global.fetch.mock.calls.filter(
      ([url]) => url === "/activities"
    ).length;

    const deleteBtn = document.querySelector(".delete-btn");
    deleteBtn.click();
    await flushPromises();

    const callsAfter = global.fetch.mock.calls.filter(
      ([url]) => url === "/activities"
    ).length;

    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});
