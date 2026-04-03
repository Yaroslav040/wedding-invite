// Initialize AOS animations.
AOS.init({
  once: true,
  duration: 900,
  easing: "ease-out-cubic",
  offset: 90
});

const WEDDING_DATE = new Date("2026-08-21T15:00:00+03:00").getTime();
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const now = Date.now();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    return;
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  daysEl.textContent = pad(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
}

updateCountdown();
setInterval(updateCountdown, 1000);

const invitationBadge = document.getElementById("invitationBadge");
const guestNameInput = document.getElementById("guestName");
const urlGuestNameInput = document.getElementById("urlGuestName");

function applyNameFromURL() {
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("name");

  if (!rawName) {
    return;
  }

  // Keep only safe length and trim visual noise.
  const cleanName = rawName.trim().slice(0, 80);
  if (!cleanName) {
    return;
  }

  invitationBadge.textContent = `Запрошення для ${cleanName}`;
  invitationBadge.classList.add("visible");

  guestNameInput.value = cleanName;
  if (urlGuestNameInput) {
    urlGuestNameInput.value = cleanName;
  }
}

applyNameFromURL();

const albumTrack = document.getElementById("albumTrack");
const albumPrev = document.querySelector(".album-prev");
const albumNext = document.querySelector(".album-next");
const miniAlbum = document.querySelector(".mini-album");
const albumDots = document.getElementById("albumDots");
const albumCounter = document.getElementById("albumCounter");
const albumSlides = albumTrack ? Array.from(albumTrack.children) : [];
let albumIndex = 0;
let albumTimerId = null;
let touchStartX = 0;
let touchStartY = 0;
let dotButtons = [];

function renderAlbum() {
  if (!albumTrack) {
    return;
  }
  albumTrack.style.transform = `translateX(-${albumIndex * 100}%)`;

  if (albumCounter) {
    albumCounter.textContent = `${albumIndex + 1} / ${albumSlides.length}`;
  }

  if (dotButtons.length) {
    dotButtons.forEach((button, index) => {
      button.classList.toggle("active", index === albumIndex);
      button.setAttribute("aria-current", index === albumIndex ? "true" : "false");
    });
  }
}

function goToAlbumSlide(nextIndex) {
  if (!albumSlides.length) {
    return;
  }
  albumIndex = (nextIndex + albumSlides.length) % albumSlides.length;
  renderAlbum();
}

function stopAlbumAutoplay() {
  if (albumTimerId) {
    clearInterval(albumTimerId);
    albumTimerId = null;
  }
}

function startAlbumAutoplay() {
  if (albumSlides.length < 2) {
    return;
  }
  stopAlbumAutoplay();
  albumTimerId = setInterval(() => {
    goToAlbumSlide(albumIndex + 1);
  }, 3600);
}

if (albumTrack && albumSlides.length) {
  if (albumDots) {
    dotButtons = albumSlides.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "album-dot";
      dot.setAttribute("aria-label", `Перейти до фото ${index + 1}`);
      dot.addEventListener("click", () => {
        goToAlbumSlide(index);
        startAlbumAutoplay();
      });
      albumDots.append(dot);
      return dot;
    });
  }

  renderAlbum();
  startAlbumAutoplay();

  if (albumPrev) {
    albumPrev.addEventListener("click", () => {
      goToAlbumSlide(albumIndex - 1);
      startAlbumAutoplay();
    });
  }

  if (albumNext) {
    albumNext.addEventListener("click", () => {
      goToAlbumSlide(albumIndex + 1);
      startAlbumAutoplay();
    });
  }

  if (miniAlbum) {
    miniAlbum.addEventListener("mouseenter", stopAlbumAutoplay);
    miniAlbum.addEventListener("mouseleave", startAlbumAutoplay);
    miniAlbum.addEventListener("focusin", stopAlbumAutoplay);
    miniAlbum.addEventListener("focusout", startAlbumAutoplay);

    miniAlbum.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToAlbumSlide(albumIndex - 1);
        startAlbumAutoplay();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToAlbumSlide(albumIndex + 1);
        startAlbumAutoplay();
      }
    });

    miniAlbum.addEventListener("touchstart", (event) => {
      if (!event.touches.length) {
        return;
      }
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    miniAlbum.addEventListener("touchend", (event) => {
      if (!event.changedTouches.length) {
        return;
      }
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;

      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) {
        return;
      }

      if (dx > 0) {
        goToAlbumSlide(albumIndex - 1);
      } else {
        goToAlbumSlide(albumIndex + 1);
      }
      startAlbumAutoplay();
    }, { passive: true });
  }
}

