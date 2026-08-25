import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  googleReviews,
  navServiceGroups,
  processSteps,
  serviceAreas,
  services,
  site,
  whyPoints,
} from "./site-data.mjs";
import { installationPhotos } from "./gallery-photos.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

const pages = [];
const assetVersion = "commercial-page-20260823";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const asset = (name) => `/assets/${name}`;
const pageUrl = (pathname) => new URL(pathname, `${site.baseUrl}/`).toString();
const link = (pathname) => pathname;
const quoteRequestPath = "/contact/#quote-form";
const serviceHref = (slug) => (slug === "commercial-hvac" ? "/commercial/" : `/services/${slug}/`);

const mobileHeroSourceImages = new Set([
  "hero-hvac-work.webp",
  "shop-background.webp",
  "air-conditioning-installation.webp",
  "furnace-installation.webp",
  "heat-pump-installation.webp",
  "ductless-installation.webp",
  "ductwork-installation.webp",
  "gas-line-installation.webp",
  "water-heater-installation.webp",
  "tankless-water-heater.webp",
  "humidifier-installation.webp",
  "gas-fireplace-installation.webp",
  "residential-hvac-house.webp",
  "contact-background.webp",
  "contact-airrand-background.webp",
  "about-background.webp",
]);

const mobileHeroImage = (name) => {
  if (!mobileHeroSourceImages.has(name)) return "";
  return `mobile-hero/${path.basename(name, ".webp")}-mobile.webp`;
};

const heroImageStyle = (name) => {
  const mobileImage = mobileHeroImage(name);
  return `--hero-image: url('${asset(name)}')${mobileImage ? `; --mobile-hero-image: url('${asset(mobileImage)}')` : ""}`;
};

const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

const photoFallbacks = {
  "heat-pumps": "air-conditioning",
  "hrv-erv": "ductwork",
  "gas-fireplaces": "gas-lines",
  "hvac-installation": "commercial-hvac",
  "hvac-repair": "furnaces",
  "hvac-maintenance": "furnaces",
};

const photoFilters = {
  "air-conditioning": "air-conditioning",
  "commercial-hvac": "commercial",
  "ductless-systems": "ductless",
  ductwork: "ductwork",
  furnaces: "furnaces",
  "gas-lines": "gas",
  humidifiers: "indoor-air",
  "tankless-water-heaters": "water-heating",
  "water-heaters": "water-heating",
};

const photoHeadings = {
  "air-conditioning": "Recent Air Conditioning Installations",
  "commercial-hvac": "Recent commercial HVAC projects.",
  "ductless-systems": "Recent ductless installations.",
  ductwork: "Recent ductwork installations.",
  furnaces: "Recent furnace installations.",
  "gas-lines": "Recent gas line installations.",
  humidifiers: "Recent humidifier installations.",
  "tankless-water-heaters": "Recent tankless water heater installations.",
  "water-heaters": "Recent Water Heating Installations",
};

const photoSourceLabels = {
  "air-conditioning": "air conditioning installation",
  "commercial-hvac": "commercial HVAC project",
  "ductless-systems": "ductless system installation",
  ductwork: "ductwork installation",
  furnaces: "furnace installation",
  "gas-lines": "gas line installation",
  humidifiers: "humidifier installation",
  "tankless-water-heaters": "tankless water heater installation",
  "water-heaters": "water heater installation",
};

function projectPhotos() {
  const order = [
    "commercial-hvac",
    "furnaces",
    "air-conditioning",
    "ductwork",
    "gas-lines",
    "tankless-water-heaters",
    "water-heaters",
    "ductless-systems",
    "humidifiers",
  ];

  return order.flatMap((key) =>
    (installationPhotos[key] ?? []).map((photo) => ({
      ...photo,
      filter: photoFilters[key] ?? key,
    })),
  );
}

const homeGalleryPreviewPhotos = [
  {
    title: "Commercial mechanical room",
    category: "Commercial",
    image: "work/homepage-gallery-mechanical-room.webp",
    alt: "Commercial mechanical room piping installation from Airrand",
    filter: "commercial",
  },
  {
    title: "Furnace and ductwork installation",
    category: "Furnaces",
    image: "work/homepage-gallery-furnace-room.webp",
    alt: "Furnace and ductwork installation from Airrand",
    filter: "furnaces",
  },
  {
    title: "Air conditioning condenser installation",
    category: "Air Conditioning",
    image: "work/homepage-gallery-ac-condenser.webp",
    alt: "Air conditioning condenser installation from Airrand",
    filter: "air-conditioning",
  },
  {
    title: "Gas meter piping installation",
    category: "Gas Lines",
    image: "work/homepage-gallery-gas-meter.webp",
    alt: "Exterior gas meter piping installation from Airrand",
    filter: "gas",
  },
  {
    title: "Commercial rooftop unit installation",
    category: "Commercial",
    image: "work/homepage-gallery-rooftop-unit.webp",
    alt: "Commercial rooftop HVAC unit installation from Airrand",
    filter: "commercial",
  },
  {
    title: "Furnace and water heater installation",
    category: "Water Heating",
    image: "work/homepage-gallery-furnace-water-heater.webp",
    alt: "Furnace and water heater installation from Airrand",
    filter: "water-heating",
  },
];

function servicePhotos(service, limit) {
  const exact = installationPhotos[service.slug] ?? [];
  const fallbackKey = photoFallbacks[service.slug];
  const fallback = fallbackKey ? installationPhotos[fallbackKey] ?? [] : [];
  const photos = exact.length ? exact : fallback;
  const visiblePhotos = typeof limit === "number" ? photos.slice(0, limit) : photos;
  return {
    exact: exact.length > 0,
    photos: visiblePhotos.map((photo) => ({
      ...photo,
      filter: photoFilters[service.slug] ?? photoFilters[fallbackKey] ?? "all",
    })),
  };
}

function ctaButtons(extraClass = "") {
  return `
    <div class="button-row ${extraClass}">
      <a class="button button-primary" href="${link(quoteRequestPath)}">Request a Quote</a>
      <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
    </div>
  `;
}

function sectionHeading({ eyebrow, title, text, align = "left" }) {
  return `
    <div class="section-heading section-heading-${align}">
      ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
      <h2>${escapeHtml(title)}</h2>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
    </div>
  `;
}

function header(current = "home") {
  const navServices = navServiceGroups
    .map(([label, slug]) => {
      return `<a href="${link(serviceHref(slug))}">${escapeHtml(label)}</a>`;
    })
    .join("");

  const mobileServices = navServiceGroups
    .map(([label, slug]) => `<a href="${link(serviceHref(slug))}">${escapeHtml(label)}</a>`)
    .join("");

  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header" data-site-header>
      <div class="header-shell">
        <a class="site-logo" href="${link("/")}" aria-label="Airrand home">
          <img src="${asset("airrand-logo-tight.png")}" alt="Airrand" width="360" height="223">
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">
          <a class="${current === "home" ? "active" : ""}" href="${link("/")}">Home</a>
          <details class="nav-dropdown ${current === "services" ? "active" : ""}">
            <summary>Services</summary>
            <div class="nav-menu">
              ${navServices}
            </div>
          </details>
          <a class="${current === "brands" ? "active" : ""}" href="${link("/brands/")}">Brands</a>
          <a class="${current === "commercial" ? "active" : ""}" href="${link("/commercial/")}">Commercial</a>
          <a class="${current === "gallery" ? "active" : ""}" href="${link("/gallery/")}">Gallery</a>
          <a class="${current === "reviews" ? "active" : ""}" href="${link("/reviews/")}">Reviews</a>
          <a class="${current === "about" ? "active" : ""}" href="${link("/about/")}">About</a>
          <a class="${current === "contact" ? "active" : ""}" href="${link("/contact/")}">Contact</a>
        </nav>
        <div class="header-actions">
          <a class="header-phone" href="tel:${site.phoneTel}">${site.phone}</a>
          <a class="button button-small" href="${link(quoteRequestPath)}">Request a Quote</a>
          <button class="nav-toggle" type="button" aria-label="Open menu" aria-controls="mobile-nav" aria-expanded="false" data-nav-toggle>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" data-mobile-nav>
        <a href="${link("/")}">Home</a>
        <details>
          <summary>Services</summary>
          <div>${mobileServices}</div>
        </details>
        <a href="${link("/brands/")}">Brands</a>
        <a href="${link("/commercial/")}">Commercial</a>
        <a href="${link("/gallery/")}">Gallery</a>
        <a href="${link("/reviews/")}">Reviews</a>
        <a href="${link("/about/")}">About</a>
        <a href="${link("/contact/")}">Contact</a>
        <a class="button button-primary" href="${link(quoteRequestPath)}">Request a Quote</a>
        <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
      </nav>
    </header>
  `;
}

function footer() {
  const serviceLinks = services
    .slice(0, 10)
    .map((service) => `<a href="${link(serviceHref(service.slug))}">${escapeHtml(service.title)}</a>`)
    .join("");
  const areaList = serviceAreas.map((area) => `<span>${escapeHtml(area)}</span>`).join("");

  return `
    <footer class="site-footer">
      <div class="footer-shell">
        <div class="footer-brand">
          <a class="footer-logo" href="${link("/")}" aria-label="Airrand home">
            <img src="${asset("airrand-logo-tight.png")}" alt="Airrand" width="360" height="223">
          </a>
          <p>${escapeHtml(site.description)}</p>
          <div class="footer-contact">
            <a href="tel:${site.phoneTel}">${site.phone}</a>
            <a href="mailto:${site.email}">${site.email}</a>
            <span>${site.hours} service available</span>
          </div>
        </div>
        <div class="footer-col">
          <h2>Quick Links</h2>
          <a href="${link("/services/")}">Services</a>
          <a href="${link("/commercial/")}">Commercial</a>
          <a href="${link("/gallery/")}">Gallery</a>
          <a href="${link("/reviews/")}">Reviews</a>
          <a href="${link("/about/")}">About</a>
          <a href="${link("/contact/")}">Contact</a>
          <a href="${site.instagram}" rel="noopener" target="_blank">Instagram</a>
        </div>
        <div class="footer-col">
          <h2>Services</h2>
          ${serviceLinks}
        </div>
        <div class="footer-col footer-areas">
          <h2>Service Areas</h2>
          <div>${areaList}</div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>Copyright <span data-year></span> ${escapeHtml(site.legalName)}. All rights reserved.</p>
        <a href="${link("/privacy-policy/")}">Privacy Policy</a>
      </div>
    </footer>
    <div class="mobile-contact-bar" aria-label="Quick contact">
      <a href="tel:${site.phoneTel}">Call</a>
      <a href="${link(quoteRequestPath)}">Request Quote</a>
    </div>
  `;
}

function trustBar() {
  const items = [
    ["Residential & Commercial", "Heating, cooling, ventilation, gas and mechanical service."],
    ["24/7 Service", "Available for urgent HVAC needs throughout the GTA."],
    ["Professional Installation", "Clean workmanship, careful setup and clear handoff."],
    ["Serving the GTA", "Toronto, Vaughan, Markham, Richmond Hill and nearby communities."],
  ];

  return `
    <section class="trust-bar" aria-label="Airrand service highlights">
      <div class="trust-shell">
        ${items
          .map(
            ([title, text]) => `
              <div>
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(text)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function serviceCard(service) {
  return `
    <a class="service-card reveal" href="${link(serviceHref(service.slug))}">
      <span class="service-card-image">
        <img src="${asset(service.image)}" alt="${escapeHtml(service.title)} service equipment" loading="lazy" width="640" height="480">
      </span>
      <span class="service-card-body">
        <span class="service-card-group">${escapeHtml(service.group)}</span>
        <strong>${escapeHtml(service.title)}</strong>
        <span>${escapeHtml(service.short)}</span>
      </span>
    </a>
  `;
}

function servicesGrid(items = services) {
  return `<div class="services-grid">${items.map(serviceCard).join("")}</div>`;
}

function contactForm(context = "quote") {
  return `
    <form class="contact-form" action="/api/quote/" method="post" enctype="multipart/form-data" data-contact-form>
      <div class="field-grid">
        <label>
          <span>Name</span>
          <input name="name" type="text" autocomplete="name" required>
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" type="tel" autocomplete="tel" required>
        </label>
      </div>
      <div class="field-grid">
        <label>
          <span>Email</span>
          <input name="email" type="email" autocomplete="email" required>
        </label>
        <label>
          <span>Service Needed</span>
          <select name="service" required>
            <option value="">Select a service</option>
            ${services.map((service) => `<option>${escapeHtml(service.title)}</option>`).join("")}
          </select>
        </label>
      </div>
      <fieldset class="address-section">
        <legend>Service Address</legend>
        <label>
          <span>Street Address</span>
          <input name="streetAddress" type="text" autocomplete="address-line1" required>
        </label>
        <div class="field-grid">
          <label>
            <span>Unit / Suite</span>
            <input name="unit" type="text" autocomplete="address-line2">
          </label>
          <label>
            <span>City</span>
            <input name="city" type="text" autocomplete="address-level2" required>
          </label>
        </div>
        <label>
          <span>Postal Code</span>
          <input name="postalCode" type="text" autocomplete="postal-code" required>
        </label>
      </fieldset>
      <fieldset class="radio-row">
        <legend>Project Type</legend>
        <label><input type="radio" name="projectType" value="Residential" checked> Residential</label>
        <label><input type="radio" name="projectType" value="Commercial"> Commercial</label>
      </fieldset>
      <label>
        <span>Message</span>
        <textarea name="message" rows="5" placeholder="Tell us what is happening, what equipment is involved and where the property is located." required></textarea>
      </label>
      <label>
        <span>Upload Photos</span>
        <input name="photos" type="file" accept="image/*" multiple>
      </label>
      <input class="form-honeypot" name="company" type="hidden" autocomplete="off" tabindex="-1" value="">
      <input type="hidden" name="context" value="${escapeHtml(context)}">
      <button class="button button-primary" type="submit">Request a Quote</button>
      <p class="form-status" aria-live="polite" data-form-status></p>
    </form>
  `;
}

function galleryGrid({ limit, filters = false, projects = projectPhotos() } = {}) {
  const visibleProjects = typeof limit === "number" ? projects.slice(0, limit) : projects;
  const filterButtons = filters
    ? `
      <div class="filter-bar" aria-label="Gallery filters">
        <button class="active" type="button" data-filter="all">All</button>
        <button type="button" data-filter="residential">Residential</button>
        <button type="button" data-filter="commercial">Commercial</button>
        <button type="button" data-filter="furnaces">Furnaces</button>
        <button type="button" data-filter="air-conditioning">Air Conditioning</button>
        <button type="button" data-filter="ductwork">Ductwork</button>
        <button type="button" data-filter="ductless">Ductless</button>
        <button type="button" data-filter="gas">Gas</button>
        <button type="button" data-filter="water-heating">Water Heating</button>
      </div>
    `
    : "";

  return `
    <div class="gallery-shell" data-gallery>
      ${filterButtons}
      <div class="gallery-grid">
        ${visibleProjects
          .map(
            (project) => `
              <button class="gallery-card reveal" type="button" data-gallery-item data-filter-value="${escapeHtml(project.filter)}" data-lightbox-src="${asset(project.image)}" data-lightbox-title="${escapeHtml(project.category)}" data-lightbox-alt="${escapeHtml(project.alt)}">
                <img src="${asset(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy" width="700" height="520">
                <span>
                  <small>${escapeHtml(project.category)}</small>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function workSlider(projects, label) {
  const duration = `${Math.max(28, projects.length * 4)}s`;
  const renderCard = (project, index, clone = false) => `
    <button class="marquee-card" type="button" data-lightbox-src="${asset(project.image)}" data-lightbox-title="${escapeHtml(project.category)}" data-lightbox-alt="${escapeHtml(project.alt)}" tabindex="${clone ? "-1" : "0"}">
      <img src="${asset(project.image)}" alt="${escapeHtml(project.alt)}" loading="eager" decoding="async" width="520" height="650" draggable="false">
      <span class="marquee-caption">
        <small>${escapeHtml(project.category)}</small>
      </span>
    </button>
  `;

  return `
    <div class="work-marquee" aria-label="${escapeHtml(label)}">
      <div class="marquee-viewport">
        <div class="marquee-track" style="--scroll-duration: ${duration};">
          <div class="marquee-group">
            ${projects.map((project, index) => renderCard(project, index)).join("")}
          </div>
          <div class="marquee-group" aria-hidden="true">
            ${projects.map((project, index) => renderCard(project, index, true)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

const equipmentBrands = [
  {
    name: "Carrier",
    slug: "carrier",
    logo: "normalized/carrier.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Fan coils", "Controls"],
    description:
      "Carrier offers heating and cooling equipment across several efficiency and comfort levels, from conventional residential systems to more advanced comfort options.",
    featured: true,
  },
  {
    name: "Bosch",
    slug: "bosch",
    logo: "normalized/bosch.png",
    categories: ["heating-cooling", "heat-pumps", "boilers", "water-heating"],
    equipment: ["Heat pumps", "Inverter systems", "Boilers", "Water heating"],
    description:
      "Bosch equipment is often considered for inverter-driven heat-pump technology, hydronic heating equipment and high-efficiency system options.",
    featured: true,
  },
  {
    name: "Trane",
    slug: "trane",
    logo: "normalized/trane.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Air handlers"],
    description:
      "Trane produces heating and cooling equipment used in a range of residential and light commercial comfort applications.",
    featured: true,
  },
  {
    name: "Amana",
    slug: "amana",
    logo: "normalized/amana.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps"],
    description:
      "Amana heating and cooling equipment can be part of practical residential replacement options where price, comfort and warranty details need to be compared.",
  },
  {
    name: "Daikin",
    slug: "daikin",
    logo: "normalized/daikin.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Heat pumps", "Air conditioners", "Ductless systems", "Commercial HVAC"],
    description:
      "Daikin equipment is commonly discussed for heat-pump, ductless and conventional comfort applications, depending on the building and system design.",
    featured: true,
  },
  {
    name: "York",
    slug: "york",
    logo: "normalized/york.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Commercial equipment"],
    description:
      "York equipment can be considered for residential and commercial heating and cooling projects where equipment availability and application fit matter.",
  },
  {
    name: "American Standard",
    slug: "american-standard",
    logo: "normalized/american-standard.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Air handlers"],
    description:
      "American Standard offers familiar heating and cooling options for homes that need straightforward replacement choices or more advanced comfort features.",
  },
  {
    name: "Goodman",
    slug: "goodman",
    logo: "normalized/goodman.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps"],
    description:
      "Goodman offers residential heating and cooling equipment across common applications and price points.",
    featured: true,
  },
  {
    name: "Bryant",
    slug: "bryant",
    logo: "normalized/bryant.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Fan coils"],
    description:
      "Bryant equipment can support a range of furnace, air conditioner and heat-pump applications when matched to the building requirements.",
  },
  {
    name: "Lennox",
    slug: "lennox",
    logo: "normalized/lennox.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Controls"],
    description:
      "Lennox has equipment options that can be compared across efficiency, comfort control, noise and long-term ownership considerations.",
    featured: true,
  },
  {
    name: "Google Nest",
    slug: "nest",
    logo: "normalized/nest.png",
    categories: ["controls"],
    equipment: ["Smart thermostats", "Scheduling", "App-based temperature control"],
    description:
      "Google Nest thermostats may be an option when the HVAC equipment and control wiring support the required compatibility.",
  },
  {
    name: "ecobee",
    slug: "ecobee",
    logo: "normalized/ecobee.png",
    categories: ["controls"],
    equipment: ["Smart thermostats", "Remote sensors", "Scheduling", "App controls"],
    description:
      "ecobee smart controls can help customers manage comfort and scheduling when the system configuration is compatible.",
  },
  {
    name: "Kepler",
    slug: "kepler",
    logo: "normalized/kepler.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Heat pumps", "Cooling equipment", "Comfort systems"],
    description:
      "Kepler equipment can be discussed as part of heating and cooling comparisons where system type, availability and application fit are reviewed.",
  },
  {
    name: "KeepRite",
    slug: "keeprite",
    logo: "normalized/keeprite.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps"],
    description:
      "KeepRite offers familiar residential heating and cooling equipment that can fit many conventional replacement applications.",
  },
  {
    name: "Kinghome",
    slug: "kinghome",
    logo: "normalized/kinghome.png",
    categories: ["heating-cooling", "heat-pumps"],
    equipment: ["Heat pumps", "Ductless systems", "Cooling equipment"],
    description:
      "Kinghome equipment may be considered for heat-pump and ductless applications where the equipment layout and control requirements make sense.",
  },
  {
    name: "IBC",
    slug: "ibc",
    logo: "normalized/ibc.png",
    categories: ["boilers", "water-heating"],
    equipment: ["Boilers", "Hydronic heating", "Indirect water-heating options"],
    description:
      "IBC is relevant for hydronic heating and boiler conversations where venting, piping, controls and building heat load need careful review.",
    featured: true,
  },
  {
    name: "Rheem",
    slug: "rheem",
    logo: "normalized/rheem.png",
    categories: ["heating-cooling", "heat-pumps", "water-heating", "boilers"],
    equipment: ["Furnaces", "Air conditioners", "Heat pumps", "Water heaters"],
    description:
      "Rheem appears across both comfort equipment and water-heating discussions, depending on the project and available equipment options.",
  },
  {
    name: "Rinnai",
    slug: "rinnai",
    logo: "normalized/rinnai.png",
    categories: ["water-heating"],
    equipment: ["Tankless water heaters", "Hot-water equipment"],
    description:
      "Rinnai is commonly considered for tankless water-heating applications where hot-water demand, venting and gas supply are reviewed.",
    featured: true,
  },
  {
    name: "Navien",
    slug: "navien",
    logo: "normalized/navien.png",
    categories: ["water-heating", "boilers"],
    equipment: ["Tankless water heaters", "Boilers", "Combination systems"],
    description:
      "Navien equipment can be part of tankless, boiler and combination-system conversations when the application supports the required setup.",
    featured: true,
  },
  {
    name: "Bradford White",
    slug: "bradford-white",
    logo: "normalized/bradford-white.png",
    categories: ["water-heating"],
    equipment: ["Tank water heaters", "Water-heating equipment"],
    description:
      "Bradford White is relevant for traditional water-heating replacement choices where tank size, venting and installation conditions matter.",
  },
  {
    name: "John Wood",
    slug: "john-wood",
    logo: "normalized/john-wood.png",
    categories: ["water-heating"],
    equipment: ["Tank water heaters", "Residential water heating"],
    description:
      "John Wood water heaters can be discussed for tank replacement work where sizing, fuel type, venting and site access need to be confirmed.",
  },
];

const brandFilterOptions = [
  ["all", "All"],
  ["heating-cooling", "Heating & Cooling"],
  ["heat-pumps", "Heat Pumps"],
  ["water-heating", "Water Heating"],
  ["boilers", "Boilers"],
  ["controls", "Controls"],
];

const brandCategoryLabels = {
  "heating-cooling": "Heating & Cooling",
  "heat-pumps": "Heat Pumps",
  "water-heating": "Water Heating",
  boilers: "Boilers",
  controls: "Controls",
};

const brandsBySlug = new Map(equipmentBrands.map((brand) => [brand.slug, brand]));

function brandLogo(brand, { loading = "lazy" } = {}) {
  return `
    <span class="brand-logo-plate">
      <img src="${asset(`brands/${brand.logo}`)}?v=${assetVersion}" alt="${escapeHtml(brand.name)} logo" loading="${loading}" decoding="async">
    </span>
  `;
}

function brandLogoList(slugs, label) {
  return `
    <ul class="brand-strip" aria-label="${escapeHtml(label)}">
      ${slugs
        .map((slug) => brandsBySlug.get(slug))
        .filter(Boolean)
        .map(
          (brand) => `
            <li class="brand-strip-card brand-${brand.slug}">
              ${brandLogo(brand)}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function brandsSection() {
  return `
    <section class="section brands-section" aria-labelledby="brands-heading">
      <div class="container">
        <div class="section-heading section-heading-center">
          <p class="eyebrow">Equipment Brands</p>
          <h2 id="brands-heading">Brands we work with</h2>
          <p>Airrand works with common heating, cooling, thermostat, tankless and water-heating equipment across residential and commercial systems.</p>
        </div>
        <ul class="brand-grid" aria-label="Equipment and appliance brands Airrand works with">
          ${equipmentBrands
            .map(
              (brand) => `
                <li class="brand-mark brand-${brand.slug}">
                  ${brandLogo(brand)}
                </li>
              `,
            )
            .join("")}
        </ul>
        <div class="section-action">
          <a class="button button-primary" href="${link("/brands/")}">Explore All Equipment Brands</a>
        </div>
      </div>
    </section>
  `;
}

const equipmentPriorityBlocks = [
  {
    title: "Affordability",
    text:
      "Dependable HVAC systems are available at different price points. Airrand can help balance upfront equipment cost with reliability and expected operating cost.",
  },
  {
    title: "Energy Efficiency",
    text:
      "Higher-efficiency equipment can reduce energy use and provide more advanced comfort control. Efficiency levels vary by equipment type and model.",
  },
  {
    title: "Comfort",
    text:
      "Equipment selection affects temperature consistency, humidity control, airflow, staging, modulation and noise.",
  },
  {
    title: "Reliability",
    text:
      "Equipment quality matters, but proper sizing, installation and commissioning are just as important for dependable operation.",
  },
  {
    title: "Features & Controls",
    text:
      "Modern systems may include variable-speed operation, multi-stage heating, inverter compressors, smart thermostats, zoning support and indoor air quality accessories.",
  },
  {
    title: "Long-Term Value",
    text:
      "The least expensive equipment upfront is not always the least expensive system to own. Energy use, maintenance, repairability, parts availability, warranty and installation quality all matter.",
  },
];

const equipmentTiers = [
  {
    title: "Practical",
    focus: ["Reliable heating and cooling", "Straightforward controls", "Lower initial equipment cost", "Conventional single-stage or basic equipment options"],
  },
  {
    title: "Enhanced",
    focus: ["Higher efficiency", "Multi-stage equipment", "Quieter operation", "Improved comfort control", "Better thermostat and control options"],
  },
  {
    title: "Premium",
    focus: ["Variable-speed systems", "Inverter technology", "Advanced communication", "Improved temperature consistency", "Higher efficiency options", "More precise comfort control"],
  },
];

const selectionSteps = [
  ["Understand the Application", "Evaluate the home or building, existing equipment and customer goals."],
  ["Determine Capacity", "Equipment should be appropriately sized for the application."],
  ["Compare Options", "Present suitable equipment at different price and feature levels."],
  ["Explain the Differences", "Clearly explain what customers gain or give up between different options."],
  ["Install & Commission", "Proper installation and setup are critical regardless of the equipment brand."],
];

const technologyBlocks = [
  {
    title: "Single-Stage",
    text: "Simple on/off equipment, often with lower upfront cost and suitable for many conventional applications.",
  },
  {
    title: "Two-Stage",
    text: "Allows equipment to operate at more than one capacity level, which can improve comfort and reduce unnecessary full-output operation.",
  },
  {
    title: "Variable-Speed",
    text: "Allows fans or equipment to adjust output more gradually, supporting airflow control, lower noise and steadier comfort.",
  },
  {
    title: "Inverter Heat Pumps",
    text: "Use variable compressor operation to adjust heating or cooling capacity in many modern heat-pump and ductless systems.",
  },
  {
    title: "Smart Controls",
    text: "Modern thermostats may support remote access, scheduling, energy reports, monitoring and smart-home integration, depending on the equipment.",
  },
];

const brandFaqs = [
  {
    question: "Is one HVAC brand better than every other brand?",
    answer:
      "Not necessarily. Different manufacturers have strengths across different equipment categories, price points and applications. The right choice depends on the building, budget, equipment requirements and features you are looking for.",
  },
  {
    question: "What is the most reliable HVAC brand?",
    answer:
      "Reliability depends on both equipment design and installation quality. Proper sizing, airflow, electrical work, refrigerant setup and commissioning can significantly affect how a system performs over time.",
  },
  {
    question: "Do expensive HVAC systems last longer?",
    answer:
      "Not automatically. Higher-cost systems often include higher efficiency, variable-speed technology, quieter operation or more advanced controls. Longevity still depends heavily on installation, maintenance and operating conditions.",
  },
  {
    question: "Is a higher-efficiency system worth it?",
    answer:
      "It depends on the building, equipment usage, energy costs and how long you expect to own the property. Airrand can compare efficiency levels so customers can decide whether the additional upfront cost makes sense.",
  },
  {
    question: "Which brand makes the best heat pump?",
    answer:
      "There is no universal answer. Heat pumps differ in cold-weather performance, efficiency, compressor technology, capacity range, controls, noise and price. The best choice depends on the application.",
  },
  {
    question: "Can I choose the brand of equipment installed?",
    answer:
      "Yes. If a customer has a preferred manufacturer, Airrand can discuss appropriate available options for the application.",
  },
  {
    question: "What if I do not care which brand I get?",
    answer:
      "Airrand can recommend equipment based on your budget, building, equipment type, comfort goals and long-term priorities.",
  },
  {
    question: "Can you install equipment I already purchased?",
    answer:
      "Customer-supplied equipment may be considered depending on the application, equipment condition, compatibility and project requirements. Contact Airrand before purchasing equipment independently.",
  },
  {
    question: "Do all brands offer the same warranty?",
    answer:
      "No. Warranty terms vary by manufacturer, model, equipment category and registration requirements. Customers should review the specific warranty included with the quoted equipment.",
  },
  {
    question: "What matters more: equipment brand or installation quality?",
    answer:
      "Both matter, but even excellent equipment can perform poorly if it is improperly sized or installed. Correct installation is essential to system performance and reliability.",
  },
];

function inlineList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function brandDetailCard(brand) {
  const categories = brand.categories.map((category) => brandCategoryLabels[category] ?? category);

  return `
    <li class="brand-detail-card brand-${brand.slug}" data-brand-card data-brand-categories="${escapeHtml(brand.categories.join(" "))}">
      <div class="brand-detail-logo">
        ${brandLogo(brand)}
      </div>
      <div class="brand-detail-copy">
        <div>
          <p class="brand-card-kicker">${escapeHtml(categories.join(" / "))}</p>
          <h3>${escapeHtml(brand.name)}</h3>
        </div>
        <p>${escapeHtml(brand.description)}</p>
        <details class="brand-card-more">
          <summary>Common equipment categories</summary>
          <ul>
            ${inlineList(brand.equipment)}
          </ul>
        </details>
      </div>
    </li>
  `;
}

function brandsPage() {
  const heroBrands = ["carrier", "bosch", "daikin", "lennox", "navien", "rinnai", "ecobee"]
    .map((slug) => brandsBySlug.get(slug))
    .filter(Boolean);
  const featuredBrands = equipmentBrands.filter((brand) => brand.featured);

  return {
    pathname: "/brands/",
    title: "HVAC Equipment Brands | Furnaces, AC, Heat Pumps & More | Airrand",
    description:
      "Explore the HVAC equipment brands Airrand works with for furnaces, air conditioners, heat pumps, boilers, tankless water heaters and smart controls throughout the GTA.",
    current: "brands",
    image: "hero-hvac-work.webp",
    schema: [
      businessSchema(),
      faqSchema(brandFaqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Brands", url: "/brands/" },
      ]),
    ],
    body: `
      <section class="page-hero brands-hero" style="${heroImageStyle("hero-hvac-work.webp")}">
        <div class="container brands-hero-grid">
          <div>
            <p class="eyebrow">Equipment Options</p>
            <h1>The Right Equipment for the Right Application</h1>
            <p>Airrand works with a wide range of heating, cooling, ventilation, water-heating and control manufacturers. That gives us the flexibility to recommend equipment based on your home, building, budget and priorities instead of forcing every project into one product line.</p>
            <div class="hero-buttons">
              <a class="button button-primary" href="#brand-grid">Explore Brands</a>
              <a class="button button-secondary" href="${link("/contact/")}">Request a Quote</a>
            </div>
          </div>
          <div class="hero-brand-panel" aria-label="Selected equipment brands">
            ${heroBrands
              .map(
                (brand, index) => `
                  <span class="brand-orbit brand-${brand.slug}" style="--brand-index: ${index}">
                    ${brandLogo(brand, { loading: index < 3 ? "eager" : "lazy" })}
                  </span>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section brand-choice-section">
        <div class="container brand-choice-grid">
          <div>
            <p class="eyebrow">More Choice. Better Fit.</p>
            <h2>Equipment should match the building, not the other way around.</h2>
            <p>Different homes, buildings and customers have different requirements. One customer may prioritize the lowest reasonable initial cost, while another may care most about quiet operation, cold-climate heat-pump performance, commercial durability, smart controls or long-term operating cost.</p>
          </div>
          <aside class="brand-statement">
            <p>We focus on selecting the equipment that fits the application - not simply selling the same system to everyone.</p>
          </aside>
        </div>
      </section>

      <section class="section brand-priority-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Selection Priorities",
            title: "What Matters Most to You?",
            text:
              "Airrand can help compare equipment choices by budget, efficiency, comfort, reliability, features, noise, warranty and ownership cost.",
            align: "center",
          })}
          <div class="priority-grid">
            ${equipmentPriorityBlocks
              .map(
                (item) => `
                  <article class="priority-card reveal">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section brand-directory-section" id="brand-grid" data-brand-directory>
        <div class="container">
          ${sectionHeading({
            eyebrow: "Equipment brands we install and service",
            title: "Brands We Work With",
            text:
              "Use the filters to explore heating, cooling, heat-pump, boiler, water-heating and control brands Airrand can discuss for residential and commercial projects.",
            align: "center",
          })}
          <div class="filter-bar brand-filter-bar" role="group" aria-label="Filter equipment brands">
            ${brandFilterOptions
              .map(
                ([filter, label], index) => `
                  <button type="button" class="${index === 0 ? "active" : ""}" data-brand-filter="${escapeHtml(filter)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(label)}</button>
                `,
              )
              .join("")}
          </div>
          <ul class="brand-detail-grid" aria-label="Detailed brand list">
            ${equipmentBrands.map((brand) => brandDetailCard(brand)).join("")}
          </ul>
          <p class="brand-empty" data-brand-empty hidden>No brands match this filter.</p>
        </div>
      </section>

      <section class="section tier-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Equipment Tiers",
            title: "HVAC Equipment Isn't One-Size-Fits-All",
            text:
              "Equipment can generally be evaluated across practical, enhanced and premium levels. The right level depends on the application, comfort goals and budget.",
            align: "center",
          })}
          <div class="tier-grid">
            ${equipmentTiers
              .map(
                (tier) => `
                  <article class="tier-panel">
                    <h3>${escapeHtml(tier.title)}</h3>
                    <ul class="check-list">
                      ${inlineList(tier.focus)}
                    </ul>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section cost-efficiency-section">
        <div class="container cost-efficiency-grid">
          <div>
            <p class="eyebrow">Cost vs Efficiency</p>
            <h2>Balancing Upfront Cost and Long-Term Efficiency</h2>
            <p>Some customers want the lowest reasonable installation cost. Others are willing to invest more upfront for higher efficiency, variable-speed equipment, quieter operation, improved comfort, advanced controls or heat-pump technology.</p>
            <p>Neither approach is automatically right or wrong. Airrand can evaluate the building and explain the available options without providing one-size-fits-all advice.</p>
          </div>
          <div class="efficiency-scale" aria-label="Cost and efficiency scale">
            <span>Lower Initial Cost</span>
            <strong>Balanced</strong>
            <span>Higher Efficiency &amp; Features</span>
          </div>
        </div>
      </section>

      <section class="section selection-process-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Selection Process",
            title: "How We Help Choose Your Equipment",
            text:
              "The equipment decision should be clear before installation begins.",
            align: "center",
          })}
          <div class="brand-process-grid">
            ${selectionSteps
              .map(
                ([title, text], index) => `
                  <article class="brand-process-step reveal">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="installation-message">
        <div class="container installation-message-grid">
          <div>
            <p class="eyebrow">Critical Detail</p>
            <h2>The Brand Matters. The Installation Matters More.</h2>
            <p>Premium HVAC equipment cannot perform properly if it is incorrectly sized, installed or commissioned. Good equipment deserves a good installation.</p>
          </div>
          <ul class="installation-checks">
            ${inlineList(["Correct equipment selection", "Proper airflow", "Refrigerant setup", "Electrical installation", "Gas setup", "Drainage", "Controls", "Startup", "Testing", "Commissioning"])}
          </ul>
        </div>
      </section>

      <section class="section technology-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "HVAC Technology",
            title: "Understanding Today's HVAC Technology",
            text:
              "Different equipment platforms can feel very different in day-to-day use. Airrand can explain the practical differences before you decide.",
            align: "center",
          })}
          <div class="technology-grid">
            ${technologyBlocks
              .map(
                (item) => `
                  <article class="technology-block">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section commercial-brand-section">
        <div class="container commercial-brand-grid">
          <div>
            <p class="eyebrow">Commercial HVAC</p>
            <h2>Equipment Options for Commercial HVAC</h2>
            <p>Commercial applications may involve rooftop units, make-up air units, split systems, heat pumps, gas-fired equipment, ventilation equipment, boilers, water heating and building controls.</p>
            <p>Different projects require different manufacturers and equipment configurations. Airrand can evaluate replacement equipment or equipment for new mechanical installations.</p>
            <a class="button button-primary" href="${link("/contact/")}">Discuss a Commercial Project</a>
          </div>
          <div class="commercial-equipment-list">
            ${inlineList(["Rooftop units", "Make-up air units", "Split systems", "Heat pumps", "Gas-fired equipment", "Ventilation equipment", "Boilers", "Water heating", "Building controls"])}
          </div>
        </div>
      </section>

      <section class="section utility-brand-section">
        <div class="container utility-brand-grid">
          <article>
            <p class="eyebrow">Water Heating</p>
            <h2>Water Heating Options</h2>
            <p>Customers may choose between traditional tank water heaters, tankless water heaters, boilers and combination systems. Selection depends on hot-water demand, fuel, venting, space, budget and efficiency goals.</p>
            ${brandLogoList(["bradford-white", "rheem", "rinnai", "navien", "bosch", "ibc", "john-wood"], "Water heating brand logos")}
          </article>
          <article>
            <p class="eyebrow">Smart Comfort Controls</p>
            <h2>Smart Comfort Controls</h2>
            <p>Compatible systems can offer remote temperature control, scheduling, energy monitoring, smart-home integration, occupancy sensing and equipment alerts.</p>
            <p><strong>Thermostat compatibility depends on the HVAC equipment and control configuration.</strong></p>
            ${brandLogoList(["nest", "ecobee"], "Smart thermostat brand logos")}
          </article>
        </div>
      </section>

      <section class="section faq-section">
        <div class="container faq-shell">
          ${sectionHeading({
            eyebrow: "FAQ",
            title: "Frequently Asked Questions About HVAC Brands",
            text:
              "Common questions about comparing furnace brands, air conditioner brands, heat pump brands, water heating equipment and smart controls in the GTA.",
            align: "center",
          })}
          <div class="faq-list">
            ${brandFaqs
              .map(
                (faq) => `
                  <details class="faq-item">
                    <summary><span>${escapeHtml(faq.question)}</span></summary>
                    <p>${escapeHtml(faq.answer)}</p>
                  </details>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      ${finalCta({
        title: "Not Sure Which System Is Right for You?",
        text:
          "You do not need to know which brand, efficiency rating or equipment type you need before contacting us. Tell Airrand what you are trying to accomplish and we will help compare the available options.",
      })}
    `,
  };
}

function googleReviewsSection() {
  const reviewsUrl = escapeHtml(site.googleReviewsUrl);
  const renderStars = (rating) => {
    const visibleStars = "★".repeat(Math.max(0, Math.min(5, Math.round(Number(rating)))));
    return `<span class="review-stars" aria-label="${escapeHtml(rating)} out of 5 stars">${visibleStars}</span>`;
  };
  const renderSlide = (review, clone = false) => `
    <a class="review-slide-card" href="${reviewsUrl}" target="_blank" rel="noopener" tabindex="${clone ? "-1" : "0"}">
      <span class="review-source">Google review</span>
      <strong>${escapeHtml(review.author)}</strong>
      <span class="review-rating-row">
        ${renderStars(review.rating)}
      </span>
      <p>${escapeHtml(review.text).replaceAll("\n", "<br>")}</p>
      <em>Read on Google</em>
    </a>
  `;

  return `
    <section class="section reviews-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Google Reviews",
          title: "What Airrand customers say on Google.",
          text:
            "Real customer reviews from Airrand's Google Business Profile, with the direct Google link kept visible for verification.",
          align: "center",
        })}
        <div class="google-reviews-panel">
          <div>
            <p class="review-label">Connected profile</p>
            <h3>Only 5-star Google reviews at the moment</h3>
            <p>Visitors can open the verified Google listing to read the full review profile or leave feedback after a completed job.</p>
          </div>
          <div class="button-row google-reviews-actions">
            <a class="button button-primary" href="${reviewsUrl}" target="_blank" rel="noopener">Read Google Reviews</a>
            <a class="button button-secondary" href="${reviewsUrl}" target="_blank" rel="noopener">Leave a Review</a>
          </div>
        </div>
        <div class="review-marquee" aria-label="Google review links">
          <div class="marquee-viewport">
            <div class="marquee-track" style="--scroll-duration: 120s;">
              <div class="marquee-group">
                ${googleReviews.map((review) => renderSlide(review)).join("")}
              </div>
              <div class="marquee-group" aria-hidden="true">
                ${googleReviews.map((review) => renderSlide(review, true)).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function reviewInitials(author) {
  const initials = String(author)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "A";
}

function reviewExcerpt(text, maxLength = 285) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const trimmed = normalized.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  const end = lastSpace > 190 ? lastSpace : maxLength;
  return `${trimmed.slice(0, end).trim()}...`;
}

function reviewParagraphs(text) {
  return String(text)
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function renderReviewStars(rating) {
  const visibleStars = "★".repeat(Math.max(0, Math.min(5, Math.round(Number(rating)))));
  return `<span class="review-page-stars" aria-label="${escapeHtml(rating)} out of 5 stars">${visibleStars}</span>`;
}

function reviewCard(review) {
  const isLong = String(review.text).replace(/\s+/g, " ").trim().length > 330;

  return `
    <article class="reviews-page-card reveal">
      <div class="reviews-page-card-top">
        <span class="review-avatar" aria-hidden="true">${escapeHtml(reviewInitials(review.author))}</span>
        <div>
          <span class="review-source">Google review</span>
          <h3>${escapeHtml(review.author)}</h3>
        </div>
      </div>
      ${renderReviewStars(review.rating)}
      ${
        isLong
          ? `<details class="review-page-copy">
              <summary>
                <span>${escapeHtml(reviewExcerpt(review.text))}</span>
                <strong>Read Full Review</strong>
              </summary>
              <div class="review-page-full">${reviewParagraphs(review.text)}</div>
            </details>`
          : `<div class="review-page-copy">${reviewParagraphs(review.text)}</div>`
      }
      <a class="review-google-link" href="${escapeHtml(site.googleReviewsUrl)}" target="_blank" rel="noopener">Read on Google</a>
    </article>
  `;
}

function featuredReviewCard(review, photo) {
  return `
    <article class="featured-review-card reveal">
      <button class="featured-review-photo" type="button" data-lightbox-src="${asset(photo.image)}" data-lightbox-title="${escapeHtml(photo.category)}" data-lightbox-alt="${escapeHtml(photo.alt)}">
        <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="760" height="620">
        <span>Recent Airrand Work</span>
      </button>
      <div class="featured-review-copy">
        <p class="review-label">Customer Story</p>
        <h3>${escapeHtml(review.author)}</h3>
        ${renderReviewStars(review.rating)}
        <blockquote>${reviewParagraphs(review.text)}</blockquote>
        <a class="review-google-link" href="${escapeHtml(site.googleReviewsUrl)}" target="_blank" rel="noopener">Read on Google</a>
      </div>
    </article>
  `;
}

function reviewThemeCard(theme) {
  return `
    <article class="review-theme-card reveal">
      <span class="review-theme-icon" aria-hidden="true">${heatingIcon(theme.icon)}</span>
      <h3>${escapeHtml(theme.title)}</h3>
      <p>${escapeHtml(theme.text)}</p>
    </article>
  `;
}

function reviewWorkCard(photo) {
  return `
    <button class="reviews-work-card reveal" type="button" data-lightbox-src="${asset(photo.image)}" data-lightbox-title="${escapeHtml(photo.category)}" data-lightbox-alt="${escapeHtml(photo.alt)}">
      <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="640" height="520">
      <span>Recent Airrand Work</span>
      <strong>${escapeHtml(photo.category)}</strong>
    </button>
  `;
}

function reviewsPage() {
  const reviewsUrl = escapeHtml(site.googleReviewsUrl);
  const featuredReviews = [
    ["Michael Mugerman", installationPhotos.furnaces?.[0]],
    ["Gregory Shpringer", installationPhotos.furnaces?.[1]],
    ["Anya O", installationPhotos.furnaces?.[2]],
  ]
    .map(([author, photo]) => {
      const review = googleReviews.find((item) => item.author === author);
      return review && photo ? { review, photo } : null;
    })
    .filter(Boolean);

  const reviewThemes = [
    {
      icon: "cycle",
      title: "Fast Response",
      text:
        "Multiple reviews describe Airrand responding quickly, including urgent calls, same-day visits and help within about an hour.",
    },
    {
      icon: "controls",
      title: "Clear Communication",
      text:
        "Customers repeatedly mention that the issue, solution, equipment and next steps were explained clearly before the work was wrapped up.",
    },
    {
      icon: "tools",
      title: "Clean Workmanship",
      text:
        "Install reviews point to careful setup, clean work areas, attention to detail and systems left running properly before the team leaves.",
    },
    {
      icon: "repair",
      title: "Professional Service",
      text:
        "The review text consistently describes polite, knowledgeable and professional service across repair, installation and maintenance work.",
    },
  ];

  const reviewQuotes = [
    "Fast response",
    "excellent communication",
    "clean workmanship",
    "polite and professional",
    "quality of work",
    "works perfectly",
  ];

  const reviewWorkPhotos = [
    installationPhotos.furnaces?.[0],
    installationPhotos["air-conditioning"]?.[0],
    installationPhotos.ductwork?.[3],
    installationPhotos["commercial-hvac"]?.[0],
    installationPhotos["tankless-water-heaters"]?.[0],
    installationPhotos["ductless-systems"]?.[0],
  ].filter(Boolean);

  return {
    pathname: "/reviews/",
    title: "Customer Reviews | Airrand HVAC in the GTA",
    description:
      "Read real Airrand customer reviews and see project work from Airrand's heating, cooling, mechanical and HVAC service across the Greater Toronto Area.",
    current: "reviews",
    image: "shop-background.webp",
    schema: [businessSchema(), breadcrumbs([{ name: "Home", url: "/" }, { name: "Reviews", url: "/reviews/" }])],
    body: `
      <section class="page-hero compact-hero reviews-hero" style="${heroImageStyle("shop-background.webp")}">
        <div class="container">
          <p class="eyebrow">Customer Reviews</p>
          <h1>What Airrand Customers Say</h1>
          <p>Real feedback from customers who have trusted Airrand with heating, cooling, mechanical and HVAC work throughout the Greater Toronto Area.</p>
          <div class="button-row">
            <a class="button button-primary" href="${reviewsUrl}" target="_blank" rel="noopener">Read Google Reviews</a>
            <a class="button button-secondary" href="${reviewsUrl}" target="_blank" rel="noopener">Leave a Review</a>
          </div>
        </div>
      </section>

      <section class="section reviews-profile-section">
        <div class="container">
          <div class="reviews-profile-panel reveal">
            <span class="google-profile-mark" aria-hidden="true">G</span>
            <div>
              <p class="review-label">Linked Google Profile</p>
              <h2>See Airrand's Current Google Reviews</h2>
              <p>Open the live Google listing for Airrand's current rating, review count and newest customer feedback.</p>
            </div>
            <a class="button button-primary" href="${reviewsUrl}" target="_blank" rel="noopener">Open Google</a>
          </div>
        </div>
      </section>

      <section class="section reviews-grid-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Google Reviews",
            title: "Real customer feedback from Airrand's Google profile.",
            text:
              "These reviews use the customer names, ratings and review text already available in the Airrand project. Each card keeps the Google listing one click away for verification.",
          })}
          <div class="reviews-page-grid">
            ${googleReviews.map((review) => reviewCard(review)).join("")}
          </div>
        </div>
      </section>

      <section class="section featured-reviews-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Customer Stories",
            title: "What Customers Remember About the Experience",
            text:
              "Longer reviews tend to focus on response time, explanation, workmanship and how the system was left after the job.",
          })}
          <div class="featured-review-grid">
            ${featuredReviews.map(({ review, photo }) => featuredReviewCard(review, photo)).join("")}
          </div>
        </div>
      </section>

      <section class="section review-themes-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "What Customers Notice",
            title: "What Customers Consistently Mention",
            text:
              "The themes below are based on recurring wording and patterns in the review text already available for Airrand.",
          })}
          <div class="review-theme-grid">
            ${reviewThemes.map(reviewThemeCard).join("")}
          </div>
        </div>
      </section>

      <section class="review-quote-strip" aria-label="Short phrases from Airrand Google reviews">
        <div class="review-quote-track">
          ${reviewQuotes.map((quote) => `<span>&ldquo;${escapeHtml(quote)}&rdquo;</span>`).join("")}
        </div>
      </section>

      <section class="section reviews-work-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Real Work",
            title: "See the Work Behind the Reputation",
            text: "Reviews tell part of the story. The finished work shows the rest.",
          })}
          <div class="reviews-work-grid">
            ${reviewWorkPhotos.map(reviewWorkCard).join("")}
          </div>
        </div>
      </section>

      ${serviceAreaSection()}
      ${finalCta({
        title: "Ready to Talk About Your HVAC Project?",
        text:
          "Send Airrand the equipment details, property type, location and any photos so the next step is clear.",
      })}
    `,
  };
}

function serviceAreaSection() {
  return `
    <section class="section service-area">
      <div class="container service-area-grid">
        <div>
          <p class="eyebrow">Service Area</p>
          <h2>HVAC service throughout the Greater Toronto Area.</h2>
          <p>Airrand serves homeowners, property managers, builders and commercial clients across the GTA with heating, cooling, gas, ventilation, water heating and mechanical HVAC services.</p>
          ${ctaButtons()}
        </div>
        <div class="area-cloud" aria-label="Service areas">
          ${serviceAreas.map((area) => `<a href="${link("/contact/")}">${escapeHtml(area)}</a>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function finalCta({
  title = "Need HVAC help in the GTA?",
  text = "Tell Airrand what you need and whether the work is residential or commercial.",
} = {}) {
  return `
    <section class="final-cta">
      <div class="container final-cta-shell">
        <div>
          <p class="eyebrow">24/7 Service Available</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(text)}</p>
        </div>
        ${ctaButtons()}
      </div>
    </section>
  `;
}

function layout({ title, description, pathname, current, body, schema = [], image = "hero-hvac-work.webp" }) {
  const canonical = pageUrl(pathname);
  const pageTitle = title.includes(site.name) ? title : `${title} | ${site.name}`;
  const bodyClass = current ? `page-${String(current).replace(/[^a-z0-9-]/gi, "-").toLowerCase()}` : "page-default";
  const jsonLd = schema.length
    ? `<script type="application/ld+json">${JSON.stringify(schema.length === 1 ? schema[0] : schema)}</script>`
    : "";

  return `<!doctype html>
<html lang="en-CA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${pageUrl(asset(image).slice(1))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#07090c">
  <link rel="icon" href="${asset("airrand-logo-tight.png")}?v=${assetVersion}" type="image/png">
  <link rel="apple-touch-icon" href="${asset("airrand-logo-tight.png")}?v=${assetVersion}">
  <link rel="manifest" href="${link("/site.webmanifest")}">
  <link rel="preload" href="${asset("airrand-logo-tight.png")}" as="image">
  <link rel="stylesheet" href="${asset("styles.css")}?v=${assetVersion}">
  ${jsonLd}
</head>
<body class="${escapeHtml(bodyClass)}">
  ${header(current)}
  <main id="main">
    ${body}
  </main>
  ${footer()}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label="Project image preview" hidden data-lightbox>
    <button type="button" class="lightbox-close" aria-label="Close image preview" data-lightbox-close></button>
    <figure>
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Project image preview" data-lightbox-image>
      <figcaption data-lightbox-caption></figcaption>
    </figure>
  </div>
  <script src="${asset("main.js")}?v=${assetVersion}" defer></script>
</body>
</html>`;
}

function businessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["HVACBusiness", "LocalBusiness"],
    name: site.legalName,
    url: site.baseUrl,
    telephone: site.phone,
    email: site.email,
    image: pageUrl("assets/airrand-logo-tight.png"),
    areaServed: ["Greater Toronto Area", ...serviceAreas],
    openingHours: "Mo-Su 00:00-23:59",
    sameAs: [site.instagram],
  };
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.baseUrl,
  };
}

function breadcrumbs(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: pageUrl(item.url),
    })),
  };
}

function serviceSchema(service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.title} Services`,
    serviceType: service.title,
    provider: {
      "@type": "HVACBusiness",
      name: site.legalName,
      telephone: site.phone,
      email: site.email,
      url: site.baseUrl,
    },
    areaServed: ["Greater Toronto Area", ...serviceAreas],
    description: service.meta,
  };
}

const faqProfiles = {
  "air-conditioning": {
    topic: "air conditioning",
    problemSigns: "warm air, weak airflow, short cycling, unusual noise, water around the unit or a system that cannot keep up on hot days",
    scopeQuestion: "Can Airrand install or replace my air conditioner?",
    scopeAnswer:
      "Yes. Airrand can help with central air conditioning installation, replacement, diagnostics and maintenance, including sizing, condenser placement and startup checks.",
    timeline:
      "A straightforward replacement can often be completed within a day. Larger homes, difficult access, ductwork changes or commercial coordination can add time.",
  },
  furnaces: {
    topic: "furnace",
    problemSigns: "no heat, uneven heating, frequent shutdowns, unusual smells, loud operation, poor airflow or equipment that is getting unreliable",
    scopeQuestion: "Can Airrand replace or service my furnace?",
    scopeAnswer:
      "Yes. Airrand handles furnace replacement, installation, diagnostics and service with attention to venting, airflow, safety checks and clean setup.",
    timeline:
      "Many furnace replacements are completed in one visit, while venting changes, airflow corrections or added equipment can extend the schedule.",
  },
  "heat-pumps": {
    topic: "heat pump",
    problemSigns: "poor heating or cooling, long run times, outdoor unit issues, unusual noise, reduced comfort or questions about upgrading from older equipment",
    scopeQuestion: "Can Airrand help me decide if a heat pump makes sense?",
    scopeAnswer:
      "Yes. Airrand can review the property, existing equipment and comfort goals, then explain whether a heat pump or hybrid setup is a practical fit.",
    timeline:
      "Timing depends on the system type, indoor equipment, line routing and whether the heat pump is being added to an existing comfort system.",
  },
  "ductless-systems": {
    topic: "ductless system",
    problemSigns: "rooms that never feel comfortable, additions without ductwork, hot or cold offices, garage comfort issues or older homes where new ducts are not practical",
    scopeQuestion: "Can Airrand install single-zone and multi-zone ductless systems?",
    scopeAnswer:
      "Yes. Airrand installs ductless systems with planning for indoor head placement, outdoor unit location, line routing, drainage and final setup.",
    timeline:
      "Single-zone work is usually faster than multi-zone installations. Extra indoor heads, longer line routes and finish details can add time.",
  },
  ductwork: {
    topic: "ductwork",
    problemSigns: "poor airflow, uncomfortable rooms, noisy ducts, renovation changes, missing ventilation routes or messy existing duct layouts",
    scopeQuestion: "Can Airrand modify or install ductwork?",
    scopeAnswer:
      "Yes. Airrand handles duct installation, changes and replacements for residential and commercial spaces with clean routing and practical service access.",
    timeline:
      "Small modifications may be quick, while full duct layouts, commercial fit-outs and renovation work depend on site access and project scope.",
  },
  "gas-lines": {
    topic: "gas line",
    problemSigns: "new gas equipment, appliance relocation, mechanical room changes, undersized piping concerns or a project that needs organized gas connections",
    scopeQuestion: "Can Airrand install gas piping for HVAC equipment and appliances?",
    scopeAnswer:
      "Yes. Airrand provides gas piping for furnaces, water heaters, tankless units, gas fireplaces and related HVAC equipment with careful routing.",
    timeline:
      "Timing depends on pipe length, access, appliance location and how much coordination is needed around the mechanical room or finished areas.",
  },
  "water-heaters": {
    topic: "water heater",
    problemSigns: "no hot water, rusty water, leaks near the tank, rumbling sounds, old equipment or hot water that runs out too quickly",
    scopeQuestion: "Can Airrand replace a traditional tank water heater?",
    scopeAnswer:
      "Yes. Airrand installs and replaces traditional water heaters, including water connections, venting coordination and operational checks before completion.",
    timeline:
      "A direct replacement is often simpler than a change in tank size, venting, location or fuel setup. Airrand can confirm timing after seeing the site.",
  },
  "tankless-water-heaters": {
    topic: "tankless water heater",
    problemSigns: "limited hot water, interest in on-demand hot water, older tank equipment, venting changes or questions about upgrading to tankless",
    scopeQuestion: "Can Airrand install a tankless water heater?",
    scopeAnswer:
      "Yes. Airrand installs tankless systems with attention to gas supply, venting, condensate, service access and startup verification.",
    timeline:
      "Tankless work varies because gas, venting and condensate requirements can change from home to home. A site review helps set the right expectation.",
  },
  "hrv-erv": {
    topic: "HRV or ERV",
    problemSigns: "stale air, excess humidity, condensation, renovation ventilation needs or a tighter home that needs controlled fresh air",
    scopeQuestion: "Can Airrand install an HRV or ERV system?",
    scopeAnswer:
      "Yes. Airrand installs HRV and ERV systems with planning for fresh-air routes, exhaust routes, balancing considerations and HVAC integration.",
    timeline:
      "Timing depends on duct access, exterior wall access, equipment location and whether the system is part of a larger renovation or HVAC upgrade.",
  },
  humidifiers: {
    topic: "whole-home humidifier",
    problemSigns: "dry air, static, winter discomfort, wood shrinkage concerns or humidity levels that feel too low during heating season",
    scopeQuestion: "Can Airrand add a humidifier to my HVAC system?",
    scopeAnswer:
      "Yes. Airrand installs whole-home humidifiers with furnace-side integration, water and drain connections, controls and a homeowner walkthrough.",
    timeline:
      "Most humidifier installs are smaller projects, but access, drain routing and control wiring can affect the final timing.",
  },
  "gas-fireplaces": {
    topic: "gas fireplace",
    problemSigns: "a new fireplace project, renovation plans, gas piping needs, equipment replacement or a finished space that needs clean coordination",
    scopeQuestion: "Can Airrand help with gas fireplace installation work?",
    scopeAnswer:
      "Yes. Airrand supports gas fireplace projects with related HVAC and gas piping scope, coordination around finish details and system checks.",
    timeline:
      "Timing depends on gas routing, fireplace location, finish work and whether other trades are involved in the project.",
  },
  "commercial-hvac": {
    topic: "commercial HVAC",
    problemSigns: "tenant comfort complaints, rooftop equipment problems, ventilation changes, fit-out requirements or aging commercial heating and cooling equipment",
    scopeQuestion: "Can Airrand handle commercial HVAC projects and service?",
    scopeAnswer:
      "Yes. Airrand supports commercial heating, cooling, ventilation, ductwork, rooftop equipment coordination, gas piping and mechanical installation scope.",
    timeline:
      "Commercial timing depends on access, tenant schedules, rooftop or mechanical room coordination, equipment availability and project size.",
  },
  "hvac-repair": {
    topic: "HVAC repair",
    problemSigns: "no heat, no cooling, short cycling, unusual noises, weak airflow, water around equipment or a system that suddenly stops working",
    scopeQuestion: "Can Airrand diagnose heating and cooling problems?",
    scopeAnswer:
      "Yes. Airrand provides HVAC diagnostics and repair recommendations with clear scope, practical next steps and emergency service availability.",
    timeline:
      "Some repairs can be completed during the first visit. Parts, equipment access or larger failures may require a follow-up visit.",
  },
  "hvac-maintenance": {
    topic: "HVAC maintenance",
    problemSigns: "overdue service, dirty filters, reduced airflow, rising energy use, seasonal startup concerns or equipment you want checked before peak weather",
    scopeQuestion: "What does HVAC maintenance include?",
    scopeAnswer:
      "Airrand reviews heating and cooling operation, filters, airflow, visible equipment condition and practical recommendations for repairs or replacement.",
    timeline:
      "Maintenance visits are usually shorter than installation work, but timing depends on equipment condition, access and the number of systems being checked.",
  },
  "hvac-installation": {
    topic: "HVAC installation",
    problemSigns: "aging equipment, renovation plans, new mechanical scope, poor comfort or a system that needs a cleaner long-term setup",
    scopeQuestion: "What HVAC equipment can Airrand install?",
    scopeAnswer:
      "Airrand installs heating, cooling, ventilation, water heating and gas equipment with attention to sizing, routing, setup, testing and clean handoff.",
    timeline:
      "Installation timing depends on the equipment, building access, mechanical room layout, duct or piping work and whether the project is residential or commercial.",
  },
};

function serviceFaqs(service) {
  const profile = faqProfiles[service.slug] ?? {
    topic: service.title.toLowerCase(),
    problemSigns: "comfort issues, aging equipment, unusual operation or a project that needs professional HVAC planning",
    scopeQuestion: `Can Airrand help with ${service.title.toLowerCase()}?`,
    scopeAnswer: `${service.intro} Airrand can review the site, explain the scope and recommend a practical next step.`,
    timeline: "Timing depends on access, equipment, parts and the amount of installation, repair or coordination required.",
  };

  if (service.slug === "gas-lines") {
    return [
      {
        question: "Can Airrand run a new gas line?",
        answer:
          "Yes. Airrand can evaluate and install gas piping for appropriate HVAC equipment, water heating equipment and approved gas appliances, with the route, equipment load and installation requirements reviewed before work proceeds.",
      },
      {
        question: "Can I add a gas fireplace to my existing gas system?",
        answer:
          "Possibly, but the existing gas system should be evaluated for capacity, routing, appliance requirements, shutoff location and the condition of the current piping before a fireplace connection is added.",
      },
      {
        question: "Can I add a tankless water heater to my existing gas line?",
        answer:
          "Tankless equipment can have significant gas-input requirements. The existing piping, total connected load, equipment location and manufacturer requirements should be checked before installation.",
      },
      {
        question: "Does changing furnace size affect the gas line?",
        answer:
          "Potentially. Equipment input and the total connected load on the gas system should be reviewed when a furnace is replaced with equipment that has different requirements.",
      },
      {
        question: "Can gas lines be moved?",
        answer:
          "Yes, depending on the application and route. Relocation may involve pipe sizing, supports, shutoffs, appliance connections and required testing before the system is put back into service.",
      },
      {
        question: "Why does gas-pipe size matter?",
        answer:
          "Pipe size affects the ability to deliver adequate gas to connected equipment. Appliance input, pipe length, fittings, pressure and total system load all influence whether a gas line is appropriate.",
      },
      {
        question: "How do I know if my gas line is leaking?",
        answer:
          "Do not use DIY test methods. If you smell gas or suspect a leak, leave the area and contact the gas utility or emergency services as appropriate from a safe location.",
      },
      {
        question: "Can Airrand pressure-test gas piping?",
        answer:
          "New or modified gas piping can require testing before commissioning. Testing requirements depend on the installation and applicable code requirements.",
      },
      {
        question: "Can Airrand install gas lines outdoors?",
        answer:
          "Outdoor piping can be used in appropriate applications with suitable materials, protection, supports and routing. The installation location and equipment requirements need to be reviewed.",
      },
      {
        question: "Does Airrand work on commercial gas piping?",
        answer:
          "Yes, for appropriate commercial HVAC and mechanical applications such as rooftop equipment, make-up air units, boilers, unit heaters, mechanical rooms and commercial water-heating equipment.",
      },
    ];
  }

  if (service.slug === "water-heaters") {
    return [
      {
        question: "Should I choose tank or tankless?",
        answer:
          "The right choice depends on hot-water demand, equipment location, gas or electrical capacity, venting, budget and project requirements. Airrand can review the application and explain practical options.",
      },
      {
        question: "Does tankless mean unlimited hot water?",
        answer:
          "A properly sized tankless system can provide continuous hot water within its designed flow capacity. Flow rate, incoming water temperature, gas capacity and simultaneous fixtures still matter.",
      },
      {
        question: "Can Airrand replace my existing water heater?",
        answer:
          "Yes, subject to evaluating the existing equipment, venting, water connections, fuel source, drainage and the application. Direct replacements are usually simpler than changes in equipment type or location.",
      },
      {
        question: "What size water heater do I need?",
        answer:
          "Sizing depends on household demand, fixture use, recovery needs, equipment type and the installation conditions. It should not be selected from square footage alone.",
      },
      {
        question: "What is a combi boiler?",
        answer:
          "A combi boiler is one appliance designed to provide hydronic space heating and domestic hot-water production. It must be sized for both the building heating load and the hot-water demand.",
      },
      {
        question: "Is a boiler the same as a water heater?",
        answer:
          "No. A water heater is primarily for domestic hot water such as showers, sinks, dishwashers and laundry. A boiler is primarily for hydronic space heating, although some systems are designed to combine both functions.",
      },
      {
        question: "Why is my tankless water heater showing an error code?",
        answer:
          "Error codes vary by manufacturer and model. They can relate to ignition, venting, water flow, sensors, condensate, gas supply or maintenance needs, so the specific equipment should be diagnosed properly.",
      },
      {
        question: "Why is water leaking from my water heater?",
        answer:
          "Water can come from piping, drainage, relief components, fittings or the tank itself. If a storage tank is leaking from the tank body, replacement may be required.",
      },
      {
        question: "Can a water heater be moved?",
        answer:
          "Relocation may require changes to water piping, gas, venting, drainage, electrical and service access. The location needs to be evaluated before the scope can be confirmed.",
      },
      {
        question: "How often should water-heating equipment be maintained?",
        answer:
          "Maintenance intervals depend on equipment type, manufacturer requirements, usage and water conditions. Tankless systems and boilers often have more specific maintenance needs than a basic tank replacement.",
      },
    ];
  }

  if (service.slug === "air-conditioning") {
    return [
      {
        question: "How do I know whether my AC needs repair or replacement?",
        answer:
          "The right choice depends on system condition, repair history, cooling performance, efficiency, equipment compatibility and the cost of the required repair. Airrand can assess the system before recommending a repair or replacement path.",
      },
      {
        question: "Why is my AC running but not cooling properly?",
        answer:
          "Poor cooling can be related to airflow, refrigeration, electrical, controls, equipment condition or system setup. The system should be diagnosed before parts or refrigerant are added.",
      },
      {
        question: "Why is there ice on my AC line or indoor coil?",
        answer:
          "Ice can be connected to restricted airflow, refrigeration issues or other operating problems. Continued operation can worsen the condition, so the system should be inspected rather than simply topped up.",
      },
      {
        question: "How often should air conditioning maintenance be performed?",
        answer:
          "Many homeowners choose to have cooling equipment inspected before or during the cooling season, especially older or heavily used systems. Maintenance can catch issues earlier, but it cannot prevent every failure.",
      },
      {
        question: "Does a bigger air conditioner cool better?",
        answer:
          "No. Oversized equipment can cycle excessively, reduce humidity control and create comfort issues. Proper sizing and airflow matter more than simply installing a larger unit.",
      },
      {
        question: "Does low refrigerant mean I just need a recharge?",
        answer:
          "A sealed air conditioning system should not normally use up refrigerant every season. If refrigerant is low, the cause and operating condition should be evaluated before refrigerant is added.",
      },
      {
        question: "Can Airrand replace just the outdoor unit?",
        answer:
          "Sometimes, but compatibility must be evaluated first. The indoor coil, refrigerant type, capacity, controls and manufacturer requirements all affect whether replacing only the outdoor condenser is appropriate.",
      },
      {
        question: "Does Airrand handle residential and light commercial cooling?",
        answer:
          "Yes. Airrand handles central air conditioning installation, replacement, repair, diagnostics and maintenance for homes and light commercial spaces across the Greater Toronto Area.",
      },
      {
        question: "What should I send when requesting AC service?",
        answer:
          "Share the property type, city, equipment photos, model information if available and a short description of the cooling issue or replacement goal. Photos help Airrand understand access and equipment condition faster.",
      },
    ];
  }

  if (service.slug === "heat-pumps") {
    return [
      {
        question: "Can a heat pump heat my home in winter?",
        answer:
          "Modern heat pumps can provide useful heating in cold weather, but capability varies by equipment, outdoor conditions, system sizing, building heat loss, installation and controls.",
      },
      {
        question: "Do I still need a furnace with a heat pump?",
        answer:
          "Some homes use heat pumps as the main heating and cooling system, while many GTA homes use a hybrid heat-pump and furnace setup. The best configuration depends on the home and equipment.",
      },
      {
        question: "Will my heat pump run constantly?",
        answer:
          "Some variable-capacity heat pumps are designed to run longer at lower output. Longer runtimes are not automatically a problem if the system is maintaining comfort and operating correctly.",
      },
      {
        question: "Why is my heat pump producing steam outside?",
        answer:
          "During cold weather, frost can form on the outdoor coil and the system may enter defrost mode. Steam, a temporarily stopped outdoor fan or different operating sounds can be normal during a brief defrost cycle.",
      },
      {
        question: "Does a heat pump replace my air conditioner?",
        answer:
          "In many applications, yes. A heat pump provides cooling using similar refrigeration principles to an air conditioner while also being capable of heating when the refrigeration cycle reverses.",
      },
      {
        question: "Are heat pumps noisy?",
        answer:
          "Noise varies by equipment design, capacity, compressor technology, location and installation. Placement and setup should be considered during system planning.",
      },
      {
        question: "How long does a heat pump installation take?",
        answer:
          "Timing depends on the system type, indoor equipment, refrigerant line routing, electrical requirements, controls and whether the heat pump is being integrated with an existing furnace.",
      },
      {
        question: "Can a heat pump work with my existing furnace?",
        answer:
          "Often it can, but compatibility needs to be evaluated. The furnace, indoor coil, controls, airflow, capacity and system condition all affect whether a hybrid setup makes sense.",
      },
      {
        question: "Is a heat pump more efficient than a gas furnace?",
        answer:
          "They operate differently, so cost and efficiency comparisons depend on the equipment, outdoor temperature, utility pricing and building conditions. Airrand can compare practical options without making universal savings promises.",
      },
      {
        question: "What size heat pump do I need?",
        answer:
          "Sizing should be based on the building and system requirements rather than square footage alone. Heating load, cooling load, ductwork, airflow and hybrid strategy all matter.",
      },
    ];
  }

  if (service.slug === "ductless-systems") {
    return [
      {
        question: "Can ductless systems heat and cool?",
        answer:
          "Many ductless systems use heat-pump technology and can provide both heating and cooling. Capability depends on the equipment, system design and application.",
      },
      {
        question: "Can I control each room separately?",
        answer:
          "Multi-zone ductless systems can provide separate temperature settings by zone, but connected indoor units generally share the same overall heating or cooling operating mode.",
      },
      {
        question: "Can one ductless head heat while another cools?",
        answer:
          "Standard multi-zone systems generally do not provide simultaneous heating and cooling between connected heads. Some systems may show a mode conflict, place one head on standby or prioritize one mode depending on manufacturer design.",
      },
      {
        question: "How many indoor heads can connect to one outdoor unit?",
        answer:
          "The number varies by outdoor-unit model, capacity, manufacturer combination rules, line-set lengths and the rooms being served. It should be confirmed from the specific equipment data.",
      },
      {
        question: "Can ductless systems work in winter?",
        answer:
          "Many ductless heat-pump systems can provide useful heating in cold weather, but winter performance depends on the model, outdoor temperature, building load and installation. Cold-climate options may be considered for GTA applications.",
      },
      {
        question: "Do ductless systems need drains?",
        answer:
          "Yes. Indoor units remove moisture during cooling and require proper condensate drainage. Drain routing is an important part of placement and installation planning.",
      },
      {
        question: "Are ductless systems noisy?",
        answer:
          "Indoor and outdoor sound levels vary by equipment, capacity, operating speed, location and installation. Placement should be considered so the system is practical for the room.",
      },
      {
        question: "Can I control my ductless system from my phone?",
        answer:
          "Wi-Fi or app control varies by model and manufacturer. Some systems include it, while others may require an accessory or may not support it.",
      },
      {
        question: "Where should a ductless indoor unit be installed?",
        answer:
          "Placement should consider airflow, drainage, service access, room layout, furniture, direct airflow exposure and line-set routing. Exact placement should be planned on site.",
      },
      {
        question: "Can ductless replace my entire furnace and AC system?",
        answer:
          "It depends on the home, heating load, room layout, equipment design and whether every important area can be served properly. Airrand can review whether ductless is a targeted solution or a broader replacement strategy.",
      },
    ];
  }

  if (service.slug === "ductwork") {
    return [
      {
        question: "Can Airrand install new ductwork?",
        answer:
          "Yes. Airrand installs new ductwork for appropriate residential and commercial HVAC, ventilation, renovation and fit-out projects throughout the GTA.",
      },
      {
        question: "Can existing ductwork be modified?",
        answer:
          "Yes. Existing systems can often be modified for renovations, equipment replacements, layout changes, new rooms, register relocation or return-air improvements.",
      },
      {
        question: "Why is one room hotter or colder than the others?",
        answer:
          "Uneven temperatures can be related to airflow, duct design, return air, insulation, building heat gain or loss, equipment capacity or system setup. It should be evaluated as part of the complete HVAC system.",
      },
      {
        question: "Can you add a new supply vent?",
        answer:
          "Potentially. The existing duct system, available airflow, branch location and return-air path should be reviewed before adding a new supply branch.",
      },
      {
        question: "Why are my vents noisy?",
        answer:
          "Noisy vents can be related to restrictive grilles, high air velocity, duct sizing, fittings, loose metal, vibration or equipment airflow. Noise is often a system issue rather than one isolated part.",
      },
      {
        question: "What is static pressure?",
        answer:
          "Static pressure is resistance to airflow inside the HVAC system. Filters, coils, ductwork, fittings, dampers, registers and grilles all add resistance that the blower has to work through.",
      },
      {
        question: "Does bigger ductwork mean more airflow?",
        answer:
          "Not automatically. Airflow depends on the complete system, including blower performance, duct layout, fittings, registers, return air and equipment requirements.",
      },
      {
        question: "Can ductwork be moved during a renovation?",
        answer:
          "Often yes, but structure, ceiling space, airflow, service access and other building systems need to be considered before ductwork is moved.",
      },
      {
        question: "Should ductwork be insulated?",
        answer:
          "Some ductwork should be insulated depending on location, air temperature, condensation risk, building conditions and application. It is not one universal requirement for every duct.",
      },
      {
        question: "What is spiral duct?",
        answer:
          "Spiral duct is rigid round metal duct often used in commercial and exposed applications. It can provide a clean finished appearance and an efficient round airflow path.",
      },
      {
        question: "Does Airrand handle commercial ductwork?",
        answer:
          "Yes. Airrand handles appropriate commercial HVAC and ventilation ductwork, including fit-outs, rooftop equipment connections, spiral duct, rectangular duct, main trunks and mechanical room work.",
      },
    ];
  }

  const applications = service.applications.map((item) => item.toLowerCase()).join(", ");

  return [
    {
      question: `How do I know if I need ${profile.topic} service?`,
      answer: `Common signs include ${profile.problemSigns}. Airrand can assess the system, explain what is happening and recommend the right next step.`,
    },
    {
      question: profile.scopeQuestion,
      answer: profile.scopeAnswer,
    },
    {
      question: `How long does ${profile.topic} work usually take?`,
      answer: profile.timeline,
    },
    {
      question: `Does Airrand handle residential and commercial ${profile.topic} work?`,
      answer: `Yes. Airrand supports applications such as ${applications} across the Greater Toronto Area, with recommendations based on the property type and equipment involved.`,
    },
    {
      question: `What should I send when requesting a ${profile.topic} quote?`,
      answer:
        "Share the property type, city, equipment photos, model information if available and a short description of the issue or project goal. Photos help Airrand understand access, equipment condition and scope faster.",
    },
    {
      question: `Why choose Airrand for ${profile.topic} work in the GTA?`,
      answer:
        "Airrand focuses on clear communication, clean workmanship, practical recommendations and systems that are checked before the job is handed over.",
    },
  ];
}

function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function faqSection(service, faqs) {
  const topic = faqProfiles[service.slug]?.topic ?? service.title.toLowerCase();

  return `
    <section class="section faq-section">
      <div class="container faq-shell">
        ${sectionHeading({
          eyebrow: "FAQ",
          title: `${escapeHtml(service.title)} FAQ`,
          text: `Common questions about ${escapeHtml(topic)} service, installation, repair and quotes in the Greater Toronto Area.`,
          align: "center",
        })}
        <div class="faq-list">
          ${faqs
            .map(
              (faq) => `
                <details class="faq-item">
                  <summary><span>${escapeHtml(faq.question)}</span></summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

const waterHeatingBrandSlugs = ["bradford-white", "rheem", "rinnai", "navien", "bosch", "ibc"];

const waterHeatingSystemOptions = [
  {
    eyebrow: "Tank Water Heater",
    title: "Tank Water Heaters",
    icon: "tank",
    text: "Stores a ready supply of hot water in an insulated tank.",
    itemsTitle: "Best suited for",
    items: [
      "Straightforward replacement",
      "Conventional residential applications",
      "Lower upfront equipment cost",
      "Familiar serviceability",
    ],
    cta: "Tank Water Heaters",
    href: "#tank-water-heaters",
  },
  {
    eyebrow: "Tankless Water Heater",
    title: "Tankless Water Heaters",
    icon: "tankless",
    text: "Heats domestic water on demand instead of storing a large volume of hot water.",
    itemsTitle: "Potential benefits",
    items: [
      "Compact installation",
      "Continuous hot water when properly sized",
      "Higher-efficiency equipment options",
      "No large storage tank",
    ],
    cta: "Explore Tankless Systems",
    href: "/services/tankless-water-heaters/",
  },
  {
    eyebrow: "Boiler",
    title: "Boilers & Hydronic Heating",
    icon: "boiler",
    text:
      "Boilers heat water for hydronic heating systems such as radiators, baseboards, fan coils or in-floor heating.",
    itemsTitle: "Potential applications",
    items: [
      "Radiant floors",
      "Baseboard heating",
      "Radiators",
      "Hydronic air handlers",
      "Combination heating systems",
    ],
    cta: "Ask About Boiler Systems",
    href: "/contact/",
  },
];

const waterHeatingSelectionFactors = [
  {
    title: "Hot-Water Demand",
    text:
      "Occupants, bathrooms, showers, large tubs, appliances and simultaneous fixture use all affect the right system choice.",
    icon: "water",
  },
  {
    title: "Available Space",
    text:
      "Tank systems need room for storage, while tankless equipment can free up floor space but still needs clearances and service access.",
    icon: "space",
  },
  {
    title: "Existing Venting",
    text:
      "Current venting can influence replacement options. Some equipment may require metal venting, plastic venting, combustion air or vent modifications.",
    icon: "venting",
  },
  {
    title: "Fuel Source",
    text:
      "Natural gas, propane or electric equipment options depend on available fuel, electrical capacity and the existing mechanical setup.",
    icon: "flame",
  },
  {
    title: "Budget",
    text:
      "Different systems have different upfront equipment and installation costs, especially when venting, gas piping or location changes are involved.",
    icon: "budget",
  },
  {
    title: "Long-Term Priorities",
    text:
      "Efficiency, space savings, hot-water recovery, equipment lifespan and serviceability should be weighed against initial cost.",
    icon: "controls",
  },
];

const waterHeatingTankReplacementSigns = [
  ["Leaking Tank", "Visible water from the tank body can point toward replacement rather than repair."],
  ["Corrosion", "Rust, failing fittings or deteriorated components can signal poor overall condition."],
  ["Insufficient Hot Water", "Hot water that runs out too quickly may relate to capacity, recovery or equipment condition."],
  ["Burner / Control Problems", "Repeated ignition, burner or control issues should be properly diagnosed."],
  ["Repeated Service Calls", "Frequent repair visits can make replacement a more practical discussion."],
  ["Poor Overall Condition", "Condition matters more than a single age number when deciding what comes next."],
];

const waterHeatingInstallationItems = [
  ["Equipment Selection", "Choose equipment appropriate for the application.", "sizing"],
  ["Gas / Fuel Connection", "Verify gas piping, fuel supply and pressure where applicable.", "gas"],
  ["Venting", "Install intake and exhaust systems according to equipment requirements.", "venting"],
  ["Water Connections", "Provide appropriate hot and cold water piping and isolation.", "piping"],
  ["Drainage", "Install condensate or relief drainage where required.", "drainage"],
  ["Electrical", "Verify power, controls and disconnect requirements.", "electrical"],
  ["Expansion Control", "Evaluate thermal expansion requirements where applicable.", "pressure"],
  ["Startup & Testing", "Verify operation and temperatures before completion.", "testing"],
  ["Service Access", "Leave equipment accessible for future maintenance and repair.", "tools"],
];

const waterHeatingSafetyItems = [
  "Temperature and pressure relief valve",
  "Venting",
  "Combustion air",
  "Gas piping",
  "Expansion",
  "Drainage",
  "Carbon monoxide considerations",
  "Equipment clearances",
];

const waterHeatingHydronicApplications = [
  { title: "Radiators", detail: "Existing radiator loops", icon: "temperature" },
  { title: "Baseboard heaters", detail: "Hydronic perimeter heat", icon: "piping" },
  { title: "In-floor radiant heating", detail: "Warm floor zones", icon: "space" },
  { title: "Hydronic fan coils", detail: "Forced-air comfort from hot water", icon: "venting" },
  { title: "Air handlers", detail: "Coils tied into ductwork", icon: "controls" },
  { title: "Snowmelt where applicable", detail: "Outdoor radiant applications", icon: "scale" },
];

const waterHeatingProblems = [
  { title: "No hot water", group: "Temperature", icon: "temperature" },
  { title: "Insufficient hot water", group: "Demand", icon: "water" },
  { title: "Water temperature fluctuating", group: "Controls", icon: "controls" },
  { title: "Tank leaking", group: "Tank condition", icon: "drainage" },
  { title: "Pilot / ignition problems", group: "Ignition", icon: "flame" },
  { title: "Error codes", group: "Diagnostics", icon: "controls" },
  { title: "Burner problems", group: "Combustion", icon: "flame" },
  { title: "Venting issues", group: "Venting", icon: "venting" },
  { title: "Unusual noise", group: "Operation", icon: "tools" },
  { title: "Water around the equipment", group: "Leak or drain", icon: "drainage" },
  { title: "Tankless flow problems", group: "Flow rate", icon: "tankless" },
  { title: "Boiler pressure problems", group: "Hydronic", icon: "pressure" },
];

const waterHeatingMaintenanceGroups = [
  {
    title: "Tank Water Heater",
    items: [
      "Visual inspection",
      "Burner operation",
      "Venting",
      "Drainage",
      "Relief valve condition",
      "General tank condition",
    ],
  },
  {
    title: "Tankless",
    items: [
      "Heat-exchanger cleaning / descaling when appropriate",
      "Filters",
      "Burner operation",
      "Venting",
      "Condensate",
      "Error history",
    ],
  },
  {
    title: "Boiler",
    items: [
      "Burner / combustion",
      "Pressure",
      "Expansion tank",
      "Circulation",
      "Venting",
      "Controls",
      "Condensate",
      "Heat exchanger",
    ],
  },
];

function waterHeatingIcon(key) {
  const icons = {
    tank: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M8 4.5h8" />
        <path d="M8 19.5h8" />
        <path d="M7 7.5a5 2.4 0 0 1 10 0v9a5 2.4 0 0 1-10 0Z" />
        <path d="M7 7.5a5 2.4 0 0 0 10 0" />
        <path d="M10 11h4" />
        <path d="M10 14h4" />
      </svg>
    `,
    tankless: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <rect x="6" y="3.5" width="12" height="17" rx="2.5" />
        <path d="M9 7h6" />
        <path d="M9 10.5h6" />
        <path d="M10 14h4" />
        <path d="M9 20.5v2" />
        <path d="M15 20.5v2" />
      </svg>
    `,
    boiler: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <rect x="5" y="4" width="14" height="15" rx="2.5" />
        <path d="M8 8h8" />
        <path d="M8 11h3" />
        <path d="M13 11h3" />
        <path d="M8 16h8" />
        <path d="M9 19v2" />
        <path d="M15 19v2" />
      </svg>
    `,
    water: () => technicalSetupIcon("Drainage"),
    flame: () => heatingIcon("flame"),
    venting: () => technicalSetupIcon("Venting"),
    gas: () => technicalSetupIcon("Gas pressure"),
    electrical: () => technicalSetupIcon("Electrical"),
    controls: () => technicalSetupIcon("Controls"),
    drainage: () => technicalSetupIcon("Drainage"),
    sizing: () => technicalSetupIcon("Proper sizing"),
    testing: () => technicalSetupIcon("Commissioning"),
    tools: () => heatingIcon("tools"),
    temperature: () => heatingIcon("temperature"),
    space: () => heatingIcon("home"),
    budget: () => heatingIcon("energy"),
    pressure: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M6 15a6 6 0 1 1 12 0" />
        <path d="M12 15l3-4" />
        <path d="M5 19h14" />
        <path d="M8 15h8" />
      </svg>
    `,
    piping: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M4 8h9a3 3 0 0 1 3 3v5" />
        <path d="M4 16h8a4 4 0 0 0 4-4V8" />
        <path d="M18 8h2" />
        <path d="M18 16h2" />
      </svg>
    `,
    shield: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M12 3 19 6v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6Z" />
        <path d="M9 12l2 2 4-5" />
      </svg>
    `,
    scale: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M12 3s5 5.4 5 9a5 5 0 0 1-10 0c0-3.6 5-9 5-9Z" />
        <path d="M8.5 17.5c2.3 1.2 4.7 1.2 7 0" />
        <path d="M6 21h12" />
      </svg>
    `,
    cycle: () => heatingIcon("cycle"),
  };

  const icon = icons[key] ?? icons.tools;
  return typeof icon === "function" ? icon() : icon;
}

function waterHeatingList(items) {
  return `
    <ul class="water-heating-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function waterHeatingOverviewSection(service) {
  return `
    <section class="section water-heating-section water-heating-overview-section">
      <div class="container service-detail-grid">
        <article class="detail-copy">
          <p class="eyebrow">What Airrand Handles</p>
          <h2>Water-heating work planned around the full mechanical system.</h2>
          <p>Water-heating equipment is connected to more than just hot and cold water lines. Fuel supply, venting, drainage, controls, clearances and service access all affect the right installation approach.</p>
          <p>Airrand works through tank replacements, tankless upgrades and boiler-related water-heating conversations with practical recommendations for GTA homes and light commercial properties.</p>
          <ul class="check-list">
            ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <aside class="service-aside water-heating-aside">
          <h2>Common Applications</h2>
          <ul>
            ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <a class="button button-primary" href="${link("/contact/")}">Book Water Heating Service</a>
          <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
        </aside>
      </div>
    </section>
  `;
}

function waterHeatingOptionsSection() {
  return `
    <section class="section water-heating-section water-heating-options-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Types",
          title: "Tank, Tankless or Boiler?",
          text:
            "These systems are often discussed together, but they are not the same. The right option depends on the equipment purpose, demand and existing site conditions.",
          align: "center",
        })}
        <div class="water-heating-options-grid">
          ${waterHeatingSystemOptions
            .map(
              (option) => `
                <article class="water-option-card reveal">
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(option.icon)}</span>
                  <p class="eyebrow">${escapeHtml(option.eyebrow)}</p>
                  <h3>${escapeHtml(option.title)}</h3>
                  <p>${escapeHtml(option.text)}</p>
                  <div>
                    <strong>${escapeHtml(option.itemsTitle)}</strong>
                    ${waterHeatingList(option.items)}
                  </div>
                  <a class="button button-secondary" href="${link(option.href)}">${escapeHtml(option.cta)}</a>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingSelectionSection() {
  return `
    <section class="section water-heating-section water-heating-selection-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Equipment Selection",
          title: "Which Water Heating System Makes Sense?",
          text:
            "Good selection starts with the building and the existing mechanical setup, not a one-size-fits-all recommendation.",
        })}
        <div class="water-selection-grid">
          ${waterHeatingSelectionFactors
            .map(
              (item) => `
                <article class="water-technical-card reveal">
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingTankSection() {
  return `
    <section id="tank-water-heaters" class="section water-heating-section water-heating-tank-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Traditional Water Heating",
            title: "Tank Water Heaters",
            text:
              "Traditional tank water heaters maintain a stored volume of hot water. They remain a practical option for many homes because they are familiar, straightforward, widely serviceable and available in several capacities.",
          })}
          <p class="water-note">A tank replacement still needs proper venting, water connections, fuel setup, drainage and startup checks before it is handed over.</p>
        </article>
        <div class="water-flow-panel reveal" aria-label="Tank water heater flow diagram">
          <div class="water-flow-step">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("water")}</span>
            <strong>Cold Water In</strong>
          </div>
          <span class="water-flow-arrow" aria-hidden="true">&rarr;</span>
          <div class="water-flow-step water-flow-step-main">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("tank")}</span>
            <strong>Heated Storage Tank</strong>
          </div>
          <span class="water-flow-arrow" aria-hidden="true">&rarr;</span>
          <div class="water-flow-step">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("temperature")}</span>
            <strong>Hot Water Out</strong>
          </div>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingReplacementSection() {
  return `
    <section class="section water-heating-section water-heating-replacement-section">
      <div class="container">
        ${sectionHeading({
          title: "When Should a Tank Water Heater Be Replaced?",
          text:
            "Condition matters more than a single age number. Leaks, corrosion, repeated failures and poor performance are stronger signals than the calendar alone.",
        })}
        <div class="water-sign-grid">
          ${waterHeatingTankReplacementSigns
            .map(
              ([title, text]) => `
                <article class="water-technical-card reveal">
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(title.includes("Leak") ? "water" : title.includes("Control") ? "controls" : "tools")}</span>
                  <h3>${escapeHtml(title)}</h3>
                  <p>${escapeHtml(text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingTanklessSection() {
  const advantages = [
    "Compact wall-mounted design",
    "Continuous hot-water capability when sized correctly",
    "High-efficiency options",
    "Reduced standby storage losses",
  ];
  const considerations = ["Gas capacity", "Venting", "Water flow", "Electrical requirements", "Water quality", "Maintenance"];

  return `
    <section class="section water-heating-section water-heating-tankless-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "On-Demand Hot Water",
            title: "Tankless Water Heaters",
            text:
              "Tankless systems heat water as it flows through the equipment instead of storing a large tank of hot water.",
          })}
          <p class="water-note"><strong>Continuous hot water within the system's designed flow capacity.</strong> That is the important distinction: tankless systems still need to be selected around demand and site conditions.</p>
          <a class="button button-primary" href="${link("/services/tankless-water-heaters/")}">View Tankless Water Heating</a>
        </article>
        <div class="water-dual-panel reveal">
          <article>
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("tankless")}</span>
            <h3>Potential Advantages</h3>
            ${waterHeatingList(advantages)}
          </article>
          <article>
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("venting")}</span>
            <h3>Potential Considerations</h3>
            ${waterHeatingList(considerations)}
          </article>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingComparisonSection() {
  return `
    <section class="section water-heating-section water-heating-comparison-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Comparison",
          title: "Tank vs. Tankless",
          text:
            "Neither system is automatically better. The right option depends on the home, water demand, equipment location and budget.",
          align: "center",
        })}
        <div class="water-comparison-grid">
          <article class="water-comparison-card reveal">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("tank")}</span>
            <h3>Tank</h3>
            ${waterHeatingList([
              "Stores hot water",
              "Larger physical footprint",
              "Lower typical equipment complexity",
              "Straightforward replacement in many homes",
              "Hot-water supply limited by stored capacity and recovery",
            ])}
          </article>
          <article class="water-comparison-card reveal">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("tankless")}</span>
            <h3>Tankless</h3>
            ${waterHeatingList([
              "Heats water on demand",
              "Compact wall-mounted equipment",
              "Requires adequate fuel or power",
              "More complex controls",
              "Can provide continuous hot water when properly sized",
            ])}
          </article>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingBoilerSection() {
  return `
    <section class="section water-heating-section water-heating-boiler-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Hydronic Systems",
            title: "Boilers and Hydronic Heating",
            text:
              "Boilers heat water that circulates through a hydronic heating system. Boiler installation and service in Toronto and the GTA depends on the building, piping, venting, controls and equipment application.",
          })}
          <p class="water-note">Depending on the equipment and system design, some boiler systems may also support domestic hot-water production.</p>
        </article>
        <div class="water-chip-panel reveal" aria-label="Common hydronic applications">
          <div class="water-chip-panel-head">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("boiler")}</span>
            <div>
              <strong>Common hydronic applications</strong>
              <small>Matched to piping, controls and heat load.</small>
            </div>
          </div>
          <div class="water-chip-grid">
            ${waterHeatingHydronicApplications
              .map(
                (item) => `
                  <article class="water-application-chip">
                    <span class="water-mini-icon" aria-hidden="true">${waterHeatingIcon(item.icon)}</span>
                    <div>
                      <strong>${escapeHtml(item.title)}</strong>
                      <small>${escapeHtml(item.detail)}</small>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingBoilerVsSection() {
  return `
    <section class="section water-heating-section water-heating-boiler-vs-section">
      <div class="container">
        ${sectionHeading({
          title: "Boiler vs. Water Heater",
          text:
            "Many homeowners use the words interchangeably, but the equipment is usually designed for different primary jobs.",
          align: "center",
        })}
        <div class="water-boiler-vs-grid">
          <article class="water-purpose-card reveal">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("tank")}</span>
            <p class="eyebrow">Water Heater</p>
            <h3>Domestic hot water</h3>
            ${waterHeatingList(["Showers", "Sinks", "Dishwashers", "Laundry"])}
          </article>
          <article class="water-purpose-card reveal">
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("boiler")}</span>
            <p class="eyebrow">Boiler</p>
            <h3>Hydronic space heating</h3>
            ${waterHeatingList(["Radiators", "Baseboards", "Radiant floors", "Hydronic air handlers"])}
          </article>
        </div>
        <p class="water-summary-line">Some systems combine both functions, but the equipment and piping arrangement must be designed specifically for that application.</p>
      </div>
    </section>
  `;
}

function waterHeatingCombiSection() {
  return `
    <section class="section water-heating-section water-heating-combi-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Combination Systems",
            title: "What Is a Combi Boiler?",
            text:
              "A combination boiler can provide both hydronic space heating and domestic hot water from one appliance.",
          })}
          <p class="water-note"><strong>The equipment has to be sized for both the building's heating demand and domestic hot-water requirements.</strong> A combi boiler is not automatically the right choice for every home.</p>
        </article>
        <div class="water-dual-panel reveal">
          <article>
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("cycle")}</span>
            <h3>Potential Advantages</h3>
            ${waterHeatingList(["Compact equipment", "Fewer separate appliances", "Efficient modern designs"])}
          </article>
          <article>
            <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("controls")}</span>
            <h3>Potential Considerations</h3>
            ${waterHeatingList(["Proper sizing", "Domestic hot-water demand", "Heating load", "Controls", "Piping", "Maintenance"])}
          </article>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingInstallationSection() {
  return `
    <section class="section water-heating-section water-heating-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Water Heating Installation Actually Includes",
          text:
            "Water-heating installation is mechanical work. The details around venting, fuel, drainage, expansion and startup matter as much as the appliance itself.",
        })}
        <div class="water-install-grid">
          ${waterHeatingInstallationItems
            .map(
              ([title, text, icon]) => `
                <article class="water-technical-card reveal">
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(icon)}</span>
                  <h3>${escapeHtml(title)}</h3>
                  <p>${escapeHtml(text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingSafetySection() {
  return `
    <section class="section water-heating-section water-heating-safety-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Safety",
            title: "Water Heating Safety Matters",
            text:
              "Gas-fired and vented equipment must be approached carefully. Airrand evaluates the installation as a system instead of treating the appliance as a standalone box.",
          })}
          <p class="water-note">This is not DIY gas or venting advice. Site conditions and manufacturer requirements need to be reviewed by a qualified professional.</p>
        </article>
        <div class="water-safety-list reveal">
          ${waterHeatingSafetyItems
            .map(
              (item) => `
                <div>
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(item.includes("Carbon") ? "shield" : item.includes("Venting") ? "venting" : item.includes("Gas") ? "gas" : "tools")}</span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingDiagnosticsSection() {
  return `
    <section class="section water-heating-section water-heating-diagnostics-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Diagnostics",
          title: "Common Water Heating Problems",
          text:
            "These symptoms can have several possible causes and should be properly diagnosed before equipment or components are replaced.",
        })}
        <div class="water-problem-grid">
          ${waterHeatingProblems
            .map(
              (item) => `
                <article class="water-problem-tile reveal">
                  <span class="water-mini-icon" aria-hidden="true">${waterHeatingIcon(item.icon)}</span>
                  <div>
                    <small>${escapeHtml(item.group)}</small>
                    <strong>${escapeHtml(item.title)}</strong>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingScaleSection() {
  return `
    <section class="section water-heating-section water-heating-scale-section">
      <div class="container water-split-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Long-Term Performance",
            title: "Water Quality Can Affect Equipment",
            text:
              "Mineral buildup and scale can affect water-heating equipment over time. Maintenance needs can vary depending on equipment, water quality, usage and manufacturer requirements.",
          })}
        </article>
        <div class="water-scale-panel reveal">
          <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon("scale")}</span>
          <h3>Scale-sensitive areas</h3>
          ${waterHeatingList(["Tankless heat exchangers", "Boiler heat exchangers", "Fixtures", "Storage tanks"])}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingMaintenanceSection() {
  return `
    <section class="section water-heating-section water-heating-maintenance-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Maintenance",
          title: "Water Heating Equipment Needs Regular Care",
          text:
            "Maintenance is different for tanks, tankless units and boilers. The equipment type and manufacturer requirements should guide the service approach.",
        })}
        <div class="water-maintenance-grid">
          ${waterHeatingMaintenanceGroups
            .map(
              (group) => `
                <article class="water-maintenance-card reveal">
                  <span class="water-heating-icon" aria-hidden="true">${waterHeatingIcon(group.title.includes("Tankless") ? "tankless" : group.title.includes("Boiler") ? "boiler" : "tank")}</span>
                  <h3>${escapeHtml(group.title)}</h3>
                  ${waterHeatingList(group.items)}
                </article>
              `,
            )
            .join("")}
        </div>
        <div class="section-action">
          <a class="button button-primary" href="${link("/contact/")}">Book Water Heating Service</a>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingBrandsSection() {
  const brandCards = waterHeatingBrandSlugs.map((slug) => brandsBySlug.get(slug)).filter(Boolean);

  return `
    <section class="section water-heating-section water-heating-brands-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Brands",
          title: "Water Heating Equipment Options",
          text:
            "Airrand works with multiple equipment manufacturers so the system can be selected around the application, budget and project requirements.",
          align: "center",
        })}
        <ul class="water-brand-strip" aria-label="Water heating equipment brands">
          ${brandCards
            .map(
              (brand) => `
                <li class="brand-strip-card brand-${brand.slug}">
                  ${brandLogo(brand)}
                </li>
              `,
            )
            .join("")}
        </ul>
        <div class="section-action">
          <a class="button button-secondary" href="${link("/brands/")}">Explore All Brands</a>
        </div>
      </div>
    </section>
  `;
}

function waterHeatingWorkSection(work) {
  if (!work.photos.length) return "";
  const workTitle = "Recent Water Heating Installations";

  return `
    <section class="section gallery-section water-heating-work-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Recent Work",
          title: workTitle,
          text: "A look at recent Airrand water-heating installations throughout the GTA.",
        })}
        ${workSlider(work.photos, workTitle)}
      </div>
    </section>
  `;
}

function waterHeatingFaqSection(faqs) {
  return `
    <section class="section faq-section water-heating-faq-section">
      <div class="container faq-shell">
        ${sectionHeading({
          eyebrow: "FAQ",
          title: "Water Heating FAQ",
          text: "Common questions about tank water heaters, tankless systems, boilers, replacement and service in the Greater Toronto Area.",
          align: "center",
        })}
        <div class="faq-list">
          ${faqs
            .map(
              (faq) => `
                <details class="faq-item">
                  <summary><span>${escapeHtml(faq.question)}</span></summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function waterHeatingPage(service) {
  const work = servicePhotos(service);
  const faqs = serviceFaqs(service);
  const pageDescription =
    "Airrand installs and services tank water heaters, tankless systems and boilers for residential and light commercial properties throughout the Greater Toronto Area.";

  return {
    pathname: `/services/${service.slug}/`,
    title: "Water Heater, Tankless & Boiler Services GTA | Airrand",
    description: pageDescription,
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema({ ...service, title: "Water Heating", meta: pageDescription }),
      faqSchema(faqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: "Water Heating", url: `/services/${service.slug}/` },
      ]),
    ],
    body: `
      <section class="page-hero service-hero water-heating-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">Water Heating</p>
          <h1>Water Heating Solutions for the Greater Toronto Area</h1>
          <p>Airrand installs, replaces and services tank water heaters, tankless systems and boilers for residential and light commercial applications throughout the GTA.</p>
          ${ctaButtons()}
        </div>
      </section>
      ${waterHeatingOverviewSection(service)}
      ${waterHeatingOptionsSection()}
      ${waterHeatingSelectionSection()}
      ${waterHeatingTankSection()}
      ${waterHeatingReplacementSection()}
      ${waterHeatingTanklessSection()}
      ${waterHeatingComparisonSection()}
      ${waterHeatingBoilerSection()}
      ${waterHeatingBoilerVsSection()}
      ${waterHeatingCombiSection()}
      ${waterHeatingInstallationSection()}
      ${standardsStrip()}
      ${waterHeatingSafetySection()}
      ${waterHeatingDiagnosticsSection()}
      ${waterHeatingScaleSection()}
      ${waterHeatingMaintenanceSection()}
      ${waterHeatingBrandsSection()}
      ${waterHeatingWorkSection(work)}
      ${waterHeatingFaqSection(faqs)}
      ${finalCta({
        title: "Need help with water heating equipment?",
        text:
          "Share photos of the equipment, the property type and what is happening so Airrand can recommend the right next step.",
      })}
    `,
  };
}

const gasLineDesignFactors = [
  { title: "Appliance Input", text: "Connected equipment has specific fuel-demand requirements.", icon: "equipment" },
  { title: "Total Load", text: "New equipment can affect the entire connected gas system.", icon: "load" },
  { title: "Pipe Length", text: "Longer runs can change piping requirements.", icon: "route" },
  { title: "Pipe Diameter", text: "Pipe size must suit the connected load and system conditions.", icon: "sizing" },
  { title: "Fuel Type", text: "Natural gas and propane systems have different requirements.", icon: "flame" },
  { title: "Existing Capacity", text: "Existing piping should be reviewed before equipment is added.", icon: "meter" },
  { title: "Pressure", text: "Supply conditions affect gas-fired equipment performance.", icon: "pressure" },
  { title: "Fittings", text: "Turns and fittings are part of the overall piping design.", icon: "pipe" },
  { title: "Equipment Location", text: "Access, clearances and serviceability affect routing.", icon: "map" },
];

const gasLineApplications = [
  {
    title: "Furnaces",
    text: "Gas supply for residential and light-commercial heating equipment.",
    icon: "furnace",
  },
  {
    title: "Water Heaters",
    text: "Connections for conventional gas-fired water heaters.",
    icon: "tank",
  },
  {
    title: "Tankless Water Heaters",
    text: "Gas supply sized for higher-input tankless equipment where required.",
    icon: "tankless",
  },
  {
    title: "Boilers",
    text: "Gas piping for hydronic heating equipment.",
    icon: "boiler",
  },
  {
    title: "Gas Fireplaces",
    text: "New or replacement gas connections for approved fireplace installations.",
    icon: "fireplace",
  },
  {
    title: "Garage Heaters",
    text: "Gas piping for residential or light-commercial unit heaters.",
    icon: "garage",
  },
  {
    title: "Rooftop Units",
    text: "Commercial gas connections for packaged rooftop equipment.",
    icon: "rooftop",
  },
  {
    title: "Make-Up Air / Commercial Equipment",
    text: "Gas piping for mechanical systems where applicable.",
    icon: "commercial",
  },
];

const gasLineUpgradeTriggers = [
  { title: "Adding a tankless water heater", icon: "tankless" },
  { title: "Adding a gas fireplace", icon: "fireplace" },
  { title: "Installing a larger furnace", icon: "furnace" },
  { title: "Adding a garage heater", icon: "garage" },
  { title: "Adding commercial equipment", icon: "rooftop" },
  { title: "Replacing several appliances at once", icon: "connectedLoad" },
];

const gasLineInstallationItems = [
  ["Proper Sizing", "Gas piping should be sized for connected equipment and system conditions.", "sizing"],
  ["Approved Materials", "Use materials suitable for the application and installation location.", "materials"],
  ["Clean Routing", "Route piping logically and avoid unnecessary complexity.", "route"],
  ["Proper Supports", "Secure piping correctly and maintain a clean installation.", "support"],
  ["Shutoff Valves", "Provide accessible appliance shutoffs where required.", "valve"],
  ["Appliance Connections", "Make appropriate final connections to the equipment.", "connection"],
  ["Pressure Testing", "Test gas piping as required before placing the system into service.", "pressure"],
  ["Equipment Setup", "Verify appliance gas requirements and operation where part of the project.", "controls"],
  ["Final Inspection / Commissioning", "Complete checks before the installation is considered finished.", "commission"],
];

const gasLineCompleteSystems = [
  ["Gas Supply", "Fuel piping matched to the connected equipment.", "pipe"],
  ["Venting", "Exhaust routing appropriate for the appliance.", "venting"],
  ["Combustion Air", "Air requirements considered where applicable.", "air"],
  ["Drainage", "Condensate or relief drainage where equipment requires it.", "drainage"],
  ["Electrical", "Power and disconnect needs coordinated with the equipment.", "electrical"],
  ["Controls", "Thermostats, safeties and equipment controls set up correctly.", "controls"],
  ["Clearances", "Equipment and piping left serviceable and accessible.", "space"],
];

const gasLineMaterials = [
  ["Black Steel / Black Iron", "Common gas-piping material used in many mechanical installations.", "pipe"],
  ["CSST Where Permitted", "Corrugated stainless steel tubing may be used in approved applications.", "materials"],
  ["Approved Appliance Connectors", "Final appliance connections should suit the equipment and location.", "connection"],
  ["Other Approved Materials", "Some applications require materials selected for specific conditions.", "shield"],
];

const gasLineProblems = [
  { title: "Undersized piping", group: "Capacity", icon: "sizing" },
  { title: "Poor routing", group: "Workmanship", icon: "route" },
  { title: "Missing or inaccessible shutoffs", group: "Serviceability", icon: "valve" },
  { title: "Corrosion", group: "Condition", icon: "materials" },
  { title: "Unsupported pipe", group: "Installation", icon: "support" },
  { title: "Appliance relocation issues", group: "Planning", icon: "map" },
  { title: "Equipment added without reviewing total load", group: "System load", icon: "load" },
  { title: "Leaks / failed testing", group: "Verification", icon: "pressure" },
  { title: "Incorrect appliance connection", group: "Connection", icon: "connection" },
  { title: "Mechanical-room piping that restricts service access", group: "Access", icon: "space" },
];

const gasLineDemandReviewItems = [
  "Whether existing piping is adequate",
  "Whether a branch needs modification",
  "Whether the main gas line needs changes",
  "Whether equipment location affects routing",
];

const gasResidentialItems = [
  "Furnaces",
  "Water heaters",
  "Tankless",
  "Fireplaces",
  "Garage heaters",
  "Renovations",
  "Equipment relocation",
];

const gasCommercialItems = [
  "Rooftop equipment",
  "Make-up air units",
  "Boilers",
  "Mechanical rooms",
  "Gas-fired unit heaters",
  "Commercial water heating",
  "Equipment replacement",
];

const gasLineIcons = {
  meter: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="8" width="14" height="11" rx="2.5" />
      <path d="M8 8V5h8v3" />
      <path d="M9 13h6" />
      <path d="M10 16h4" />
      <path d="M3 13h2" />
      <path d="M19 13h2" />
    </svg>
  `,
  pipe: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10a4 4 0 0 1 4 4v4" />
      <path d="M4 16h9a5 5 0 0 0 5-5V8" />
      <path d="M18 8h2" />
      <path d="M18 16h2" />
    </svg>
  `,
  branch: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 12h6" />
      <path d="M10 12h10" />
      <path d="M10 12V6h7" />
      <path d="M10 12v6h7" />
      <circle cx="10" cy="12" r="1.5" />
    </svg>
  `,
  equipment: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h4" />
    </svg>
  `,
  valve: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 12h6" />
      <path d="M14 12h6" />
      <path d="M10 8h4v8h-4Z" />
      <path d="M9 6h6" />
      <path d="M12 6v2" />
    </svg>
  `,
  pressure: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M6 16a6 6 0 1 1 12 0" />
      <path d="M12 16l3-5" />
      <path d="M5 20h14" />
      <path d="M8 16h8" />
    </svg>
  `,
  venting: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 15h8a4 4 0 0 0 4-4V5" />
      <path d="M8 19h7a5 5 0 0 0 5-5V8" />
      <path d="M16 5h4" />
      <path d="M20 8h-4" />
    </svg>
  `,
  support: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 10h16" />
      <path d="M7 10v9" />
      <path d="M17 10v9" />
      <path d="M6 19h12" />
      <path d="M9 6h6" />
    </svg>
  `,
  route: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 18h5a4 4 0 0 0 4-4V9a3 3 0 0 1 3-3h2" />
      <circle cx="5" cy="18" r="1.5" />
      <circle cx="19" cy="6" r="1.5" />
      <path d="M9 12h5" />
    </svg>
  `,
  materials: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  `,
  connection: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 12h6" />
      <path d="M14 12h6" />
      <path d="M10 8h4v8h-4Z" />
      <path d="M7 9v6" />
      <path d="M17 9v6" />
    </svg>
  `,
  commission: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3 19 6v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6Z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  `,
  commercial: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M8 9h2" />
      <path d="M14 9h2" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M10 20v-4h4v4" />
    </svg>
  `,
  furnace: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 7h6" />
      <path d="M9 10h6" />
      <path d="M9 13h6" />
      <path d="M9 17h2" />
      <path d="M13 17h2" />
    </svg>
  `,
  rooftop: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 18h16" />
      <path d="M6 14h12v4H6Z" />
      <path d="M8 10h8v4H8Z" />
      <path d="M9 7h6" />
    </svg>
  `,
  fireplace: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 20V7h14v13" />
      <path d="M8 20v-8a4 4 0 0 1 8 0v8" />
      <path d="M12 17c1.3-.9 2-1.9 2-3.1 0-1.1-.7-2-1.5-2.8.1 1.4-1 2.1-1 3.1 0 .8.2 1.7.5 2.8Z" />
    </svg>
  `,
  garage: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M7 20v-7h10v7" />
      <path d="M9 16h6" />
    </svg>
  `,
  load: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 19V5" />
      <path d="M5 19h14" />
      <path d="M8 16h2" />
      <path d="M12 13h2" />
      <path d="M16 9h2" />
      <path d="M8 8l8 8" />
    </svg>
  `,
  connectedLoad: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="4" y="5" width="6" height="12" rx="1.6" />
      <rect x="14" y="4" width="6" height="13" rx="1.6" />
      <path d="M6.5 8h1" />
      <path d="M16.5 7h1" />
      <path d="M7 17v2" />
      <path d="M17 17v2" />
      <path d="M10 11h4" />
      <path d="M12 9v4" />
      <path d="M8 20h8" />
    </svg>
  `,
  air: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10a3 3 0 0 0 0-6" />
      <path d="M4 13h16" />
      <path d="M4 18h9a3 3 0 0 1 0 6" />
    </svg>
  `,
  electrical: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="m13 3-7 11h6l-1 7 7-11h-6Z" />
    </svg>
  `,
  spark: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M4.9 4.9l2.8 2.8" />
      <path d="M16.3 16.3l2.8 2.8" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M4.9 19.1l2.8-2.8" />
      <path d="M16.3 7.7l2.8-2.8" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  `,
  lockout: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="6" y="10" width="12" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2" />
    </svg>
  `,
  pulse: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 13h3l2-5 4 10 2-5h5" />
      <path d="M5 19h14" />
    </svg>
  `,
  drainage: () => waterHeatingIcon("drainage"),
  controls: () => waterHeatingIcon("controls"),
  tank: () => waterHeatingIcon("tank"),
  tankless: () => waterHeatingIcon("tankless"),
  boiler: () => waterHeatingIcon("boiler"),
  flame: () => heatingIcon("flame"),
  shield: () => waterHeatingIcon("shield"),
  safety: () => waterHeatingIcon("shield"),
  sizing: () => heatingIcon("sizing"),
  map: () => heatingIcon("map"),
  space: () => heatingIcon("home"),
};

function gasLineIcon(key) {
  const icon = gasLineIcons[key] ?? gasLineIcons.pipe;
  return typeof icon === "function" ? icon() : icon;
}

function gasLineList(items) {
  return `
    <ul class="gas-line-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function gasLineOverviewSection(service) {
  return `
    <section class="section gas-line-section gas-line-overview-section">
      <div class="container service-detail-grid">
        <article class="detail-copy">
          <p class="eyebrow">What Airrand Handles</p>
          <h2>Professional gas piping with sizing, routing and safety in mind.</h2>
          <p>Gas piping is not simply running a pipe from one point to another. The connected equipment, total fuel demand, route, material, supports, shutoffs, appliance requirements and testing all affect the final scope.</p>
          <p>Airrand handles new gas-line installations, extensions, modifications and replacement-equipment connections for appropriate residential and commercial HVAC and mechanical applications.</p>
          <ul class="check-list">
            ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <aside class="service-aside gas-line-aside">
          <h2>Common Applications</h2>
          <ul>
            ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <a class="button button-primary" href="${link("/contact/")}">Book Gas Service</a>
          <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
        </aside>
      </div>
    </section>
  `;
}

function gasLineDesignSection() {
  return `
    <section class="section gas-line-section gas-line-design-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Design",
          title: "Gas Lines Have to Match the Equipment They Serve",
          text:
            "Gas piping must be sized and routed based on the equipment connected to the system. Airrand reviews the practical requirements without turning the page into a DIY sizing guide.",
        })}
        <div class="gas-line-split gas-design-layout">
          <article class="gas-design-factors">
          <div class="gas-factor-grid">
            ${gasLineDesignFactors
              .map(
                (item) => `
                  <div class="gas-factor">
                    <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(item.icon)}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.text)}</small>
                  </div>
                `,
              )
              .join("")}
          </div>
          </article>
          <aside class="gas-design-diagram reveal" aria-label="Gas piping system diagram">
          <div class="gas-flow-panel">
            <div class="gas-flow-step">
              <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("meter")}</span>
              <strong>Gas Meter / Supply</strong>
            </div>
            <span class="gas-flow-arrow" aria-hidden="true">&rarr;</span>
            <div class="gas-flow-step">
              <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("pipe")}</span>
              <strong>Main Gas Line</strong>
            </div>
            <span class="gas-flow-arrow" aria-hidden="true">&rarr;</span>
            <div class="gas-flow-step">
              <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("branch")}</span>
              <strong>Branch Lines</strong>
            </div>
            <span class="gas-flow-arrow" aria-hidden="true">&rarr;</span>
            <div class="gas-flow-step gas-flow-step-warm">
              <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("equipment")}</span>
              <strong>Equipment</strong>
            </div>
          </div>
          <div class="gas-flow-callout">
            <span class="gas-mini-icon" aria-hidden="true">${gasLineIcon("load")}</span>
            <div>
              <strong>Adding new equipment can change the requirements of the existing gas system.</strong>
              <p>Existing piping should be evaluated before additional gas-fired equipment is connected.</p>
            </div>
          </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function gasLineApplicationsSection() {
  return `
    <section class="section gas-line-section gas-line-applications-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Common Applications",
          title: "Gas Piping for HVAC and Mechanical Equipment",
          text:
            "Airrand supports gas piping for equipment that needs a properly planned fuel supply, clear access and safe commissioning.",
        })}
        <div class="gas-application-grid">
          ${gasLineApplications
            .map(
              (item) => `
                <article class="gas-line-card reveal">
                  <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function gasLineCapacitySection() {
  return `
    <section class="section gas-line-section gas-line-capacity-section">
      <div class="container gas-line-split">
        <article>
          ${sectionHeading({
            eyebrow: "Capacity",
            title: "When Existing Gas Piping May Not Be Enough",
            text:
              "Replacing or adding equipment can change gas demand. The existing gas line should be evaluated for total connected load and system capacity before new equipment is added.",
          })}
          <a class="button button-primary" href="${link("/contact/")}">Have Airrand Evaluate Your Gas System</a>
        </article>
        <div class="gas-trigger-panel reveal">
          ${gasLineUpgradeTriggers
            .map(
              (item) => `
                <article class="gas-trigger-card">
                  <span class="gas-mini-icon" aria-hidden="true">${gasLineIcon(item.icon)}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function gasLineProjectTypesSection() {
  return `
    <section class="section gas-line-section gas-line-project-types-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Project Types",
          title: "New Gas Line or Existing-System Extension?",
          text:
            "Both project types need planning. The route, system capacity, supports, shutoffs and equipment requirements should be reviewed before installation.",
          align: "center",
        })}
        <div class="gas-dual-panel">
          <article class="gas-line-panel reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("pipe")}</span>
            <p class="eyebrow">New Gas Line</p>
            <h3>For new locations and new mechanical scope.</h3>
            ${gasLineList(["New equipment location", "Renovation", "Addition", "Mechanical room changes", "Commercial fit-out", "New gas appliance"])}
            <p>Routing, sizing, supports and shutoffs should be planned before installation.</p>
          </article>
          <article class="gas-line-panel gas-line-panel-warm reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("branch")}</span>
            <p class="eyebrow">Extend / Modify Existing Gas Line</p>
            <h3>For added, moved or replacement equipment.</h3>
            ${gasLineList(["New appliance added", "Equipment relocated", "Existing piping rerouted", "Replacement equipment has different requirements"])}
            <p>Existing pipe size and system capacity should be evaluated before extension.</p>
          </article>
        </div>
      </div>
    </section>
  `;
}

function gasLineInstallationSection() {
  return `
    <section class="section gas-line-section gas-line-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Gas Line Installation Actually Includes",
          text:
            "A professional gas-line installation is planned, supported, connected, tested and commissioned as part of the larger mechanical system.",
        })}
        <div class="gas-technical-grid">
          ${gasLineInstallationItems
            .map(
              ([title, text, icon]) => `
                <article class="gas-line-card reveal">
                  <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(icon)}</span>
                  <h3>${escapeHtml(title)}</h3>
                  <p>${escapeHtml(text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function gasLineTestingSection() {
  return `
    <section class="section gas-line-section gas-line-testing-section">
      <div class="container gas-line-split">
        <article>
          ${sectionHeading({
            eyebrow: "Verification",
            title: "Gas Piping Should Be Tested Before It Is Put Into Service",
            text:
              "New or modified gas piping needs to be checked for integrity before operation. Pressure testing confirms that the piping system holds appropriately before gas is introduced or equipment is operated.",
          })}
          <p class="gas-line-note">Testing requirements depend on the installation and applicable code requirements.</p>
        </article>
        <div class="gas-process-panel reveal" aria-label="Gas piping verification sequence">
          ${["Install", "Test", "Commission"]
            .map(
              (step, index) => `
                <div class="gas-process-step">
                  <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(index === 0 ? "pipe" : index === 1 ? "pressure" : "commission")}</span>
                  <strong>${escapeHtml(step)}</strong>
                </div>
              `,
            )
            .join('<span class="gas-flow-arrow" aria-hidden="true">&rarr;</span>')}
        </div>
      </div>
    </section>
  `;
}

function gasLinePerformanceSection() {
  const effects = [
    { title: "Poor burner performance", icon: "flame" },
    { title: "Ignition issues", icon: "spark" },
    { title: "Reduced equipment output", icon: "load" },
    { title: "Lockouts", icon: "lockout" },
    { title: "Unstable operation", icon: "pulse" },
  ];

  return `
    <section class="section gas-line-section gas-line-performance-section">
      <div class="container gas-line-split">
        <article>
          ${sectionHeading({
            eyebrow: "Equipment Performance",
            title: "Gas Supply Affects How Equipment Operates",
            text:
              "Gas-fired equipment depends on proper supply conditions. Gas pressure and appliance setup should be verified according to the specific equipment requirements.",
          })}
          <p class="gas-line-note">Airrand does not use universal pressure numbers as a substitute for reviewing the actual equipment and installation.</p>
        </article>
        <div class="gas-problem-list">
          ${effects
            .map(
              (item) => `
                <article class="gas-performance-card">
                  <span class="gas-mini-icon" aria-hidden="true">${gasLineIcon(item.icon)}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function gasLineCompleteSystemSection() {
  return `
    <section class="section gas-line-section gas-line-complete-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Complete Installation",
          title: "Gas Supply Is Only One Part of a Gas Appliance Installation",
          text:
            "A gas-fired appliance also depends on venting, combustion air, drainage where applicable, electrical, controls and equipment clearances.",
          align: "center",
        })}
        <div class="gas-system-map reveal">
          ${gasLineCompleteSystems
            .map(
              ([title, text, icon]) => `
                <article>
                  <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(icon)}</span>
                  <strong>${escapeHtml(title)}</strong>
                  <small>${escapeHtml(text)}</small>
                </article>
              `,
            )
            .join("")}
        </div>
        <p class="gas-summary-line"><strong>A properly sized gas line does not compensate for incorrect venting or equipment setup.</strong></p>
      </div>
    </section>
  `;
}

function gasLineMechanicalRoomSection(work) {
  const photo = work.photos[0] ?? {
    image: "work/homepage-gallery-mechanical-room.webp",
    alt: "Airrand mechanical room piping installation",
    category: "Gas Lines",
  };

  return `
    <section class="section gas-line-section gas-line-mechanical-room-section">
      <div class="container gas-line-photo-split">
        <article>
          ${sectionHeading({
            eyebrow: "Mechanical Rooms",
            title: "Clean Gas Piping Makes Mechanical Rooms Better",
            text:
              "Good mechanical-room piping should be straight, supported, serviceable, clearly routed, accessible and organized. The goal is a system that can be understood and serviced later.",
          })}
          <blockquote>Mechanical piping should look intentional, not improvised.</blockquote>
        </article>
        <figure class="gas-photo-panel reveal">
          <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="700" height="820">
          <figcaption>${escapeHtml(photo.category)} work from Airrand's project gallery.</figcaption>
        </figure>
      </div>
    </section>
  `;
}

function gasLineMaterialsSection() {
  return `
    <section class="section gas-line-section gas-line-materials-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Materials",
          title: "Different Applications May Use Different Gas-Piping Materials",
          text:
            "Depending on the installation, approved gas piping systems may use different materials. Selection depends on the location, application and applicable code requirements.",
        })}
        <div class="gas-material-grid">
          ${gasLineMaterials
            .map(
              ([title, text, icon]) => `
                <article class="gas-line-card reveal">
                  <span class="gas-line-icon" aria-hidden="true">${gasLineIcon(icon)}</span>
                  <h3>${escapeHtml(title)}</h3>
                  <p>${escapeHtml(text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
        <p class="gas-summary-line">The material selected must be appropriate for the location, application and applicable code requirements.</p>
      </div>
    </section>
  `;
}

function gasLineRoutingSection() {
  return `
    <section class="section gas-line-section gas-line-routing-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Routing",
          title: "Gas Piping Can Run Through Different Environments",
          text:
            "Indoor and outdoor gas piping have different practical considerations. Airrand keeps this review high-level for customers and confirms the technical details on site.",
          align: "center",
        })}
        <div class="gas-dual-panel">
          <article class="gas-line-panel reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("commercial")}</span>
            <p class="eyebrow">Indoor</p>
            <h3>Mechanical rooms and finished spaces.</h3>
            ${gasLineList(["Protection", "Supports", "Access", "Appliance location", "Mechanical-room layout"])}
          </article>
          <article class="gas-line-panel gas-line-panel-warm reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("route")}</span>
            <p class="eyebrow">Outdoor</p>
            <h3>Exterior routing and equipment locations.</h3>
            ${gasLineList(["Weather exposure", "Corrosion protection", "Supports", "Routing", "Equipment location"])}
          </article>
        </div>
      </div>
    </section>
  `;
}

function gasLineProblemsSection() {
  return `
    <section class="section gas-line-section gas-line-problems-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Diagnostics",
          title: "Common Gas-Piping Issues We Encounter",
          text:
            "These concerns should be evaluated by a qualified gas technician. The symptom is only the starting point for a proper review.",
        })}
        <div class="gas-problem-grid">
          ${gasLineProblems
            .map(
              (item) => `
                <article class="gas-problem-tile reveal">
                  <span class="gas-mini-icon" aria-hidden="true">${gasLineIcon(item.icon)}</span>
                  <div>
                    <small>${escapeHtml(item.group)}</small>
                    <strong>${escapeHtml(item.title)}</strong>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
        <p class="gas-summary-line">Gas-line concerns should be evaluated by a qualified gas technician.</p>
      </div>
    </section>
  `;
}

function gasLineLeakSafetySection() {
  return `
    <section class="section gas-line-section gas-line-leak-section">
      <div class="container gas-safety-panel reveal">
        <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("safety")}</span>
        <div>
          <p class="eyebrow">Safety</p>
          <h2>If You Suspect a Gas Leak</h2>
          ${gasLineList([
            "Do not operate electrical switches or create ignition sources.",
            "Leave the affected area.",
            "Contact the gas utility or emergency services as appropriate from a safe location.",
            "Do not attempt to locate or repair the leak yourself.",
          ])}
        </div>
      </div>
    </section>
  `;
}

function gasLineDemandSection() {
  return `
    <section class="section gas-line-section gas-line-demand-section">
      <div class="container gas-line-split">
        <article>
          ${sectionHeading({
            eyebrow: "Equipment Upgrades",
            title: "New Equipment Can Change Gas Demand",
            text:
              "Modern equipment may have different gas-input requirements than the equipment being replaced. High-input tankless units, larger furnaces, boilers, garage heaters and commercial rooftop equipment should be reviewed before connection.",
          })}
        </article>
        <div class="gas-review-panel reveal">
          <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("load")}</span>
          <h3>Airrand can evaluate</h3>
          ${gasLineList(gasLineDemandReviewItems)}
        </div>
      </div>
    </section>
  `;
}

function gasLineCapabilitySection() {
  return `
    <section class="section gas-line-section gas-line-capability-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Capability",
          title: "Residential Gas Work. Commercial Mechanical Capability.",
          text:
            "Airrand supports gas piping as part of practical residential work and broader commercial HVAC/mechanical scopes.",
          align: "center",
        })}
        <div class="gas-dual-panel">
          <article class="gas-line-panel reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("garage")}</span>
            <p class="eyebrow">Residential</p>
            <h3>Homes, renovations and equipment replacement.</h3>
            ${gasLineList(gasResidentialItems)}
          </article>
          <article class="gas-line-panel gas-line-panel-warm reveal">
            <span class="gas-line-icon" aria-hidden="true">${gasLineIcon("commercial")}</span>
            <p class="eyebrow">Commercial</p>
            <h3>Mechanical rooms and commercial HVAC equipment.</h3>
            ${gasLineList(gasCommercialItems)}
            <a class="button button-secondary" href="${link("/commercial/")}">Commercial HVAC</a>
          </article>
        </div>
      </div>
    </section>
  `;
}

function gasLineWorkSection(work) {
  if (!work.photos.length) return "";
  const workTitle = "Recent Gas Line Installations";

  return `
    <section class="section gallery-section gas-line-work-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Recent Work",
          title: workTitle,
          text: "A look at recent Airrand gas-piping and mechanical installations throughout the GTA.",
        })}
        ${workSlider(work.photos, workTitle)}
      </div>
    </section>
  `;
}

function gasLineFaqSection(faqs) {
  return `
    <section class="section faq-section gas-line-faq-section">
      <div class="container faq-shell">
        ${sectionHeading({
          eyebrow: "FAQ",
          title: "Gas Lines FAQ",
          text:
            "Common questions about gas-line installation, equipment connections, pressure testing and residential or commercial gas piping in the Greater Toronto Area.",
          align: "center",
        })}
        <div class="faq-list">
          ${faqs
            .map(
              (faq) => `
                <details class="faq-item">
                  <summary><span>${escapeHtml(faq.question)}</span></summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function gasLinesPage(service) {
  const work = servicePhotos(service);
  const faqs = serviceFaqs(service);
  const pageDescription =
    "Airrand provides professional gas-line installation and gas piping for furnaces, water heaters, tankless systems, fireplaces and HVAC equipment throughout the Greater Toronto Area.";

  return {
    pathname: `/services/${service.slug}/`,
    title: "Gas Line Installation & Gas Piping GTA | Airrand",
    description: pageDescription,
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema({ ...service, title: "Gas Line Installation", meta: pageDescription }),
      faqSchema(faqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: "Gas Lines", url: `/services/${service.slug}/` },
      ]),
    ],
    body: `
      <section class="page-hero service-hero gas-line-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">Gas Service</p>
          <h1>Gas Line Installation &amp; Service in the Greater Toronto Area</h1>
          <p>Airrand provides gas piping for HVAC equipment, water heating, fireplaces and other approved gas appliances with careful sizing, routing and clean workmanship.</p>
          ${ctaButtons()}
        </div>
      </section>
      ${gasLineOverviewSection(service)}
      ${standardsStrip()}
      ${gasLineDesignSection()}
      ${gasLineApplicationsSection()}
      ${gasLineCapacitySection()}
      ${gasLineProjectTypesSection()}
      ${gasLineInstallationSection()}
      ${gasLineTestingSection()}
      ${gasLinePerformanceSection()}
      ${gasLineCompleteSystemSection()}
      ${gasLineMechanicalRoomSection(work)}
      ${gasLineMaterialsSection()}
      ${gasLineRoutingSection()}
      ${gasLineProblemsSection()}
      ${gasLineLeakSafetySection()}
      ${gasLineDemandSection()}
      ${gasLineCapabilitySection()}
      ${gasLineWorkSection(work)}
      ${gasLineFaqSection(faqs)}
      ${finalCta({
        title: "Need gas piping reviewed or installed?",
        text:
          "Share the equipment, property type, location and photos so Airrand can review the gas-line scope and recommend the right next step.",
      })}
    `,
  };
}

const coolingWarningSigns = [
  {
    title: "Weak Airflow",
    text: "Reduced airflow from the vents can be related to filters, blower performance, ductwork or system setup.",
    icon: "airflow",
  },
  {
    title: "Warm Air",
    text: "If the system is running but not delivering proper cooling, the cause should be diagnosed before assuming replacement is needed.",
    icon: "temperature",
  },
  {
    title: "Frequent Cycling",
    text: "Repeated short cycles may indicate a control, airflow, sizing or equipment problem.",
    icon: "cycle",
  },
  {
    title: "Unusual Noise",
    text: "Grinding, rattling, buzzing or other new sounds may indicate mechanical or electrical issues.",
    icon: "noise",
  },
  {
    title: "Moisture or Drainage",
    text: "Cooling systems remove moisture from the air. Drainage issues should be addressed before they create water damage.",
    icon: "drainage",
  },
  {
    title: "Higher Energy Use",
    text: "A system working harder than normal may use more electricity and may indicate declining performance.",
    icon: "energy",
  },
];

const coolingRepairConsiderations = [
  "The system has generally been reliable",
  "The issue is isolated",
  "Major components are still in good condition",
  "The required repair is reasonable",
  "Cooling performance has otherwise been acceptable",
  "The equipment is compatible with the existing system",
];

const coolingReplacementConsiderations = [
  "Repairs are becoming frequent",
  "Major components are failing",
  "Cooling performance is inconsistent",
  "The equipment uses outdated or difficult-to-service components or refrigerant",
  "Efficiency is significantly lower than modern equipment",
  "The required repair cost is becoming substantial",
  "The existing system is poorly matched or improperly sized",
];

const coolingSystemComponents = [
  ["condenser", "Outdoor condenser"],
  ["coil", "Indoor evaporator coil"],
  ["blower", "Furnace or air handler blower"],
  ["refrigerant", "Refrigerant piping"],
  ["duct", "Ductwork"],
  ["controls", "Thermostat and controls"],
  ["drainage", "Condensate drainage"],
  ["electrical", "Electrical"],
  ["airflow", "Airflow setup"],
];

const coolingEquipmentOptions = [
  {
    title: "Proper Capacity",
    text:
      "The system should be sized for the building rather than automatically matching the old unit. Oversized equipment can cycle excessively and may not control humidity well.",
    icon: "sizing",
  },
  {
    title: "Efficiency",
    text:
      "Higher-efficiency systems can reduce electricity consumption, but the right level depends on usage, budget, building characteristics and compatibility.",
    icon: "energy",
  },
  {
    title: "Compressor Technology",
    text:
      "Single-stage systems run at full output, two-stage systems can operate at more than one capacity, and some premium AC systems offer variable capacity.",
    icon: "compressor",
  },
  {
    title: "Noise",
    text:
      "Equipment design, compressor technology, fan design, placement and installation details all influence perceived operating noise.",
    icon: "noise",
  },
  {
    title: "System Compatibility",
    text:
      "The condenser, evaporator coil, furnace or air handler and controls need to work together correctly.",
    icon: "controls",
  },
];

const coolingInstallationItems = [
  {
    title: "Proper Sizing",
    text: "Select equipment appropriate for the application.",
    icon: "sizing",
  },
  {
    title: "Coil Matching",
    text: "Ensure the indoor coil and outdoor equipment are properly matched.",
    icon: "coil",
  },
  {
    title: "Refrigerant Piping",
    text: "Install and route the refrigerant lines correctly.",
    icon: "refrigerant",
  },
  {
    title: "Vacuum & Dehydration",
    text: "Properly evacuate the refrigeration circuit before startup.",
    icon: "vacuum",
  },
  {
    title: "Refrigerant Setup",
    text: "Verify charge and operating conditions according to equipment requirements.",
    icon: "refrigerant",
  },
  {
    title: "Airflow",
    text: "Confirm appropriate airflow through the evaporator coil.",
    icon: "airflow",
  },
  {
    title: "Drainage",
    text: "Install condensate drainage correctly.",
    icon: "drainage",
  },
  {
    title: "Electrical",
    text: "Verify disconnects, wiring, breaker requirements and controls.",
    icon: "electrical",
  },
  {
    title: "Startup & Commissioning",
    text: "Operate the system and verify performance before completion.",
    icon: "commissioning",
  },
];

const coolingPerformanceFactors = [
  ["sizing", "Equipment Sizing", "Correct capacity matters for both comfort and system cycling."],
  ["airflow", "Airflow", "Cooling performance depends heavily on moving the correct amount of air."],
  ["duct", "Ductwork", "Leaks, restrictions and poorly designed duct systems can reduce comfort."],
  ["home", "Insulation & Building Load", "The home itself affects how hard the cooling system needs to work."],
  ["controls", "Thermostat Location", "Poor thermostat placement can affect how the system responds."],
  ["drainage", "Humidity", "Cooling involves both temperature and moisture removal."],
];

const coolingProblemItems = [
  "AC not turning on",
  "Outdoor unit not running",
  "Weak airflow",
  "Warm air from vents",
  "Frozen evaporator coil",
  "Frozen refrigerant line",
  "Water around the furnace or coil",
  "Breaker tripping",
  "Short cycling",
  "High operating noise",
  "Poor cooling on hot days",
  "Uneven temperatures",
];

const coolingRefrigerantChecks = [
  "Diagnose first",
  "Check system operation",
  "Confirm refrigerant condition",
  "Repair issues when appropriate",
  "Verify charge after service",
];

const coolingMaintenanceItems = [
  "Outdoor coil condition",
  "Electrical components",
  "Contactor",
  "Capacitor",
  "Condenser fan",
  "Refrigerant performance",
  "Evaporator airflow",
  "Filter condition",
  "Condensate drainage",
  "Thermostat operation",
  "General system performance",
];

function coolingIcon(key) {
  const icons = {
    airflow: () => heatingIcon("airflow"),
    blower: () => heatingIcon("blower"),
    coil: () => heatingIcon("duct"),
    commissioning: () => technicalSetupIcon("Commissioning"),
    compressor: () => heatingIcon("staging"),
    condenser: () => heatingIcon("blower"),
    controls: () => technicalSetupIcon("Controls"),
    cycle: () => heatingIcon("cycle"),
    drainage: () => technicalSetupIcon("Drainage"),
    duct: () => heatingIcon("duct"),
    electrical: () => technicalSetupIcon("Electrical"),
    energy: () => heatingIcon("energy"),
    home: () => heatingIcon("home"),
    noise: () => heatingIcon("noise"),
    refrigerant: () => technicalSetupIcon("Refrigerant setup"),
    sizing: () => technicalSetupIcon("Proper sizing"),
    temperature: () => heatingIcon("temperature"),
    vacuum: () => technicalSetupIcon("Commissioning"),
  };

  return (icons[key] ?? (() => heatingIcon("tools")))();
}

function coolingWarningSignsSection() {
  return `
    <section class="section cooling-section cooling-warning-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Cooling Warning Signs",
          title: "Signs Your Air Conditioner May Need Service",
          text:
            "Cooling symptoms can have several possible causes. These warning signs are worth checking before a small issue turns into an uncomfortable house.",
        })}
        <div class="cooling-warning-grid">
          ${coolingWarningSigns
            .map(
              (item) => `
                <article class="cooling-card reveal">
                  <span class="cooling-icon" aria-hidden="true">${coolingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingRepairReplaceSection() {
  return `
    <section class="section cooling-section cooling-decision-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Repair vs Replacement",
          title: "Should You Repair or Replace Your Air Conditioner?",
          text:
            "The right choice depends on the system condition, age, efficiency, repair history and the cost of the required repair.",
        })}
        <div class="cooling-decision-grid">
          <article class="cooling-decision-panel reveal">
            <span class="cooling-panel-label">Repair May Make Sense When</span>
            <ul>
              ${coolingRepairConsiderations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <article class="cooling-decision-panel cooling-decision-panel-replace reveal">
            <span class="cooling-panel-label">Replacement May Be Worth Considering When</span>
            <ul>
              ${coolingReplacementConsiderations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        </div>
        <div class="section-action">
          <a class="button button-primary" href="${link("/contact/")}">Have Airrand Assess Your System</a>
        </div>
      </div>
    </section>
  `;
}

function coolingSystemSection() {
  return `
    <section class="section cooling-system-section">
      <div class="container cooling-system-grid">
        <article class="cooling-system-copy">
          ${sectionHeading({
            eyebrow: "System Performance",
            title: "Good Cooling Is More Than a Condenser Outside",
            text:
              "A new condenser cannot correct poor airflow, an undersized duct system, an incompatible coil or improper system setup. Airrand evaluates the cooling system as a complete package.",
          })}
          <p>The outdoor unit is only one part of the cooling system. Central AC performance depends on the equipment, airflow path, refrigerant circuit, controls, drainage and electrical setup working together.</p>
        </article>
        <div class="cooling-component-map" aria-label="Central air conditioning system components">
          <div class="cooling-component-center">
            <strong>Complete Cooling System</strong>
            <span>Not just the outdoor box</span>
          </div>
          ${coolingSystemComponents
            .map(
              ([icon, label], index) => `
                <div class="cooling-component" style="--component-index: ${index}">
                  <span class="cooling-icon" aria-hidden="true">${coolingIcon(icon)}</span>
                  <strong>${escapeHtml(label)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingEquipmentSection() {
  return `
    <section class="section cooling-section cooling-equipment-section">
      <div class="container cooling-equipment-layout">
        <div class="cooling-equipment-copy">
          ${sectionHeading({
            eyebrow: "Equipment Selection",
            title: "Choosing the Right Air Conditioner",
            text:
              "Choosing equipment involves more than selecting a brand. Capacity, efficiency, compressor design, noise and system compatibility all affect the result.",
          })}
          <a class="button button-secondary" href="${link("/brands/")}">Explore Equipment Brands</a>
        </div>
        <div class="cooling-equipment-grid">
          ${coolingEquipmentOptions
            .map(
              (item) => `
                <article class="cooling-card cooling-option-card reveal">
                  <span class="cooling-icon" aria-hidden="true">${coolingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingInstallationSection() {
  return `
    <section class="section cooling-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Air Conditioning Installation Actually Includes",
          text:
            "A good AC installation is a technical setup. Airrand focuses on the details that affect cooling performance, reliability, drainage, airflow and serviceability.",
          align: "center",
        })}
        <div class="cooling-installation-grid">
          ${coolingInstallationItems
            .map(
              (item) => `
                <article class="cooling-install-card reveal">
                  <span class="cooling-icon" aria-hidden="true">${coolingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingPerformanceSection() {
  return `
    <section class="section cooling-section cooling-performance-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Comfort",
          title: "What Affects How Well Your Home Cools?",
          text:
            "Cooling comfort depends on the full home and HVAC system. Equipment selection matters, but so do airflow, ductwork, thermostat location and humidity.",
        })}
        <div class="cooling-performance-grid">
          ${coolingPerformanceFactors
            .map(
              ([icon, title, text]) => `
                <article class="cooling-performance-item reveal">
                  <span class="cooling-icon" aria-hidden="true">${coolingIcon(icon)}</span>
                  <div>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingDiagnosticsSection() {
  return `
    <section class="section cooling-diagnostics-section">
      <div class="container cooling-diagnostics-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Diagnostics",
            title: "Common Cooling Problems",
            text:
              "These symptoms can have several possible causes and should be properly diagnosed before parts or refrigerant are added.",
          })}
        </article>
        <div class="cooling-problem-list">
          ${coolingProblemItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingRefrigerantSection() {
  return `
    <section class="section cooling-refrigerant-section">
      <div class="container cooling-refrigerant-panel">
        <div>
          <p class="eyebrow">Refrigeration</p>
          <h2>Refrigerant Is Not Something an AC Should Regularly Use Up</h2>
          <p>A sealed air conditioning system should not normally require refrigerant to be added every season. If refrigerant is low, the system should be evaluated for the cause rather than automatically being topped up.</p>
        </div>
        <div class="cooling-refrigerant-checks" aria-label="Refrigerant service approach">
          ${coolingRefrigerantChecks
            .map(
              (item) => `
                <div>
                  <span aria-hidden="true"></span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingMaintenanceSection() {
  return `
    <section class="section cooling-section cooling-maintenance-section">
      <div class="container cooling-maintenance-layout">
        <div>
          ${sectionHeading({
            eyebrow: "Maintenance",
            title: "Seasonal Maintenance Helps Keep Cooling Reliable",
            text:
              "AC maintenance gives the equipment a practical seasonal review. It can catch some issues earlier, but no maintenance visit can prevent every possible failure.",
          })}
          <a class="button button-primary" href="${link("/contact/")}">Book AC Maintenance</a>
        </div>
        <div class="cooling-maintenance-grid" aria-label="Air conditioning maintenance checklist">
          ${coolingMaintenanceItems
            .map(
              (item) => `
                <div class="cooling-maintenance-card">
                  <span aria-hidden="true"></span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function coolingEducationSections() {
  return `
    ${coolingWarningSignsSection()}
    ${coolingRepairReplaceSection()}
    ${coolingSystemSection()}
    ${coolingEquipmentSection()}
    ${coolingInstallationSection()}
    ${coolingPerformanceSection()}
    ${coolingDiagnosticsSection()}
    ${coolingRefrigerantSection()}
    ${coolingMaintenanceSection()}
  `;
}

const heatPumpFitItems = [
  {
    title: "Existing Ductwork",
    text: "Central heat pumps need an air-distribution system capable of handling the required airflow.",
    icon: "duct",
  },
  {
    title: "Existing Furnace",
    text: "Some homes can integrate a heat pump with an existing furnace depending on compatibility and system condition.",
    icon: "flame",
  },
  {
    title: "Electrical Capacity",
    text: "Heat-pump equipment and related components need appropriate electrical service.",
    icon: "electrical",
  },
  {
    title: "Home Heat Loss",
    text: "Insulation, windows, air leakage and heating load affect equipment selection.",
    icon: "home",
  },
  {
    title: "Comfort Priorities",
    text: "Customers may prioritize efficiency, lower gas use, cooling performance or more precise temperature control.",
    icon: "controls",
  },
  {
    title: "Budget",
    text: "Heat-pump systems range from practical equipment to more advanced inverter-driven systems.",
    icon: "energy",
  },
];

const heatPumpEquipmentOptions = [
  {
    title: "Capacity",
    text: "Equipment needs to be selected based on the building and expected heating and cooling load.",
    icon: "sizing",
  },
  {
    title: "Cold-Climate Performance",
    text: "Different systems maintain different levels of heating capacity as outdoor temperatures fall.",
    icon: "temperature",
  },
  {
    title: "Efficiency",
    text: "Heating and cooling efficiency ratings vary between models, but selection should stay practical and application-specific.",
    icon: "energy",
  },
  {
    title: "Compressor Technology",
    text:
      "Single or two-stage systems use more conventional steps. Inverter or variable-capacity systems can adjust output more gradually based on demand.",
    icon: "compressor",
  },
  {
    title: "Controls & Compatibility",
    text: "Controls need to coordinate the heat pump, indoor equipment, furnace if applicable, thermostat and auxiliary heat.",
    icon: "controls",
  },
];

const heatPumpInstallationItems = [
  {
    title: "Equipment Sizing",
    text: "Select appropriate heating and cooling capacity for the application.",
    icon: "sizing",
  },
  {
    title: "Indoor / Outdoor Matching",
    text: "Ensure the indoor coil or air handler is properly matched to the outdoor unit.",
    icon: "coil",
  },
  {
    title: "Refrigerant Piping",
    text: "Correctly install, route and insulate the refrigeration lines.",
    icon: "refrigerant",
  },
  {
    title: "Vacuum & Dehydration",
    text: "Properly evacuate the refrigeration system before startup.",
    icon: "vacuum",
  },
  {
    title: "Refrigerant Setup",
    text: "Verify charge and operating conditions according to manufacturer requirements.",
    icon: "refrigerant",
  },
  {
    title: "Airflow",
    text: "Confirm proper airflow through the indoor equipment and duct system.",
    icon: "airflow",
  },
  {
    title: "Electrical",
    text: "Verify breaker, disconnect, wiring and controls.",
    icon: "electrical",
  },
  {
    title: "Drainage",
    text: "Install condensate drainage correctly.",
    icon: "drainage",
  },
  {
    title: "Commissioning",
    text: "Test both heating and cooling operation before completion.",
    icon: "commissioning",
  },
];

const heatPumpSystemComponents = [
  ["condenser", "Outdoor heat pump"],
  ["coil", "Indoor coil or air handler"],
  ["flame", "Furnace if hybrid"],
  ["duct", "Ductwork"],
  ["airflow", "Airflow"],
  ["controls", "Thermostat and controls"],
  ["refrigerant", "Refrigerant piping"],
  ["home", "Building load"],
];

const heatPumpProblems = [
  "Not heating",
  "Not cooling",
  "Outdoor unit not operating",
  "Excessive ice buildup",
  "System stuck in one mode",
  "Weak airflow",
  "Frequent cycling",
  "Unusual noise",
  "Breaker tripping",
  "Poor heating performance",
  "Thermostat or control issues",
  "Auxiliary or furnace heat not operating correctly",
];

const heatPumpMaintenanceItems = [
  "Outdoor coil condition",
  "Indoor airflow",
  "Filter condition",
  "Refrigerant performance",
  "Electrical components",
  "Condensate drainage",
  "Thermostat / controls",
  "Defrost operation",
  "Outdoor fan",
  "Indoor blower",
  "General heating and cooling performance",
];

function heatPumpIcon(key) {
  if (key === "flame") return heatingIcon("flame");
  return coolingIcon(key);
}

function heatPumpBasicsSection() {
  return `
    <section class="section heat-pump-section heat-pump-basics-section">
      <div class="container heat-pump-basics-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Heat Pump Basics",
            title: "Heating and Cooling From the Same System",
            text:
              "A heat pump moves heat rather than creating all of its heat through combustion. In cooling mode, it moves heat from inside the building to the outdoors. In heating mode, the refrigeration cycle reverses and transfers available heat from outdoor air into the building.",
          })}
          <div class="heat-pump-callout">One outdoor system can provide both heating and cooling.</div>
        </article>
        <div class="heat-pump-mode-visual" aria-label="Heat pump heating and cooling modes">
          <article class="heat-pump-mode-card heat-pump-mode-cooling">
            <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon("airflow")}</span>
            <p class="eyebrow">Summer</p>
            <h3>Cooling Mode</h3>
            <strong>Inside heat -> Outside</strong>
          </article>
          <article class="heat-pump-mode-card heat-pump-mode-heating">
            <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon("flame")}</span>
            <p class="eyebrow">Winter</p>
            <h3>Heating Mode</h3>
            <strong>Outside heat -> Inside</strong>
          </article>
        </div>
      </div>
    </section>
  `;
}

function heatPumpWinterSection() {
  return `
    <section class="section heat-pump-winter-section">
      <div class="container heat-pump-winter-grid">
        <div class="heat-pump-winter-panel">
          <p class="eyebrow">Cold-Weather Performance</p>
          <h2>Do Heat Pumps Work in Ontario Winters?</h2>
          <p>Modern heat pumps can provide useful heating at low outdoor temperatures, but actual performance depends on equipment design, outdoor temperature, system sizing, building heat loss, installation and controls.</p>
          <p>Heat-pump capacity and efficiency generally change as outdoor temperature drops. Cold-climate capability varies by manufacturer and model, which is one reason proper equipment selection matters.</p>
        </div>
        <div class="heat-pump-factor-list" aria-label="Cold weather heat pump performance factors">
          {items}
        </div>
      </div>
    </section>
  `.replace(
    "{items}",
    ["Equipment design", "Outdoor temperature", "System sizing", "Building heat loss", "Installation", "Controls"]
      .map(
        (item) => `
          <div>
            <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon(item === "Outdoor temperature" ? "temperature" : item === "Controls" ? "controls" : "sizing")}</span>
            <strong>${escapeHtml(item)}</strong>
          </div>
        `,
      )
      .join(""),
  );
}

function heatPumpHybridSection() {
  return `
    <section class="section heat-pump-section heat-pump-hybrid-section">
      <div class="container heat-pump-hybrid-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Hybrid Heating",
            title: "Heat Pump + Furnace: A Flexible Ontario Setup",
            text:
              "A heat pump can handle much of the home's heating and cooling while an existing or new gas furnace provides supplemental or backup heating when appropriate.",
          })}
          <p>The switchover strategy depends on equipment, controls, energy costs, outdoor temperature and building requirements. Airrand avoids one-size-fits-all switchover rules.</p>
          <a class="button button-primary" href="${link("/contact/")}">Ask About Hybrid Heating</a>
        </article>
        <div class="heat-pump-hybrid-flow" aria-label="Hybrid heat pump and furnace flow">
          <div>
            <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon("airflow")}</span>
            <small>Milder Weather</small>
            <strong>Heat Pump</strong>
            <em>Primary heating</em>
          </div>
          <span class="heat-pump-flow-arrow" aria-hidden="true"></span>
          <div class="heat-pump-hybrid-furnace">
            <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon("flame")}</span>
            <small>Colder Conditions / Higher Demand</small>
            <strong>Furnace Support</strong>
            <em>Supplemental or backup heat</em>
          </div>
        </div>
      </div>
    </section>
  `;
}

function heatPumpFitSection() {
  return `
    <section class="section heat-pump-fit-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Fit",
          title: "Is a Heat Pump Right for Your Home?",
          text:
            "A heat pump should be evaluated as part of the whole home and HVAC system. The right answer depends on the building, ductwork, furnace, electrical capacity and comfort goals.",
        })}
        <div class="heat-pump-card-grid">
          ${heatPumpFitItems
            .map(
              (item) => `
                <article class="heat-pump-card reveal">
                  <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpSelectionSection() {
  return `
    <section class="section heat-pump-section heat-pump-selection-section">
      <div class="container heat-pump-selection-layout">
        <div class="heat-pump-sticky-copy">
          ${sectionHeading({
            eyebrow: "Equipment Selection",
            title: "Choosing the Right Heat Pump",
            text:
              "Not all heat pumps are the same. Capacity, cold-weather performance, efficiency, compressor technology and controls all affect whether a system is a good fit.",
          })}
          <a class="button button-secondary" href="${link("/brands/")}">Explore Equipment Brands</a>
        </div>
        <div class="heat-pump-selection-grid">
          ${heatPumpEquipmentOptions
            .map(
              (item) => `
                <article class="heat-pump-card reveal">
                  <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpInstallationSection() {
  return `
    <section class="section heat-pump-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Heat Pump Installation Actually Includes",
          text:
            "A heat-pump installation needs careful equipment matching, refrigerant setup, airflow, controls and commissioning in both heating and cooling modes.",
          align: "center",
        })}
        <div class="heat-pump-installation-grid">
          ${heatPumpInstallationItems
            .map(
              (item) => `
                <article class="heat-pump-install-card reveal">
                  <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpSystemSection() {
  return `
    <section class="section heat-pump-system-section">
      <div class="container heat-pump-system-grid">
        <article>
          ${sectionHeading({
            eyebrow: "System Performance",
            title: "The Outdoor Unit Is Only Part of the System",
            text:
              "A high-end outdoor unit cannot compensate for poor airflow, incompatible indoor equipment or incorrect control setup. Airrand evaluates the complete system rather than treating the outdoor heat pump as an isolated piece of equipment.",
          })}
        </article>
        <div class="heat-pump-system-map" aria-label="Heat pump complete system components">
          ${heatPumpSystemComponents
            .map(
              ([icon, label]) => `
                <div>
                  <span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon(icon)}</span>
                  <strong>${escapeHtml(label)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpEfficiencyCapacitySection() {
  return `
    <section class="section heat-pump-section heat-pump-efficiency-section">
      <div class="container heat-pump-efficiency-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Performance",
            title: "Efficiency and Heating Capacity Are Not the Same Thing",
            text:
              "A heat pump can remain efficient while its available heating capacity changes with outdoor temperature. Equipment selection for a GTA home should consider both, not one efficiency number alone.",
          })}
        </article>
        <div class="heat-pump-indicators">
          <div>
            <span>Efficiency</span>
            <strong>How effectively energy is used</strong>
          </div>
          <div>
            <span>Available Heating Capacity</span>
            <strong>How much heat the system can deliver</strong>
          </div>
        </div>
      </div>
    </section>
  `;
}

function heatPumpDefrostSection() {
  return `
    <section class="section heat-pump-defrost-section">
      <div class="container heat-pump-defrost-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Normal Operation",
            title: "What Is Heat Pump Defrost Mode?",
            text:
              "During cold weather, frost can form on the outdoor coil. The heat pump may temporarily enter a defrost cycle to remove that frost.",
          })}
          <p>A brief defrost cycle is normal heat-pump operation and does not automatically mean the system is malfunctioning.</p>
        </article>
        <div class="heat-pump-defrost-list">
          ${["The outdoor unit may produce steam", "The fan may temporarily stop", "Operation may sound different", "Supplemental heat may operate depending on system configuration"]
            .map((item) => `<div><span class="heat-pump-icon" aria-hidden="true">${heatPumpIcon("temperature")}</span><strong>${escapeHtml(item)}</strong></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpComparisonSection() {
  return `
    <section class="section heat-pump-comparison-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Types",
          title: "Heat Pump vs. Air Conditioner and Gas Furnace",
          text:
            "A heat pump is not automatically better for every home. It should be compared against the existing cooling and heating strategy.",
        })}
        <div class="heat-pump-comparison-grid">
          <article class="heat-pump-comparison-card">
            <p class="eyebrow">Heat Pump vs. Air Conditioner</p>
            <div class="heat-pump-mini-compare">
              <div>
                <h3>Air Conditioner</h3>
                <p><strong>Cooling:</strong> Yes</p>
                <p><strong>Heating:</strong> No, requires separate heating equipment</p>
                <p><strong>Primary Role:</strong> Cooling</p>
              </div>
              <div>
                <h3>Heat Pump</h3>
                <p><strong>Cooling:</strong> Yes</p>
                <p><strong>Heating:</strong> Yes</p>
                <p><strong>Primary Role:</strong> Heating + cooling</p>
              </div>
            </div>
            <p>Both use refrigeration technology for cooling. A heat pump adds the ability to reverse the refrigeration cycle and provide heating.</p>
            <a class="button button-secondary" href="${link("/services/air-conditioning/")}">View Air Conditioning Services</a>
          </article>
          <article class="heat-pump-comparison-card heat-pump-comparison-card-warm">
            <p class="eyebrow">Heat Pump vs. Gas Furnace</p>
            <div class="heat-pump-mini-compare">
              <div>
                <h3>Heat Pump</h3>
                <p>Transfers heat</p>
                <p>Provides heating and cooling</p>
                <p>Uses electricity</p>
                <p>Performance changes with outdoor conditions</p>
              </div>
              <div>
                <h3>Gas Furnace</h3>
                <p>Creates heat through combustion</p>
                <p>Provides heating only</p>
                <p>Uses natural gas or fuel</p>
                <p>Can deliver strong heating output in cold weather</p>
              </div>
            </div>
            <p><strong>Many GTA homes can also use both technologies together in a hybrid system.</strong></p>
          </article>
        </div>
      </div>
    </section>
  `;
}

function heatPumpDiagnosticsSection() {
  return `
    <section class="section heat-pump-diagnostics-section">
      <div class="container heat-pump-diagnostics-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Diagnostics",
            title: "Common Heat Pump Problems",
            text:
              "These symptoms can have several possible causes and should be properly diagnosed before parts or refrigerant are added.",
          })}
        </article>
        <div class="heat-pump-problem-list">
          ${heatPumpProblems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpMaintenanceSection() {
  return `
    <section class="section heat-pump-section heat-pump-maintenance-section">
      <div class="container heat-pump-maintenance-layout">
        <div>
          ${sectionHeading({
            eyebrow: "Maintenance",
            title: "Heat Pumps Work Year-Round",
            text:
              "Because a heat pump may operate during both heating and cooling seasons, it can accumulate more annual operating hours than a conventional air conditioner. Maintenance helps keep the system reviewed, but it cannot prevent every failure.",
          })}
          <a class="button button-primary" href="${link("/contact/")}">Book Heat Pump Service</a>
        </div>
        <div class="heat-pump-maintenance-grid" aria-label="Heat pump maintenance checklist">
          ${heatPumpMaintenanceItems
            .map(
              (item) => `
                <div class="heat-pump-maintenance-card">
                  <span aria-hidden="true"></span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatPumpEducationSections() {
  return `
    ${heatPumpBasicsSection()}
    ${heatPumpWinterSection()}
    ${heatPumpHybridSection()}
    ${heatPumpFitSection()}
    ${heatPumpSelectionSection()}
    ${heatPumpInstallationSection()}
    ${heatPumpSystemSection()}
    ${heatPumpEfficiencyCapacitySection()}
    ${heatPumpDefrostSection()}
    ${heatPumpComparisonSection()}
    ${heatPumpDiagnosticsSection()}
    ${heatPumpMaintenanceSection()}
  `;
}

const ductlessApplications = [
  {
    title: "Additions",
    text: "Useful when extending the existing duct system is difficult or impractical.",
    icon: "home",
  },
  {
    title: "Basements",
    text: "Can provide dedicated temperature control for finished basement spaces.",
    icon: "temperature",
  },
  {
    title: "Garages",
    text: "Suitable for conditioned garages or workshops where appropriate.",
    icon: "tools",
  },
  {
    title: "Offices",
    text: "Allows individual temperature control for smaller commercial or office spaces.",
    icon: "controls",
  },
  {
    title: "Older Homes",
    text: "Can add heating and cooling without major duct renovations.",
    icon: "home",
  },
  {
    title: "Problem Rooms",
    text: "Useful for rooms that remain too hot or too cold compared with the rest of the building.",
    icon: "airflow",
  },
];

const ductlessSystemDesignItems = [
  "Outdoor unit capacity",
  "Indoor unit combinations",
  "Simultaneous load",
  "Room sizes",
  "Diversity",
  "Line-set lengths",
  "Elevation differences",
  "Manufacturer combination rules",
];

const ductlessPlacementItems = [
  "Clear airflow path",
  "Appropriate wall height",
  "Service access",
  "Furniture placement",
  "Direct airflow exposure",
  "Drain routing",
  "Exterior wall access where possible",
];

const ductlessInstallationItems = [
  {
    title: "Equipment Sizing",
    text: "Select indoor and outdoor equipment appropriate for the space and application.",
    icon: "sizing",
  },
  {
    title: "Indoor Unit Placement",
    text: "Choose locations that support effective airflow and serviceability.",
    icon: "placement",
  },
  {
    title: "Refrigerant Piping",
    text: "Install, route and insulate the refrigerant lines correctly.",
    icon: "refrigerant",
  },
  {
    title: "Vacuum & Dehydration",
    text: "Properly evacuate the refrigeration circuit before startup.",
    icon: "vacuum",
  },
  {
    title: "Condensate Drainage",
    text: "Provide reliable drainage from indoor units.",
    icon: "drainage",
  },
  {
    title: "Electrical",
    text: "Verify disconnects, wiring, breakers and communication connections.",
    icon: "electrical",
  },
  {
    title: "Outdoor Unit Placement",
    text: "Provide adequate airflow, clearance and service access.",
    icon: "outdoor",
  },
  {
    title: "Controls",
    text: "Configure remotes, wired controllers or compatible smart controls as required.",
    icon: "controls",
  },
  {
    title: "Commissioning",
    text: "Test operation, temperatures, drainage, controls and system response before completion.",
    icon: "commissioning",
  },
];

const ductlessProblems = [
  "Indoor unit not cooling",
  "Indoor unit not heating",
  "Outdoor unit not running",
  "Water leaking from indoor head",
  "Weak airflow",
  "Ice buildup",
  "Error codes",
  "Remote or controller problems",
  "Unusual noise",
  "One zone not operating properly",
  "Communication faults",
  "Breaker tripping",
];

const ductlessMaintenanceItems = [
  "Indoor filters",
  "Indoor coil condition",
  "Blower wheel condition",
  "Condensate drainage",
  "Outdoor coil",
  "Electrical components",
  "Refrigerant performance",
  "Line-set condition",
  "Controls",
  "Heating and cooling performance",
];

const ductlessControlItems = [
  "Handheld remotes",
  "Wired controllers",
  "Wi-Fi control",
  "Manufacturer apps",
  "Smart-home integration",
  "Room temperature sensing",
];

const ductlessIcons = {
  indoor: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="4" y="5" width="16" height="6" rx="2" />
      <path d="M7 14h10" />
      <path d="M8 17h8" />
      <path d="M10 20h4" />
    </svg>
  `,
  outdoor: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9c2.3-1.6 4.5-.2 4.5 2.1" />
      <path d="M14.6 13.5c.1 2.8-2.2 4-4 2.8" />
      <path d="M9.4 13.5c-2.5-1.2-2.3-3.8-.4-4.7" />
    </svg>
  `,
  lines: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 7h10a4 4 0 0 1 4 4v6" />
      <path d="M4 12h8a3 3 0 0 1 3 3v4" />
      <path d="M4 17h5" />
    </svg>
  `,
  room: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M8 20v-6h8v6" />
      <path d="M8 9h8" />
    </svg>
  `,
  wifi: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 9a12 12 0 0 1 16 0" />
      <path d="M7 12a7.5 7.5 0 0 1 10 0" />
      <path d="M10 15a3 3 0 0 1 4 0" />
      <path d="M12 18h.01" />
    </svg>
  `,
  zone: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="4" y="5" width="6" height="6" rx="1" />
      <rect x="14" y="5" width="6" height="6" rx="1" />
      <rect x="4" y="15" width="6" height="4" rx="1" />
      <rect x="14" y="15" width="6" height="4" rx="1" />
    </svg>
  `,
};

function ductlessIcon(key) {
  const icons = {
    airflow: () => heatingIcon("airflow"),
    commissioning: () => technicalSetupIcon("Commissioning"),
    controls: () => technicalSetupIcon("Controls"),
    drainage: () => technicalSetupIcon("Drainage"),
    electrical: () => technicalSetupIcon("Electrical"),
    energy: () => heatingIcon("energy"),
    flame: () => heatingIcon("flame"),
    home: () => heatingIcon("home"),
    indoor: () => ductlessIcons.indoor,
    lines: () => ductlessIcons.lines,
    outdoor: () => ductlessIcons.outdoor,
    placement: () => ductlessIcons.room,
    refrigerant: () => technicalSetupIcon("Refrigerant setup"),
    room: () => ductlessIcons.room,
    sizing: () => technicalSetupIcon("Proper sizing"),
    temperature: () => heatingIcon("temperature"),
    tools: () => heatingIcon("tools"),
    vacuum: () => technicalSetupIcon("Commissioning"),
    wifi: () => ductlessIcons.wifi,
    zone: () => ductlessIcons.zone,
  };

  const svg = (icons[key] ?? (() => heatingIcon("tools")))();
  return svg.replace(
    /<svg\s+/,
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ',
  );
}

function ductlessCard(item, className = "ductless-card") {
  return `
    <article class="${className} reveal">
      <span class="ductless-icon" aria-hidden="true">${ductlessIcon(item.icon)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `;
}

function ductlessBasicsSection() {
  const steps = [
    ["outdoor", "Outdoor Unit"],
    ["lines", "Refrigerant Lines"],
    ["indoor", "Indoor Head"],
    ["room", "Conditioned Space"],
  ];

  return `
    <section class="section ductless-section ductless-basics-section">
      <div class="container ductless-basics-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Ductless Basics",
            title: "Heating and Cooling Without Traditional Ductwork",
            text:
              "A ductless system uses an outdoor unit connected to one or more indoor units. Instead of moving conditioned air through a central duct system, each indoor unit delivers heating or cooling directly into the space it serves.",
          })}
          <div class="ductless-callout">No traditional supply and return duct system required.</div>
        </article>
        <div class="ductless-flow" aria-label="Ductless system flow">
          ${steps
            .map(
              ([icon, label], index) => `
                ${index > 0 ? `<span class="ductless-flow-arrow" aria-hidden="true"></span>` : ""}
                <div class="ductless-flow-step">
                  <span class="ductless-icon" aria-hidden="true">${ductlessIcon(icon)}</span>
                  <strong>${escapeHtml(label)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessApplicationsSection() {
  return `
    <section class="section ductless-applications-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Common Applications",
          title: "Where Ductless Systems Work Especially Well",
          text:
            "Ductless mini-split systems are often useful for targeted spaces where extending or changing traditional ductwork is difficult, expensive or unnecessary.",
        })}
        <div class="ductless-card-grid">
          ${ductlessApplications.map((item) => ductlessCard(item)).join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessSystemTypesSection() {
  const panels = [
    {
      eyebrow: "Single-Zone",
      title: "One outdoor unit",
      flow: ["Outdoor Unit", "One Indoor Unit"],
      text: "A single-zone system serves one main space or comfort zone.",
      list: ["One room", "Addition", "Garage", "Basement", "Office", "Dedicated problem area"],
      accent: "cool",
    },
    {
      eyebrow: "Multi-Zone",
      title: "One outdoor unit",
      flow: ["Outdoor Unit", "Multiple Indoor Units"],
      text:
        "Several indoor units can connect to one compatible outdoor unit depending on equipment design.",
      list: ["Several rooms", "Multiple floors", "Homes without central ductwork", "Separate comfort zones"],
      accent: "warm",
    },
  ];

  return `
    <section class="section ductless-section ductless-system-types-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Types",
          title: "Single-Zone or Multi-Zone?",
          text:
            "The right ductless layout depends on how many areas need conditioning, how they are used and which equipment combinations are supported.",
        })}
        <div class="ductless-system-type-grid">
          ${panels
            .map(
              (panel) => `
                <article class="ductless-system-panel ductless-system-panel-${panel.accent} reveal">
                  <p class="eyebrow">${escapeHtml(panel.eyebrow)}</p>
                  <h3>${escapeHtml(panel.title)}</h3>
                  <div class="ductless-mini-flow">
                    <span>${escapeHtml(panel.flow[0])}</span>
                    <i aria-hidden="true"></i>
                    <span>${escapeHtml(panel.flow[1])}</span>
                  </div>
                  <p>${escapeHtml(panel.text)}</p>
                  <strong>Best suited for:</strong>
                  <ul>
                    ${panel.list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                  </ul>
                </article>
              `,
            )
            .join("")}
        </div>
        <div class="ductless-note">The number and combination of indoor units depends on the specific equipment and system design.</div>
      </div>
    </section>
  `;
}

function ductlessZoningSection() {
  const rooms = [
    ["Bedroom", "22&deg;C"],
    ["Office", "21&deg;C"],
    ["Basement", "20&deg;C"],
  ];

  return `
    <section class="section ductless-zoning-section">
      <div class="container ductless-zoning-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Zoning",
            title: "Comfort Where You Need It",
            text:
              "Ductless systems allow individual areas to have their own temperature settings when the system is configured for multiple zones.",
          })}
          <p>Different spaces can operate at different setpoints depending on the system configuration. In many standard multi-zone systems, connected indoor units generally share the same overall heating or cooling operating mode unless the equipment is specifically designed otherwise.</p>
        </article>
        <div class="ductless-zone-visual" aria-label="Example ductless zone setpoints">
          ${rooms
            .map(
              ([room, temp]) => `
                <div>
                  <span class="ductless-icon" aria-hidden="true">${ductlessIcon("zone")}</span>
                  <strong>${escapeHtml(room)}</strong>
                  <em>${temp}</em>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessDesignSection() {
  return `
    <section class="section ductless-section ductless-design-section">
      <div class="container ductless-design-grid">
        <article>
          ${sectionHeading({
            eyebrow: "System Design",
            title: "More Indoor Heads Does Not Automatically Mean Better",
            text:
              "Multi-zone ductless design needs planning. Installing too many or poorly selected indoor units can reduce system performance instead of improving comfort.",
          })}
          <p>Airrand evaluates the equipment combination, the rooms being served and the real-world operating conditions rather than treating every head count as interchangeable.</p>
        </article>
        <div class="ductless-factor-list" aria-label="Ductless multi-zone design factors">
          ${ductlessSystemDesignItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessPlacementSection() {
  return `
    <section class="section ductless-placement-section">
      <div class="container ductless-placement-grid">
        <div class="ductless-placement-copy">
          ${sectionHeading({
            eyebrow: "Placement",
            title: "Where the Indoor Unit Goes Matters",
            text:
              "Indoor-unit placement affects air distribution, noise perception, comfort, service access, condensate drainage, refrigerant line routing and appearance.",
          })}
        </div>
        <div class="ductless-check-panel">
          <h3>Good placement considers:</h3>
          <div class="ductless-check-grid">
            ${ductlessPlacementItems
              .map(
                (item) => `
                  <div>
                    <span aria-hidden="true"></span>
                    <strong>${escapeHtml(item)}</strong>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function ductlessLineRoutingSection() {
  const photos = (installationPhotos["ductless-systems"] ?? []).slice(0, 2);
  return `
    <section class="section ductless-section ductless-line-section">
      <div class="container ductless-line-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Installation Detail",
            title: "Clean Line Routing Is Part of a Good Ductless Installation",
            text:
              "Ductless systems require refrigerant tubing, communication wiring, condensate drainage, an exterior penetration and protective line-hide or another appropriate finish.",
          })}
          <ul class="check-list">
            <li>Straight line-hide and thoughtful routing</li>
            <li>Clean wall penetrations and neat outdoor connections</li>
            <li>Proper supports and serviceable equipment locations</li>
          </ul>
          <blockquote class="ductless-pull-quote">A ductless system should look intentional, not added as an afterthought.</blockquote>
        </article>
        <div class="ductless-photo-pair">
          ${photos
            .map(
              (photo) => `
                <button type="button" data-lightbox-src="${asset(photo.image)}" data-lightbox-title="${escapeHtml(photo.category)}" data-lightbox-alt="${escapeHtml(photo.alt)}">
                  <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="640" height="700">
                  <span>Recent Ductless Work</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessInstallationSection() {
  return `
    <section class="section ductless-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Ductless Installation Actually Includes",
          text:
            "A ductless mini-split installation is a complete comfort-system setup. The indoor units, outdoor unit, refrigeration circuit, drainage, electrical work, controls and commissioning all matter.",
          align: "center",
        })}
        <div class="ductless-installation-grid">
          ${ductlessInstallationItems.map((item) => ductlessCard(item, "ductless-install-card")).join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessWinterSection() {
  return `
    <section class="section ductless-winter-section">
      <div class="container ductless-winter-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Heating Performance",
            title: "Ductless Systems Can Heat Too",
            text:
              "Many modern ductless systems are heat pumps and can provide heating as well as cooling. Heating performance varies by model, outdoor temperature, system sizing and the way the space is used.",
          })}
          <p>Cold-climate ductless equipment may be better suited to GTA winters, while some applications may still use another heating source as backup or support.</p>
          <div class="ductless-note ductless-note-warm">Cold-weather performance should be evaluated using the specific equipment data, not assumptions.</div>
          <a class="button button-secondary" href="${link("/services/heat-pumps/")}">Learn More About Heat Pumps</a>
        </article>
        <div class="ductless-winter-panel">
          ${["Heating performance varies by model", "Capacity changes with outdoor temperature", "Cold-climate options may fit some GTA applications", "Backup or support heat may still be appropriate"]
            .map((item) => `<div><span class="ductless-icon" aria-hidden="true">${ductlessIcon("flame")}</span><strong>${escapeHtml(item)}</strong></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessCentralComparisonSection() {
  return `
    <section class="section ductless-section ductless-comparison-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "System Comparison",
          title: "Ductless vs. Central Air",
          text:
            "Both can be useful, but they solve different comfort problems. The better option depends on the building and the areas that need conditioning.",
        })}
        <div class="ductless-comparison-grid">
          <article class="ductless-comparison-card reveal">
            <h3>Ductless</h3>
            <ul>
              <li>No traditional duct system required</li>
              <li>Individual zone control</li>
              <li>Indoor units visible in the room</li>
              <li>Good for additions and isolated spaces</li>
              <li>Can provide heating and cooling</li>
            </ul>
          </article>
          <article class="ductless-comparison-card reveal">
            <h3>Central Air</h3>
            <ul>
              <li>Uses existing duct system</li>
              <li>Conditions multiple rooms through shared ductwork</li>
              <li>Indoor equipment is less visible</li>
              <li>Good for whole-home centralized comfort</li>
            </ul>
          </article>
        </div>
        <div class="section-action">
          <a class="button button-secondary" href="${link("/services/air-conditioning/")}">View Air Conditioning Services</a>
        </div>
      </div>
    </section>
  `;
}

function ductlessHeatPumpComparisonSection() {
  return `
    <section class="section ductless-heat-pump-compare-section">
      <div class="container ductless-heat-pump-compare-panel">
        <div>
          <h2>Ductless Heat Pump vs. Central Heat Pump</h2>
          <p>Ductless systems use individual indoor heads and do not require central ductwork. Central heat pumps use a furnace or air handler and ductwork for whole-home distribution.</p>
        </div>
        <div class="ductless-mini-compare">
          <div>
            <h3>Ductless</h3>
            <p>Individual indoor heads</p>
            <p>No central ductwork required</p>
            <p>Strong zoning flexibility</p>
          </div>
          <div>
            <h3>Central Heat Pump</h3>
            <p>Uses furnace or air handler and ductwork</p>
            <p>Whole-home distribution</p>
            <p>Similar layout to traditional central HVAC</p>
          </div>
        </div>
        <a class="button button-secondary" href="${link("/services/heat-pumps/")}">View Heat Pump Services</a>
      </div>
    </section>
  `;
}

function ductlessModeBehaviorSection() {
  return `
    <section class="section ductless-section ductless-mode-section">
      <div class="container ductless-mode-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Multi-Zone Operation",
            title: "How Multi-Zone Systems Handle Heating and Cooling Calls",
            text:
              "On many standard multi-zone ductless heat-pump systems, connected indoor units share the same overall operating mode. That means the system generally cannot cool one zone while simultaneously heating another zone.",
          })}
          <p>Behavior varies by manufacturer. If one indoor unit is set to cooling and another is set to heating, the system may prioritize one mode, place one or more heads on standby, show a mode-conflict indicator or prevent conflicting operation.</p>
          <div class="ductless-note">Modern systems are designed with controls and protections to prevent normal mode conflicts from damaging the equipment.</div>
        </article>
        <div class="ductless-mode-list">
          ${["Prioritize one mode", "Place heads on standby", "Show a mode-conflict indicator", "Prevent conflicting operation"]
            .map((item) => `<span>${escapeHtml(item)}</span>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessDiagnosticsSection() {
  return `
    <section class="section ductless-diagnostics-section">
      <div class="container ductless-diagnostics-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Diagnostics",
            title: "Common Ductless System Problems",
            text:
              "These symptoms can have several possible causes and should be properly diagnosed before parts or refrigerant are added.",
          })}
        </article>
        <div class="ductless-problem-list">
          ${ductlessProblems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessControlsSection() {
  return `
    <section class="section ductless-section ductless-controls-section">
      <div class="container ductless-controls-grid">
        <article>
          ${sectionHeading({
            eyebrow: "Controls",
            title: "Control Ductless Comfort Your Way",
            text:
              "Ductless equipment may support handheld remotes, wired controllers, Wi-Fi control, manufacturer apps, smart-home integration and room temperature sensing.",
          })}
          <p>Actual capabilities depend on the equipment. Control compatibility varies by model and manufacturer.</p>
        </article>
        <div class="ductless-control-list">
          ${ductlessControlItems
            .map((item) => `<div><span class="ductless-icon" aria-hidden="true">${ductlessIcon(item.includes("Wi") || item.includes("app") || item.includes("Smart") ? "wifi" : "controls")}</span><strong>${escapeHtml(item)}</strong></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessMaintenanceSection() {
  return `
    <section class="section ductless-maintenance-section">
      <div class="container ductless-maintenance-layout">
        <div>
          ${sectionHeading({
            eyebrow: "Maintenance",
            title: "Ductless Systems Need Regular Care Too",
            text:
              "Because ductless systems may provide both heating and cooling, filters, coils, drainage, controls and overall performance should be reviewed regularly. Maintenance helps keep the system checked, but it cannot prevent every possible failure.",
          })}
          <a class="button button-primary" href="${link("/contact/")}">Book Ductless Service</a>
        </div>
        <div class="ductless-maintenance-grid" aria-label="Ductless maintenance checklist">
          ${ductlessMaintenanceItems
            .map(
              (item) => `
                <div class="ductless-maintenance-card">
                  <span aria-hidden="true"></span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function ductlessEducationSections() {
  return `
    ${ductlessBasicsSection()}
    ${ductlessApplicationsSection()}
    ${ductlessSystemTypesSection()}
    ${ductlessZoningSection()}
    ${ductlessDesignSection()}
    ${ductlessPlacementSection()}
    ${ductlessLineRoutingSection()}
    ${ductlessInstallationSection()}
    ${ductlessWinterSection()}
    ${ductlessCentralComparisonSection()}
    ${ductlessHeatPumpComparisonSection()}
    ${ductlessModeBehaviorSection()}
    ${ductlessDiagnosticsSection()}
    ${ductlessControlsSection()}
    ${ductlessMaintenanceSection()}
  `;
}

function standardsStrip() {
  const standards = [
    {
      logo: "badge-csa.png",
      logoClass: "standard-logo-csa",
      width: 360,
      height: 150,
      alt: "CSA Group logo",
      label: "Approved",
      heading: "CSA Approved",
      text:
        "Airrand follows applicable CSA standards, codes and manufacturer requirements for safe equipment installation and performance.",
    },
    {
      logo: "badge-tssa.png",
      logoClass: "standard-logo-tssa",
      width: 180,
      height: 180,
      alt: "Technical Standards and Safety Authority logo",
      label: "Insured",
      heading: "TSSA Insured",
      text:
        "Gas, combustion and venting work is handled with TSSA compliance in mind, from planning through final checks.",
    },
    {
      logo: "badge-hrai-fixed.png",
      logoClass: "standard-logo-hrai",
      width: 220,
      height: 172,
      alt: "HRAI logo",
      label: "Certified",
      heading: "HRAI Certified",
      text:
        "Airrand applies recognized HVAC training, sizing, airflow and installation practices for responsible system work.",
    },
  ];

  return `
    <section class="section standards-section">
      <div class="container standards-grid" aria-label="Standards and safety focus">
        ${standards
          .map(
            (item) => `
              <article class="standard-card">
                <div class="standard-logo ${item.logoClass}">
                  <img src="${asset(item.logo)}" alt="${escapeHtml(item.alt)}" loading="lazy" width="${item.width}" height="${item.height}">
                </div>
                <h3>${escapeHtml(item.heading)}</h3>
                <p>${escapeHtml(item.text)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

const heatingWarningSigns = [
  {
    title: "Uneven Heating",
    text: "Some rooms are noticeably colder or warmer than others.",
    icon: "temperature",
  },
  {
    title: "Frequent Cycling",
    text: "The furnace turns on and off more often than expected.",
    icon: "cycle",
  },
  {
    title: "Unusual Noises",
    text: "Rattling, grinding, banging or other new sounds may indicate a mechanical issue.",
    icon: "noise",
  },
  {
    title: "Rising Energy Use",
    text: "A furnace working harder than normal can increase heating costs.",
    icon: "energy",
  },
  {
    title: "Weak Airflow",
    text: "Low airflow can be related to filters, ductwork, blower issues or system setup.",
    icon: "airflow",
  },
  {
    title: "Repeated Repairs",
    text: "Frequent service calls may indicate that replacement should be considered.",
    icon: "repair",
  },
];

const heatingInfoItems = [
  ["home", "Residential & Light Commercial"],
  ["tools", "Repair | Replacement | Installation"],
  ["flame", "Gas Furnace Service"],
  ["map", "Serving the Greater Toronto Area"],
];

const repairConsiderations = [
  "The furnace is relatively newer",
  "The issue is isolated",
  "The system has otherwise been reliable",
  "The repair cost is reasonable",
  "Efficiency is still acceptable",
  "Major components remain in good condition",
];

const replacementConsiderations = [
  "Repairs are becoming frequent",
  "Major components are failing",
  "The system is nearing the end of its expected service life",
  "Heating comfort is poor",
  "Efficiency is significantly lower than modern equipment",
  "The repair cost is approaching a meaningful portion of replacement cost",
];

const furnaceOptions = [
  {
    title: "Proper Sizing",
    text:
      "A furnace should be sized for the building and heating load rather than simply matching the old equipment.",
    icon: "sizing",
  },
  {
    title: "Efficiency",
    text:
      "Higher-efficiency furnaces can reduce fuel use, but the right efficiency level depends on budget and application.",
    icon: "energy",
  },
  {
    title: "Staging",
    text:
      "Single-stage, two-stage and modulating furnaces deliver heat differently. The right choice depends on comfort goals, system design and budget.",
    icon: "staging",
  },
  {
    title: "Blower Technology",
    text:
      "Variable-speed ECM blowers can improve airflow control, comfort and operating noise when the system is set up correctly.",
    icon: "blower",
  },
  {
    title: "Controls",
    text:
      "Modern furnaces can work with different thermostat and control options depending on system compatibility.",
    icon: "controls",
  },
];

const furnaceInstallationItems = [
  {
    title: "Equipment Sizing",
    text: "Confirm the furnace is matched to the building and heating load.",
    icon: "Proper sizing",
  },
  {
    title: "Gas Pressure",
    text: "Confirm gas pressure and burner operation according to equipment requirements.",
    icon: "Gas pressure",
  },
  {
    title: "Venting",
    text: "Ensure intake and exhaust routing are installed correctly.",
    icon: "Venting",
  },
  {
    title: "Airflow",
    text: "Verify appropriate airflow through the furnace and duct system.",
    icon: "Airflow",
  },
  {
    title: "Electrical",
    text: "Check wiring, service access and equipment electrical requirements.",
    icon: "Electrical",
  },
  {
    title: "Drainage",
    text: "Set condensate drainage so high-efficiency equipment can run properly.",
    icon: "Drainage",
  },
  {
    title: "Duct Transitions",
    text: "Build clean transitions that support airflow and service access.",
    icon: "duct",
  },
  {
    title: "Thermostat / Controls",
    text: "Connect compatible controls and verify heating calls respond correctly.",
    icon: "Controls",
  },
  {
    title: "Startup & Commissioning",
    text: "Test furnace operation and verify the system before completion.",
    icon: "Commissioning",
  },
];

const furnaceMaintenanceItems = [
  "Filter condition",
  "Blower inspection",
  "Burner operation",
  "Venting",
  "Condensate drainage",
  "Safety controls",
  "Thermostat operation",
  "Electrical connections",
  "General system performance",
];

const heatingIcons = {
  temperature: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a5 5 0 1 0 8 0Z" />
      <path d="M10 7h3" />
      <path d="M10 10h3" />
      <path d="M10 13h3" />
      <path d="M8 16.5a2 2 0 1 0 2 0V5" />
    </svg>
  `,
  cycle: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M17 3l3 3-3 3" />
      <path d="M20 6H9a5 5 0 0 0-5 5" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M4 18h11a5 5 0 0 0 5-5" />
    </svg>
  `,
  noise: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 10h4l5-5v14l-5-5H4Z" />
      <path d="M16 9c.8.8 1.2 1.8 1.2 3s-.4 2.2-1.2 3" />
      <path d="M19 6c1.6 1.5 2.4 3.5 2.4 6s-.8 4.5-2.4 6" />
    </svg>
  `,
  energy: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M13 3L5 14h6l-1 7 9-12h-6Z" />
      <path d="M4 21h16" />
    </svg>
  `,
  airflow: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10.5a2.5 2.5 0 1 0-2.2-3.7" />
      <path d="M4 12h15" />
      <path d="M4 16h10.5a2.5 2.5 0 1 1-2.2 3.7" />
    </svg>
  `,
  repair: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M14.5 5.5l4 4" />
      <path d="M3.5 20.5l6.7-6.7" />
      <path d="M13 4a5.4 5.4 0 0 0 6.9 6.9L13.8 17a3 3 0 0 1-4.2 0L7 14.4a3 3 0 0 1 0-4.2Z" />
    </svg>
  `,
  home: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V20h11v-9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  `,
  tools: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
      <path d="m14 7 3 3-9 9H5v-3Z" />
      <path d="M4 6h5" />
      <path d="M6.5 3.5v5" />
    </svg>
  `,
  flame: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M8 16a4 4 0 1 0 8 0c0-2.8-3-4.4-2.6-8-2.4 1.4-5.4 4.1-5.4 8Z" />
      <path d="M13.5 16a1.5 1.5 0 0 1-3 0c0-1.1 1.1-1.8 1-3.1 1.1.8 2 1.8 2 3.1Z" />
    </svg>
  `,
  map: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  `,
  sizing: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 19V5h14" />
      <path d="M5 9h4" />
      <path d="M5 13h6" />
      <path d="M5 17h4" />
      <path d="M13 17l5-5" />
      <path d="M15 12h3v3" />
    </svg>
  `,
  staging: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 18h14" />
      <path d="M6 15h3V9H6Z" />
      <path d="M11 15h3V6h-3Z" />
      <path d="M16 15h3v-4h-3Z" />
    </svg>
  `,
  blower: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 9.6c.8-3.5 3.8-4.2 5.3-2.6 1.6 1.6.8 4.6-2.9 5" />
      <path d="M14.1 13.2c2.6 2.4 1.7 5.3-.5 5.9-2.1.6-4.4-1.6-3.4-5.2" />
      <path d="M9.8 13c-3.4 1.1-5.5-1.1-4.9-3.3.6-2.1 3.6-3 6 .1" />
    </svg>
  `,
  controls: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="6" y="3.5" width="12" height="17" rx="3" />
      <path d="M9 8h6" />
      <path d="M9 12h2" />
      <path d="M13 12h2" />
      <path d="M9 16h6" />
    </svg>
  `,
  duct: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h7l3 3h6v5h-8l-3-3H4Z" />
      <path d="M11 8v5" />
      <path d="M14 11v5" />
      <path d="M5 18h14" />
    </svg>
  `,
};

function heatingIcon(key) {
  return heatingIcons[key] ?? heatingIcons.tools;
}

function furnaceTechnicalIcon(item) {
  if (technicalSetupIcons[item]) {
    return technicalSetupIcon(item);
  }
  return heatingIcon(item);
}

function heatingWarningSignsSection() {
  return `
    <section class="section heating-section heating-warning-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Furnace Warning Signs",
          title: "Signs Your Furnace May Need Service",
          text:
            "A heating issue should be assessed in context. These signs do not diagnose a specific failure on their own, but they are worth paying attention to.",
        })}
        <div class="heating-warning-grid">
          ${heatingWarningSigns
            .map(
              (item) => `
                <article class="heating-card heating-warning-card reveal">
                  <span class="heating-icon" aria-hidden="true">${heatingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatingInfoStrip() {
  return `
    <section class="heating-info-section" aria-label="Heating service details">
      <div class="container heating-info-strip">
        ${heatingInfoItems
          .map(
            ([icon, label]) => `
              <div class="heating-info-item">
                <span class="heating-info-icon" aria-hidden="true">${heatingIcon(icon)}</span>
                <span>${escapeHtml(label)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function heatingRepairReplaceSection() {
  return `
    <section class="section heating-section heating-decision-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Repair vs Replacement",
          title: "Should You Repair or Replace Your Furnace?",
          text:
            "There is no single answer. The right choice depends on the furnace condition, age, repair history, efficiency and cost of the required repair.",
        })}
        <div class="heating-decision-grid">
          <article class="heating-decision-panel reveal">
            <span class="heating-panel-label">Repair May Make Sense When</span>
            <ul>
              ${repairConsiderations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <article class="heating-decision-panel heating-decision-panel-warm reveal">
            <span class="heating-panel-label">Replacement May Be Worth Considering When</span>
            <ul>
              ${replacementConsiderations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        </div>
        <div class="section-action">
          <a class="button button-primary" href="${link("/contact/")}">Have Us Assess Your Furnace</a>
        </div>
      </div>
    </section>
  `;
}

function heatingEquipmentOptionsSection() {
  return `
    <section class="section heating-section heating-equipment-section">
      <div class="container heating-equipment-layout">
        <div class="heating-equipment-copy">
          ${sectionHeading({
            eyebrow: "Equipment Options",
            title: "Choosing the Right Furnace for Your Home",
            text:
              "Furnace selection is about more than brand. The equipment should fit the building, the duct system, the controls and the way the space is used.",
          })}
          <a class="button button-secondary" href="${link("/brands/")}">Explore Equipment Brands</a>
        </div>
        <div class="heating-equipment-grid">
          ${furnaceOptions
            .map(
              (item) => `
                <article class="heating-card heating-option-card reveal">
                  <span class="heating-icon" aria-hidden="true">${heatingIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatingInstallationStandardSection() {
  return `
    <section class="section heating-installation-section">
      <div class="container">
        ${sectionHeading({
          eyebrow: "Installation Standard",
          title: "What Proper Furnace Installation Actually Includes",
          text:
            "A clean furnace install is also a technical setup. Airrand focuses on the details that affect safety, airflow, comfort and serviceability.",
          align: "center",
        })}
        <div class="heating-installation-grid">
          ${furnaceInstallationItems
            .map(
              (item) => `
                <article class="heating-install-card reveal">
                  <span class="heating-icon" aria-hidden="true">${furnaceTechnicalIcon(item.icon)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatingMaintenanceSection() {
  return `
    <section class="section heating-section heating-maintenance-section">
      <div class="container heating-maintenance-layout">
        <div>
          ${sectionHeading({
            eyebrow: "Maintenance",
            title: "Regular Maintenance Helps Keep Heating Reliable",
            text:
              "Seasonal maintenance gives the furnace a proper look-over before small issues become harder to catch during a cold stretch.",
          })}
          <a class="button button-primary" href="${link("/contact/")}">Book Furnace Maintenance</a>
        </div>
        <div class="heating-maintenance-grid" aria-label="Furnace maintenance checklist">
          ${furnaceMaintenanceItems
            .map(
              (item) => `
                <div class="heating-maintenance-card">
                  <span aria-hidden="true"></span>
                  <strong>${escapeHtml(item)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function heatingEducationSections() {
  return `
    ${heatingWarningSignsSection()}
    ${heatingInfoStrip()}
    ${heatingRepairReplaceSection()}
    ${heatingEquipmentOptionsSection()}
    ${heatingInstallationStandardSection()}
  `;
}

function homePage() {
  return {
    pathname: "/",
    title: "Professional HVAC Solutions for the Greater Toronto Area",
    description:
      "Airrand provides residential and commercial heating, cooling, ventilation, gas and mechanical HVAC services across the Greater Toronto Area.",
    current: "home",
    image: "hero-hvac-work.webp",
    schema: [businessSchema(), websiteSchema()],
    body: `
      <section class="hero" style="${heroImageStyle("hero-hvac-work.webp")}">
        <div class="hero-overlay"></div>
        <div class="container hero-content">
          <p class="eyebrow">Residential & Commercial HVAC | Greater Toronto Area</p>
          <h1>Heating. Cooling. Ventilation. Done Right.</h1>
          <p>Airrand provides professional HVAC, gas, water heating and mechanical services for homes and commercial properties across the GTA.</p>
          ${ctaButtons("hero-buttons")}
          <div class="hero-meta" aria-label="Availability and contact">
            <span>24/7 Service Available</span>
            <a href="mailto:${site.email}">${site.email}</a>
          </div>
        </div>
      </section>
      ${trustBar()}
      <section class="section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Complete HVAC Solutions",
            title: "Technical HVAC work for comfort, airflow, gas and mechanical systems.",
            text:
              "From home comfort equipment to commercial ventilation and mechanical installations, Airrand keeps the scope clear and the workmanship sharp.",
          })}
          ${servicesGrid()}
        </div>
      </section>
      ${brandsSection()}
      <section class="section split-section">
        <div class="container split-grid">
          <article class="split-panel reveal">
            <img src="${asset("residential-hvac-house.webp")}" alt="Residential HVAC visual for home comfort systems" loading="lazy" width="640" height="480">
            <div>
              <p class="eyebrow">Residential HVAC</p>
              <h2>Home comfort systems installed and serviced carefully.</h2>
              <p>Heating, cooling, ductless, water heating, repairs, maintenance and indoor air quality work for homes across the GTA.</p>
              <ul class="check-list">
                <li>Equipment replacement and installation</li>
                <li>Repairs, maintenance and service calls</li>
                <li>Ductless, humidifiers, HRV / ERV and water heating</li>
              </ul>
              <a class="button button-secondary" href="${link("/residential/")}">Residential Services</a>
            </div>
          </article>
          <article class="split-panel split-panel-warm reveal">
            <img src="${asset("hero-hvac-work.webp")}" alt="Commercial mechanical work with ductwork and support framing" loading="lazy" width="640" height="480">
            <div>
              <p class="eyebrow">Commercial HVAC</p>
              <h2>Commercial mechanical work is a core part of Airrand.</h2>
              <p>Ventilation, ductwork, gas piping, rooftop equipment coordination, equipment replacement, service and maintenance.</p>
              <ul class="check-list">
                <li>Rooftop and commercial HVAC equipment</li>
                <li>Ductwork, ventilation and make-up air scope</li>
                <li>Gas piping and mechanical installations</li>
              </ul>
              <a class="button button-secondary" href="${link("/commercial/")}">Commercial Services</a>
            </div>
          </article>
        </div>
      </section>
      <section class="section gallery-section home-gallery-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Gallery",
            title: "Real installation photos from Airrand's gallery.",
            text:
              "Browse recent Airrand heating, cooling, ductwork, gas, water heating and commercial installations throughout the GTA.",
          })}
          ${galleryGrid({ projects: homeGalleryPreviewPhotos })}
          <div class="section-action">
            <a class="button button-primary" href="${link("/gallery/")}">View Gallery</a>
          </div>
        </div>
      </section>
      ${googleReviewsSection()}
      <section class="section why-section">
        <div class="container why-grid">
          <div class="why-intro">
            <p class="eyebrow">Why Airrand</p>
            <h2>HVAC work should be clean, correct and built to last.</h2>
            <p>Airrand approaches HVAC work with a focus on proper installation, clean workmanship, clear communication and long-term reliability.</p>
          </div>
          <div class="why-list">
            ${whyPoints
              .map(
                (point) => `
                  <article class="why-card reveal">
                    <h3>${escapeHtml(point.title)}</h3>
                    <p>${escapeHtml(point.text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="section process-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Process",
            title: "From first call to finished installation.",
            text:
              "A simple path keeps the work clear, whether the request is a home repair, equipment replacement or commercial HVAC project.",
            align: "center",
          })}
          <div class="process-grid">
            ${processSteps
              .map(
                (step, index) => `
                  <article class="process-card reveal">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(step.title)}</h3>
                    <p>${escapeHtml(step.text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta()}
    `,
  };
}

function servicesPage() {
  return {
    pathname: "/services/",
    title: "HVAC Services in the GTA",
    description:
      "Explore Airrand's residential and commercial HVAC services, including AC, furnaces, heat pumps, ductless, gas lines, ductwork, water heaters and commercial HVAC.",
    current: "services",
    image: "shop-background.webp",
    schema: [businessSchema(), breadcrumbs([{ name: "Home", url: "/" }, { name: "Services", url: "/services/" }])],
    body: `
      <section class="page-hero compact-hero" style="${heroImageStyle("shop-background.webp")}">
        <div class="container">
          <p class="eyebrow">Services</p>
          <h1>Complete HVAC Solutions</h1>
          <p>Heating, cooling, gas, ventilation, water heating, repair, maintenance and commercial HVAC services throughout the Greater Toronto Area.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container">
          ${servicesGrid()}
        </div>
      </section>
      ${finalCta({
        title: "Have a specific HVAC problem or project?",
        text: "Send Airrand the details and receive a clear next step for residential or commercial service.",
      })}
    `,
  };
}

const humidifierTypes = [
  {
    key: "bypass",
    icon: "pad",
    eyebrow: "Bypass",
    title: "Bypass Humidifier",
    text:
      "A bypass humidifier uses the furnace blower and a small bypass duct to move air through a wetted evaporative pad.",
    flow: ["Supply Air", "Humidifier Pad", "Return Air"],
    flowNote:
      "The exact supply and return relationship depends on the equipment and duct layout. Airrand reviews the installation instead of assuming one universal orientation.",
    strengths: [
      "Simple design",
      "No dedicated humidifier fan",
      "Lower electrical demand",
      "Common residential application",
      "Generally straightforward maintenance",
    ],
    considerations: [
      "Requires suitable duct layout",
      "Uses furnace airflow",
      "Requires bypass ducting",
      "Typically lower output than steam systems",
    ],
  },
  {
    key: "fan",
    icon: "fan",
    eyebrow: "Fan-Powered",
    title: "Fan-Powered Humidifier",
    text:
      "A fan-powered humidifier uses its own internal fan to move air across the wetted evaporative pad, so it does not need the same bypass duct arrangement as a traditional bypass model.",
    flow: ["Internal Fan", "Water Panel", "Conditioned Air"],
    flowNote:
      "Fan-assisted equipment can be useful where duct layout makes a bypass route difficult or where higher evaporative output is needed.",
    strengths: [
      "More installation flexibility",
      "No bypass duct between supply and return",
      "Higher evaporative output than many basic bypass models",
      "Useful where bypass routing is difficult",
    ],
    considerations: [
      "Requires electrical power",
      "Contains an additional fan or motor",
      "Still uses an evaporative water panel",
      "Output depends on equipment and conditions",
    ],
  },
  {
    key: "steam",
    icon: "steam",
    eyebrow: "Steam",
    title: "Steam Humidifier",
    text:
      "A steam humidifier heats water to create steam, then introduces that steam into the duct system.",
    flow: ["Water", "Steam Generator", "Duct Injection"],
    flowNote:
      "Steam systems can provide significantly more humidification capacity, but they also require more involved installation and maintenance.",
    strengths: [
      "High humidification capacity",
      "Less dependent on furnace heat for evaporation",
      "Can provide more precise humidity control",
      "Suitable for higher humidification demand",
    ],
    considerations: [
      "Higher equipment cost",
      "Higher electrical demand",
      "Requires suitable electrical service",
      "Requires water and drainage",
      "Periodic canister, electrode or equipment maintenance depending on design",
    ],
  },
];

const humidifierComparisonRows = [
  ["Uses furnace airflow", "Yes", "Partially / airflow assisted", "No for evaporation"],
  ["Dedicated fan", "No", "Yes", "Not for evaporation"],
  ["Bypass duct required", "Usually", "No", "No"],
  ["Water panel", "Yes", "Yes", "Depends on design"],
  ["Electrical demand", "Low", "Moderate", "Higher"],
  ["Humidification capacity", "Moderate", "Moderate to higher", "High"],
  ["Installation complexity", "Lower", "Moderate", "Higher"],
  ["Best suited for", "Typical homes", "Layout constraints / higher output", "Higher demand / premium control"],
];

const humidifierSelectionItems = [
  {
    icon: "home-size",
    title: "Home Size",
    text: "Larger homes may require more humidification capacity.",
  },
  {
    icon: "tightness",
    title: "Building Tightness",
    text: "Air leakage affects how quickly moisture leaves the home.",
  },
  {
    icon: "runtime",
    title: "HVAC Runtime",
    text: "Evaporative humidifiers depend partly on airflow and system operation.",
  },
  {
    icon: "duct",
    title: "Duct Layout",
    text: "Available supply and return locations affect installation options.",
  },
  {
    icon: "drain",
    title: "Water & Drain Access",
    text: "Humidifiers need appropriate water supply and, depending on type, drainage.",
  },
  {
    icon: "electric",
    title: "Electrical Capacity",
    text: "Steam and powered equipment may require dedicated electrical consideration.",
  },
];

const humidifierIntegrationItems = [
  ["duct", "Supply duct"],
  ["duct", "Return duct"],
  ["fan", "Furnace blower"],
  ["controls", "Humidifier control"],
  ["controls", "Thermostat"],
  ["water", "Water supply"],
  ["drain", "Drain"],
  ["electric", "Electrical"],
  ["sensor", "Outdoor sensor where applicable"],
];

const humidifierInstallItems = [
  ["selection", "Equipment Selection", "Select the humidifier type and capacity appropriate for the application."],
  ["location", "Mounting Location", "Choose an accessible duct or wall location suitable for the equipment."],
  ["duct", "Duct Integration", "Install bypass or steam distribution components where required."],
  ["water", "Water Supply", "Provide a suitable water connection and shutoff."],
  ["drain", "Drainage", "Provide proper drainage where required."],
  ["electric", "Electrical", "Connect powered equipment according to requirements."],
  ["controls", "Controls", "Configure humidistat, thermostat or automatic controls."],
  ["airflow", "Airflow", "Verify airflow through evaporative equipment."],
  ["testing", "Startup & Testing", "Confirm water flow, drainage and humidity call operation."],
];

const humidifierProblems = [
  ["humidity", "Not producing humidity"],
  ["water", "Water not flowing"],
  ["water", "Excessive water use"],
  ["drain", "Leaking"],
  ["drain", "Drain blockage"],
  ["scale", "Water panel heavily scaled"],
  ["valve", "Solenoid valve problems"],
  ["controls", "Humidistat / control problems"],
  ["fan", "Fan not operating"],
  ["steam", "Steam canister / electrode issues"],
  ["home-size", "Low humidity despite operation"],
  ["warning", "Condensation from excessive settings"],
];

const humidifierMaintenanceGroups = [
  {
    title: "Bypass",
    icon: "pad",
    items: [
      "Replace / inspect water panel",
      "Clean distribution tray",
      "Inspect drain",
      "Check solenoid",
      "Verify bypass damper position",
      "Inspect water line",
    ],
  },
  {
    title: "Fan-Powered",
    icon: "fan",
    items: [
      "Water panel",
      "Distribution tray",
      "Drain",
      "Solenoid",
      "Internal fan",
      "Electrical connections",
    ],
  },
  {
    title: "Steam",
    icon: "steam",
    items: [
      "Canister / electrode assembly depending on equipment",
      "Drain system",
      "Water connections",
      "Steam hose / distribution tube",
      "Electrical components",
      "Controls",
    ],
  },
];

const humidifierFaqs = [
  {
    question: "What is the difference between a bypass and fan-powered humidifier?",
    answer:
      "Bypass humidifiers use HVAC airflow through a bypass duct. Fan-powered humidifiers use an internal fan and generally do not require a bypass duct between supply and return.",
  },
  {
    question: "What is the difference between evaporative and steam humidifiers?",
    answer:
      "Evaporative systems rely on water evaporating across a panel. Steam humidifiers actively heat water to create steam and introduce it into the duct system.",
  },
  {
    question: "Is a steam humidifier better?",
    answer:
      "Not automatically. Steam can provide higher output and more control, but it also has higher installation, electrical and maintenance requirements.",
  },
  {
    question: "How do I know which humidifier I need?",
    answer:
      "The home, ductwork, HVAC equipment, humidity demand, water and drain access, electrical capacity and budget should be evaluated before selecting a humidifier.",
  },
  {
    question: "Why is my house still dry with the humidifier running?",
    answer:
      "Possible causes include airflow, water flow, equipment capacity, building leakage, outdoor conditions, controls or maintenance. The humidifier and the HVAC system should be checked together.",
  },
  {
    question: "Why are my windows sweating?",
    answer:
      "The humidity setting may be too high for current outdoor conditions or the building envelope. As outdoor temperatures fall, lower indoor humidity may be appropriate to reduce condensation risk.",
  },
  {
    question: "Does a whole-home humidifier run all year?",
    answer:
      "Generally, humidification is mainly used during dry heating-season conditions. Controls and operation depend on the installation and equipment.",
  },
  {
    question: "How often does the humidifier pad need replacement?",
    answer:
      "Replacement frequency depends on equipment, water quality, runtime and manufacturer guidance. Water panels should be inspected as part of humidifier maintenance.",
  },
  {
    question: "Does a steam humidifier use a lot of electricity?",
    answer:
      "Steam humidifiers have significantly higher electrical demand than basic evaporative humidifiers because they actively boil or heat water. Exact demand depends on the model.",
  },
  {
    question: "Can a humidifier work with a heat pump?",
    answer:
      "Potentially, but equipment type and integration matter. Steam systems may be better suited in some applications because they do not depend on hot furnace supply air for evaporation.",
  },
  {
    question: "Can Airrand install whole-home furnace humidifiers from major brands?",
    answer:
      "Yes. Airrand can review the HVAC system, equipment requirements and manufacturer instructions, then install a compatible whole-home humidifier with proper controls, water and drain setup.",
  },
];

const humidifierIcons = {
  water: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z" />
      <path d="M9 15c1.2 1.4 4 1.4 6 0" />
    </svg>
  `,
  airflow: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10a3 3 0 1 0-3-3" />
      <path d="M4 12h16" />
      <path d="M4 16h12a3 3 0 1 1-3 3" />
    </svg>
  `,
  pad: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 7h6" />
      <path d="M9 10h6" />
      <path d="M9 13h6" />
      <path d="M9 16h6" />
    </svg>
  `,
  fan: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c-1-4 2-6 5-5 1.4 2.7 0 5.2-3.7 6" />
      <path d="M10.4 13.2c-4 1.2-6.2-1.6-5.2-4.6 3-.9 5.1.8 6.3 4.1" />
      <path d="M13.5 13.1c3 2.8 2.1 6.3-.8 7.3-2.4-2-2.2-4.8.2-7.2" />
    </svg>
  `,
  steam: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M8 20c-1.5-2.5 1.5-4.3 0-6.8C7 11.5 7.4 9.8 9.1 8.5" />
      <path d="M13 20c-1.5-2.5 1.5-4.3 0-6.8-1-1.7-.6-3.4 1.1-4.7" />
      <path d="M18 20c-1.5-2.5 1.5-4.3 0-6.8-1-1.7-.6-3.4 1.1-4.7" />
      <path d="M6 5h11" />
    </svg>
  `,
  duct: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 7h10v5h6" />
      <path d="M4 17h7v-5" />
      <path d="M14 4v6" />
      <path d="M20 9v6" />
    </svg>
  `,
  controls: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M10 7h4" />
      <circle cx="12" cy="13" r="2" />
    </svg>
  `,
  drain: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M6 5h12" />
      <path d="M8 5v6a4 4 0 0 0 8 0V5" />
      <path d="M12 15v5" />
      <path d="M9 20h6" />
    </svg>
  `,
  electric: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M13 2L5 14h6l-1 8 8-12h-6z" />
    </svg>
  `,
  sensor: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0z" />
      <path d="M11 6h5" />
      <path d="M11 10h4" />
    </svg>
  `,
  "home-size": `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  `,
  tightness: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
      <path d="M8 8l8 8" />
    </svg>
  `,
  runtime: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </svg>
  `,
  location: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  `,
  selection: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h14" />
      <path d="M9 6l2 2 4-4" />
    </svg>
  `,
  testing: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 16a7 7 0 0 1 14 0" />
      <path d="M12 16l4-5" />
      <path d="M8 20h8" />
    </svg>
  `,
  valve: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 12h16" />
      <path d="M8 8l8 8" />
      <path d="M16 8l-8 8" />
      <path d="M12 4v4" />
    </svg>
  `,
  scale: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M7 4h10v16H7z" />
      <path d="M10 7h4" />
      <path d="M9 11h6" />
      <path d="M10 15h4" />
    </svg>
  `,
  warning: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3l9 16H3z" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </svg>
  `,
  portable: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="7" y="5" width="10" height="14" rx="2" />
      <path d="M10 9h4" />
      <path d="M9 19v2" />
      <path d="M15 19v2" />
    </svg>
  `,
  ventilation: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 9h10a3 3 0 1 0-3-3" />
      <path d="M4 15h16" />
      <path d="M17 11l4 4-4 4" />
    </svg>
  `,
};

function humidifierIcon(key) {
  return humidifierIcons[key] ?? humidifierIcons.water;
}

function humidifierLinearFlow(items, className = "") {
  return `
    <div class="humidifier-linear-flow ${className}" aria-label="${escapeHtml(items.join(" to "))}">
      ${items
        .map(
          (item, index) => `
            <div class="humidifier-flow-node">
              <span>${escapeHtml(item)}</span>
            </div>
            ${index < items.length - 1 ? `<span class="humidifier-flow-arrow" aria-hidden="true"></span>` : ""}
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierIconGrid(items, className = "humidifier-card-grid") {
  return `
    <div class="${className}">
      ${items
        .map(
          (item) => `
            <article class="humidifier-card reveal">
              <span class="humidifier-icon" aria-hidden="true">${humidifierIcon(item.icon)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierTypeOverview() {
  return `
    <div class="humidifier-type-grid">
      ${humidifierTypes
        .map(
          (type) => `
            <article class="humidifier-type-card humidifier-type-${type.key} reveal">
              <span class="humidifier-icon" aria-hidden="true">${humidifierIcon(type.icon)}</span>
              <p class="eyebrow">${escapeHtml(type.eyebrow)}</p>
              <h3>${escapeHtml(type.title)}</h3>
              <p>${escapeHtml(type.text)}</p>
              <div class="humidifier-mini-flow">
                ${humidifierLinearFlow(type.flow)}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierTypeDetails() {
  return `
    <div class="humidifier-detail-stack">
      ${humidifierTypes
        .map(
          (type) => `
            <article class="humidifier-detail-card humidifier-type-${type.key} reveal" id="${type.key}-humidifier">
              <div class="humidifier-detail-copy">
                <span class="humidifier-icon" aria-hidden="true">${humidifierIcon(type.icon)}</span>
                <h3>${escapeHtml(type.title)}</h3>
                <p>${escapeHtml(type.text)}</p>
                <strong class="humidifier-statement">${escapeHtml(type.flowNote)}</strong>
              </div>
              <div class="humidifier-detail-flow">
                ${humidifierLinearFlow(type.flow)}
              </div>
              <div class="humidifier-detail-lists">
                <div>
                  <strong>Potential strengths</strong>
                  <ul class="humidifier-list">
                    ${inlineList(type.strengths)}
                  </ul>
                </div>
                <div>
                  <strong>Considerations</strong>
                  <ul class="humidifier-list">
                    ${inlineList(type.considerations)}
                  </ul>
                </div>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierComparisonMarkup() {
  return `
    <div class="humidifier-comparison-wrap">
      <table class="humidifier-comparison-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Bypass</th>
            <th>Fan-Powered</th>
            <th>Steam</th>
          </tr>
        </thead>
        <tbody>
          ${humidifierComparisonRows
            .map(
              ([feature, bypass, fan, steam]) => `
                <tr>
                  <th scope="row">${escapeHtml(feature)}</th>
                  <td>${escapeHtml(bypass)}</td>
                  <td>${escapeHtml(fan)}</td>
                  <td>${escapeHtml(steam)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="humidifier-comparison-cards">
        ${humidifierComparisonRows
          .map(
            ([feature, bypass, fan, steam]) => `
              <article>
                <h3>${escapeHtml(feature)}</h3>
                <dl>
                  <div><dt>Bypass</dt><dd>${escapeHtml(bypass)}</dd></div>
                  <div><dt>Fan-Powered</dt><dd>${escapeHtml(fan)}</dd></div>
                  <div><dt>Steam</dt><dd>${escapeHtml(steam)}</dd></div>
                </dl>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function humidifierIntegrationGrid() {
  return `
    <div class="humidifier-integration-grid" aria-label="Whole-home humidifier integration points">
      ${humidifierIntegrationItems
        .map(
          ([iconKey, title]) => `
            <article>
              <span class="humidifier-mini-icon" aria-hidden="true">${humidifierIcon(iconKey)}</span>
              <strong>${escapeHtml(title)}</strong>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierProblemGrid() {
  return `
    <div class="humidifier-problem-grid">
      ${humidifierProblems
        .map(
          ([iconKey, title]) => `
            <article class="humidifier-problem-tile reveal">
              <span class="humidifier-mini-icon" aria-hidden="true">${humidifierIcon(iconKey)}</span>
              <strong>${escapeHtml(title)}</strong>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifierMaintenanceGrid() {
  return `
    <div class="humidifier-maintenance-grid">
      ${humidifierMaintenanceGroups
        .map(
          (group) => `
            <article class="humidifier-maintenance-card reveal">
              <span class="humidifier-icon" aria-hidden="true">${humidifierIcon(group.icon)}</span>
              <h3>${escapeHtml(group.title)}</h3>
              <ul class="humidifier-list">
                ${inlineList(group.items)}
              </ul>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function humidifiersPage(service) {
  const related = ["furnaces", "heat-pumps", "hrv-erv", "ductwork"]
    .map((slug) => serviceBySlug.get(slug))
    .filter(Boolean);
  const work = servicePhotos(service);

  return {
    pathname: `/services/${service.slug}/`,
    title: "Whole-Home Humidifier Installation & Service GTA | Airrand",
    description:
      "Airrand installs and services bypass, fan-powered and steam whole-home humidifiers throughout the Greater Toronto Area, including controls, water connections and HVAC integration.",
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema(service),
      faqSchema(humidifierFaqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: service.title, url: `/services/${service.slug}/` },
      ]),
    ],
    body: `
      <section class="page-hero service-hero humidifier-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">Indoor Air Service</p>
          <h1>Whole-Home Humidifier Services in the Greater Toronto Area</h1>
          <p>Airrand installs and services whole-home humidifiers that help manage dry winter air throughout the home using the central HVAC system.</p>
          ${ctaButtons()}
        </div>
      </section>

      <section class="section humidifier-section humidifier-overview-section">
        <div class="container service-detail-grid">
          <article class="detail-copy">
            <p class="eyebrow">What Airrand Handles</p>
            <h2>Whole-home humidifier work with equipment, airflow, water, drainage and controls in mind.</h2>
            <p>${escapeHtml(service.intro)} The right humidifier has to fit the home, duct system, furnace or air handler, available utilities and service access.</p>
            <ul class="check-list">
              ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <aside class="service-aside humidifier-aside">
            <h2>Common Applications</h2>
            <ul>
              ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <a class="button button-primary" href="${link("/contact/#quote-form")}">Book Humidifier Service</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
          </aside>
        </div>
      </section>

      ${standardsStrip()}

      <section class="section humidifier-section">
        <div class="container humidifier-split">
          <article>
            <p class="eyebrow">Winter Comfort</p>
            <h2>Why Homes Get Dry in Winter</h2>
            <p>Cold outdoor air generally contains less moisture than warm indoor air can hold. When that outdoor air enters the home and is heated, indoor relative humidity can drop.</p>
            <p>That may contribute to dry skin, dry throat, static electricity, dry woodwork and general winter discomfort. Airrand keeps the discussion practical and avoids medical claims.</p>
          </article>
          <aside class="humidifier-flow-panel">
            ${humidifierLinearFlow(["Cold Outdoor Air", "Heated Indoors", "Lower Relative Humidity"])}
          </aside>
        </div>
      </section>

      <section class="section humidifier-section humidifier-how-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "How It Works",
            title: "Humidity Added Through the HVAC System",
            text:
              "A whole-home humidifier adds moisture to air moving through the furnace or air handler system. Depending on the type, moisture may be added through an evaporative pad, a powered fan or steam injected into the duct system.",
            align: "center",
          })}
          <div class="humidifier-system-flow">
            ${humidifierLinearFlow(["Water Supply", "Humidifier", "Furnace / Airflow", "Home"])}
          </div>
        </div>
      </section>

      <section class="section humidifier-section humidifier-types-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Humidifier Types",
            title: "Bypass, Fan-Powered or Steam?",
            text:
              "Whole-home duct-mounted humidifiers are not all the same. The right approach depends on the home, HVAC system, duct layout, utilities and humidity demand.",
            align: "center",
          })}
          ${humidifierTypeOverview()}
        </div>
      </section>

      <section class="section humidifier-section humidifier-type-detail-section">
        <div class="container">
          ${humidifierTypeDetails()}
        </div>
      </section>

      <section class="section humidifier-section humidifier-comparison-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Comparison",
            title: "Which Type of Humidifier Makes Sense?",
            text:
              "The table keeps the comparison high level. Airrand does not use hard capacity claims unless the actual equipment and home are being reviewed.",
            align: "center",
          })}
          ${humidifierComparisonMarkup()}
          <p class="humidifier-note">The right choice depends on the home, HVAC system, duct layout, humidity demand, available utilities and budget.</p>
        </div>
      </section>

      <section class="section humidifier-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "System Fit",
            title: "Choosing the Right Humidifier Is More Than Picking a Box",
            text:
              "A whole-home humidifier has to match the building and the equipment it connects to. Airrand keeps this practical instead of using DIY sizing formulas.",
            align: "center",
          })}
          ${humidifierIconGrid(humidifierSelectionItems, "humidifier-card-grid")}
        </div>
      </section>

      <section class="section humidifier-section humidifier-temperature-section">
        <div class="container humidifier-split">
          <article>
            <p class="eyebrow">Winter Control</p>
            <h2>More Humidity Is Not Always Better</h2>
            <p>Indoor humidity should generally be adjusted based on outdoor temperature and building conditions. As outdoor temperatures fall, excessive indoor humidity can contribute to condensation on windows, exterior walls and other cold surfaces.</p>
            <strong class="humidifier-statement">The goal is comfortable humidity without creating condensation problems.</strong>
          </article>
          <aside class="humidifier-temperature-panel">
            <div>
              <span>Warmer winter day</span>
              <strong>Higher humidity may be acceptable</strong>
            </div>
            <div>
              <span>Very cold day</span>
              <strong>Lower humidity may be appropriate</strong>
            </div>
          </aside>
        </div>
      </section>

      <section class="section humidifier-section">
        <div class="container humidifier-two-panel-grid">
          <article class="humidifier-feature-panel reveal">
            <p class="eyebrow">Controls</p>
            <h2>Manual Humidistat</h2>
            <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("controls")}</span>
            <p>The homeowner adjusts the humidity setting. Manual control may require seasonal adjustment as outdoor temperatures change.</p>
          </article>
          <article class="humidifier-feature-panel humidifier-feature-panel-warm reveal">
            <p class="eyebrow">Automatic Control</p>
            <h2>Automatic Humidity Control</h2>
            <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("sensor")}</span>
            <p>Some systems can use outdoor-temperature information or integrated controls to adjust humidity demand more automatically. Control capability varies by humidifier, thermostat, furnace, manufacturer and accessories.</p>
          </article>
        </div>
      </section>

      <section class="section humidifier-section humidifier-integration-section">
        <div class="container humidifier-split">
          <article>
            <p class="eyebrow">System Integration</p>
            <h2>The Humidifier Has to Work With the HVAC System</h2>
            <p>Proper installation can involve the furnace or air handler, ductwork, water supply, drainage, electrical wiring, controls and outdoor-temperature sensing where applicable.</p>
            <strong class="humidifier-statement">Humidifier performance depends on both the humidifier and the airflow system it is connected to.</strong>
          </article>
          <aside class="humidifier-map-panel">
            ${humidifierIntegrationGrid()}
          </aside>
        </div>
      </section>

      <section class="section humidifier-section">
        <div class="container humidifier-two-panel-grid">
          <article class="humidifier-feature-panel reveal">
            <p class="eyebrow">Bypass Systems</p>
            <h2>Bypass Humidifiers Need Proper Airflow</h2>
            <p>A bypass humidifier relies on a pressure difference across the duct system to move air through the humidifier.</p>
            <ul class="humidifier-list">
              ${inlineList(["Supply / return locations", "Airflow", "Bypass routing", "Duct space", "Service access"])}
            </ul>
          </article>
          <article class="humidifier-feature-panel humidifier-feature-panel-warm reveal">
            <p class="eyebrow">Installation Detail</p>
            <h2>Water and Drainage Are Part of the Installation</h2>
            <p>Humidifier systems may require a water supply connection, shutoff valve, appropriate tubing or piping, drain connection, proper slope and serviceable routing.</p>
            <strong class="humidifier-statement">Water piping should be installed cleanly and left accessible for service.</strong>
          </article>
        </div>
      </section>

      <section class="section humidifier-section humidifier-install-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Installation Standard",
            title: "What Proper Whole-Home Humidifier Installation Includes",
            text:
              "The equipment, ductwork, water, drainage, power, controls and startup checks all affect how the system performs after Airrand leaves.",
            align: "center",
          })}
          <div class="humidifier-install-grid">
            ${humidifierInstallItems
              .map(
                ([iconKey, title, text]) => `
                  <article class="humidifier-install-card reveal">
                    <span class="humidifier-icon" aria-hidden="true">${humidifierIcon(iconKey)}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section humidifier-section humidifier-problems-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Diagnostics",
            title: "Common Whole-Home Humidifier Problems",
            text:
              "Humidifier problems can involve water flow, airflow, controls, drainage or the humidifier itself.",
            align: "center",
          })}
          ${humidifierProblemGrid()}
        </div>
      </section>

      <section class="section humidifier-section humidifier-maintenance-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Maintenance",
            title: "Different Humidifiers Have Different Maintenance Needs",
            text:
              "Maintenance depends on the humidifier type, water quality, runtime and manufacturer recommendations.",
            align: "center",
          })}
          ${humidifierMaintenanceGrid()}
          <div class="section-action">
            <a class="button button-primary" href="${link("/contact/#quote-form")}">Book Humidifier Service</a>
          </div>
        </div>
      </section>

      <section class="section humidifier-section">
        <div class="container humidifier-split">
          <article>
            <p class="eyebrow">Long-Term Performance</p>
            <h2>Water Quality Affects Humidifier Maintenance</h2>
            <p>Minerals in the water can accumulate on evaporative pads, distribution trays, steam components and drain systems.</p>
            <p>Maintenance requirements depend on water quality, equipment type, runtime and manufacturer recommendations.</p>
          </article>
          <aside class="humidifier-scale-panel">
            <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("scale")}</span>
            <h3>Scale buildup is a maintenance issue, not just a cosmetic one.</h3>
            <p>Keeping humidifier components clean supports water flow, drainage and long-term operation.</p>
          </aside>
        </div>
      </section>

      <section class="section humidifier-section humidifier-compare-services-section">
        <div class="container humidifier-two-panel-grid">
          <article class="humidifier-feature-panel reveal">
            <p class="eyebrow">Humidification</p>
            <h2>Humidification and Ventilation Do Different Jobs</h2>
            <div class="humidifier-mini-compare">
              <div>
                <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("water")}</span>
                <strong>Humidifier</strong>
                <p>Adds moisture to indoor air.</p>
              </div>
              <div>
                <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("ventilation")}</span>
                <strong>HRV / ERV</strong>
                <p>Exchanges stale indoor air with outdoor air.</p>
              </div>
            </div>
            <p>Ventilation can affect humidity, but an HRV or ERV is not the same thing as a whole-home humidifier.</p>
            <a class="button button-secondary" href="${link("/services/hrv-erv/")}">Learn About HRV / ERV Ventilation</a>
          </article>
          <article class="humidifier-feature-panel humidifier-feature-panel-warm reveal">
            <p class="eyebrow">Whole-Home Comfort</p>
            <h2>Whole-Home vs. Portable Humidification</h2>
            <div class="humidifier-mini-compare">
              <div>
                <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("portable")}</span>
                <strong>Portable Unit</strong>
                <p>Serves a room or small area and requires manual refilling.</p>
              </div>
              <div>
                <span class="humidifier-icon" aria-hidden="true">${humidifierIcon("duct")}</span>
                <strong>Whole-Home</strong>
                <p>Integrates with central HVAC and is connected to a water supply.</p>
              </div>
            </div>
            <p>Whole-home humidification is designed to support humidity throughout the ducted home, but the right choice still depends on the application.</p>
          </article>
        </div>
      </section>

      <section class="section gallery-section humidifier-gallery-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Recent Work",
            title: "Recent Whole-Home Humidifier Installations",
            text:
              "A look at recent Airrand humidifier and indoor-air installations throughout the GTA.",
          })}
          ${workSlider(work.photos, "Recent whole-home humidifier installations")}
        </div>
      </section>

      ${faqSection(service, humidifierFaqs)}

      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Related Services",
            title: "Connected HVAC services from Airrand.",
            text:
              "Whole-home humidity control often connects with heating equipment, ductwork, ventilation and heat-pump integration.",
          })}
          ${servicesGrid(related)}
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta({
        title: "Need whole-home humidifier help?",
        text:
          "Share the home, HVAC system, humidity concern and location so Airrand can recommend the right next step.",
      })}
    `,
  };
}

const ductworkSystemEffects = [
  "Airflow",
  "Comfort",
  "Equipment performance",
  "Noise",
  "Temperature consistency",
  "Energy use",
  "System reliability",
];

const ductworkSizingFactors = [
  "Equipment airflow",
  "Branch length",
  "Duct dimensions",
  "Number of fittings",
  "Available space",
  "Register requirements",
  "Static pressure",
  "System layout",
];

const ductworkDuctTypes = [
  {
    icon: "rectangular",
    title: "Rectangular Duct",
    text: "Common for trunks, mechanical rooms, equipment connections, commercial systems and tight ceiling spaces.",
    items: ["Main trunks", "Plenums", "Equipment connections", "Commercial systems"],
  },
  {
    icon: "round",
    title: "Round Duct",
    text: "Common for residential branches, smaller air runs, flexible routing and efficient airflow paths.",
    items: ["Residential branches", "Smaller runs", "Clean air paths", "Routing flexibility"],
  },
  {
    icon: "spiral",
    title: "Spiral Duct",
    text: "Common for commercial applications, exposed ceilings, long round duct runs and finished installations.",
    items: ["Commercial fit-outs", "Exposed ceilings", "Long runs", "Finished spaces"],
  },
];

const ductworkResidentialProjects = [
  "Basement finishing",
  "Renovations",
  "Additions",
  "Furnace replacement modifications",
  "Heat-pump conversions",
  "New supply runs",
  "New returns",
  "Moving registers",
  "Correcting poor routing",
];

const ductworkCommercialScope = [
  "Rooftop units",
  "Main trunks",
  "Spiral duct",
  "Rectangular duct",
  "Diffusers",
  "Return-air systems",
  "Exhaust",
  "Make-up air",
  "Mechanical rooms",
  "Ceiling coordination",
];

const ductworkNewModified = [
  {
    title: "New Duct Installation",
    text: "Used for new construction, additions, commercial fit-outs, major renovations and new HVAC systems.",
    items: ["New construction", "Additions", "Commercial fit-outs", "Major renovations", "New HVAC systems"],
  },
  {
    title: "Duct Modifications",
    text: "Used when existing systems need to adapt to equipment replacement, layout changes or airflow issues.",
    items: ["Equipment replacement", "Layout changes", "New rooms", "Register relocation", "Return-air improvements"],
  },
];

const ductworkWorkmanshipItems = [
  {
    icon: "seal",
    title: "Duct Sealing",
    text: "Joints, seams, connections, plenums and equipment transitions should be sealed appropriately.",
  },
  {
    icon: "insulation",
    title: "Insulation",
    text: "Some ductwork needs insulation for heat transfer, condensation control or acoustic reasons.",
  },
  {
    icon: "noise",
    title: "Noise Control",
    text: "High velocity, restrictive grilles, sharp fittings, vibration and blower issues can all affect sound.",
  },
  {
    icon: "supports",
    title: "Supports & Hangers",
    text: "Good ductwork should be straight, secure, aligned and organized before the ceiling is closed.",
  },
  {
    icon: "service",
    title: "Service Access",
    text: "Duct placement should not unnecessarily block filters, coils, dampers, motors or equipment panels.",
  },
  {
    icon: "equipment",
    title: "Equipment Changes",
    text: "New furnaces, coils or heat pumps can require plenums, transitions, return changes or filter rack work.",
  },
];

const ductworkInstallItems = [
  ["airflow", "Airflow Planning", "Determine how air needs to move through the building."],
  ["sizing", "Duct Sizing", "Select appropriate duct sizes for system conditions."],
  ["route", "Routing", "Plan paths around structure and other trades."],
  ["fabrication", "Fabrication", "Build transitions, plenums and fittings accurately."],
  ["supports", "Supports", "Provide proper hangers and support."],
  ["seal", "Sealing", "Seal joints and connections appropriately."],
  ["insulation", "Insulation", "Insulate ducts where required."],
  ["register", "Registers & Diffusers", "Coordinate final air-delivery points."],
  ["review", "Final Airflow Review", "Verify the finished system operates as intended."],
];

const ductworkProblems = [
  "Weak airflow",
  "Uneven temperatures",
  "Noisy vents",
  "Undersized ducts",
  "Poor return airflow",
  "Loose ductwork",
  "Leaking joints",
  "Crushed flexible duct",
  "Poor transitions",
  "Unsupported duct",
  "Condensation",
  "Poor register placement",
];

const ductworkMaterialPanels = [
  {
    title: "Sheet Metal",
    text: "Rigid ductwork can support clean routing, long-term durability and a lower risk of deformation when installed correctly.",
    items: ["Rigid construction", "Clean routing", "Durability", "Lower deformation risk"],
  },
  {
    title: "Flexible Duct",
    text: "Flex duct can be useful in certain applications, especially short final connections, but poor installation can make it restrictive.",
    items: ["Short final connections", "Some residential applications", "Useful routing flexibility", "Avoid crushing, kinking and excessive length"],
  },
];

function ductworkIcon(key) {
  const icons = {
    airflow: `<path d="M4 8h10a3 3 0 1 0-3-3" /><path d="M4 12h16" /><path d="M4 16h12a3 3 0 1 1-3 3" />`,
    return: `<path d="M18 7H8a4 4 0 0 0 0 8h8" /><path d="M12 11l4 4-4 4" />`,
    duct: `<path d="M4 8h12l4 4-4 4H4Z" /><path d="M8 8v8" /><path d="M12 8v8" />`,
    rectangular: `<rect x="4" y="7" width="16" height="10" rx="2" /><path d="M8 7v10" /><path d="M16 7v10" />`,
    round: `<circle cx="12" cy="12" r="7" /><path d="M5 12h14" /><path d="M12 5v14" />`,
    spiral: `<path d="M5 9c3-4 11-4 14 0" /><path d="M5 12c3-4 11-4 14 0" /><path d="M5 15c3-4 11-4 14 0" />`,
    pressure: `<path d="M6 16a6 6 0 1 1 12 0" /><path d="M12 16l3-5" /><path d="M4 20h16" />`,
    fitting: `<path d="M4 8h9v4h7" /><path d="M13 8v8" /><path d="M4 16h9" />`,
    seal: `<path d="M5 12h14" /><path d="M8 8l8 8" /><path d="M8 16l8-8" />`,
    insulation: `<path d="M5 7h14v10H5Z" /><path d="M8 7v10" /><path d="M12 7v10" /><path d="M16 7v10" />`,
    noise: `<path d="M5 14h3l4 4V6L8 10H5Z" /><path d="M16 9c1 1 1.5 2 1.5 3s-.5 2-1.5 3" /><path d="M19 7c1.6 1.6 2.4 3.2 2.4 5S20.6 15.4 19 17" />`,
    supports: `<path d="M7 4v6" /><path d="M17 4v6" /><path d="M5 10h14v7H5Z" /><path d="M8 20h8" />`,
    service: `<path d="M7 4h10v16H7Z" /><path d="M10 8h4" /><path d="M10 12h4" /><path d="M10 16h2" />`,
    equipment: `<rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h3" />`,
    register: `<rect x="5" y="6" width="14" height="12" rx="2" /><path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h8" />`,
    sizing: `<path d="M5 19V5h14" /><path d="M5 9h5" /><path d="M5 13h8" /><path d="M13 17l5-5" /><path d="M15 12h3v3" />`,
    route: `<path d="M4 7h6a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3h4" /><path d="M17 14l3 3-3 3" />`,
    fabrication: `<path d="M5 7h9l5 5-5 5H5Z" /><path d="M14 7v10" />`,
    review: `<path d="M6 6h12v14H6Z" /><path d="M9 13l2 2 4-5" /><path d="M9 8h6" />`,
  };

  return `
    <span class="ductwork-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        ${icons[key] ?? icons.duct}
      </svg>
    </span>
  `;
}

function ductworkPillList(items) {
  return `<ul class="ductwork-pill-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function ductworkFlow(items, className = "") {
  return `
    <div class="ductwork-flow ${className}" aria-label="${escapeHtml(items.join(" to "))}">
      ${items
        .map(
          (item, index) => `
            <span>${escapeHtml(item)}</span>
            ${index < items.length - 1 ? `<i aria-hidden="true"></i>` : ""}
          `,
        )
        .join("")}
    </div>
  `;
}

function ductworkCardGrid(items, className = "ductwork-card-grid") {
  return `
    <div class="${className}">
      ${items
        .map(
          (item) => `
            <article class="ductwork-card reveal">
              ${ductworkIcon(item.icon ?? "duct")}
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
              ${item.items ? ductworkPillList(item.items) : ""}
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function ductworkPage(service) {
  const related = ["commercial-hvac", "furnaces", "heat-pumps", "hrv-erv"]
    .map((slug) => serviceBySlug.get(slug))
    .filter(Boolean);
  const work = servicePhotos(service);
  const faqs = serviceFaqs(service);
  const firstPhoto = work.photos[0] ?? installationPhotos.ductwork?.[0];
  const secondPhoto = work.photos[3] ?? installationPhotos.ductwork?.[3] ?? firstPhoto;

  return {
    pathname: "/services/ductwork/",
    title: "Ductwork Design & Installation GTA | Airrand",
    description:
      "Airrand designs, installs and modifies residential and commercial HVAC ductwork throughout the Greater Toronto Area, including spiral duct, sheet metal, supply and return systems and ventilation ductwork.",
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema(service),
      faqSchema(faqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: "Ductwork", url: "/services/ductwork/" },
      ]),
    ],
    body: `
      <section class="page-hero service-hero ductwork-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">Air Distribution</p>
          <h1>Ductwork Design &amp; Installation in the Greater Toronto Area</h1>
          <p>Airrand designs, installs and modifies residential and commercial duct systems with proper airflow, clean routing, strong supports and practical service access.</p>
          ${ctaButtons()}
        </div>
      </section>

      <section class="section ductwork-section ductwork-overview-section">
        <div class="container service-detail-grid">
          <article class="detail-copy">
            <p class="eyebrow">Complete Air Distribution</p>
            <h2>Ductwork is more than sheet metal between equipment and rooms.</h2>
            <p>Airrand handles residential and commercial ductwork for HVAC systems, renovations, additions, commercial fit-outs, rooftop equipment, ventilation systems, mechanical rooms and duct modifications across the GTA.</p>
            <ul class="check-list">
              ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <aside class="service-aside">
            <h2>Common Applications</h2>
            <ul>
              ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <a class="button button-primary" href="${link(quoteRequestPath)}">Request a Quote</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
          </aside>
        </div>
      </section>

      <section class="section ductwork-section ductwork-system-section">
        <div class="container ductwork-system-grid">
          <div>
            <p class="eyebrow">System Performance</p>
            <h2>Good Equipment Still Needs Good Airflow</h2>
            <p>A furnace, air conditioner or heat pump can only perform properly if conditioned air can move through the building as intended.</p>
            <p class="ductwork-statement">The HVAC equipment creates the heating or cooling. The ductwork has to deliver it.</p>
          </div>
          <div class="ductwork-flow-panel">
            ${ductworkFlow(["Furnace / Air Handler", "Supply Duct", "Rooms", "Return Air", "Equipment"])}
            ${ductworkPillList(ductworkSystemEffects)}
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-supply-return-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Airflow Basics",
            title: "Supply Air and Return Air Work Together",
            text:
              "A balanced air-distribution system needs both a supply path and a return path.",
            align: "center",
          })}
          <div class="ductwork-two-panel-grid">
            <article class="ductwork-panel ductwork-supply-panel reveal">
              ${ductworkIcon("airflow")}
              <h3>Supply Air</h3>
              <p>Carries conditioned air from the HVAC equipment to occupied spaces.</p>
              ${ductworkPillList(["Floor registers", "Wall registers", "Ceiling diffusers", "Commercial supply grilles"])}
            </article>
            <article class="ductwork-panel ductwork-return-panel reveal">
              ${ductworkIcon("return")}
              <h3>Return Air</h3>
              <p>Carries air from the building back to the furnace or air handler.</p>
              <p class="ductwork-note">Increasing supply airflow without an adequate return-air path does not automatically improve system performance.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-sizing-section">
        <div class="container ductwork-split">
          <div>
            <p class="eyebrow">Duct Design</p>
            <h2>Duct Size Affects How Much Air Can Move</h2>
            <p>Duct systems should be designed around required airflow and system conditions, not rule-of-thumb assumptions.</p>
            <p class="ductwork-statement">A duct that is too small can restrict airflow. A duct that is unnecessarily large may create other design and installation challenges.</p>
          </div>
          <div class="ductwork-factor-grid">
            ${ductworkSizingFactors.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-pressure-section">
        <div class="container ductwork-pressure-grid">
          <div>
            <p class="eyebrow">Airflow Resistance</p>
            <h2>What Is Static Pressure?</h2>
            <p>Static pressure is resistance to airflow inside the HVAC system. Air has to move through filters, coils, ductwork, fittings, dampers, registers and grilles.</p>
            <p class="ductwork-note">Static pressure should be evaluated in the context of the equipment and system design.</p>
          </div>
          <div class="ductwork-pressure-panel">
            ${ductworkFlow(["Blower", "Filter", "Coil", "Ductwork", "Fittings", "Register"], "ductwork-pressure-flow")}
            ${ductworkCardGrid(
              [
                { icon: "pressure", title: "Reduced Airflow", text: "Excessive resistance can reduce how much air reaches the spaces." },
                { icon: "equipment", title: "Blower Workload", text: "The blower has to work through the actual installed system." },
                { icon: "noise", title: "Noise & Comfort", text: "Resistance can contribute to sound, uneven comfort and equipment issues." },
              ],
              "ductwork-mini-card-grid",
            )}
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-fitting-section">
        <div class="container ductwork-fitting-grid">
          <div>
            <p class="eyebrow">Airflow Detail</p>
            <h2>Duct Fittings Are Part of the Design</h2>
            <p>Airflow changes direction through elbows, tees, wyes, transitions, reducers, boots and takeoffs. Poor fitting design can create unnecessary resistance and turbulence.</p>
            ${ductworkPillList(["Elbows", "Tees", "Wyes", "Transitions", "Reducers", "Boots", "Takeoffs"])}
          </div>
          <div class="ductwork-comparison">
            <article>
              <strong>Abrupt Transition</strong>
              <span>More turbulent airflow</span>
            </article>
            <article>
              <strong>Gradual Transition</strong>
              <span>Smoother airflow path where the application allows</span>
            </article>
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-transition-section">
        <div class="container ductwork-photo-split">
          <div>
            <p class="eyebrow">Fabrication</p>
            <h2>Good Transitions Should Match the Equipment and Duct System</h2>
            <p>Transitions connect different duct sizes, shapes, equipment openings, plenums and branch systems. Good transitions should change size logically, support airflow, fit the available space, maintain service access and look deliberate.</p>
          </div>
          ${
            secondPhoto
              ? `<button class="ductwork-photo-card" type="button" data-lightbox-src="${asset(secondPhoto.image)}" data-lightbox-title="${escapeHtml(secondPhoto.category)}" data-lightbox-alt="${escapeHtml(secondPhoto.alt)}">
                  <img src="${asset(secondPhoto.image)}" alt="${escapeHtml(secondPhoto.alt)}" loading="lazy" width="760" height="620">
                  <span>Real Airrand sheet-metal work</span>
                </button>`
              : ""
          }
        </div>
      </section>

      <section class="section ductwork-section ductwork-types-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Duct Types",
            title: "Rectangular, Round and Spiral Ductwork",
            text:
              "The appropriate duct type depends on space, airflow, appearance, application and project requirements.",
            align: "center",
          })}
          ${ductworkCardGrid(ductworkDuctTypes, "ductwork-type-grid")}
        </div>
      </section>

      <section class="section ductwork-section ductwork-spiral-section">
        <div class="container ductwork-photo-split ductwork-photo-split-reverse">
          ${
            firstPhoto
              ? `<button class="ductwork-photo-card" type="button" data-lightbox-src="${asset(firstPhoto.image)}" data-lightbox-title="${escapeHtml(firstPhoto.category)}" data-lightbox-alt="${escapeHtml(firstPhoto.alt)}">
                  <img src="${asset(firstPhoto.image)}" alt="${escapeHtml(firstPhoto.alt)}" loading="lazy" width="760" height="620">
                  <span>Commercial ductwork from Airrand's gallery</span>
                </button>`
              : ""
          }
          <div>
            <p class="eyebrow">Commercial Ductwork</p>
            <h2>Spiral Ductwork for Clean Commercial Installations</h2>
            <p>Spiral duct can provide strong rigid construction, a clean finished appearance, an efficient round airflow path and good suitability for exposed ceilings or long straight duct runs.</p>
            <blockquote class="ductwork-quote">Exposed ductwork becomes part of the finished space, so workmanship matters.</blockquote>
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-res-com-section">
        <div class="container ductwork-two-panel-grid">
          <article class="ductwork-panel reveal">
            <p class="eyebrow">Residential</p>
            <h2>Residential Ductwork Has to Fit the House</h2>
            <p>Residential ductwork has to work with the real framing, finished areas, equipment location and comfort goals.</p>
            ${ductworkPillList(ductworkResidentialProjects)}
          </article>
          <article class="ductwork-panel ductwork-commercial-panel reveal">
            <p class="eyebrow">Commercial</p>
            <h2>Commercial Air Distribution Requires Coordination</h2>
            <p>Commercial ductwork has to work mechanically while fitting around structure, electrical, plumbing, fire protection and architectural requirements.</p>
            ${ductworkPillList(ductworkCommercialScope)}
            <a class="button button-secondary" href="${link("/commercial/")}">View Commercial HVAC</a>
          </article>
        </div>
      </section>

      <section class="section ductwork-section ductwork-project-types-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Project Types",
            title: "New Duct Systems and Existing-System Modifications",
            text:
              "Modifying one branch can sometimes affect the rest of the system, so changes should be reviewed as part of the whole air-distribution layout.",
            align: "center",
          })}
          ${ductworkCardGrid(ductworkNewModified, "ductwork-two-panel-grid")}
        </div>
      </section>

      <section class="section ductwork-section ductwork-comfort-section">
        <div class="container ductwork-card-grid">
          <article class="ductwork-card reveal">
            ${ductworkIcon("return")}
            <p class="eyebrow">Return System</p>
            <h2>Return Air Is Often Overlooked</h2>
            <p>A good supply-air system still needs air to return to the furnace or air handler. Limited return capacity, closed room doors, poor return locations, undersized returns and restrictive grilles can all matter.</p>
          </article>
          <article class="ductwork-card reveal">
            ${ductworkIcon("airflow")}
            <p class="eyebrow">Comfort Problems</p>
            <h2>Uneven Temperatures Can Be an Air-Distribution Problem</h2>
            <p>Hot and cold rooms can be related to duct sizing, register location, return-air path, balancing, insulation, building load, equipment capacity or duct leakage.</p>
          </article>
          <article class="ductwork-card reveal">
            ${ductworkIcon("register")}
            <p class="eyebrow">Air Balancing</p>
            <h2>Air Has to Be Distributed Where It Is Needed</h2>
            <p>Dampers and branch design can influence how airflow is distributed between areas. Comfort problems should be evaluated as part of the complete HVAC system.</p>
            ${ductworkFlow(["Main Trunk", "Zone A", "Zone B", "Zone C"], "ductwork-zone-flow")}
          </article>
        </div>
      </section>

      <section class="section ductwork-section ductwork-workmanship-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Workmanship",
            title: "Ductwork Details That Affect the Finished System",
            text:
              "Clean ductwork is planned for airflow, supports, sealing, insulation, noise, access and future service.",
            align: "center",
          })}
          ${ductworkCardGrid(ductworkWorkmanshipItems)}
        </div>
      </section>

      <section class="section ductwork-section ductwork-install-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Installation Standard",
            title: "What Proper Ductwork Installation Actually Includes",
            text:
              "Air distribution is planning, sizing, fabrication, routing, support and final review working together.",
            align: "center",
          })}
          <div class="ductwork-install-grid">
            ${ductworkInstallItems
              .map(
                ([icon, title, text]) => `
                  <article class="ductwork-install-card reveal">
                    ${ductworkIcon(icon)}
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-problems-section">
        <div class="container ductwork-problems-grid">
          <div>
            <p class="eyebrow">Diagnostics</p>
            <h2>Common Ductwork Problems</h2>
            <p>Airflow issues should be diagnosed before assuming the equipment itself is the problem.</p>
          </div>
          <div class="ductwork-problem-list">
            ${ductworkProblems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
      </section>

      <section class="section ductwork-section ductwork-material-section">
        <div class="container ductwork-material-grid">
          <article class="ductwork-myth-panel">
            <p class="eyebrow">Capacity Myth</p>
            <h2>Bigger Ductwork Does Not Create More Heating or Cooling</h2>
            <p>Ductwork distributes the capacity produced by the HVAC equipment. Increasing duct size does not increase the furnace or air conditioner's rated output. The duct system should be designed to deliver the required airflow appropriately.</p>
          </article>
          ${ductworkMaterialPanels
            .map(
              (panel) => `
                <article class="ductwork-panel reveal">
                  <p class="eyebrow">Duct Materials</p>
                  <h3>${escapeHtml(panel.title)}</h3>
                  <p>${escapeHtml(panel.text)}</p>
                  ${ductworkPillList(panel.items)}
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="section gallery-section ductwork-gallery-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Recent Work",
            title: "Recent Ductwork Installations",
            text:
              "A look at recent Airrand residential and commercial ductwork installations throughout the GTA.",
          })}
          ${workSlider(work.photos, "Recent ductwork installations")}
        </div>
      </section>

      ${standardsStrip()}
      ${faqSection(service, faqs)}

      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Related Services",
            title: "Connected HVAC services from Airrand.",
            text:
              "Ductwork often connects with equipment replacement, heat pumps, furnaces, ventilation and commercial mechanical work.",
          })}
          ${servicesGrid(related)}
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta({
        title: "Need ductwork help in the GTA?",
        text:
          "Share the property type, location, equipment photos and ductwork concern so Airrand can recommend the right next step.",
      })}
    `,
  };
}

const hrvApplications = [
  {
    icon: "home",
    title: "Newer Homes",
    text: "Tighter construction can benefit from controlled fresh-air ventilation.",
  },
  {
    icon: "ducts",
    title: "Major Renovations",
    text: "Air-sealing and envelope upgrades can change how a home naturally exchanges air.",
  },
  {
    icon: "fresh",
    title: "Indoor Air Quality Upgrades",
    text: "Ventilation can help replace stale indoor air with controlled outdoor air.",
  },
  {
    icon: "space",
    title: "Finished Basements",
    text: "Additional occupied areas can increase ventilation requirements.",
  },
  {
    icon: "people",
    title: "High Occupancy Homes",
    text: "More people generally produce more moisture, odors and indoor contaminants.",
  },
  {
    icon: "controls",
    title: "Limited Natural Ventilation",
    text: "Mechanical ventilation is more predictable than relying on leakage or open windows.",
  },
];

const hrvDuctRoutingItems = [
  ["intake", "Intake Location", "Fresh air starts with the right exterior location."],
  ["exhaust", "Exhaust Location", "Stale air needs a proper discharge path."],
  ["ducts", "Duct Length", "Longer runs add resistance and planning requirements."],
  ["ducts", "Number of Fittings", "Turns and transitions affect airflow."],
  ["insulation", "Insulation", "Cold-side ducting may need protection."],
  ["humidity", "Condensation Control", "Moisture and cold surfaces have to be considered."],
  ["selection", "Supports", "Ductwork should be secured and serviceable."],
  ["fan", "Airflow Resistance", "The unit has to move air through the real route."],
  ["location", "Service Access", "Filters, core and fans need room for maintenance."],
];

const hrvControlItems = [
  ["fan", "Low-Speed Ventilation", "Steady background air exchange"],
  ["controls", "Intermittent Operation", "Scheduled ventilation cycles"],
  ["fresh", "High-Speed Boost", "Extra airflow when needed"],
  ["controls", "Timer Controls", "Temporary run periods"],
  ["humidity", "Bathroom Boost", "Humidity and odor response"],
  ["humidity", "Humidity-Based Control", "Model-dependent moisture settings"],
  ["controls", "Wall Controller", "Simple homeowner interface"],
  ["unit", "HVAC Integration", "Coordinated with the air handler"],
];

const hrvInstallItems = [
  ["selection", "Equipment Selection", "Choose equipment suitable for the building and application."],
  ["location", "Unit Location", "Provide service access and appropriate installation conditions."],
  ["intake", "Fresh-Air Intake", "Route outdoor intake appropriately."],
  ["exhaust", "Exhaust-Air Termination", "Provide appropriate exhaust routing and termination."],
  ["ducts", "Ductwork", "Size and route ventilation ductwork appropriately."],
  ["insulation", "Insulation", "Insulate cold-side ductwork where required."],
  ["drain", "Drainage", "Provide condensate drainage where applicable."],
  ["controls", "Controls", "Configure system controls and boost functions."],
  ["balance", "Balancing", "Set and verify supply and exhaust airflow."],
];

const hrvProblems = [
  ["fan", "Unit not operating"],
  ["fresh", "Weak airflow"],
  ["noise", "Excessive noise"],
  ["snow", "Frozen core"],
  ["drain", "Water leaking"],
  ["filter", "Dirty filters"],
  ["intake", "Blocked intake / exhaust"],
  ["controls", "Control problems"],
  ["balance", "Imbalanced airflow"],
  ["humidity", "Condensation issues"],
  ["fan", "Fan problems"],
  ["ducts", "Poor fresh-air distribution"],
];

const hrvFaqs = [
  {
    question: "What is the difference between an HRV and ERV?",
    answer:
      "An HRV primarily transfers heat between outgoing stale air and incoming fresh air. An ERV performs the same basic ventilation function but can also transfer some moisture between the air streams.",
  },
  {
    question: "Do I need an HRV or ERV?",
    answer:
      "The right choice depends on the home, humidity conditions, climate, occupancy and ventilation requirements. Airrand can review the building and explain which approach makes sense.",
  },
  {
    question: "Does an HRV heat my house?",
    answer:
      "No. An HRV recovers some heat from outgoing indoor air to temper incoming outdoor air, but it does not heat the incoming air to indoor temperature by itself.",
  },
  {
    question: "Does an ERV control humidity?",
    answer:
      "An ERV can transfer some moisture between air streams, but it is not a dedicated humidifier or dehumidifier. Proper humidity control equipment may still be needed.",
  },
  {
    question: "Should an HRV run all the time?",
    answer:
      "Operating strategy depends on the equipment, building and ventilation requirements. Some systems use continuous low-speed ventilation while others use scheduled or boost operation.",
  },
  {
    question: "Why is my HRV leaking water?",
    answer:
      "Drainage, condensation, freezing, blocked components or maintenance issues can contribute to water problems. The equipment, drain route and operating conditions should be checked.",
  },
  {
    question: "Why is my HRV freezing?",
    answer:
      "Cold-weather frost can occur in the recovery core. Different manufacturers use different defrost strategies, so the equipment and installation need to be reviewed together.",
  },
  {
    question: "How often should HRV filters be cleaned?",
    answer:
      "Maintenance intervals depend on the equipment, environment and usage. Filters, the core, drain pan, exterior hoods and fans should be inspected periodically.",
  },
  {
    question: "Can an HRV work with my existing furnace?",
    answer:
      "Often yes, but the best integration depends on the duct system, furnace or air handler, controls, house layout and ventilation goals.",
  },
  {
    question: "Does an HRV replace bathroom fans?",
    answer:
      "Not universally. Ventilation design varies, and local requirements and system design determine the correct exhaust strategy for bathrooms and other rooms.",
  },
  {
    question: "Can Airrand balance an HRV / ERV?",
    answer:
      "Yes. Airflow setup and balancing are part of proper ventilation work, because supply and exhaust flows need to be set appropriately for the system to operate as intended.",
  },
];

const hrvIcons = {
  fresh: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10a3 3 0 1 0-3-3" />
      <path d="M4 12h16" />
      <path d="M4 16h12a3 3 0 1 1-3 3" />
    </svg>
  `,
  exhaust: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 6h9" />
      <path d="M5 12h14" />
      <path d="M5 18h9" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  `,
  home: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  `,
  unit: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  `,
  heat: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M8 19c-1.4-2.4 1.4-4 0-6.3C7 11 7.4 9.2 9.2 8" />
      <path d="M13 19c-1.4-2.4 1.4-4 0-6.3C12 11 12.4 9.2 14.2 8" />
      <path d="M18 19c-1.4-2.4 1.4-4 0-6.3C17 11 17.4 9.2 19.2 8" />
    </svg>
  `,
  humidity: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z" />
      <path d="M9 15c1.2 1.4 4 1.4 6 0" />
    </svg>
  `,
  ducts: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 7h10v5h6" />
      <path d="M4 17h7v-5" />
      <path d="M14 4v6" />
      <path d="M20 9v6" />
    </svg>
  `,
  fan: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c-1-4 2-6 5-5 1.4 2.7 0 5.2-3.7 6" />
      <path d="M10.4 13.2c-4 1.2-6.2-1.6-5.2-4.6 3-.9 5.1.8 6.3 4.1" />
      <path d="M13.5 13.1c3 2.8 2.1 6.3-.8 7.3-2.4-2-2.2-4.8.2-7.2" />
    </svg>
  `,
  filter: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 5h14l-6 7v5l-2 2v-7z" />
      <path d="M8 9h8" />
    </svg>
  `,
  core: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M8 8l8 8" />
      <path d="M16 8l-8 8" />
    </svg>
  `,
  drain: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M6 5h12" />
      <path d="M8 5v6a4 4 0 0 0 8 0V5" />
      <path d="M12 15v5" />
      <path d="M9 20h6" />
    </svg>
  `,
  controls: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M10 7h4" />
      <circle cx="12" cy="13" r="2" />
    </svg>
  `,
  balance: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 4v16" />
      <path d="M5 8h14" />
      <path d="M7 8l-3 6h6z" />
      <path d="M17 8l-3 6h6z" />
    </svg>
  `,
  pressure: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 16a7 7 0 0 1 14 0" />
      <path d="M12 16l4-5" />
      <path d="M8 20h8" />
    </svg>
  `,
  intake: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 12h12" />
      <path d="M12 8l4 4-4 4" />
      <path d="M20 6v12" />
    </svg>
  `,
  commercial: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 20h16" />
      <path d="M6 20V6h8v14" />
      <path d="M14 10h4v10" />
      <path d="M8 9h3" />
      <path d="M8 13h3" />
    </svg>
  `,
  people: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M4 20a5 5 0 0 1 10 0" />
      <path d="M17 11a2.5 2.5 0 1 0 0-5" />
      <path d="M16 15a4.5 4.5 0 0 1 4 5" />
    </svg>
  `,
  space: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 20h16" />
      <path d="M6 20V8l6-4 6 4v12" />
      <path d="M9 20v-5h6v5" />
      <path d="M8 11h2" />
      <path d="M14 11h2" />
    </svg>
  `,
  snow: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3v18" />
      <path d="M5 7l14 10" />
      <path d="M19 7L5 17" />
      <path d="M8 3l4 4 4-4" />
      <path d="M8 21l4-4 4 4" />
    </svg>
  `,
  noise: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 14h4l5 4V6L8 10H4z" />
      <path d="M16 9c1 1.2 1 4.8 0 6" />
      <path d="M19 7c2 2.8 2 7.2 0 10" />
    </svg>
  `,
  insulation: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </svg>
  `,
  location: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  `,
  selection: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h14" />
      <path d="M9 6l2 2 4-4" />
    </svg>
  `,
};

function hrvIcon(key) {
  return hrvIcons[key] ?? hrvIcons.unit;
}

function hrvIconCardGrid(items, className = "hrv-card-grid") {
  return `
    <div class="${className}">
      ${items
        .map(
          (item) => `
            <article class="hrv-icon-card reveal">
              <span class="hrv-icon" aria-hidden="true">${hrvIcon(item.icon)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function hrvLinearFlow(items) {
  return `
    <div class="hrv-linear-flow" aria-label="${escapeHtml(items.join(" to "))}">
      ${items
        .map(
          (item, index) => `
            <div class="hrv-flow-node">
              <span>${escapeHtml(item)}</span>
            </div>
            ${index < items.length - 1 ? `<span class="hrv-flow-arrow" aria-hidden="true"></span>` : ""}
          `,
        )
        .join("")}
    </div>
  `;
}

function hrvAirflowDiagram() {
  const paths = [
    ["fresh", "Outdoor Fresh Air", "enters the ventilation unit"],
    ["home", "Fresh Air to Home", "tempered fresh air is supplied indoors"],
    ["exhaust", "Stale Air from Home", "stale indoor air returns to the unit"],
    ["intake", "Exhaust Air Outdoors", "stale air is discharged outside"],
  ];
  const renderPath = ([iconKey, title, text], index) => `
    <article class="hrv-path-card ${index >= 2 ? "hrv-path-card-exhaust" : ""}">
      <span class="hrv-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;

  return `
    <div class="hrv-airflow-diagram" aria-label="HRV and ERV airflow paths">
      <div class="hrv-path-grid">
        ${paths.slice(0, 2).map(renderPath).join("")}
      </div>
      <div class="hrv-core-row">
        <span aria-hidden="true"></span>
        <div class="hrv-core">
          <span class="hrv-icon" aria-hidden="true">${hrvIcon("core")}</span>
          <strong>Recovery Core</strong>
          <small>Air streams stay separate while energy transfers through the core.</small>
        </div>
        <span aria-hidden="true"></span>
      </div>
      <div class="hrv-path-grid">
        ${paths.slice(2).map((path, index) => renderPath(path, index + 2)).join("")}
      </div>
    </div>
  `;
}

function hrvControlGrid() {
  return `
    <div class="hrv-control-grid" aria-label="HRV and ERV control options">
      ${hrvControlItems
        .map(
          ([iconKey, title, text]) => `
            <article class="hrv-control-card">
              <span class="hrv-mini-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
              <strong>${escapeHtml(title)}</strong>
              <small>${escapeHtml(text)}</small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function hrvRoutingGrid() {
  return `
    <div class="hrv-routing-grid" aria-label="HRV and ERV duct routing considerations">
      ${hrvDuctRoutingItems
        .map(
          ([iconKey, title, text]) => `
            <article class="hrv-routing-card">
              <span class="hrv-mini-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
              <div>
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(text)}</small>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function hrvWorkPhotos() {
  return [
    ...(installationPhotos.ductwork ?? []).slice(0, 4),
    ...(installationPhotos["commercial-hvac"] ?? []).slice(0, 2),
    ...(installationPhotos.furnaces ?? []).slice(0, 2),
  ].map((photo) => ({
    ...photo,
    category: photo.category === "Furnaces" ? "Mechanical Room" : photo.category,
    filter: "ductwork",
  }));
}

function hrvErvPage(service) {
  const related = ["ductwork", "humidifiers", "furnaces", "commercial-hvac"]
    .map((slug) => serviceBySlug.get(slug))
    .filter(Boolean);
  const work = hrvWorkPhotos();

  return {
    pathname: `/services/${service.slug}/`,
    title: "HRV & ERV Installation & Service GTA | Airrand",
    description:
      "Airrand installs and services HRV and ERV whole-home ventilation systems throughout the Greater Toronto Area, including fresh-air ducting, controls, balancing and HVAC integration.",
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema(service),
      faqSchema(hrvFaqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: service.title, url: `/services/${service.slug}/` },
      ]),
    ],
    body: `
      <section class="page-hero service-hero hrv-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">Ventilation Service</p>
          <h1>HRV &amp; ERV Ventilation Services in the Greater Toronto Area</h1>
          <p>Airrand installs and services HRV and ERV systems that bring controlled fresh air into homes and buildings while exhausting stale indoor air.</p>
          <div class="hrv-hero-points" aria-label="HRV and ERV service focus">
            <span>Fresh air</span>
            <span>Controlled exhaust</span>
            <span>Energy recovery</span>
          </div>
          ${ctaButtons()}
        </div>
      </section>

      <section class="section hrv-section hrv-overview-section">
        <div class="container service-detail-grid">
          <article class="detail-copy">
            <p class="eyebrow">What Airrand Handles</p>
            <h2>Whole-home ventilation work with equipment, ductwork, controls and balancing in mind.</h2>
            <p>${escapeHtml(service.intro)} The goal is not just to mount a ventilation box near the furnace. The full system has to move air correctly, exhaust stale air properly and remain serviceable after installation.</p>
            <ul class="check-list">
              ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <aside class="service-aside hrv-aside">
            <h2>Common Applications</h2>
            <ul>
              ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <a class="button button-primary" href="${link("/contact/#quote-form")}">Book Ventilation Service</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
          </aside>
        </div>
      </section>

      <section class="section hrv-section hrv-need-section">
        <div class="container hrv-split">
          <article>
            <p class="eyebrow">Whole-Home Ventilation</p>
            <h2>Tighter Homes Need Controlled Fresh Air</h2>
            <p>Modern GTA homes are often built or renovated to reduce uncontrolled air leakage. That can improve energy performance, but stale indoor air may not naturally escape as quickly.</p>
            <p>A mechanical ventilation system can provide fresh outdoor air, controlled exhaust and more predictable air exchange without relying on random leakage through the building envelope.</p>
          </article>
          <aside class="hrv-visual-panel">
            ${hrvLinearFlow(["Outdoor Fresh Air", "Home", "Stale Air Exhausted"])}
          </aside>
        </div>
      </section>

      <section class="section hrv-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "How It Works",
            title: "Fresh Air In. Stale Air Out.",
            text:
              "HRV and ERV systems move fresh outdoor air and stale indoor air through separate paths. The two air streams remain separated while energy is transferred through the recovery core.",
            align: "center",
          })}
          ${hrvAirflowDiagram()}
        </div>
      </section>

      <section class="section hrv-section hrv-definition-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Heat Recovery</p>
            <h2>What Is an HRV?</h2>
            <p>A Heat Recovery Ventilator exchanges stale indoor air with fresh outdoor air while transferring heat between the two air streams.</p>
            <div class="hrv-mini-transfer">
              ${hrvLinearFlow(["Warm Indoor Exhaust", "Heat Transfer", "Cold Outdoor Fresh Air"])}
            </div>
            <ul class="check-list">
              <li>Warm indoor exhaust air transfers heat to colder incoming outdoor air in winter.</li>
              <li>The air streams remain separated.</li>
              <li>The incoming air is tempered, not fully heated by the HRV alone.</li>
            </ul>
          </article>
          <article class="hrv-feature-panel hrv-feature-panel-alt reveal">
            <p class="eyebrow">Energy Recovery</p>
            <h2>What Is an ERV?</h2>
            <p>An Energy Recovery Ventilator performs the same basic ventilation function, but it can transfer both heat and some moisture between the incoming and outgoing air streams.</p>
            <div class="hrv-mini-transfer hrv-mini-transfer-alt">
              ${hrvLinearFlow(["Fresh Air", "Heat + Some Moisture", "Exhaust Air"])}
            </div>
            <ul class="check-list">
              <li>Moisture transfer can help reduce how much moisture is lost or introduced through ventilation.</li>
              <li>An ERV is not a humidifier or dehumidifier.</li>
              <li>Moisture performance depends on the building and operating conditions.</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="section hrv-section hrv-comparison-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "System Comparison",
            title: "HRV vs. ERV",
            text:
              "Neither system is automatically better. The right choice depends on the building, climate, humidity conditions and ventilation requirements.",
            align: "center",
          })}
          <div class="hrv-comparison-grid">
            <article class="hrv-comparison-card reveal">
              <span class="hrv-icon" aria-hidden="true">${hrvIcon("heat")}</span>
              <p class="eyebrow">HRV</p>
              <h3>Transfers primarily heat</h3>
              <ul class="check-list">
                ${inlineList(["Winter ventilation", "Indoor humidity levels", "Building characteristics", "Climate", "Occupancy"])}
              </ul>
            </article>
            <article class="hrv-comparison-card hrv-comparison-card-erv reveal">
              <span class="hrv-icon" aria-hidden="true">${hrvIcon("humidity")}</span>
              <p class="eyebrow">ERV</p>
              <h3>Transfers heat + some moisture</h3>
              <ul class="check-list">
                ${inlineList(["Humidity management", "Building characteristics", "Occupancy", "Seasonal conditions", "Ventilation load"])}
              </ul>
            </article>
          </div>
          <div class="section-action">
            <a class="button button-primary" href="${link("/contact/#quote-form")}">Ask Airrand Which System Fits Your Home</a>
          </div>
        </div>
      </section>

      <section class="section hrv-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Applications",
            title: "When a Ventilation System Makes Sense",
            text:
              "Controlled ventilation can be useful when the building, occupancy or renovation work changes how the home exchanges air.",
            align: "center",
          })}
          ${hrvIconCardGrid(hrvApplications)}
        </div>
      </section>

      <section class="section hrv-section hrv-duct-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Duct Design</p>
            <h2>Fresh-Air Duct Routing Matters</h2>
            <p>HRV and ERV performance depends heavily on how the duct system is designed. A good ventilation unit connected to poor ductwork will not perform like a good ventilation system.</p>
            ${hrvRoutingGrid()}
          </article>
          <article class="hrv-feature-panel hrv-feature-panel-alt reveal">
            <p class="eyebrow">Exterior Terminations</p>
            <h2>Fresh-Air Intake and Exhaust Placement Matter</h2>
            <p>Fresh-air intake and stale-air exhaust locations should be planned so exhaust is not immediately drawn back into the intake. Weather protection, serviceability, obstructions and manufacturer requirements all matter.</p>
            <ul class="check-list">
              ${inlineList(["Suitable wall or roof locations", "Clear exterior hoods", "Weather protection", "Serviceable routing", "Manufacturer and code requirements"])}
            </ul>
          </article>
        </div>
      </section>

      <section class="section hrv-section hrv-balance-section">
        <div class="container hrv-split">
          <article>
            <p class="eyebrow">Airflow Balancing</p>
            <h2>A Ventilation System Has to Be Balanced</h2>
            <p>HRV and ERV systems move two separate air streams: fresh air supplied and stale air exhausted. Those flows should be set appropriately so the system operates as intended.</p>
            <p>Improper balance can affect building pressure, comfort, system performance, air distribution and ventilation effectiveness.</p>
            <strong class="hrv-statement">Installing the equipment is only part of the job. Airflow setup matters.</strong>
          </article>
          <aside class="hrv-balance-visual" aria-label="Balanced supply and exhaust airflow">
            <div>
              <span>Supply Air</span>
              <strong>100%</strong>
            </div>
            <span class="hrv-balance-center" aria-hidden="true">${hrvIcon("balance")}</span>
            <div>
              <span>Exhaust Air</span>
              <strong>100%</strong>
            </div>
          </aside>
        </div>
      </section>

      <section class="section hrv-section hrv-pressure-section">
        <div class="container">
          ${sectionHeading({
            title: "Balanced Ventilation vs. Pressure Problems",
            text: "The explanation stays high level, but the idea is important: supply and exhaust should be considered together.",
            align: "center",
          })}
          <div class="hrv-pressure-grid">
            ${[
              ["balance", "Balanced", "Supply and exhaust are appropriately matched."],
              ["exhaust", "Too Much Exhaust", "Can contribute to negative building pressure."],
              ["fresh", "Too Much Supply", "Can contribute to positive building pressure."],
            ]
              .map(
                ([iconKey, title, text]) => `
                  <article class="hrv-pressure-card reveal">
                    <span class="hrv-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section hrv-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">System Integration</p>
            <h2>HRV / ERV Integration With Your HVAC System</h2>
            <p>Ventilation systems can be configured differently depending on the building. The best arrangement depends on existing ductwork, furnace or air handler, house layout, ventilation goals and equipment design.</p>
            <ul class="check-list">
              ${inlineList(["Dedicated ventilation ductwork", "Partial connection to central ductwork", "Connection to return-air system", "Independent supply and exhaust points"])}
            </ul>
          </article>
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Controls</p>
            <h2>Does the Furnace Blower Need to Run?</h2>
            <p>Depending on how the ventilation system is connected, the central blower may need to operate during ventilation cycles. Other systems may use more independent ducting.</p>
            <p>The correct control strategy depends on duct configuration, equipment, controls and air distribution requirements.</p>
          </article>
        </div>
      </section>

      <section class="section hrv-section hrv-controls-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Controls</p>
            <h2>Ventilation Should Match How the Home Is Used</h2>
            <p>Control options vary by model and installation. HRV and ERV controls may support continuous low-speed ventilation, intermittent operation, high-speed boost, timer controls, bathroom boost, humidity-based operation or HVAC control integration.</p>
            ${hrvControlGrid()}
          </article>
          <article class="hrv-feature-panel hrv-feature-panel-alt reveal">
            <p class="eyebrow">Boost Ventilation</p>
            <h2>Extra Ventilation When You Need It</h2>
            <p>Some systems can temporarily increase ventilation during activities that create more humidity or odors, such as showers, cooking or large gatherings.</p>
            <p>An HRV or ERV does not automatically replace dedicated kitchen exhaust requirements.</p>
          </article>
        </div>
      </section>

      <section class="section hrv-section hrv-winter-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Winter Operation</p>
            <h2>Ventilation Equipment Can Produce Condensate</h2>
            <p>During cold-weather operation, moisture can condense inside some ventilation equipment. Proper installation may require a drain connection, slope, freeze protection considerations and accessible routing.</p>
            <strong class="hrv-statement">Drainage is part of the installation, not an afterthought.</strong>
          </article>
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Cold Weather</p>
            <h2>What Happens During Very Cold Weather?</h2>
            <p>During cold outdoor conditions, frost can develop in the heat-recovery core. Many systems use a defrost strategy to manage this.</p>
            <ul class="check-list">
              ${inlineList(["Adjust airflow", "Recirculate indoor air", "Change fan operation", "Enter a timed defrost cycle"])}
            </ul>
            <p>Defrost behavior varies by manufacturer and model.</p>
          </article>
        </div>
      </section>

      <section class="section hrv-section">
        <div class="container hrv-split">
          <article>
            <p class="eyebrow">Maintenance</p>
            <h2>Filters and Recovery Cores Need Attention</h2>
            <p>HRV and ERV systems contain components that require periodic inspection and cleaning. Maintenance requirements vary by equipment, environment and usage.</p>
            <ul class="check-list">
              ${inlineList(["Fresh-air filter", "Exhaust-air filter", "Recovery core", "Drain pan", "Condensate drain", "Exterior intake hood", "Exterior exhaust hood", "Fans"])}
            </ul>
          </article>
          <aside class="hrv-feature-panel hrv-maintenance-panel">
            <span class="hrv-icon" aria-hidden="true">${hrvIcon("filter")}</span>
            <h3>Maintenance supports airflow, drainage and long-term operation.</h3>
          </aside>
        </div>
      </section>

      <section class="section hrv-section hrv-problems-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Diagnostics",
            title: "Common Ventilation System Problems",
            text:
              "Ventilation problems can involve the equipment, controls, ductwork or airflow setup.",
            align: "center",
          })}
          <div class="hrv-problem-grid">
            ${hrvProblems
              .map(
                ([iconKey, title]) => `
                  <article class="hrv-problem-tile reveal">
                    <span class="hrv-mini-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
                    <strong>${escapeHtml(title)}</strong>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section hrv-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Humidity</p>
            <h2>Ventilation and Humidity Are Connected</h2>
            <p>Ventilation affects indoor moisture levels because outdoor and indoor air are continually being exchanged. In winter, outdoor air is often drier once heated indoors, and higher ventilation rates can contribute to lower indoor humidity.</p>
            <p>An ERV can transfer some moisture between air streams, but an ERV is not a whole-home humidifier.</p>
            <a class="button button-secondary" href="${link("/services/humidifiers/")}">View Whole-Home Humidifiers</a>
          </article>
          <article class="hrv-feature-panel hrv-feature-panel-alt reveal">
            <h2>Ventilation and Filtration Do Different Jobs</h2>
            <div class="hrv-mini-compare">
              <div>
                <span class="hrv-icon" aria-hidden="true">${hrvIcon("fresh")}</span>
                <strong>Ventilation</strong>
                <p>Replaces stale indoor air with outdoor air.</p>
              </div>
              <div>
                <span class="hrv-icon" aria-hidden="true">${hrvIcon("filter")}</span>
                <strong>Filtration</strong>
                <p>Removes particles from air moving through a filter.</p>
              </div>
            </div>
            <p>A good indoor-air strategy may use both, but they solve different problems.</p>
          </article>
        </div>
      </section>

      <section class="section hrv-section hrv-install-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Installation Standard",
            title: "What Proper HRV / ERV Installation Actually Includes",
            text:
              "A ventilation system is equipment, ductwork, controls, drainage, terminations and airflow setup working together.",
            align: "center",
          })}
          <div class="hrv-install-grid">
            ${hrvInstallItems
              .map(
                ([iconKey, title, text]) => `
                  <article class="hrv-install-card reveal">
                    <span class="hrv-icon" aria-hidden="true">${hrvIcon(iconKey)}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section hrv-section hrv-residential-commercial-section">
        <div class="container hrv-two-panel-grid">
          <article class="hrv-feature-panel reveal">
            <p class="eyebrow">Residential</p>
            <h2>Residential Ventilation</h2>
            <ul class="check-list">
              ${inlineList(["New homes", "Renovations", "Basement finishing", "Indoor air upgrades", "Existing-system replacement"])}
            </ul>
          </article>
          <article class="hrv-feature-panel hrv-feature-panel-alt reveal">
            <p class="eyebrow">Light Commercial</p>
            <h2>Commercial Mechanical Capability</h2>
            <ul class="check-list">
              ${inlineList(["Offices", "Small commercial spaces", "Mechanical-room ventilation integration", "HVAC upgrades"])}
            </ul>
            <a class="button button-secondary" href="${link("/commercial/")}">View Commercial HVAC</a>
          </article>
        </div>
      </section>

      ${standardsStrip()}

      <section class="section gallery-section hrv-gallery-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Recent Work",
            title: "Ventilation & Ductwork Projects",
            text:
              "A look at recent Airrand ventilation, ductwork and mechanical installations throughout the GTA.",
          })}
          ${workSlider(work, "Ventilation and ductwork projects")}
        </div>
      </section>

      ${faqSection(service, hrvFaqs)}

      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Related Services",
            title: "Connected HVAC services from Airrand.",
            text:
              "Ventilation often connects with ductwork, humidity control, heating equipment and commercial mechanical work.",
          })}
          ${servicesGrid(related)}
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta({
        title: "Need HRV or ERV help in the GTA?",
        text:
          "Share the home, equipment, ventilation concern and location so Airrand can recommend the right next step.",
      })}
    `,
  };
}

function servicePage(service) {
  if (service.slug === "water-heaters") {
    return waterHeatingPage(service);
  }
  if (service.slug === "gas-lines") {
    return gasLinesPage(service);
  }
  if (service.slug === "humidifiers") {
    return humidifiersPage(service);
  }
  if (service.slug === "ductwork") {
    return ductworkPage(service);
  }
  if (service.slug === "hrv-erv") {
    return hrvErvPage(service);
  }

  const isCoolingPage = service.slug === "air-conditioning";
  const isHeatPumpPage = service.slug === "heat-pumps";
  const isDuctlessPage = service.slug === "ductless-systems";
  const related = services.filter((item) => item.slug !== service.slug).slice(0, 4);
  const work = servicePhotos(service);
  const faqs = serviceFaqs(service);
  const pageTitle = isCoolingPage
    ? "Air Conditioning Services GTA | AC Repair & Installation | Airrand"
    : isHeatPumpPage
      ? "Heat Pump Installation & Service GTA | Airrand"
      : isDuctlessPage
      ? "Ductless Mini Split Installation & Service GTA | Airrand"
    : `${service.title} Services in the GTA`;
  const pageDescription = isCoolingPage
    ? "Airrand provides air conditioning installation, replacement, repair and maintenance for residential and commercial properties throughout the Greater Toronto Area."
    : isHeatPumpPage
      ? "Airrand installs and services heat-pump systems for homes and commercial properties throughout the Greater Toronto Area, including central and hybrid heating and cooling systems."
      : isDuctlessPage
      ? "Airrand installs and services ductless mini-split and multi-zone systems for homes and commercial spaces throughout the Greater Toronto Area."
    : service.meta;
  const workTitle = isHeatPumpPage
    ? "Heat Pump & High-Efficiency System Installations"
    : isDuctlessPage
    ? "Recent Ductless Installations"
    : work.exact
    ? photoHeadings[service.slug] ?? `Recent ${service.title.toLowerCase()} work.`
    : "Related project photos from Airrand's work.";
  const workText = isHeatPumpPage
    ? "A look at recent Airrand heating and cooling installations throughout the GTA."
    : isDuctlessPage
    ? "A look at recent Airrand ductless and mini-split installations throughout the GTA."
    : work.exact
    ? `These photos come from Airrand's existing ${photoSourceLabels[service.slug] ?? service.title.toLowerCase()} gallery.`
    : "This service does not currently have its own dedicated photo set, so these are relevant examples from Airrand's existing project gallery.";
  const heroHeading = isDuctlessPage
    ? "Ductless Mini-Split Services in the Greater Toronto Area"
    : `${service.title} Services in the Greater Toronto Area`;
  const detailHeading = isDuctlessPage
    ? "Professional ductless heating and cooling work with proper sizing, placement and clean installation."
    : `Professional ${service.title.toLowerCase()} work with clear scope and clean execution.`;
  const detailText = isDuctlessPage
    ? `${service.intro} The goal is a ductless system that fits the space, looks intentional and is set up for reliable long-term comfort.`
    : `${service.intro} The goal is a system that fits the building, operates properly and is left ready for long-term use.`;
  const finalCtaTitle = isDuctlessPage
    ? "Need ductless mini-split help?"
    : `Need ${service.title.toLowerCase()} help?`;
  const workSection = work.photos.length
    ? `<section class="section gallery-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Recent Work",
            title: workTitle,
            text: workText,
          })}
          ${workSlider(work.photos, workTitle)}
        </div>
      </section>`
    : "";

  return {
    pathname: `/services/${service.slug}/`,
    title: pageTitle,
    description: pageDescription,
    current: "services",
    image: service.image,
    schema: [
      businessSchema(),
      serviceSchema(service),
      faqSchema(faqs),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services/" },
        { name: service.title, url: `/services/${service.slug}/` },
      ]),
    ],
    body: `
      <section class="page-hero service-hero" style="${heroImageStyle(service.image)}">
        <div class="container">
          <p class="eyebrow">${escapeHtml(service.group)} Service</p>
          <h1>${escapeHtml(heroHeading)}</h1>
          <p>${escapeHtml(service.intro)}</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container service-detail-grid">
          <article class="detail-copy">
            <p class="eyebrow">What Airrand Handles</p>
            <h2>${escapeHtml(detailHeading)}</h2>
            <p>${escapeHtml(detailText)}</p>
            <ul class="check-list">
              ${service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <aside class="service-aside">
            <h2>Common Applications</h2>
            <ul>
              ${service.applications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <a class="button button-primary" href="${link("/contact/")}">Book Service</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
          </aside>
        </div>
      </section>
      ${service.slug === "furnaces" ? workSection : ""}
      ${service.slug === "furnaces" ? heatingEducationSections() : ""}
      ${isCoolingPage ? workSection : ""}
      ${isCoolingPage ? coolingEducationSections() : ""}
      ${isHeatPumpPage ? workSection : ""}
      ${isHeatPumpPage ? heatPumpEducationSections() : ""}
      ${isDuctlessPage ? ductlessEducationSections() : ""}
      ${standardsStrip()}
      ${service.slug === "furnaces" ? heatingMaintenanceSection() : ""}
      ${service.slug !== "furnaces" && !isCoolingPage && !isHeatPumpPage ? workSection : ""}
      ${faqSection(service, faqs)}
      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Related Services",
            title: "More HVAC services from Airrand.",
            text: "Airrand supports connected HVAC, gas, ventilation and water heating scopes across residential and commercial properties.",
          })}
          ${servicesGrid(related)}
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta({
        title: finalCtaTitle,
        text: "Share the equipment, property type and location so Airrand can recommend the right next step.",
      })}
    `,
  };
}

function residentialPage() {
  const residentialServices = services.filter((service) =>
    [
      "air-conditioning",
      "furnaces",
      "heat-pumps",
      "ductless-systems",
      "water-heaters",
      "tankless-water-heaters",
      "humidifiers",
      "hrv-erv",
      "hvac-repair",
      "hvac-maintenance",
    ].includes(service.slug),
  );

  return {
    pathname: "/residential/",
    title: "Residential HVAC Services in the GTA",
    description:
      "Residential HVAC installation, repair and maintenance for heating, cooling, ductless, water heating and indoor air quality across the GTA.",
    current: "services",
    image: "residential-hvac-house.webp",
    schema: [
      businessSchema(),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Residential HVAC", url: "/residential/" },
      ]),
    ],
    body: `
      <section class="page-hero compact-hero" style="${heroImageStyle("residential-hvac-house.webp")}">
        <div class="container">
          <p class="eyebrow">Residential HVAC</p>
          <h1>Heating, cooling and indoor comfort for homes across the GTA.</h1>
          <p>Airrand handles equipment replacement, repairs, maintenance, ductless systems, water heating and indoor air quality work for residential properties.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container detail-copy wide-copy">
          <h2>Comfort systems should be installed cleanly and explained clearly.</h2>
          <p>For homeowners, the difference between an average job and a dependable system often comes down to the details: equipment selection, airflow, piping, venting, controls and testing before the work is handed over.</p>
          <ul class="check-list columns">
            <li>Heating and cooling equipment replacement</li>
            <li>Repairs and maintenance</li>
            <li>Ductless and heat pump systems</li>
            <li>Water heaters and tankless systems</li>
            <li>Humidifiers and HRV / ERV ventilation</li>
            <li>Gas lines and fireplace-related gas work</li>
          </ul>
        </div>
      </section>
      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Residential Services",
            title: "Home HVAC services Airrand can help with.",
          })}
          ${servicesGrid(residentialServices)}
        </div>
      </section>
      ${finalCta({
        title: "Need HVAC service at home?",
        text: "Call or request a quote for residential heating, cooling, water heating, ductless or indoor air quality work.",
      })}
    `,
  };
}

const commercialPageCapabilityItems = [
  ["rooftop", "Rooftop Equipment", "Commercial heating and cooling equipment replacement, installation and service."],
  ["duct", "Ductwork", "Main trunks, branches, transitions, spiral duct and air-distribution systems."],
  ["fan", "Ventilation", "Fresh air, exhaust, make-up air and commercial ventilation systems."],
  ["gas", "Gas Piping", "Gas supply for rooftop units, heaters, boilers and other mechanical equipment where applicable."],
  ["mechanical", "Mechanical Rooms", "Clean equipment layouts, piping, ductwork and service-conscious installation."],
  ["replace", "Equipment Replacement", "Planning and coordination when existing commercial equipment reaches end of service life."],
  ["controls", "Controls", "Equipment controls, thermostats and system integration within Airrand's applicable scope."],
  ["service", "Service & Maintenance", "Diagnostics, repairs and ongoing support for commercial HVAC systems."],
];

const commercialSystemItems = [
  ["rooftop", "Rooftop Units", "Packaged commercial heating and cooling equipment."],
  ["split", "Split Systems", "Commercial indoor and outdoor systems where appropriate."],
  ["heat-pump", "Heat Pumps", "Commercial heating and cooling applications where suitable."],
  ["fan", "Make-Up Air Units", "Conditioned replacement air for commercial ventilation systems."],
  ["exhaust", "Exhaust Systems", "Air removal for appropriate commercial applications."],
  ["duct", "Duct Systems", "Supply, return and ventilation ductwork."],
  ["gas", "Gas-Fired Equipment", "Gas-fired mechanical equipment within Airrand's licensed scope."],
  ["water", "Hydronic Equipment", "Boilers, pumps, fan coils or related systems where applicable."],
];

const rooftopIncludes = ["Heating", "Cooling", "Supply airflow", "Ventilation", "Economizer functions where equipped", "Controls"];
const rooftopWork = [
  "Equipment replacement",
  "Service and diagnostics",
  "Gas connections",
  "Electrical coordination within scope",
  "Duct transition modifications",
  "Curb / equipment interface review",
  "Startup and testing",
  "Equipment-access coordination where required",
];
const rooftopReplacementFactors = [
  "Existing curb",
  "Supply opening",
  "Return opening",
  "Gas connection",
  "Electrical requirements",
  "Controls",
  "Drainage",
  "Ventilation requirements",
  "Equipment dimensions",
  "Weight",
  "Service clearances",
];
const commercialDuctItems = [
  "Rectangular duct",
  "Spiral duct",
  "Supply trunks",
  "Return duct",
  "Transitions",
  "Equipment connections",
  "Branch systems",
  "Diffuser connections",
  "Ventilation pathways",
];
const spiralDuctBenefits = ["Rigid construction", "Clean appearance", "Efficient round airflow path", "Suitable for exposed ceilings", "Long straight commercial runs"];
const ventilationNeeds = ["Outdoor air", "Exhaust", "Make-up air", "Pressure relationships", "Occupancy", "Equipment ventilation"];
const makeupAirSupports = ["Commercial exhaust", "Building pressure", "Mechanical ventilation", "Occupied spaces", "Specific process applications where appropriate"];
const commercialGasApplications = ["Rooftop units", "Make-up air equipment", "Unit heaters", "Boilers", "Water-heating equipment", "Mechanical rooms"];
const gasReviewItems = ["Equipment input", "Total connected load", "Pipe routing", "Supports", "Shutoffs", "Testing", "Serviceability"];
const mechanicalRoomItems = ["Heating equipment", "Cooling equipment", "Water heating", "Gas piping", "Ductwork", "Drainage", "Electrical", "Controls"];
const replacementProjectItems = [
  "Different cabinet sizes",
  "Different airflow",
  "New controls",
  "Different gas requirements",
  "New electrical requirements",
  "Duct modifications",
  "Ventilation changes",
  "Drainage changes",
];
const retrofitConstraints = [
  "Existing structure",
  "Occupied spaces",
  "Existing electrical",
  "Plumbing",
  "Sprinkler systems",
  "Finished ceilings",
  "Limited access",
  "Existing mechanical systems",
];
const fitoutItems = [
  "New supply runs",
  "New returns",
  "Diffuser relocation",
  "Duct modifications",
  "Exhaust",
  "Make-up air",
  "Equipment changes",
  "Thermostat / control relocation",
  "Gas piping",
];
const coordinationTrades = [
  ["electrical", "Electrical"],
  ["water", "Plumbing"],
  ["fire", "Fire Protection"],
  ["building", "Structure"],
  ["architectural", "Architectural"],
  ["controls", "Controls"],
];
const serviceAccessItems = ["Filters", "Motors", "Coils", "Controls", "Gas valves", "Electrical panels", "Drainage", "Belts where applicable", "Service panels"];
const commercialDiagnosticsItems = [
  ["heat", "Heating"],
  ["cool", "Cooling"],
  ["airflow", "Airflow"],
  ["controls", "Controls"],
  ["gas", "Gas"],
  ["electrical", "Electrical"],
  ["fan", "Ventilation"],
  ["rooftop", "Rooftop Equipment"],
  ["drain", "Drainage"],
];
const commercialMaintenanceItems = [
  "Filters",
  "Belts where equipped",
  "Coils",
  "Drainage",
  "Motors",
  "Electrical",
  "Heating operation",
  "Refrigeration performance",
  "Gas operation",
  "Ventilation",
  "Controls",
];
const commercialReviewItems = [
  ["equipment", "Existing Equipment", "What is currently installed?"],
  ["building", "Building Use", "How is the space being used?"],
  ["airflow", "Airflow", "How is air currently distributed?"],
  ["fan", "Ventilation", "What outdoor or exhaust airflow is required?"],
  ["utilities", "Utilities", "Gas, electrical and drainage conditions."],
  ["access", "Access", "Can equipment be installed and serviced?"],
  ["duct", "Existing Ductwork", "Can it support the proposed equipment?"],
  ["schedule", "Project Constraints", "Schedule, occupancy and other trades."],
];
const commercialProcessSteps = [
  ["01", "Site Review", "Understand the existing mechanical system and project requirements."],
  ["02", "Scope", "Define equipment, modifications and mechanical work."],
  ["03", "Coordination", "Review routing, access and other project conditions."],
  ["04", "Installation", "Complete the mechanical work cleanly and deliberately."],
  ["05", "Startup & Testing", "Verify the system operates as intended within Airrand's scope."],
  ["06", "Walkthrough", "Review the completed system and relevant operating information."],
];
const commercialBuildingTypes = ["Retail", "Offices", "Restaurants", "Warehouses", "Commercial units", "Light industrial", "Multi-use buildings", "Mechanical rooms"];
const commercialWhyItems = [
  ["workmanship", "Clean Workmanship", "Mechanical installations should look deliberate."],
  ["technical", "Technical Execution", "Equipment, airflow, gas, ductwork and controls have to work together."],
  ["communication", "Communication", "Customers should understand the scope and project status."],
  ["coordination", "Coordination", "Commercial HVAC has to fit around the building and other trades."],
  ["service", "Serviceability", "The finished system should remain practical to maintain."],
  ["long-term", "Long-Term Thinking", "Avoid solving today's problem in a way that creates tomorrow's problem."],
];
const commercialFaqs = [
  {
    question: "Does Airrand handle rooftop HVAC equipment?",
    answer: "Airrand works with appropriate commercial rooftop heating and cooling equipment for service, replacement and installation.",
  },
  {
    question: "Does Airrand install commercial ductwork?",
    answer:
      "Yes. Airrand handles rectangular duct, round duct, spiral duct, supply and return ductwork and ventilation systems for appropriate commercial projects.",
  },
  {
    question: "Can Airrand work in occupied commercial spaces?",
    answer:
      "Often, but project conditions, access, safety and scheduling should be reviewed before work begins. The goal is to plan the work clearly rather than promise zero disruption.",
  },
  {
    question: "Does Airrand handle make-up air systems?",
    answer: "Airrand works with appropriate commercial ventilation and make-up air equipment within its mechanical scope.",
  },
  {
    question: "Does Airrand install commercial gas piping?",
    answer:
      "Yes, for appropriate HVAC and mechanical equipment within licensed scope, including rooftop units, make-up air equipment, unit heaters, boilers and water-heating equipment.",
  },
  {
    question: "Can Airrand replace an existing rooftop unit?",
    answer: "Yes, subject to evaluating the existing equipment, curb, duct connections, gas, electrical, controls and access conditions.",
  },
  {
    question: "Does Airrand offer commercial HVAC maintenance?",
    answer:
      "Airrand provides commercial service and maintenance support for appropriate HVAC equipment. Routine maintenance can help identify developing problems before they become larger service issues.",
  },
  {
    question: "Can Airrand modify existing commercial ductwork?",
    answer: "Yes, depending on the existing system, airflow requirements, site conditions and project scope.",
  },
  {
    question: "Does Airrand work with general contractors?",
    answer: "Airrand can work alongside contractors and other trades on appropriate commercial HVAC and mechanical scopes.",
  },
  {
    question: "What information should I provide for a commercial quote?",
    answer:
      "Helpful details include the building address, type of space, equipment information if available, photos, drawings where available, description of work, project schedule and contact information.",
  },
];

function commercialIcon(key) {
  const icons = {
    rooftop: `<path d="M4 15h16v5H4z"/><path d="M7 15V8h10v7"/><path d="M9 11h6"/><path d="M10 5h4"/>`,
    duct: `<path d="M4 8h11l5 4-5 4H4z"/><path d="M8 8v8"/><path d="M15 8v8"/>`,
    fan: `<circle cx="12" cy="12" r="2"/><path d="M12 10c1-5 6-5 7-2 1 3-2 5-7 4"/><path d="M14 13c4 3 2 8-1 8-3 0-4-4-1-9"/><path d="M10 13c-5 2-8-2-6-5 2-2 6-1 8 4"/>`,
    gas: `<path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1.8 1.1-3.2 2.4-4.9"/><path d="M12 13c1-1 1.8-2.2 1.2-4 2.2 2 3.3 6 .3 8.1"/>`,
    mechanical: `<path d="M5 8h14v11H5z"/><path d="M8 8V5h8v3"/><path d="M8 12h8"/><path d="M8 16h4"/>`,
    replace: `<path d="M4 7h11a4 4 0 0 1 0 8H8"/><path d="m8 11-4 4 4 4"/><path d="M20 17H9"/>`,
    controls: `<path d="M7 4h10v16H7z"/><path d="M10 8h4"/><path d="M10 12h4"/><path d="M10 16h2"/>`,
    service: `<path d="m14.7 6.3 3 3"/><path d="M5 19l4.5-1.2L18 9.3 14.7 6 6.2 14.5z"/>`,
    split: `<path d="M4 7h7v10H4z"/><path d="M13 9h7v6h-7z"/><path d="M11 12h2"/>`,
    "heat-pump": `<path d="M7 7h10v10H7z"/><path d="M12 3v4"/><path d="M12 17v4"/><path d="m4 12 3 0"/><path d="m17 12 3 0"/>`,
    exhaust: `<path d="M4 8h9"/><path d="M4 12h13"/><path d="M4 16h7"/><path d="m15 9 4 3-4 3"/>`,
    water: `<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>`,
    electrical: `<path d="m13 2-7 12h6l-1 8 7-12h-6z"/>`,
    fire: `<path d="M12 3s5 4.8 5 10a5 5 0 0 1-10 0c0-2 1.2-3.6 2.8-5.7"/><path d="M12 14c1.2-1.3 2-2.9 1.2-5 2.8 2.3 3.6 8-1.2 8"/>`,
    building: `<path d="M4 20h16"/><path d="M6 20V5h12v15"/><path d="M9 9h2"/><path d="M13 9h2"/><path d="M9 13h2"/><path d="M13 13h2"/>`,
    architectural: `<path d="M4 18 12 4l8 14"/><path d="M8 18h8"/><path d="M10 14h4"/>`,
    heat: `<path d="M7 17c0-2 2-2 2-4s-2-2-2-4"/><path d="M12 17c0-2 2-2 2-4s-2-2-2-4"/><path d="M17 17c0-2 2-2 2-4s-2-2-2-4"/>`,
    cool: `<path d="M12 3v18"/><path d="m5 7 14 10"/><path d="m19 7-14 10"/>`,
    airflow: `<path d="M4 8h11a3 3 0 1 0-3-3"/><path d="M4 14h14a3 3 0 1 1-3 3"/>`,
    drain: `<path d="M6 4h12v8a6 6 0 0 1-12 0z"/><path d="M9 20h6"/>`,
    equipment: `<path d="M5 5h14v14H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h4"/>`,
    utilities: `<path d="M5 7h14"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M9 17h6"/>`,
    access: `<path d="M6 5h12v14H6z"/><path d="M10 12h4"/><path d="M15 12h.1"/>`,
    schedule: `<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><path d="M5 5h14v16H5z"/>`,
    workmanship: `<path d="M4 18h16"/><path d="M7 18V9l5-4 5 4v9"/><path d="M10 18v-5h4v5"/>`,
    technical: `<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4 12H2"/><path d="M22 12h-2"/><circle cx="12" cy="12" r="5"/>`,
    communication: `<path d="M4 5h16v11H7l-3 3z"/><path d="M8 9h8"/><path d="M8 12h5"/>`,
    coordination: `<circle cx="12" cy="12" r="3"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/>`,
    "long-term": `<path d="M4 12a8 8 0 1 1 3 6.2"/><path d="M4 18v-6h6"/><path d="M12 8v5l3 2"/>`,
  };

  return `
    <span class="commercial-page-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${icons[key] ?? icons.mechanical}
      </svg>
    </span>
  `;
}

function commercialCardGrid(items, className = "commercial-page-card-grid") {
  return `
    <div class="${className}">
      ${items
        .map(
          ([icon, title, text]) => `
            <article class="commercial-page-card">
              ${commercialIcon(icon)}
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(text)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function commercialPillList(items, className = "commercial-page-pill-list") {
  return `
    <ul class="${className}">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function commercialFlow(items, className = "") {
  return `
    <div class="commercial-page-flow ${className}">
      ${items
        .map(
          (item, index) => `
            <span>${escapeHtml(item)}</span>
            ${index < items.length - 1 ? `<i aria-hidden="true"></i>` : ""}
          `,
        )
        .join("")}
    </div>
  `;
}

function commercialPhoto(image, alt, caption) {
  return `
    <figure class="commercial-page-photo">
      <img src="${asset(image)}" alt="${escapeHtml(alt)}" loading="lazy" width="920" height="640">
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function commercialFaqSection() {
  return `
    <section class="section commercial-page-faq">
      <div class="container faq-shell">
        ${sectionHeading({
          eyebrow: "FAQ",
          title: "Commercial HVAC FAQ",
          text: "Common questions about Airrand commercial HVAC, ductwork, ventilation, gas piping, service and project quotes.",
          align: "center",
        })}
        <div class="faq-list">
          ${commercialFaqs
            .map(
              (faq) => `
                <details class="faq-item">
                  <summary><span>${escapeHtml(faq.question)}</span></summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function commercialQuoteButtons(extraClass = "") {
  return `
    <div class="button-row ${extraClass}">
      <a class="button button-primary" href="${link(quoteRequestPath)}">Request a Commercial Quote</a>
      <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
    </div>
  `;
}

function commercialPage() {
  const commercialServices = services.filter((service) =>
    [
      "commercial-hvac",
      "ductwork",
      "gas-lines",
      "hvac-installation",
      "hvac-repair",
      "hvac-maintenance",
      "air-conditioning",
      "furnaces",
      "heat-pumps",
      "water-heaters",
    ].includes(service.slug),
  );
  const commercialWorkPhotos = [
    ...(installationPhotos["commercial-hvac"] ?? []),
    ...(installationPhotos.ductwork ?? []).slice(0, 8),
    ...(installationPhotos["gas-lines"] ?? []).slice(0, 4),
  ].map((photo) => ({ ...photo, filter: "commercial" }));
  const rooftopPhoto = commercialWorkPhotos.find((photo) => photo.image.includes("rooftop")) ?? commercialWorkPhotos[0];
  const ductPhoto = (installationPhotos.ductwork ?? [])[0];
  const spiralPhoto = (installationPhotos.ductwork ?? [])[2] ?? ductPhoto;
  const mechanicalPhoto =
    commercialWorkPhotos.find((photo) => photo.image.includes("mechanical-room")) ??
    (installationPhotos["commercial-hvac"] ?? [])[1] ??
    rooftopPhoto;

  return {
    pathname: "/commercial/",
    title: "Commercial HVAC & Mechanical Contractor GTA | Airrand",
    description:
      "Airrand provides commercial HVAC and mechanical services throughout the GTA, including rooftop equipment, ductwork, ventilation, make-up air, gas piping, equipment replacement, service and maintenance.",
    current: "commercial",
    image: "hero-hvac-work.webp",
    schema: [
      businessSchema(),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Commercial HVAC", url: "/commercial/" },
      ]),
    ],
    body: `
      <section class="page-hero commercial-hero" style="${heroImageStyle("hero-hvac-work.webp")}">
        <div class="container">
          <p class="eyebrow">Commercial Mechanical</p>
          <h1>Commercial HVAC &amp; Mechanical Services Across the GTA</h1>
          <p>Airrand supports commercial buildings with heating, cooling, ventilation, ductwork, gas piping, rooftop equipment, mechanical upgrades, service and maintenance.</p>
          ${commercialQuoteButtons()}
          <div class="commercial-hero-points" aria-label="Commercial capabilities">
            <span>Commercial HVAC</span>
            <span>Ventilation</span>
            <span>Ductwork</span>
            <span>Gas</span>
            <span>Mechanical</span>
          </div>
        </div>
      </section>

      <section class="section commercial-page-section commercial-page-capability">
        <div class="container commercial-page-intro-grid">
          <article>
            <p class="eyebrow">Commercial Capability</p>
            <h2>Commercial Work Is More Than Replacing Equipment</h2>
            <p>Commercial HVAC projects require coordination between equipment, airflow, controls, piping, ventilation, building conditions and other trades. Airrand approaches the work as a complete mechanical system rather than a collection of individual components.</p>
            <p class="commercial-page-statement">Commercial mechanical work has to fit the building, the schedule, the equipment and the people who will service it later.</p>
          </article>
          ${commercialCardGrid(commercialPageCapabilityItems, "commercial-page-capability-grid")}
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Equipment & Systems",
            title: "Commercial HVAC Is a Connected Mechanical System",
            text:
              "Commercial work can involve rooftop equipment, duct systems, ventilation, gas-fired equipment, hydronic equipment and service access. Each piece has to work with the building around it.",
          })}
          ${commercialCardGrid(commercialSystemItems, "commercial-page-system-grid")}
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container commercial-page-feature-grid">
          <div>
            <p class="eyebrow">Rooftop HVAC</p>
            <h2>Rooftop Equipment for Commercial Buildings</h2>
            <p>Packaged rooftop units can combine heating, cooling, supply airflow, ventilation, economizer functions where equipped and controls in one commercial HVAC system.</p>
            ${commercialPillList(rooftopIncludes)}
          </div>
          ${rooftopPhoto ? commercialPhoto(rooftopPhoto.image, rooftopPhoto.alt, "Commercial rooftop equipment and mechanical work from the Airrand project gallery.") : ""}
          <article class="commercial-page-panel commercial-page-panel-blue">
            <h3>Airrand rooftop work may include</h3>
            ${commercialPillList(rooftopWork)}
          </article>
          <article class="commercial-page-panel">
            <p class="eyebrow">Replacement Planning</p>
            <h3>New Rooftop Equipment Has to Fit the Existing Building</h3>
            <p>A replacement unit may fit the heating and cooling load while still requiring mechanical modifications to integrate properly with the existing building.</p>
            ${commercialPillList(rooftopReplacementFactors, "commercial-page-compact-list")}
          </article>
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container commercial-page-photo-grid">
          ${ductPhoto ? commercialPhoto(ductPhoto.image, ductPhoto.alt, "Commercial ductwork, transitions and air-distribution work.") : ""}
          <div>
            <p class="eyebrow">Air Distribution</p>
            <h2>Commercial Ductwork &amp; Air Distribution</h2>
            <p>Airrand handles appropriate commercial duct systems including rectangular duct, spiral duct, supply trunks, return duct, transitions, equipment connections and ventilation pathways.</p>
            <p class="commercial-page-statement">Ductwork has to move the required airflow while fitting around structure, electrical, plumbing, fire protection and architectural elements.</p>
            ${commercialPillList(commercialDuctItems)}
            <a class="button button-secondary" href="${link("/services/ductwork/")}">Explore Ductwork Services</a>
          </div>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container commercial-page-split">
          <article>
            <p class="eyebrow">Sheet Metal</p>
            <h2>Spiral Duct for Commercial Spaces</h2>
            <p>Spiral duct can provide rigid construction, clean appearance and an efficient round airflow path for commercial spaces where the ductwork may be visible or run long distances.</p>
            ${commercialPillList(spiralDuctBenefits)}
            <blockquote>When ductwork is exposed, workmanship becomes part of the finished space.</blockquote>
          </article>
          ${spiralPhoto ? commercialPhoto(spiralPhoto.image, spiralPhoto.alt, "Spiral and commercial ductwork are part of Airrand's broader mechanical capability.") : ""}
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container commercial-page-air-grid">
          <article>
            <p class="eyebrow">Building Airflow</p>
            <h2>Commercial Ventilation Has to Match the Building</h2>
            <p>Commercial buildings may require systems for outdoor air, exhaust, make-up air, pressure relationships, occupancy and equipment ventilation.</p>
            ${commercialFlow(["Outdoor Air", "Mechanical Equipment", "Occupied Space", "Exhaust / Return"])}
            ${commercialPillList(ventilationNeeds)}
          </article>
          <article>
            <p class="eyebrow">Make-Up Air</p>
            <h2>Replacing the Air That Leaves the Building</h2>
            <p>When exhaust systems remove air from a building, replacement air may need to be introduced in a controlled way. Make-up air equipment can involve heating, airflow, gas, controls, ductwork and an outdoor-air intake.</p>
            ${commercialPillList(makeupAirSupports)}
          </article>
        </div>
      </section>

      <section class="section commercial-page-section commercial-pressure-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Air Balance",
            title: "Commercial Buildings Have to Breathe Properly",
            text:
              "Supply and exhaust need to be coordinated at a high level. Too much exhaust can contribute to negative pressure, while too much supply can contribute to positive pressure.",
            align: "center",
          })}
          <div class="commercial-pressure-grid">
            <article>
              ${commercialIcon("airflow")}
              <h3>Balanced</h3>
              <p>Supply and exhaust appropriately coordinated.</p>
            </article>
            <article>
              ${commercialIcon("exhaust")}
              <h3>Negative</h3>
              <p>More air leaving than entering can contribute to drafts, door issues and infiltration.</p>
            </article>
            <article>
              ${commercialIcon("fan")}
              <h3>Positive</h3>
              <p>More air entering than leaving can affect comfort and ventilation performance.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container commercial-page-split">
          <article>
            <p class="eyebrow">Commercial Gas</p>
            <h2>Gas Piping for Commercial Mechanical Equipment</h2>
            <p>Commercial gas work should account for equipment input, total connected load, pipe routing, supports, shutoffs, testing and serviceability.</p>
            ${commercialPillList(commercialGasApplications)}
            <a class="button button-secondary" href="${link("/services/gas-lines/")}">Explore Gas Piping</a>
          </article>
          <article class="commercial-page-panel commercial-page-panel-orange">
            <h3>Gas piping review includes</h3>
            ${commercialPillList(gasReviewItems)}
          </article>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container commercial-page-photo-grid commercial-page-photo-grid-reverse">
          <div>
            <p class="eyebrow">Mechanical Rooms</p>
            <h2>Mechanical Rooms Should Look Intentional</h2>
            <p>Mechanical rooms often combine heating equipment, cooling equipment, water heating, gas piping, ductwork, drainage, electrical and controls.</p>
            ${commercialPillList(mechanicalRoomItems)}
            <blockquote>Clean mechanical work is easier to understand, inspect and service.</blockquote>
          </div>
          ${mechanicalPhoto ? commercialPhoto(mechanicalPhoto.image, mechanicalPhoto.alt, "Organized mechanical-room work supports long-term serviceability.") : ""}
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container commercial-page-three-panel">
          <article>
            <p class="eyebrow">System Upgrades</p>
            <h2>Replacing Equipment Without Ignoring the Rest of the System</h2>
            <p>The replacement equipment may be new, but the building around it is existing. The two have to work together.</p>
            ${commercialPillList(replacementProjectItems, "commercial-page-compact-list")}
          </article>
          <article>
            <p class="eyebrow">Retrofit Work</p>
            <h2>Existing Buildings Rarely Give You a Blank Canvas</h2>
            <p>Airrand looks for practical routing and installation solutions within real site conditions.</p>
            ${commercialPillList(retrofitConstraints, "commercial-page-compact-list")}
          </article>
          <article>
            <p class="eyebrow">Renovations</p>
            <h2>HVAC for Commercial Fit-Outs and Renovations</h2>
            <p>Commercial renovations can require air distribution, ventilation, equipment and gas changes in the same scope.</p>
            ${commercialPillList(fitoutItems, "commercial-page-compact-list")}
          </article>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container commercial-page-coordination">
          <article>
            <p class="eyebrow">Project Coordination</p>
            <h2>Mechanical Work Has to Fit Around Other Trades</h2>
            <p>Commercial HVAC installations rarely exist in isolation. Routing and equipment placement must account for other building systems without implying Airrand is responsible for those separate trade scopes.</p>
          </article>
          <div class="commercial-coordination-map">
            <strong>HVAC</strong>
            ${coordinationTrades
              .map(([icon, label]) => `<span>${commercialIcon(icon)}${escapeHtml(label)}</span>`)
              .join("")}
          </div>
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container commercial-page-service-grid">
          <article>
            <p class="eyebrow">Long-Term Operation</p>
            <h2>Equipment Still Has to Be Serviced After Installation</h2>
            <p>A mechanical installation is not finished if routine service requires dismantling the surrounding system.</p>
            ${commercialPillList(serviceAccessItems)}
          </article>
          <article>
            <p class="eyebrow">Diagnostics</p>
            <h2>Commercial HVAC Service &amp; Troubleshooting</h2>
            <p>Diagnostics may involve more than one component: equipment, airflow, controls, gas, electrical, ventilation, rooftop equipment and drainage all matter.</p>
            ${commercialCardGrid(commercialDiagnosticsItems, "commercial-page-mini-grid")}
            <a class="button button-primary" href="${link(quoteRequestPath)}">Request Commercial Service</a>
          </article>
          <article>
            <p class="eyebrow">Preventive Maintenance</p>
            <h2>Commercial Equipment Benefits From Planned Maintenance</h2>
            <p>Routine maintenance can help identify developing problems before they become larger service issues.</p>
            ${commercialPillList(commercialMaintenanceItems)}
          </article>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Project Review",
            title: "Every Commercial Project Starts With the Building",
            text:
              "Commercial HVAC review starts with the existing equipment, building use, airflow, ventilation, utilities, access, ductwork and project constraints.",
            align: "center",
          })}
          ${commercialCardGrid(commercialReviewItems, "commercial-page-review-grid")}
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "How We Work",
            title: "From Site Review to Startup",
            text: "A clear process helps commercial mechanical scopes stay organized from first review through startup and handoff.",
            align: "center",
          })}
          <div class="commercial-process">
            ${commercialProcessSteps
              .map(
                ([number, title, text]) => `
                  <article>
                    <span>${escapeHtml(number)}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container commercial-page-building-grid">
          <article>
            <p class="eyebrow">Commercial Applications</p>
            <h2>Commercial HVAC for Different Building Types</h2>
            <p>Airrand can review appropriate commercial HVAC and mechanical scopes for retail, offices, restaurants, warehouses, commercial units, light industrial spaces, multi-use buildings and mechanical rooms.</p>
            ${commercialPillList(commercialBuildingTypes)}
          </article>
          <article class="commercial-page-panel">
            <p class="eyebrow">Different Scale. Same Discipline.</p>
            <h2>Commercial HVAC Requires Different Coordination</h2>
            <p>Commercial systems may involve larger airflow, rooftop equipment, multiple zones, ventilation requirements, larger duct systems, other trades, equipment access and occupancy considerations.</p>
            <p class="commercial-page-statement">The fundamentals remain the same: proper equipment, proper airflow, clean installation and correct setup.</p>
          </article>
        </div>
      </section>

      <section class="section muted-section commercial-page-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Airrand Projects",
            title: "See the Work Behind the Finished System",
            text:
              "Real Airrand commercial project photos show rooftop equipment, ductwork, ventilation pathways, gas piping and mechanical installation work across the GTA.",
          })}
          ${commercialWorkPhotos.length ? workSlider(commercialWorkPhotos, "Airrand commercial HVAC and mechanical project photos") : ""}
          <div class="commercial-project-link">
            <a class="button button-secondary" href="${link("/gallery/")}">View Commercial Projects</a>
          </div>
        </div>
      </section>

      <section class="section commercial-page-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Commercial Approach",
            title: "What Matters on Commercial Mechanical Work",
            text:
              "The details that matter are the same details customers notice later: clean routing, clear communication, coordinated installation and service access.",
            align: "center",
          })}
          ${commercialCardGrid(commercialWhyItems, "commercial-page-why-grid")}
        </div>
      </section>

      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Related Commercial Services",
            title: "HVAC and mechanical scopes for commercial properties.",
            text: "Explore service pages connected to commercial heating, cooling, ductwork, gas, maintenance and mechanical installation work.",
          })}
          ${servicesGrid(commercialServices)}
        </div>
      </section>
      ${commercialFaqSection()}
      ${serviceAreaSection()}
      <section class="final-cta commercial-final-cta">
        <div class="container final-cta-shell">
          <div>
            <p class="eyebrow">Commercial HVAC &amp; Mechanical</p>
            <h2>Planning a Commercial HVAC Project?</h2>
            <p>Whether you are replacing equipment, modifying ductwork, addressing ventilation or planning a larger mechanical scope, Airrand can review the project and discuss the available options.</p>
          </div>
          <div class="button-row">
            <a class="button button-primary" href="${link(quoteRequestPath)}">Request a Commercial Quote</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
            <a class="button button-secondary" href="${link("/gallery/")}">View Commercial Work</a>
          </div>
        </div>
      </section>
    `,
  };
}

function galleryPage() {
  return {
    pathname: "/gallery/",
    title: "HVAC Gallery",
    description:
      "Browse Airrand's HVAC gallery for heating, cooling, ductwork, gas, ductless, water heating and commercial mechanical visuals.",
    current: "gallery",
    image: "hero-hvac-work.webp",
    schema: [
      businessSchema(),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Gallery", url: "/gallery/" },
      ]),
    ],
    body: `
      <section class="page-hero compact-hero" style="${heroImageStyle("hero-hvac-work.webp")}">
        <div class="container">
          <p class="eyebrow">Gallery</p>
          <h1>HVAC work, equipment and mechanical detail.</h1>
          <p>Browse heating, cooling, ductwork, gas, ductless, water heating and commercial HVAC photos from Airrand's existing gallery.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Gallery",
            title: "Browse by work type.",
            text:
              "Use the filters to review real installation photos by service category.",
          })}
          ${galleryGrid({ filters: true })}
        </div>
      </section>
      ${finalCta({
        title: "Have a project that needs careful HVAC work?",
        text: "Send the details and any site photos so Airrand can review the scope.",
      })}
    `,
  };
}

const aboutPrinciples = [
  {
    title: "Quality Workmanship",
    text:
      "HVAC installations should look as professional as they perform. Routing, supports, piping, wiring, drainage, ductwork and equipment placement should be clean and intentional.",
  },
  {
    title: "Proper Installation",
    text:
      "Even premium equipment can perform poorly when it is incorrectly sized, installed or commissioned. Proper setup matters.",
    details: ["Airflow", "Refrigerant charge", "Gas pressure", "Venting", "Drainage", "Electrical", "Controls", "Startup"],
  },
  {
    title: "Clear Communication",
    text:
      "Customers should understand what work is being done, why it is being done, what equipment is being installed and how the system operates after the job is complete.",
  },
  {
    title: "Practical Recommendations",
    text:
      "Different projects have different budgets, priorities and applications. Airrand works with multiple manufacturers and system types so recommendations can fit the project.",
    link: "/brands/",
    linkText: "Explore Equipment Options",
  },
  {
    title: "Built for Long-Term Reliability",
    text:
      "The goal is not simply to make equipment operate on installation day. The system should be installed with serviceability, maintenance and long-term performance in mind.",
  },
];

const residentialCapabilityItems = [
  "Heating",
  "Cooling",
  "Heat Pumps",
  "Indoor Air Quality",
  "Water Heating",
];

const commercialCapabilityItems = [
  "Rooftop Equipment",
  "Ductwork",
  "Ventilation",
  "Gas & Mechanical",
  "Equipment Service",
];

const technicalSetupItems = [
  "Proper sizing",
  "Airflow",
  "Refrigerant setup",
  "Gas pressure",
  "Venting",
  "Electrical",
  "Drainage",
  "Controls",
  "Commissioning",
];

const technicalSetupIcons = {
  "Proper sizing": `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M5 19V5h14" />
      <path d="M5 9h4" />
      <path d="M5 13h6" />
      <path d="M5 17h4" />
      <path d="M13 17l5-5" />
      <path d="M15 12h3v3" />
    </svg>
  `,
  Airflow: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h10.5a2.5 2.5 0 1 0-2.2-3.7" />
      <path d="M4 12h15" />
      <path d="M4 16h10.5a2.5 2.5 0 1 1-2.2 3.7" />
    </svg>
  `,
  "Refrigerant setup": `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M7 15a4 4 0 0 1 8 0" />
      <path d="M11 15l2-3" />
      <path d="M5 15h12" />
      <path d="M19 6v8" />
      <path d="M15.5 8l7 4" />
      <path d="M22.5 8l-7 4" />
    </svg>
  `,
  "Gas pressure": `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M8 16a4 4 0 1 0 8 0c0-2.8-3-4.4-2.6-8-2.4 1.4-5.4 4.1-5.4 8Z" />
      <path d="M13.5 16a1.5 1.5 0 0 1-3 0c0-1.1 1.1-1.8 1-3.1 1.1.8 2 1.8 2 3.1Z" />
      <path d="M5 21h14" />
      <path d="M17 7a3 3 0 0 1 3 3" />
      <path d="M20 10h-2" />
    </svg>
  `,
  Venting: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M4 8h9l4 4-4 4H4Z" />
      <path d="M13 8v8" />
      <path d="M18 9.5h2.5" />
      <path d="M18 12h3.5" />
      <path d="M18 14.5h2.5" />
    </svg>
  `,
  Electrical: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M13 3L6 14h5l-1 7 8-12h-5Z" />
      <path d="M5 20h3" />
      <path d="M16 4h3" />
    </svg>
  `,
  Drainage: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 3s5 5.4 5 9a5 5 0 0 1-10 0c0-3.6 5-9 5-9Z" />
      <path d="M8 20h8" />
      <path d="M10 16c.7.6 1.4.9 2.3.9" />
    </svg>
  `,
  Controls: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <rect x="6" y="3.5" width="12" height="17" rx="3" />
      <path d="M9 8h6" />
      <path d="M9 12h2" />
      <path d="M13 12h2" />
      <path d="M9 16h6" />
    </svg>
  `,
  Commissioning: `
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M8 4h8" />
      <path d="M9 3h6l1 3H8Z" />
      <path d="M6 6h12v15H6Z" />
      <path d="M9 13l2 2 4-5" />
      <path d="M9 18h6" />
    </svg>
  `,
};

function technicalSetupIcon(item) {
  return technicalSetupIcons[item] ?? technicalSetupIcons.Commissioning;
}

const serviceProcess = [
  ["Conversation", "Understand the problem, project or goal."],
  ["Assessment", "Evaluate the existing system and application."],
  ["Recommendation", "Explain appropriate options without unnecessary upselling."],
  ["Installation or Service", "Perform the work carefully and professionally."],
  ["Testing", "Verify that the system operates properly."],
  ["Walkthrough", "Explain the completed work and equipment operation."],
];

const aboutValues = [
  ["Clean", "The finished installation should look deliberate and professional."],
  ["Correct", "Systems should be selected, installed and commissioned properly."],
  ["Clear", "Customers should understand what they are paying for and how their system works."],
  ["Reliable", "The work should be built with long-term operation and serviceability in mind."],
];

const aboutWorkPhotos = [
  {
    category: "Commercial Ductwork",
    image: "work/commercial-hvac-03.webp",
    alt: "Commercial ductwork installation from the Airrand project gallery",
  },
  {
    category: "Residential HVAC",
    image: "work/air-conditioning-01.webp",
    alt: "Air conditioning condenser installation from the Airrand project gallery",
  },
  {
    category: "Mechanical",
    image: "work/furnaces-01.webp",
    alt: "Furnace and water heater installation from the Airrand project gallery",
  },
  {
    category: "Clean Ductwork",
    image: "work/ductwork-04.webp",
    alt: "Clean ductwork installation detail from the Airrand project gallery",
  },
];

const instagramPreviewPhotos = [
  {
    category: "Furnace Work",
    image: "work/furnaces-07.webp",
    alt: "Mechanical room furnace installation from the Airrand project gallery",
  },
  {
    category: "Air Conditioning",
    image: "work/air-conditioning-05.webp",
    alt: "Air conditioning condenser installation from the Airrand project gallery",
  },
  {
    category: "Ductwork",
    image: "work/ductwork-04.webp",
    alt: "Ductwork installation detail from the Airrand project gallery",
  },
  {
    category: "Commercial HVAC",
    image: "work/commercial-hvac-05.webp",
    alt: "Commercial HVAC installation from the Airrand project gallery",
  },
];

const workmanshipDescriptors = ["Straight", "Supported", "Serviceable", "Organized", "Cleanly Finished"];

function aboutChipList(items, className = "about-chip-list") {
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function aboutPhotoButton(photo, className = "about-work-item", loading = "lazy") {
  return `
    <button class="${className}" type="button" data-lightbox-src="${asset(photo.image)}" data-lightbox-title="${escapeHtml(photo.category)}" data-lightbox-alt="${escapeHtml(photo.alt)}">
      <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="${loading}" width="760" height="840">
      <span>${escapeHtml(photo.category)}</span>
    </button>
  `;
}

function aboutPage() {
  return {
    pathname: "/about/",
    title: "About Airrand | Residential & Commercial HVAC Contractor GTA",
    description:
      "Learn about Airrand's approach to residential and commercial HVAC, mechanical installations, workmanship and customer service throughout the Greater Toronto Area.",
    current: "about",
    image: "work/commercial-hvac-03.webp",
    schema: [
      businessSchema(),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "About", url: "/about/" },
      ]),
    ],
    body: `
      <section class="page-hero about-hero" style="${heroImageStyle("work/commercial-hvac-03.webp")}">
        <div class="container about-hero-grid">
          <div class="about-hero-copy">
            <p class="eyebrow">About Airrand</p>
            <h1>HVAC Work Done With Care, Clarity and Technical Discipline.</h1>
            <p>Airrand provides residential and commercial heating, cooling, ventilation, gas and mechanical HVAC services throughout the Greater Toronto Area.</p>
            <p>Our approach is simple: choose the right equipment, install it properly, keep the work clean and make sure the customer understands the system when we're finished.</p>
            <div class="button-row">
              <a class="button button-primary" href="${link("/gallery/")}">View Gallery</a>
              <a class="button button-secondary" href="${link("/contact/")}">Request a Quote</a>
            </div>
            <div class="about-hero-panel" aria-label="Airrand workmanship focus">
              <span><strong>Residential HVAC</strong></span>
              <span><strong>Commercial Mechanical</strong></span>
              <span><strong>Clean Installations</strong></span>
            </div>
          </div>
        </div>
      </section>

      <section class="section about-intro-section">
        <div class="container about-intro-grid">
          <article class="about-section-copy">
            <p class="eyebrow">Company Approach</p>
            <h2>More Than Putting Equipment in Place</h2>
            <p>Good HVAC work is not just installing a furnace, condenser, heat pump or piece of ductwork. The system has to make sense for the building.</p>
            <p>Equipment needs to be sized appropriately. Airflow has to work. Gas, electrical, drainage, refrigerant piping, ventilation and controls all need to be handled correctly.</p>
            <p>The finished installation should also be clean, serviceable and understandable. Airrand focuses on the complete installation rather than simply getting equipment running and leaving.</p>
          </article>
          <figure class="about-intro-photo reveal">
            <img src="${asset("work/furnaces-01.webp")}" alt="Furnace and water heater installation from the Airrand project gallery" loading="eager" width="900" height="1100">
            <figcaption>
              <span class="about-caption-label">Airrand Standard</span>
              <span class="about-caption-quote"><strong>Equipment matters.</strong><span>The installation matters just as much.</span></span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section class="section muted-section about-approach-section">
        <div class="container about-approach-grid">
          <div class="about-section-copy about-sticky-copy">
            <p class="eyebrow">Our Approach</p>
            <h2>The Details Matter.</h2>
            <p>Airrand's work is built around clean execution, proper setup, direct communication and practical recommendations.</p>
            <p class="about-closing-line">We would rather do the job properly than build a reputation around shortcuts.</p>
          </div>
          <div class="about-principles-list">
            ${aboutPrinciples
              .map(
                (principle, index) => `
                  <article class="about-principle-row reveal">
                    <span class="about-principle-number">${String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>${escapeHtml(principle.title)}</h3>
                      <p>${escapeHtml(principle.text)}</p>
                      ${principle.details ? aboutChipList(principle.details) : ""}
                      ${principle.link ? `<a class="text-link" href="${link(principle.link)}">${escapeHtml(principle.linkText)}</a>` : ""}
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section about-capabilities-section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">Residential + Commercial</p>
            <h2>Residential Comfort. Commercial Capability.</h2>
            <p>Airrand does more than furnace and AC replacements. The work covers home comfort systems, gas work, ventilation, ductwork and larger mechanical projects.</p>
          </div>
          <div class="about-capability-split">
            <article class="about-capability-panel reveal">
              <img src="${asset("work/air-conditioning-01.webp")}" alt="Residential air conditioning installation from the Airrand project gallery" loading="lazy" width="900" height="760">
              <div>
                <p class="eyebrow">Residential HVAC</p>
                <h3>Residential Comfort Systems</h3>
                <p>Airrand supports homes with heating, cooling, heat pumps, indoor air quality and water heating systems, from replacements to ventilation upgrades.</p>
                ${aboutChipList(residentialCapabilityItems, "about-service-tags")}
                <a class="button button-secondary" href="${link("/services/")}">Residential HVAC</a>
              </div>
            </article>
            <article class="about-capability-panel about-capability-panel-warm reveal">
              <img class="about-capability-image-rtu" src="${asset("work/commercial-rooftop-rtu-01.webp")}" alt="Commercial rooftop HVAC units and gas piping installation from the Airrand project gallery" loading="lazy" width="900" height="760">
              <div>
                <p class="eyebrow">Commercial HVAC</p>
                <h3>Commercial Mechanical Systems</h3>
                <p>Airrand supports businesses with rooftop equipment, ductwork, ventilation, gas and mechanical work and equipment service, from planning to final checks.</p>
                ${aboutChipList(commercialCapabilityItems, "about-service-tags")}
                <a class="button button-secondary" href="${link("/commercial/")}">Commercial HVAC</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section muted-section about-work-section">
        <div class="container">
          <div class="about-work-header">
            <div class="section-heading">
              <p class="eyebrow">Our Work</p>
              <h2>See the Difference in the Details</h2>
              <p>Real Airrand installations show the routing, placement, equipment and mechanical detail behind the finished work.</p>
            </div>
            <a class="button button-primary" href="${link("/gallery/")}">View Full Gallery</a>
          </div>
          <div class="about-work-grid">
            ${aboutWorkPhotos.map((photo, index) => aboutPhotoButton(photo, "about-work-item reveal", index === 0 ? "eager" : "lazy")).join("")}
          </div>
        </div>
      </section>

      <section class="section about-workmanship-section">
        <div class="container about-feature-grid">
          <figure class="about-feature-photo reveal">
            <img src="${asset("work/ductwork-04.webp")}" alt="Clean ductwork installation detail from the Airrand project gallery" loading="lazy" width="1100" height="900">
          </figure>
          <article class="about-feature-copy">
            <p class="eyebrow">Workmanship</p>
            <h2>Clean Work Is Part of the Job</h2>
            <p>Airrand believes visible workmanship matters. Mechanical work should be straight, supported properly, routed logically, serviceable, organized and cleanly finished.</p>
            <ul class="workmanship-list">
              ${workmanshipDescriptors.map((item) => `<li><span aria-hidden="true"></span>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <blockquote>If the work is worth doing, it is worth doing cleanly.</blockquote>
          </article>
        </div>
      </section>

      <section class="section muted-section about-technical-section">
        <div class="container about-technical-grid">
          <article class="about-section-copy">
            <p class="eyebrow">Technical Discipline</p>
            <h2>Good Equipment Still Needs Good Setup</h2>
            <p>Equipment performance depends on more than the brand name on the cabinet. Airrand considers the complete system rather than viewing the furnace, condenser, heat pump or rooftop unit as an isolated piece of equipment.</p>
            <p>Different customers prioritize different things: upfront cost, efficiency, features, noise, heat-pump performance, smart controls and long-term operating cost.</p>
            <a class="button button-secondary" href="${link("/brands/")}">Explore the Brands We Work With</a>
          </article>
          <div class="technical-callouts">
            ${technicalSetupItems
              .map(
                (item) => `
                  <article class="technical-callout reveal">
                    <span class="technical-icon" aria-hidden="true">${technicalSetupIcon(item)}</span>
                    <h3>${escapeHtml(item)}</h3>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section about-process-section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">Customer Experience</p>
            <h2>What You Can Expect From Airrand</h2>
            <p>The process stays direct: understand the job, explain the options, perform the work properly and walk through the finished system.</p>
          </div>
          <div class="about-process-grid">
            ${serviceProcess
              .map(
                ([title, text], index) => `
                  <article class="about-process-step reveal">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section muted-section about-info-section">
        <div class="container about-info-grid">
          <article class="about-contact-panel">
            <p class="eyebrow">Company Information</p>
            <h2>Airrand Corp</h2>
            <dl>
              <div>
                <dt>Phone</dt>
                <dd><a href="tel:${site.phoneTel}">${site.phone}</a></dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd><a href="mailto:${site.email}">${site.email}</a></dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>${site.hours} Service Available</dd>
              </div>
            </dl>
            <div class="button-row">
              <a class="button button-primary" href="${link("/contact/")}">Request a Quote</a>
              <a class="button button-secondary" href="tel:${site.phoneTel}">Call Airrand</a>
            </div>
          </article>
          <article class="about-area-panel">
            <p class="eyebrow">Serving the GTA</p>
            <h2>Residential and commercial HVAC service across the Greater Toronto Area.</h2>
            <div class="area-cloud about-area-cloud" aria-label="Service areas">
              ${serviceAreas.map((area) => `<a href="${link("/contact/")}">${escapeHtml(area)}</a>`).join("")}
            </div>
          </article>
        </div>
      </section>

      <section class="section about-values-section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">Company Values</p>
            <h2>How We Want Our Work to Be Remembered</h2>
          </div>
          <div class="about-values-grid">
            ${aboutValues
              .map(
                ([title, text], index) => `
                  <article class="about-value reveal">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
          <article class="about-brands-link reveal">
            <div>
              <p class="eyebrow">Equipment Options</p>
              <h2>Equipment Options for Different Priorities</h2>
              <p>Airrand works with equipment across multiple manufacturers and product levels.</p>
            </div>
            <a class="button button-secondary" href="${link("/brands/")}">Explore Brands</a>
          </article>
        </div>
      </section>

      <section class="section about-instagram-section">
        <div class="container">
          <div class="about-instagram-header">
            <div>
              <p class="eyebrow">Follow the Work</p>
              <h2>@airrand_official</h2>
              <p>See recent installations, service work, mechanical projects and behind-the-scenes HVAC work.</p>
            </div>
            <div class="button-row">
              <a class="button button-primary" href="${site.instagram}" rel="noopener" target="_blank">Follow @airrand_official</a>
              <a class="button button-secondary" href="${link("/gallery/")}">View Gallery</a>
            </div>
          </div>
          <div class="instagram-preview" aria-label="Airrand Instagram project images">
            ${instagramPreviewPhotos
              .map(
                (photo) => `
                  <a class="instagram-tile reveal" href="${site.instagram}" rel="noopener" target="_blank">
                    <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="520" height="520">
                    <span>${escapeHtml(photo.category)}</span>
                  </a>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="about-final-cta">
        <div class="container about-final-shell">
          <div>
            <p class="eyebrow">Professional HVAC Work, Done Properly</p>
            <h2>Need HVAC Work Done Properly?</h2>
            <p>Whether you are replacing equipment in your home, troubleshooting an HVAC problem or planning a larger commercial mechanical project, Airrand can help evaluate the job and discuss the available options.</p>
          </div>
          <div class="button-row">
            <a class="button button-primary" href="${link("/contact/")}">Request a Quote</a>
            <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
            <a class="button button-secondary" href="${site.instagram}" rel="noopener" target="_blank">See Our Work on Instagram</a>
          </div>
        </div>
      </section>
    `,
  };
}

function contactPage() {
  const contactHeroImage = "contact-airrand-background.webp";

  return {
    pathname: "/contact/",
    title: "Contact Airrand",
    description:
      "Contact Airrand Corp for 24/7 residential and commercial HVAC service, quotes and project requests throughout the Greater Toronto Area.",
    current: "contact",
    image: contactHeroImage,
    schema: [
      businessSchema(),
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Contact", url: "/contact/" },
      ]),
    ],
    body: `
      <section class="page-hero contact-hero" style="${heroImageStyle(contactHeroImage)}">
        <div class="container">
          <p class="eyebrow">Contact</p>
          <h1>Request a quote or book HVAC service.</h1>
          <p>Call Airrand for urgent service or send a short request with the equipment, location and property type.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section contact-section">
        <div class="container contact-grid">
          <aside class="contact-info">
            <h2>${site.legalName}</h2>
            <a href="tel:${site.phoneTel}">${site.phone}</a>
            <a href="mailto:${site.email}">${site.email}</a>
            <span>Hours: ${site.hours}</span>
            <p>Residential and commercial HVAC service throughout the Greater Toronto Area.</p>
          </aside>
          <div class="form-panel quote-form-panel" id="quote-form">
            <h2>Quote / Service Request</h2>
            ${contactForm("contact page")}
          </div>
        </div>
      </section>
    `,
  };
}

function privacyPage() {
  return {
    pathname: "/privacy-policy/",
    title: "Privacy Policy",
    description:
      "Privacy policy for Airrand.ca contact and quote request submissions.",
    current: "privacy",
    image: "contact-background.webp",
    schema: [
      breadcrumbs([
        { name: "Home", url: "/" },
        { name: "Privacy Policy", url: "/privacy-policy/" },
      ]),
    ],
    body: `
      <section class="page-hero text-hero">
        <div class="container">
          <p class="eyebrow">Privacy</p>
          <h1>Privacy Policy</h1>
          <p>This page explains the basic information requested through Airrand.ca contact forms.</p>
        </div>
      </section>
      <section class="section legal-section">
        <div class="container detail-copy wide-copy">
          <h2>Information submitted through forms</h2>
          <p>When you contact Airrand, you may choose to provide your name, phone number, email address, service need, project type, message and optional photos. This information is sent to Airrand by the configured website email service and used to respond to your request.</p>
          <h2>Contact</h2>
          <p>For privacy questions, contact Airrand at <a href="mailto:${site.email}">${site.email}</a>.</p>
          <p>This policy should be reviewed by Airrand before publication and expanded if analytics, advertising pixels, CRM systems or additional third-party tools are added.</p>
        </div>
      </section>
    `,
  };
}

async function staticFiles() {
  const logoFavicon = await readFile(path.join(publicDir, "assets", "airrand-logo-tight.png"), "base64");
  const logoFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 223"><rect width="360" height="223" rx="18" fill="#07090c"/><image href="data:image/png;base64,${logoFavicon}" width="360" height="223" preserveAspectRatio="xMidYMid meet"/></svg>`;

  return [
    {
      pathname: "/robots.txt",
      content: `User-agent: *
Allow: /

Sitemap: ${site.baseUrl}/sitemap.xml
`,
    },
    {
      pathname: "/site.webmanifest",
      content: JSON.stringify(
        {
          name: site.name,
          short_name: site.name,
          start_url: "/",
          display: "standalone",
          background_color: "#07090c",
          theme_color: "#07090c",
          icons: [{ src: "/assets/airrand-logo-tight.png", sizes: "360x223", type: "image/png" }],
        },
        null,
        2,
      ),
    },
    {
      pathname: "/favicon.svg",
      content: logoFaviconSvg,
    },
    {
      pathname: "/projects/index.html",
      content: `<!doctype html>
<html lang="en-CA">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=/gallery/">
  <meta name="description" content="The Airrand HVAC gallery page has moved from Projects to Gallery. Open the updated installation photo gallery.">
  <link rel="canonical" href="${site.baseUrl}/gallery/">
  <meta property="og:title" content="Gallery | ${site.name}">
  <meta property="og:description" content="The Airrand HVAC gallery page has moved from Projects to Gallery. Open the updated installation photo gallery.">
  <title>Gallery | ${site.name}</title>
</head>
<body>
  <h1>Airrand Gallery</h1>
  <p>Gallery moved to <a href="/gallery/">/gallery/</a>.</p>
</body>
</html>`,
    },
  ];
}

async function copyPublic(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src);
  for (const entry of entries) {
    const source = path.join(src, entry);
    const target = path.join(dest, entry);
    const info = await stat(source);
    if (info.isDirectory()) {
      await copyPublic(source, target);
    } else {
      await copyFile(source, target);
    }
  }
}

function outputPathFor(pathname) {
  if (pathname.endsWith(".html") || pathname.endsWith(".txt") || pathname.endsWith(".xml") || pathname.endsWith(".svg") || pathname.endsWith(".webmanifest")) {
    return path.join(distDir, pathname);
  }
  const normalized = pathname === "/" ? "/index.html" : `${pathname.replace(/\/$/, "")}/index.html`;
  return path.join(distDir, normalized);
}

async function writePage(page) {
  const html = layout(page);
  const file = outputPathFor(page.pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
  pages.push(page);
}

async function writeStatic(pathname, content) {
  const file = outputPathFor(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function writeSitemap() {
  const urls = pages
    .map(
      (page) => `
  <url>
    <loc>${pageUrl(page.pathname)}</loc>
    <changefreq>${page.pathname === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${page.pathname === "/" ? "1.0" : page.pathname.startsWith("/services/") ? "0.8" : "0.7"}</priority>
  </url>`,
    )
    .join("");

  await writeStatic(
    "/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>
`,
  );
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await copyPublic(publicDir, distDir);
  await copyFile(path.join(__dirname, "styles.css"), path.join(distDir, "assets", "styles.css"));
  await copyFile(path.join(__dirname, "main.js"), path.join(distDir, "assets", "main.js"));

  const allPages = [
    homePage(),
    servicesPage(),
    brandsPage(),
    residentialPage(),
    commercialPage(),
    galleryPage(),
    reviewsPage(),
    aboutPage(),
    contactPage(),
    privacyPage(),
    ...services.map(servicePage),
  ];

  for (const page of allPages) {
    await writePage(page);
  }

  for (const file of await staticFiles()) {
    await writeStatic(file.pathname, file.content);
  }

  await writeSitemap();
  console.log(`Built ${pages.length} HTML pages in ${path.relative(rootDir, distDir)}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
