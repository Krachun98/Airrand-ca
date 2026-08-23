const header = document.querySelector("[data-site-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");

if (header && navToggle && mobileNav) {
  const setOpen = (open) => {
    header.dataset.open = String(open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", open);
  };

  navToggle.addEventListener("click", () => {
    setOpen(header.dataset.open !== "true");
  });

  mobileNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setOpen(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear().toString();
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealNodes = [...document.querySelectorAll(".reveal")];

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealNodes.forEach((node) => node.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );
  revealNodes.forEach((node) => observer.observe(node));
}

document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  const filterButtons = [...gallery.querySelectorAll("[data-filter]")];
  const items = [...gallery.querySelectorAll("[data-gallery-item]")];

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      items.forEach((item) => {
        item.hidden = filter !== "all" && item.dataset.filterValue !== filter;
      });
    });
  });
});

document.querySelectorAll("[data-brand-directory]").forEach((directory) => {
  const filterButtons = [...directory.querySelectorAll("[data-brand-filter]")];
  const cards = [...directory.querySelectorAll("[data-brand-card]")];
  const empty = directory.querySelector("[data-brand-empty]");

  const setFilter = (filter) => {
    let visibleCount = 0;

    filterButtons.forEach((button) => {
      const active = button.dataset.brandFilter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    cards.forEach((card) => {
      const categories = (card.dataset.brandCategories || "").split(" ");
      const visible = filter === "all" || categories.includes(filter);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.hidden = visibleCount > 0;
    }
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setFilter(button.dataset.brandFilter || "all");
    });
  });
});

document.querySelectorAll(".work-marquee").forEach((marquee) => {
  const viewport = marquee.querySelector(".marquee-viewport");
  const track = marquee.querySelector(".marquee-track");
  const group = marquee.querySelector(".marquee-group");
  if (!viewport || !track || !group || prefersReducedMotion) return;

  let pointerId = null;
  let startX = 0;
  let startOffset = 0;
  let offset = 0;
  let groupWidth = 0;
  let duration = 36;
  let speed = 0;
  let isPointerDown = false;
  let isDragging = false;
  let suppressClick = false;
  let lastFrameTime = 0;

  const parseDuration = () => {
    const value =
      window.getComputedStyle(track).getPropertyValue("--scroll-duration").trim() ||
      window.getComputedStyle(track).animationDuration.split(",")[0] ||
      "";
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return 36;
    return value.trim().endsWith("ms") ? amount / 1000 : amount;
  };

  const wrapOffset = (value) => {
    if (!groupWidth) return value;
    let next = value;
    while (next > 0) next -= groupWidth;
    while (next <= -groupWidth) next += groupWidth;
    return next;
  };

  const applyOffset = () => {
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  };

  const updateMetrics = () => {
    groupWidth = group.getBoundingClientRect().width;
    if (!groupWidth) return;
    duration = parseDuration();
    speed = groupWidth / duration;
    offset = wrapOffset(offset);
    applyOffset();
  };

  const tick = (time) => {
    if (!lastFrameTime) lastFrameTime = time;
    const seconds = (time - lastFrameTime) / 1000;
    lastFrameTime = time;

    if (!isPointerDown && groupWidth && speed) {
      offset = wrapOffset(offset - speed * seconds);
      applyOffset();
    }

    window.requestAnimationFrame(tick);
  };

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointerId !== null) return;
    updateMetrics();
    pointerId = event.pointerId;
    startX = event.clientX;
    startOffset = offset;
    isPointerDown = true;
    isDragging = false;
  });

  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const delta = event.clientX - startX;
    if (!isDragging && Math.abs(delta) > 6) {
      isDragging = true;
      marquee.classList.add("is-dragging");
      viewport.setPointerCapture(pointerId);
    }
    if (!isDragging) return;
    offset = wrapOffset(startOffset + delta);
    applyOffset();
    event.preventDefault();
  });

  const endDrag = (event) => {
    if (event.pointerId !== pointerId) return;
    if (viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    const wasDragging = isDragging;
    pointerId = null;
    isPointerDown = false;
    isDragging = false;
    lastFrameTime = 0;
    if (wasDragging) {
      marquee.classList.remove("is-dragging");
      if (document.activeElement instanceof HTMLElement && marquee.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
  };

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  marquee.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  marquee.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  track.style.animation = "none";
  track.querySelectorAll("img").forEach((image) => {
    image.draggable = false;
  });
  updateMetrics();
  window.requestAnimationFrame(tick);

  if ("ResizeObserver" in window) {
    new ResizeObserver(updateMetrics).observe(group);
  } else {
    window.addEventListener("resize", updateMetrics);
  }
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
let lastLightboxTrigger = null;
let lightboxOpenedByPointer = false;

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove("nav-open");
  if (lastLightboxTrigger) {
    if (lightboxOpenedByPointer && lastLightboxTrigger.closest(".work-marquee")) {
      lastLightboxTrigger.blur();
    } else {
      lastLightboxTrigger.focus();
    }
  }
  lightboxOpenedByPointer = false;
}

if (lightbox && lightboxImage && lightboxCaption && lightboxClose) {
  document.querySelectorAll("[data-lightbox-src]").forEach((button) => {
    button.addEventListener("click", (event) => {
      lastLightboxTrigger = button;
      lightboxOpenedByPointer = event.detail > 0;
      lightboxImage.src = button.dataset.lightboxSrc || "";
      lightboxImage.alt = button.dataset.lightboxAlt || "";
      lightboxCaption.textContent = button.dataset.lightboxTitle || "";
      lightbox.hidden = false;
      document.body.classList.add("nav-open");
      lightboxClose.focus();
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
}

document.querySelectorAll("[data-contact-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const status = form.querySelector("[data-form-status]");
    const photos = form.querySelector('input[type="file"]');
    const toEmail = "info@airrand.ca";
    const selectedPhotos = photos instanceof HTMLInputElement && photos.files && photos.files.length > 0;
    const subject = encodeURIComponent(`Airrand ${data.get("service") || "HVAC"} request`);
    const bodyLines = [
      `Name: ${data.get("name") || ""}`,
      `Phone: ${data.get("phone") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `Service Needed: ${data.get("service") || ""}`,
      `Project Type: ${data.get("projectType") || ""}`,
      `Source: ${data.get("context") || "website"}`,
      `Photos selected: ${selectedPhotos ? "Yes - attach before sending" : "No"}`,
      "",
      "Message:",
      data.get("message") || "",
    ];
    const body = encodeURIComponent(bodyLines.join("\n"));
    const mailtoUrl = `mailto:${toEmail}?subject=${subject}&body=${body}`;

    if (status) {
      const photoNote = selectedPhotos ? " Attach the selected photos before sending." : "";
      const fallbackLink = document.createElement("a");
      fallbackLink.href = mailtoUrl;
      fallbackLink.textContent = toEmail;
      status.textContent = "Opening an email addressed to ";
      status.append(fallbackLink, `.${photoNote} Send the email to complete the request.`);
    }
    window.location.href = mailtoUrl;
  });
});