const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");
const formSubmitButton = form ? form.querySelector('button[type="submit"]') : null;
const attendanceSelect = document.getElementById("attendance");
const guestsCountInput = document.getElementById("guestsCount");
const guestsField = document.getElementById("guestsField");
const additionalGuestsWrap = document.getElementById("additionalGuestsWrap");
const additionalGuestsContainer = document.getElementById("additionalGuests");

// Google Form current mapping (verified from live form):
// entry.57352262 -> Кількість дітей
// entry.1007123824 -> Кількість дорослих
// entry.1960921808 -> Список додаткових гостей
const FORM_ENTRY_CHILDREN = "entry.57352262";
const FORM_ENTRY_ADULTS = "entry.1007123824";
const FORM_ENTRY_GUESTS_LIST = "entry.1960921808";

const FULL_NAME_REGEX = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'’`-]+(?:\s+[A-Za-zА-Яа-яІіЇїЄєҐґ'’`-]+)+$/;

function normalizeSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isValidFullName(value) {
  const normalized = normalizeSpaces(value);
  if (!FULL_NAME_REGEX.test(normalized)) {
    return false;
  }
  return normalized
    .split(" ")
    .every((part) => part.replace(/['’`-]/g, "").length >= 2);
}

function setNameValidationState(input, valid) {
  input.classList.toggle("invalid", !valid);
}

function validateNameInput(input) {
  const normalized = normalizeSpaces(input.value);
  input.value = normalized;
  const valid = isValidFullName(normalized);
  setNameValidationState(input, valid);
  return valid;
}

function renderAdditionalGuestFields() {
  if (!additionalGuestsContainer || !additionalGuestsWrap || !attendanceSelect || !guestsCountInput) {
    return;
  }

  const declined = attendanceSelect.value === "На жаль, не зможу";
  const totalGuests = Math.max(0, parseInt(guestsCountInput.value || "0", 10) || 0);
  const extraGuestsCount = declined ? 0 : Math.max(0, totalGuests - 1);
  const previousValues = Array.from(additionalGuestsContainer.querySelectorAll(".guest-row")).map((row) => {
    const input = row.querySelector(".extra-guest-name");
    const childCheckbox = row.querySelector(".extra-guest-child");
    return {
      name: input ? input.value : "",
      isChild: Boolean(childCheckbox && childCheckbox.checked)
    };
  });

  additionalGuestsContainer.innerHTML = "";
  additionalGuestsWrap.classList.toggle("is-hidden", extraGuestsCount === 0);

  for (let index = 0; index < extraGuestsCount; index += 1) {
    const row = document.createElement("div");
    row.className = "guest-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "extra-guest-name";
    input.placeholder = `Гість ${index + 2}: Ім'я Прізвище`;
    input.autocomplete = "name";
    input.value = previousValues[index]?.name || "";
    input.required = true;
    input.addEventListener("blur", () => {
      if (input.value.trim() !== "") {
        validateNameInput(input);
      }
    });

    const childLabel = document.createElement("label");
    childLabel.className = "child-flag";

    const childCheckbox = document.createElement("input");
    childCheckbox.type = "checkbox";
    childCheckbox.className = "extra-guest-child";
    childCheckbox.checked = previousValues[index]?.isChild || false;

    const childText = document.createElement("span");
    childText.textContent = "Дитина";

    childLabel.append(childCheckbox, childText);
    row.append(input, childLabel);
    additionalGuestsContainer.append(row);
  }
}

function syncRsvpConditionalFields() {
  if (!attendanceSelect || !guestsCountInput || !guestsField) {
    return;
  }

  const declined = attendanceSelect.value === "На жаль, не зможу";

  if (declined) {
    guestsField.classList.add("is-hidden");
    guestsCountInput.required = false;
    guestsCountInput.min = "0";
    guestsCountInput.value = "0";
    guestsCountInput.setAttribute("tabindex", "-1");
  } else {
    guestsField.classList.remove("is-hidden");
    guestsCountInput.required = true;
    guestsCountInput.min = "1";
    guestsCountInput.removeAttribute("tabindex");

    if (guestsCountInput.value === "0") {
      guestsCountInput.value = "";
    }

  }

  renderAdditionalGuestFields();
}

if (attendanceSelect) {
  attendanceSelect.addEventListener("change", syncRsvpConditionalFields);
}

if (guestsCountInput) {
  guestsCountInput.addEventListener("input", () => {
    if (attendanceSelect && attendanceSelect.value !== "На жаль, не зможу") {
      const value = Math.max(0, parseInt(guestsCountInput.value || "0", 10) || 0);
      guestsCountInput.value = value ? String(value) : "";
      if (value > 6) {
        guestsCountInput.value = "6";
      }
    }
    renderAdditionalGuestFields();
  });
}

if (guestNameInput) {
  guestNameInput.addEventListener("blur", () => {
    if (guestNameInput.value.trim() !== "") {
      validateNameInput(guestNameInput);
    }
  });
}

