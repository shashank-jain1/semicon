// Content schemas. Each section type declares the fields the admin panel renders
// and the data the matching template in views/sections/<type>.ejs receives.
//
// Field types: text, textarea, richtext, image, url, number, boolean, select, color, icon, list
// Text/textarea fields support inline formatting on the site: *accent* and **bold**.

const eyebrow = { key: 'eyebrow', label: 'Eyebrow label', type: 'text', help: 'Small mono label above the heading.' };
const heading = { key: 'heading', label: 'Heading', type: 'textarea', rows: 2, help: 'Wrap words in *asterisks* to give them the gradient accent.' };
const intro = { key: 'intro', label: 'Intro paragraph', type: 'textarea', rows: 3 };

const SECTION_TYPES = {
  hero: {
    label: 'Hero — 3D chip',
    description: 'Full-screen opening with the interactive 3D chip. The animation is fixed; all text is editable.',
    locked: 'The WebGL chip, circuit board and light pulses are built-in animations.',
    fields: [
      eyebrow,
      { key: 'title', label: 'Title', type: 'textarea', rows: 3, help: 'Use a new line for each line of the title. *accent* words get the gradient.' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
      { key: 'primaryLabel', label: 'Primary button label', type: 'text' },
      { key: 'primaryLink', label: 'Primary button link', type: 'url' },
      { key: 'secondaryLabel', label: 'Secondary button label', type: 'text' },
      { key: 'secondaryLink', label: 'Secondary button link', type: 'url' },
      { key: 'chipLabel', label: 'Text engraved on the 3D chip', type: 'text', help: 'Short, e.g. SFA-X1' },
      { key: 'hud', label: 'Floating chip specs', type: 'list', itemLabel: 'label', fields: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'value', label: 'Value', type: 'text' }
      ] },
      { key: 'badges', label: 'Trust badges', type: 'list', itemLabel: 'text', fields: [
        { key: 'text', label: 'Text', type: 'text' }
      ] }
    ]
  },

  marquee: {
    label: 'Marquee ticker',
    description: 'Large scrolling band of keywords that reacts to scroll speed.',
    fields: [
      { key: 'items', label: 'Words', type: 'list', itemLabel: 'text', fields: [{ key: 'text', label: 'Text', type: 'text' }] },
      { key: 'style', label: 'Style', type: 'select', options: ['outline', 'solid'] }
    ]
  },

  edaFlow: {
    label: 'EDA flow — code to silicon',
    description: 'Scroll-driven story with a sticky EDA workbench that visualises each stage: RTL, simulation, synthesis, place & route, sign-off, GDSII.',
    locked: 'The workbench visuals are built-in animations mapped to stages 1–6 (RTL, simulation, synthesis, place & route, sign-off, GDSII). Stage text is editable.',
    fields: [
      eyebrow, heading, intro,
      { key: 'windowTitle', label: 'Workbench window title', type: 'text' },
      { key: 'stages', label: 'Stages (max 6)', type: 'list', itemLabel: 'name', max: 6, fields: [
        { key: 'name', label: 'Stage name', type: 'text' },
        { key: 'tool', label: 'Tools / methods', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'metric', label: 'Status-bar metric', type: 'text', help: 'Shown in the workbench status bar, e.g. "Coverage 98.7%".' }
      ] }
    ]
  },

  edaSuite: {
    label: 'EDA toolkit — tabs',
    description: 'Interactive tabbed showcase of EDA tool categories with features and an AI-advantage callout.',
    fields: [
      eyebrow, heading, intro,
      { key: 'tabs', label: 'Tool categories', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'features', label: 'Features (one per line)', type: 'textarea', rows: 4 },
        { key: 'aiLabel', label: 'AI callout label', type: 'text' },
        { key: 'aiText', label: 'AI callout text', type: 'textarea', rows: 2 }
      ] },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaLink', label: 'Button link', type: 'url' }
    ]
  },

  ipPortfolio: {
    label: 'IP portfolio — SoC explorer',
    description: 'Interactive chip floorplan built from your IP list, with a detail panel, category filters and IP services.',
    locked: 'The floorplan drawing is automatic: each IP below becomes a block on the die (up to 12), coloured by category. Everything else is editable.',
    fields: [
      eyebrow, heading, intro,
      { key: 'coreLabel', label: 'Label on the central core', type: 'text' },
      { key: 'items', label: 'IP blocks (max 12)', type: 'list', itemLabel: 'name', max: 12, fields: [
        { key: 'name', label: 'IP name', type: 'text' },
        { key: 'short', label: 'Short label on the die', type: 'text', help: 'Keep it to ~8 characters, e.g. "PCIe 6.0".' },
        { key: 'category', label: 'Category', type: 'text', help: 'IPs with the same category share a colour and a filter chip.' },
        { key: 'status', label: 'Status badge', type: 'text' },
        { key: 'rate', label: 'Headline figure', type: 'text', help: 'e.g. "64 GT/s"' },
        { key: 'rateLabel', label: 'Headline figure label', type: 'text' },
        { key: 'spec', label: 'Standards / spec line', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'deliverables', label: 'Deliverables (comma separated)', type: 'text' },
        { key: 'features', label: 'Features (one per line)', type: 'textarea', rows: 4 },
        { key: 'nodes', label: 'Process nodes', type: 'text' }
      ] },
      { key: 'servicesTitle', label: 'Services row title', type: 'text' },
      { key: 'services', label: 'IP services', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea', rows: 2 }
      ] },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaLink', label: 'Button link', type: 'url' }
    ]
  },

  stats: {
    label: 'Stats counters',
    description: 'Animated counting numbers.',
    fields: [
      eyebrow, heading,
      { key: 'items', label: 'Stats', type: 'list', itemLabel: 'label', fields: [
        { key: 'value', label: 'Number', type: 'number' },
        { key: 'decimals', label: 'Decimal places', type: 'number' },
        { key: 'prefix', label: 'Prefix', type: 'text' },
        { key: 'suffix', label: 'Suffix', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' }
      ] }
    ]
  },

  about: {
    label: 'About / split intro',
    description: 'Large statement with body text and key points.',
    fields: [
      eyebrow, heading,
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'image', label: 'Image (optional)', type: 'image' },
      { key: 'points', label: 'Key points', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea', rows: 2 }
      ] },
      { key: 'ctaLabel', label: 'Link label', type: 'text' },
      { key: 'ctaLink', label: 'Link URL', type: 'url' }
    ]
  },

  services: {
    label: 'Services grid',
    description: 'Bento grid of cards with 3D tilt and spotlight hover.',
    fields: [
      eyebrow, heading, intro,
      { key: 'items', label: 'Services', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'tags', label: 'Tags (comma separated)', type: 'text' },
        { key: 'featured', label: 'Featured (wide card)', type: 'boolean' },
        { key: 'link', label: 'Link (optional)', type: 'url' }
      ] }
    ]
  },

  chipAnatomy: {
    label: 'Chip anatomy — exploded view',
    description: 'Pinned scroll animation that pulls a chip apart layer by layer.',
    locked: 'The 3D exploded chip is a built-in animation with 5 layers. Edit the name and text of each layer below (first 5 are used).',
    fields: [
      eyebrow, heading, intro,
      { key: 'layers', label: 'Layers (top to bottom, max 5)', type: 'list', itemLabel: 'name', max: 5, fields: [
        { key: 'name', label: 'Layer name', type: 'text' },
        { key: 'spec', label: 'Spec tag', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 2 }
      ] }
    ]
  },

  trainingLab: {
    label: 'AI training console',
    description: 'Live-looking training terminal with animated loss/accuracy chart.',
    locked: 'The terminal typing and live chart are built-in animations; the log lines are editable.',
    fields: [
      eyebrow, heading,
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'points', label: 'Bullet points', type: 'list', itemLabel: 'text', fields: [{ key: 'text', label: 'Text', type: 'text' }] },
      { key: 'consoleTitle', label: 'Console window title', type: 'text' },
      { key: 'lines', label: 'Console log lines', type: 'list', itemLabel: 'text', fields: [{ key: 'text', label: 'Line', type: 'text' }] },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaLink', label: 'Button link', type: 'url' }
    ]
  },

  process: {
    label: 'Process — horizontal scroll',
    description: 'Pinned horizontal-scrolling timeline of steps.',
    fields: [
      eyebrow, heading, intro,
      { key: 'steps', label: 'Steps', type: 'list', itemLabel: 'title', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'meta', label: 'Tools / meta', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 }
      ] }
    ]
  },

  industries: {
    label: 'Industries — hover rows',
    description: 'Big interactive rows that expand on hover.',
    fields: [
      eyebrow, heading,
      { key: 'items', label: 'Industries', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 2 }
      ] }
    ]
  },

  academy: {
    label: 'Academy / courses',
    description: 'Training programme cards with animated borders.',
    fields: [
      eyebrow, heading, intro,
      { key: 'courses', label: 'Courses', type: 'list', itemLabel: 'title', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'level', label: 'Level', type: 'text' },
        { key: 'duration', label: 'Duration', type: 'text' },
        { key: 'mode', label: 'Mode', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'topics', label: 'Topics (comma separated)', type: 'text' }
      ] },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaLink', label: 'Button link', type: 'url' }
    ]
  },

  techStack: {
    label: 'Technology stack',
    description: 'Grouped capability pills.',
    fields: [
      eyebrow, heading,
      { key: 'groups', label: 'Groups', type: 'list', itemLabel: 'title', fields: [
        { key: 'title', label: 'Group title', type: 'text' },
        { key: 'items', label: 'Items (comma separated)', type: 'textarea', rows: 2 }
      ] }
    ]
  },

  testimonials: {
    label: 'Testimonials slider',
    description: 'Auto-rotating quotes.',
    fields: [
      eyebrow, heading,
      { key: 'items', label: 'Quotes', type: 'list', itemLabel: 'name', fields: [
        { key: 'quote', label: 'Quote', type: 'textarea', rows: 3 },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'role', label: 'Role / company', type: 'text' }
      ] }
    ]
  },

  faq: {
    label: 'FAQ accordion',
    description: 'Expandable questions and answers.',
    fields: [
      eyebrow, heading,
      { key: 'items', label: 'Questions', type: 'list', itemLabel: 'q', fields: [
        { key: 'q', label: 'Question', type: 'text' },
        { key: 'a', label: 'Answer', type: 'textarea', rows: 3 }
      ] }
    ]
  },

  cta: {
    label: 'Call to action banner',
    description: 'Big gradient banner with animated circuit lines.',
    fields: [
      eyebrow, heading,
      { key: 'text', label: 'Text', type: 'textarea', rows: 2 },
      { key: 'buttonLabel', label: 'Button label', type: 'text' },
      { key: 'buttonLink', label: 'Button link', type: 'url' },
      { key: 'secondaryLabel', label: 'Secondary label', type: 'text' },
      { key: 'secondaryLink', label: 'Secondary link', type: 'url' }
    ]
  },

  contact: {
    label: 'Contact form',
    description: 'Enquiry form (messages arrive in the admin inbox) plus contact details from Site settings.',
    fields: [
      eyebrow, heading,
      { key: 'text', label: 'Text', type: 'textarea', rows: 3 },
      { key: 'topics', label: 'Enquiry topics (comma separated)', type: 'text' },
      { key: 'buttonLabel', label: 'Submit button label', type: 'text' },
      { key: 'successMessage', label: 'Success message', type: 'text' }
    ]
  },

  richText: {
    label: 'Custom text block',
    description: 'Free-form heading and rich text.',
    fields: [
      eyebrow, heading,
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center'] },
      { key: 'width', label: 'Width', type: 'select', options: ['narrow', 'wide'] }
    ]
  },

  imageText: {
    label: 'Image + text',
    description: 'Image beside text with parallax.',
    fields: [
      eyebrow, heading,
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'imagePosition', label: 'Image position', type: 'select', options: ['right', 'left'] },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'ctaLink', label: 'Button link', type: 'url' }
    ]
  },

  cards: {
    label: 'Custom cards grid',
    description: 'Generic grid of cards with icon or image — useful for news, team, partners, products.',
    fields: [
      eyebrow, heading, intro,
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'] },
      { key: 'items', label: 'Cards', type: 'list', itemLabel: 'title', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'image', label: 'Image (replaces icon)', type: 'image' },
        { key: 'kicker', label: 'Small label', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea', rows: 3 },
        { key: 'link', label: 'Link', type: 'url' },
        { key: 'linkLabel', label: 'Link label', type: 'text' }
      ] }
    ]
  },

  html: {
    label: 'Custom HTML embed',
    description: 'Paste raw HTML (maps, videos, forms, widgets).',
    fields: [
      eyebrow, heading,
      { key: 'html', label: 'HTML', type: 'textarea', rows: 10, code: true, help: 'Rendered as-is. Only paste code you trust.' }
    ]
  }
};

