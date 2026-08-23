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

const quotePhotoLimit = 6;
const quoteMaxOriginalPhotoBytes = 16 * 1024 * 1024;
const quoteMaxPreparedPhotoBytes = 3200 * 1024;
const quotePhotoMaxDimension = 1280;

const setFormStatus = (status, message, state = "") => {
  if (!status) return;
  status.classList.remove("is-success", "is-error");
  if (state) status.classList.add(`is-${state}`);
  status.textContent = message;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("One of the selected photos could not be read.")));
    reader.readAsDataURL(file);
  });

const imageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Please upload JPG, PNG or WebP photos.")));
    image.src = dataUrl;
  });

const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("One of the selected photos could not be prepared."));
      }
    }, "image/jpeg", 0.72);
  });

const safePhotoName = (name, index) => {
  const baseName = String(name || `photo-${index + 1}`)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${baseName || `photo-${index + 1}`}.jpg`;
};

const prepareQuotePhoto = async (file, index) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload image files only.");
  }

  if (file.size > quoteMaxOriginalPhotoBytes) {
    throw new Error("One selected photo is too large. Please choose photos under 16 MB.");
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await imageFromDataUrl(dataUrl);
  const scale = Math.min(1, quotePhotoMaxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The selected photos could not be prepared in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas);
  const compressedDataUrl = await fileToDataUrl(blob);

  return {
    filename: safePhotoName(file.name, index),
    contentType: "image/jpeg",
    size: blob.size,
    content: String(compressedDataUrl).split(",")[1] || "",
  };
};

const prepareQuotePhotos = async (files) => {
  if (files.length > quotePhotoLimit) {
    throw new Error(`Please upload ${quotePhotoLimit} photos or fewer.`);
  }

  const prepared = [];
  let preparedBytes = 0;

  for (const [index, file] of files.entries()) {
    const photo = await prepareQuotePhoto(file, index);
    preparedBytes += photo.size;

    if (preparedBytes > quoteMaxPreparedPhotoBytes) {
      throw new Error("The selected photos are too large to send through the form. Please upload fewer photos or call Airrand directly.");
    }

    prepared.push(photo);
  }

  return prepared;
};

document.querySelectorAll("[data-contact-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector('button[type="submit"]');
    const photos = form.querySelector('input[type="file"]');
    const selectedPhotos = photos instanceof HTMLInputElement && photos.files ? Array.from(photos.files) : [];

    if (data.get("company")) {
      setFormStatus(status, "Request sent. Airrand will contact you shortly.", "success");
      form.reset();
      return;
    }

    setFormStatus(status, selectedPhotos.length ? "Preparing photos and sending your request..." : "Sending your request...");
    if (submitButton) submitButton.disabled = true;

    try {
      const payload = {
        name: data.get("name") || "",
        phone: data.get("phone") || "",
        email: data.get("email") || "",
        service: data.get("service") || "",
        streetAddress: data.get("streetAddress") || "",
        unit: data.get("unit") || "",
        city: data.get("city") || "",
        postalCode: data.get("postalCode") || "",
        projectType: data.get("projectType") || "",
        context: data.get("context") || "website",
        message: data.get("message") || "",
        photos: await prepareQuotePhotos(selectedPhotos),
      };

      const response = await fetch("/api/quote/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fallbackMessage =
          response.status === 404
            ? "The website quote form endpoint is not active on this deployment yet. Please call Airrand or email info@airrand.ca directly."
            : "The request could not be sent. Please call Airrand or email info@airrand.ca directly.";
        throw new Error(result.error || fallbackMessage);
      }

      setFormStatus(status, "Request sent to Airrand. We will contact you shortly.", "success");
      form.reset();
    } catch (error) {
      setFormStatus(status, error.message || "The request could not be sent. Please call Airrand or email info@airrand.ca directly.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
});
