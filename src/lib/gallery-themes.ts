export const GALLERY_THEMES = {
  classic: {
    label: "Classic",
    description: "Warm cream background, clean borders, timeless feel",
    vars: {
      "--gallery-bg": "#FAF7F2",
      "--gallery-text": "#161A22",
      "--gallery-muted": "#6b7280",
      "--gallery-border": "#E5DFD6",
      "--gallery-card-bg": "#ffffff",
      "--gallery-header-bg": "#ffffff",
    },
  },
  modern: {
    label: "Modern",
    description: "Soft warm gray background, rounded cards, subtle shadows",
    vars: {
      "--gallery-bg": "#F3EDE4",
      "--gallery-text": "#161A22",
      "--gallery-muted": "#6b7280",
      "--gallery-border": "#E5DFD6",
      "--gallery-card-bg": "#ffffff",
      "--gallery-header-bg": "#ffffff",
    },
  },
  warm: {
    label: "Warm",
    description: "Light honey tint, warm muted text, inviting feel",
    vars: {
      "--gallery-bg": "#FFFDF5",
      "--gallery-text": "#161A22",
      "--gallery-muted": "#9ca3af",
      "--gallery-border": "#F3EDE4",
      "--gallery-card-bg": "#ffffff",
      "--gallery-header-bg": "#ffffff",
    },
  },
  dark: {
    label: "Dark",
    description: "Dark background, light text, moody feel",
    vars: {
      "--gallery-bg": "#0a0a0a",
      "--gallery-text": "#f5f5f5",
      "--gallery-muted": "#a3a3a3",
      "--gallery-border": "#262626",
      "--gallery-card-bg": "#171717",
      "--gallery-header-bg": "#0a0a0a",
    },
  },
  minimal: {
    label: "Minimal",
    description: "Pure white, hairline borders, maximum photo focus",
    vars: {
      "--gallery-bg": "#ffffff",
      "--gallery-text": "#1a1a1a",
      "--gallery-muted": "#a3a3a3",
      "--gallery-border": "#f0f0f0",
      "--gallery-card-bg": "#ffffff",
      "--gallery-header-bg": "#ffffff",
    },
  },
} as const

export type GalleryTheme = keyof typeof GALLERY_THEMES

export const GALLERY_GRID_STYLES = {
  grid: { label: "Grid", description: "Equal-size square grid" },
  masonry: { label: "Masonry", description: "Natural aspect ratios, staggered" },
  column: { label: "Column", description: "Single column, large photos" },
  row: { label: "Row", description: "Horizontal justified rows" },
} as const

export type GalleryGridStyle = keyof typeof GALLERY_GRID_STYLES

export const GALLERY_FONTS = {
  "dm-sans": { label: "DM Sans", family: "'DM Sans', sans-serif", google: "DM+Sans:wght@400;500;600;700" },
  inter: { label: "Inter", family: "'Inter', sans-serif", google: "Inter:wght@400;500;600;700" },
  cormorant: { label: "Cormorant Garamond", family: "'Cormorant Garamond', serif", google: "Cormorant+Garamond:wght@400;500;600;700" },
  lora: { label: "Lora", family: "'Lora', serif", google: "Lora:wght@400;500;600;700" },
  montserrat: { label: "Montserrat", family: "'Montserrat', sans-serif", google: "Montserrat:wght@400;500;600;700" },
} as const

export type GalleryFont = keyof typeof GALLERY_FONTS

export const DOWNLOAD_RESOLUTIONS = {
  original: { label: "Original", description: "Full resolution as uploaded" },
  high_3600: { label: "High (3600px)", description: "Max 3600px, print quality" },
  web_2048: { label: "Web (2048px)", description: "Max 2048px, high-quality web" },
  web_1024: { label: "Web (1024px)", description: "Max 1024px, social media" },
} as const

export type DownloadResolution = keyof typeof DOWNLOAD_RESOLUTIONS