const SETTINGS_SCHEMA = [
  { group: 'Brand', fields: [
    { key: 'siteName', label: 'Company name', type: 'text' },
    { key: 'logoText', label: 'Logo text (icon style, chip engraving)', type: 'text' },
    { key: 'logoStyle', label: 'Logo style', type: 'select', options: ['masthead', 'icon', 'image'], help: 'masthead = SFA ring logo + word below · icon = logo icon + logo text · image = the full logo image.' },
    { key: 'logoWord', label: 'Masthead word (beside the SFA mark)', type: 'text' },
    { key: 'logoMark', label: 'Logo icon (icon style)', type: 'image', help: 'Leave empty to use the animated chip icon.' },
    { key: 'logoImage', label: 'Full logo image (image style)', type: 'image' },
    { key: 'tagline', label: 'Tagline', type: 'text' },
    { key: 'accent', label: 'Accent colour', type: 'color' },
    { key: 'accent2', label: 'Second accent colour', type: 'color' }
  ] },
  { group: 'SEO', fields: [
    { key: 'seoTitle', label: 'Default page title', type: 'text' },
    { key: 'seoDescription', label: 'Meta description', type: 'textarea', rows: 3 },
    { key: 'ogImage', label: 'Social share image', type: 'image' }
  ] },
  { group: 'Navigation', fields: [
    { key: 'nav', label: 'Menu links', type: 'list', itemLabel: 'label', fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'href', label: 'Link', type: 'url', help: 'Section anchors like /#services or page URLs like /careers' }
    ] },
    { key: 'navCtaLabel', label: 'Header button label', type: 'text' },
    { key: 'navCtaLink', label: 'Header button link', type: 'url' }
  ] },
  { group: 'Announcement bar', fields: [
    { key: 'announceEnabled', label: 'Show announcement bar', type: 'boolean' },
    { key: 'announceText', label: 'Announcement text', type: 'text' },
    { key: 'announceLink', label: 'Announcement link', type: 'url' }
  ] },
  { group: 'Contact details', fields: [
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea', rows: 2 },
    { key: 'hours', label: 'Business hours', type: 'text' },
    { key: 'socials', label: 'Social links', type: 'list', itemLabel: 'platform', fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: ['linkedin', 'x', 'youtube', 'instagram', 'github', 'facebook'] },
      { key: 'url', label: 'URL', type: 'url' }
    ] }
  ] },
  { group: 'Footer', fields: [
    { key: 'footerAbout', label: 'Footer blurb', type: 'textarea', rows: 3 },
    { key: 'footerBig', label: 'Giant footer word', type: 'text' },
    { key: 'copyright', label: 'Copyright line', type: 'text' }
  ] },
  { group: 'Effects', fields: [
    { key: 'showPreloader', label: 'Show boot-up preloader', type: 'boolean' },
    { key: 'showCursor', label: 'Custom cursor on desktop', type: 'boolean' },
    { key: 'smoothScroll', label: 'Smooth (inertia) scrolling', type: 'boolean' }
  ] }
];

module.exports = { SECTION_TYPES, SETTINGS_SCHEMA };
