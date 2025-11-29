const CONTACT_STORAGE_KEY = "contactMessages";

const loadMessages = () => {
  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveMessages = (messages) => {
  localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(messages));
};

document.addEventListener("DOMContentLoaded", () => {
  const dateEl = document.getElementById("currentDate");
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
    }).format(new Date());
  }

  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();
    const purpose = document.getElementById("contactPurpose").value.trim();
    if (!name || !email || !phone || !purpose) return;

    const messages = loadMessages();
    messages.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name,
      email,
      phone,
      purpose,
      timestamp: Date.now(),
    });
    saveMessages(messages);

    contactForm.reset();
    alert("Thank you for your message! We'll get back to you soon.");
  });
});