syncRsvpConditionalFields();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const action = form.getAttribute("action") || "";
  const isViewFormUrl = action.includes("/viewform");
  const hasPlaceholderEntries = Array.from(form.elements).some((element) => {
    if (!(element instanceof HTMLElement) || !("name" in element)) {
      return false;
    }
    return typeof element.name === "string" && /entry\.(1{10}|2{10}|3{10}|4{10})/.test(element.name);
  });

  // Prevent submit if Google Forms IDs were not configured yet.
  if (action.includes("GOOGLE_FORM_ID") || hasPlaceholderEntries || isViewFormUrl) {
    formStatus.textContent = "Вкажіть коректний URL formResponse і правильні entry ID.";
    return;
  }

  syncRsvpConditionalFields();

  if (!attendanceSelect.value) {
    formStatus.textContent = "Оберіть, будь ласка, чи зможете доєднатись.";
    attendanceSelect.focus();
    return;
  }

  const declined = attendanceSelect.value === "На жаль, не зможу";
  const mainNameValid = validateNameInput(guestNameInput);
  if (!mainNameValid) {
    formStatus.textContent = "Вкажіть ім'я та прізвище (мінімум два слова).";
    guestNameInput.focus();
    return;
  }

  if (!declined && (!guestsCountInput.value || Number(guestsCountInput.value) < 1)) {
    formStatus.textContent = "Вкажіть, будь ласка, коректну кількість осіб.";
    guestsCountInput.focus();
    return;
  }

  const extraGuestInputs = Array.from(document.querySelectorAll(".extra-guest-name"));
  for (const input of extraGuestInputs) {
    if (!validateNameInput(input)) {
      formStatus.textContent = "Перевірте ПІБ для всіх додаткових гостей.";
      input.focus();
      return;
    }
  }

  formStatus.textContent = "Надсилаємо...";

  const mainGuest = normalizeSpaces(guestNameInput.value);

  const extraGuestRows = Array.from(document.querySelectorAll("#additionalGuests .guest-row"));
  const extraGuests = extraGuestRows.map((row) => {
    const input = row.querySelector(".extra-guest-name");
    const childCheckbox = row.querySelector(".extra-guest-child");
    return {
      name: normalizeSpaces(input ? input.value : ""),
      isChild: Boolean(childCheckbox && childCheckbox.checked)
    };
  });

  const adultsList = declined
    ? []
    : [mainGuest, ...extraGuests.filter((guest) => !guest.isChild).map((guest) => guest.name)];
  const childrenList = declined
    ? []
    : extraGuests.filter((guest) => guest.isChild).map((guest) => guest.name);

  const adultsCount = adultsList.length;
  const childrenCount = childrenList.length;
  const totalGuests = adultsCount + childrenCount;

  const statusText = declined ? "На жаль, не зможу" : "Так, буду";

  // Multi-line payload for Google Forms: separate adult/children lists + totals.
  const guestsPayload = [
    `Статус: ${statusText}`,
    `Контакт: ${mainGuest}`,
    `Список дорослих (${adultsCount}):`,
    ...(adultsList.length ? adultsList.map((name) => `- ${name}`) : ["- немає"]),
    `Список дітей (${childrenCount}):`,
    ...(childrenList.length ? childrenList.map((name) => `- ${name}`) : ["- немає"]),
    `Всього гостей: ${totalGuests}`,
    `Дорослих: ${adultsCount}`,
    `Дітей: ${childrenCount}`
  ].join("\n");

  const params = new URLSearchParams();
  params.set(FORM_ENTRY_CHILDREN, String(childrenCount));
  params.set(FORM_ENTRY_ADULTS, String(adultsCount));
  params.set(FORM_ENTRY_GUESTS_LIST, guestsPayload);

  let hiddenFrame = document.querySelector('iframe[name="hidden_iframe"]');
  if (!hiddenFrame) {
    hiddenFrame = document.createElement("iframe");
    hiddenFrame.name = "hidden_iframe";
    hiddenFrame.title = "hidden form transport";
    hiddenFrame.className = "hidden-frame";
    document.body.append(hiddenFrame);
  }

  const submitUrl = `${action}?${params.toString()}`;

  if (formSubmitButton) {
    formSubmitButton.disabled = true;
  }

  hiddenFrame.setAttribute("src", submitUrl);

  setTimeout(() => {
    formStatus.textContent = "Дякуємо! Відповідь надіслано.";
    form.reset();
    guestNameInput.classList.remove("invalid");
    applyNameFromURL();
    syncRsvpConditionalFields();
    if (formSubmitButton) {
      formSubmitButton.disabled = false;
    }
  }, 1200);
});
