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
const assetVersion = "mobile-services-arrow-20260823";

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
  "water-heaters": "Recent water heater installations.",
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
      <a class="button button-primary" href="${link("/contact/")}">Request a Quote</a>
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
      const service = serviceBySlug.get(slug);
      return `<a href="${link(`/services/${slug}/`)}">${escapeHtml(label)}</a>`;
    })
    .join("");

  const mobileServices = navServiceGroups
    .map(([label, slug]) => `<a href="${link(`/services/${slug}/`)}">${escapeHtml(label)}</a>`)
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
          <a class="${current === "about" ? "active" : ""}" href="${link("/about/")}">About</a>
          <a class="${current === "contact" ? "active" : ""}" href="${link("/contact/")}">Contact</a>
        </nav>
        <div class="header-actions">
          <a class="header-phone" href="tel:${site.phoneTel}">${site.phone}</a>
          <a class="button button-small" href="${link("/contact/")}">Request a Quote</a>
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
        <a class="button button-primary" href="${link("/contact/")}">Request a Quote</a>
        <a class="button button-secondary" href="tel:${site.phoneTel}">Call ${site.phone}</a>
      </nav>
    </header>
  `;
}

function footer() {
  const serviceLinks = services
    .slice(0, 10)
    .map((service) => `<a href="${link(`/services/${service.slug}/`)}">${escapeHtml(service.title)}</a>`)
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
      <a href="${link("/contact/")}">Request Quote</a>
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
    <a class="service-card reveal" href="${link(`/services/${service.slug}/`)}">
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
      <section class="page-hero brands-hero" style="--hero-image: url('${asset("hero-hvac-work.webp")}')">
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
      <section class="page-hero compact-hero reviews-hero" style="--hero-image: url('${asset("shop-background.webp")}')">
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
      <section class="hero" style="--hero-image: url('${asset("hero-hvac-work.webp")}')">
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
              "Browse heating, cooling, ductwork, gas, water heating and commercial installation photos pulled from the existing Airrand gallery.",
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
            <p>Airrand's online presence now reflects the way a serious mechanical contractor should present itself: precise, direct and focused on the quality of the work.</p>
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
      <section class="page-hero compact-hero" style="--hero-image: url('${asset("shop-background.webp")}')">
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

function servicePage(service) {
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
      <section class="page-hero service-hero" style="--hero-image: url('${asset(service.image)}')">
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
      <section class="page-hero compact-hero" style="--hero-image: url('${asset("residential-hvac-house.webp")}')">
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

function commercialPage() {
  const commercialServices = services.filter((service) =>
    ["commercial-hvac", "ductwork", "gas-lines", "hvac-installation", "hvac-repair", "hvac-maintenance", "air-conditioning", "furnaces"].includes(
      service.slug,
    ),
  );

  return {
    pathname: "/commercial/",
    title: "Commercial HVAC Services in the GTA",
    description:
      "Commercial HVAC services for rooftop equipment, ventilation, ductwork, gas piping, mechanical installations, repairs and maintenance across the GTA.",
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
      <section class="page-hero commercial-hero" style="--hero-image: url('${asset("hero-hvac-work.webp")}')">
        <div class="container">
          <p class="eyebrow">Commercial HVAC</p>
          <h1>Mechanical HVAC work for commercial spaces across the GTA.</h1>
          <p>Airrand supports commercial heating, cooling, ventilation, ductwork, gas piping, rooftop equipment, equipment replacement, service and maintenance.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container commercial-grid">
          <article class="detail-copy">
            <p class="eyebrow">Commercial Capability</p>
            <h2>Commercial is treated as a real part of the business.</h2>
            <p>Commercial clients need HVAC scope that is practical, organized and clearly communicated. Airrand supports mechanical work where ventilation, gas piping, equipment access and serviceability all matter.</p>
          </article>
          <div class="capability-grid">
            <div><strong>Rooftop Equipment</strong><span>Heating and cooling equipment coordination and replacement scope.</span></div>
            <div><strong>Ventilation</strong><span>Commercial airflow, make-up air and ductwork requirements.</span></div>
            <div><strong>Gas Piping</strong><span>Gas lines for HVAC and related mechanical equipment.</span></div>
            <div><strong>Maintenance</strong><span>Service and maintenance support for commercial systems.</span></div>
          </div>
        </div>
      </section>
      <section class="section muted-section">
        <div class="container">
          ${sectionHeading({
            eyebrow: "Commercial Services",
            title: "HVAC and mechanical scopes for commercial properties.",
          })}
          ${servicesGrid(commercialServices)}
        </div>
      </section>
      ${serviceAreaSection()}
      ${finalCta({
        title: "Planning a commercial HVAC project?",
        text: "Send the building type, equipment involved and timeline so Airrand can review the scope.",
      })}
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
      <section class="page-hero compact-hero" style="--hero-image: url('${asset("hero-hvac-work.webp")}')">
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
      <section class="page-hero about-hero" style="--hero-image: url('${asset("work/commercial-hvac-03.webp")}')">
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
      <section class="page-hero contact-hero" style="--hero-image: url('${asset(contactHeroImage)}')">
        <div class="container">
          <p class="eyebrow">Contact</p>
          <h1>Request a quote or book HVAC service.</h1>
          <p>Call Airrand for urgent service or send a short request with the equipment, location and property type.</p>
          ${ctaButtons()}
        </div>
      </section>
      <section class="section">
        <div class="container contact-grid">
          <aside class="contact-info">
            <h2>${site.legalName}</h2>
            <a href="tel:${site.phoneTel}">${site.phone}</a>
            <a href="mailto:${site.email}">${site.email}</a>
            <span>Hours: ${site.hours}</span>
            <p>Residential and commercial HVAC service throughout the Greater Toronto Area.</p>
          </aside>
          <div class="form-panel">
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
