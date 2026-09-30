// Seed content used the first time the server starts (and by "Reset to demo content").
// Everything here is editable from the admin panel.

const crypto = require('crypto');
const uid = () => crypto.randomBytes(6).toString('hex');
const sec = (type, anchor, data) => ({ id: uid(), type, anchor, visible: true, data });

function defaultSettings() {
  return {
    siteName: 'SFA Semicon',
    logoText: 'SFA SEMICON',
    logoImage: '',
    logoMark: '/assets/img/sfa-mark.png',
    tagline: 'Intelligence, engineered in silicon.',
    accent: '#ef3b45',
    accent2: '#ff8a3d',
    seoTitle: 'SFA Semicon — AI Semiconductor Design, Model Training & Academy',
    seoDescription: 'SFA Semicon designs custom AI accelerators, applies machine learning across the chip-design flow, optimises models for silicon and trains the next generation of semiconductor engineers.',
    ogImage: '',
    nav: [
      { label: 'About', href: '/#about' },
      { label: 'Services', href: '/#services' },
      { label: 'Inside the chip', href: '/#anatomy' },
      { label: 'AI Lab', href: '/#lab' },
      { label: 'Academy', href: '/#academy' },
      { label: 'Careers', href: '/careers' }
    ],
    navCtaLabel: 'Get in touch',
    navCtaLink: '/#contact',
    announceEnabled: true,
    announceText: 'SFA Academy — the AI Hardware & Accelerator Design cohort is now enrolling',
    announceLink: '/#academy',
    email: 'info@sfatechgroup.com',
    phone: '0755-4279933',
    address: 'SFA Technologies Pvt. Ltd.\n28, Sector A, Kasturba Nagar, Chetak Bridge,\nBhopal 462023, India',
    hours: 'Mon – Fri, 9:00 – 18:00',
    socials: [
      { platform: 'linkedin', url: '' },
      { platform: 'facebook', url: '' },
      { platform: 'youtube', url: '' }
    ],
    footerAbout: 'SFA Semicon is the semiconductor and AI-silicon arm of the SFA Tech group — building on a decade of technology delivery since 2015 to design intelligent silicon, accelerate chip design with machine learning and train engineers for India’s semiconductor future.',
    footerBig: 'SFA SEMICON',
    copyright: '© {year} SFA Semicon · SFA Technologies Pvt. Ltd. All rights reserved.',
    showPreloader: true,
    showCursor: true,
    smoothScroll: true
  };
}

function homeSections() {
  return [
    sec('hero', 'top', {
      eyebrow: 'AI-native semiconductor engineering',
      title: 'Designing the\n*silicon* that\nthinks.',
      subtitle: 'SFA Semicon builds custom AI accelerators, applies machine learning across the chip-design flow, and trains the models and engineers that bring them to life — from specification to tape-out and beyond.',
      primaryLabel: 'Start a project',
      primaryLink: '#contact',
      secondaryLabel: 'Explore capabilities',
      secondaryLink: '#services',
      chipLabel: 'SFA-X1',
      hud: [
        { label: 'NPU cores', value: '256' },
        { label: 'Process node', value: '3 nm' },
        { label: 'INT8 TOPS', value: '1,200' },
        { label: 'Power', value: '< 45 W' }
      ],
      badges: [
        { text: 'RTL → GDSII' },
        { text: 'AI-driven EDA' },
        { text: 'Edge to data centre' },
        { text: 'Model optimisation' }
      ]
    }),

    sec('marquee', '', {
      style: 'outline',
      items: ['AI Accelerators', 'RTL Design', 'Design Verification', 'Physical Design', 'Chiplets', 'RISC-V', 'Edge AI', 'Model Training', 'Tape-out', 'Silicon Validation'].map(text => ({ text }))
    }),

    sec('about', 'about', {
      eyebrow: 'Who we are',
      heading: 'We fuse *artificial intelligence* with semiconductor engineering.',
      body: '<p>The next decade of computing will be defined by chips built for AI — and by AI that builds chips. SFA Semicon sits at that intersection.</p><p>We are part of the SFA Tech group, which has delivered technology solutions and resource training since 2015. SFA Semicon takes that experience into silicon, in step with the vision of <strong>Make in India</strong> and India’s growing semiconductor ecosystem.</p><p>Our architects, verification engineers, physical designers and ML scientists work as one team, using machine learning at every stage of the flow to deliver silicon that is faster, more efficient and ready sooner.</p>',
      image: '',
      points: [
        { icon: 'brain', title: 'AI-native design flow', text: 'Machine learning guides architecture exploration, verification and physical design so teams converge faster.' },
        { icon: 'layers', title: 'Full-stack silicon', text: 'From algorithm and RTL through GDSII, packaging, bring-up and production test.' },
        { icon: 'globe', title: 'Built in India, for the world', text: 'Engineering from Bhopal, India, with a trusted partner network across the major semiconductor hubs.' },
        { icon: 'graduation', title: 'Talent engine', text: 'Our academy builds job-ready VLSI and AI-hardware engineers for us and our partners.' }
      ],
      ctaLabel: 'See how we work',
      ctaLink: '#process'
    }),

    sec('stats', 'numbers', {
      eyebrow: 'By the numbers',
      heading: 'Engineering depth across the *entire* silicon lifecycle.',
      items: [
        { value: 3, decimals: 0, prefix: '', suffix: ' nm', label: 'Most advanced process node supported' },
        { value: 40, decimals: 0, prefix: '', suffix: '%', label: 'Faster verification closure with AI-ranked regressions' },
        { value: 11.4, decimals: 1, prefix: '', suffix: '×', label: 'Perf-per-watt gain from hardware-aware model tuning' },
        { value: 10, decimals: 0, prefix: '', suffix: '+', label: 'Years of technology delivery by the SFA group (since 2015)' }
      ]
    }),

    sec('services', 'services', {
      eyebrow: 'What we do',
      heading: 'End-to-end capabilities for *intelligent* silicon.',
      intro: 'Engage us for a single stage of your flow or the whole journey — every service is backed by our AI-accelerated engineering platform.',
      items: [
        { icon: 'cpu', title: 'Custom AI Accelerator Design', text: 'Domain-specific NPUs, tensor engines and SoCs architected around your models — optimised for TOPS/W, latency and cost.', tags: 'NPU, SoC, ASIC, Chiplets', featured: true, link: '' },
        { icon: 'sparkles', title: 'AI-Driven EDA & Automation', text: 'Reinforcement learning for floorplanning, ML-guided synthesis and placement, and LLM copilots that write and review RTL.', tags: 'RL floorplanning, PPA, LLM-for-RTL', featured: false, link: '' },
        { icon: 'shield', title: 'Design Verification', text: 'UVM testbenches, formal proofs and AI-prioritised regressions that close coverage in weeks, not quarters.', tags: 'UVM, Formal, Emulation', featured: false, link: '' },
        { icon: 'layers', title: 'Physical Design & Sign-off', text: 'Floorplan, place-and-route, clock-tree synthesis, STA, IR/EM and DRC/LVS sign-off at advanced FinFET and GAA nodes.', tags: 'P&R, STA, GDSII', featured: false, link: '' },
        { icon: 'brain', title: 'AI Model Training & Optimisation', text: 'Train, compress and compile models for your silicon — quantisation, pruning, distillation and hardware-aware neural architecture search.', tags: 'Quantisation, NAS, Compilers', featured: true, link: '' },
        { icon: 'code', title: 'FPGA Prototyping & Embedded', text: 'Pre-silicon validation on FPGA platforms plus firmware, drivers and SDKs so software is ready on day one.', tags: 'FPGA, Firmware, SDK', featured: false, link: '' },
        { icon: 'microscope', title: 'Post-Silicon Validation & Test', text: 'Bring-up, characterisation, DFT/ATPG and ML-based yield analytics that find root causes faster.', tags: 'DFT, ATE, Yield AI', featured: false, link: '' },
        { icon: 'truck', title: 'Sourcing & Supply Chain', text: 'Authentic components, obsolescence management and wafer-to-module logistics through a vetted global partner network.', tags: 'Sourcing, Logistics, Traceability', featured: false, link: '' }
      ]
    }),

    sec('chipAnatomy', 'anatomy', {
      eyebrow: 'Inside the silicon',
      heading: 'Anatomy of an *AI chip*',
      intro: 'Scroll to take one of our accelerator concepts apart. Every layer is engineered in-house or with trusted foundry and packaging partners.',
      layers: [
        { name: 'Integrated heat spreader', spec: 'Thermal · 45 W TDP', text: 'A copper lid that pulls heat away from the compute die and protects the silicon beneath.' },
        { name: 'AI compute die', spec: '256 NPU cores · 3 nm', text: 'Tensor engines, on-chip SRAM and a RISC-V control cluster, placed with RL-driven floorplanning.' },
        { name: 'Interposer + HBM', spec: '2.5D · 3.2 TB/s', text: 'High-bandwidth memory stacks sit beside the die on a silicon interposer to feed models without stalls.' },
        { name: 'Package substrate', spec: '12-layer build-up', text: 'Fine-pitch routing fans thousands of signals out and delivers clean, stable power to every core.' },
        { name: 'Ball-grid array', spec: '2,500+ I/O', text: 'The array of solder balls that connects the finished chip to the circuit board.' }
      ]
    }),

    sec('trainingLab', 'lab', {
      eyebrow: 'AI training lab',
      heading: 'Models trained *for the silicon* they run on.',
      body: '<p>Great hardware needs models built for it. Our ML engineers co-design networks with the chip: we train on GPU clusters, then quantise, prune and compile so models hit accuracy targets at a fraction of the power.</p>',
      points: [
        { text: 'Hardware-aware neural architecture search' },
        { text: 'INT8 / INT4 / FP8 quantisation-aware training' },
        { text: 'Custom compiler and kernel optimisation' },
        { text: 'On-device benchmarking and profiling' }
      ],
      consoleTitle: 'sfa-train — npu-x1 — 8×GPU',
      lines: [
        '$ sfa train --model vision-edge-v3 --target npu-x1 --qat int8',
        '› loading dataset shards ............ 1.28M samples',
        '› hardware profile: 256 cores · 32 MB SRAM · 3.2 TB/s',
        '› searching architecture space (NAS) ... 1,024 candidates',
        '› epoch 12/40   loss 0.412   acc 88.9%',
        '› epoch 28/40   loss 0.198   acc 94.6%',
        '› epoch 40/40   loss 0.121   acc 96.8%',
        '› quantising → INT8   Δacc −0.3%',
        '› compiling kernels for npu-x1 ......... done',
        '✓ 1,480 fps @ 6.2 W — 11.4× perf/W vs baseline'
      ].map(text => ({ text })),
      ctaLabel: 'Talk to our ML team',
      ctaLink: '#contact'
    }),

    sec('process', 'process', {
      eyebrow: 'How we build',
      heading: 'From idea to *tape-out*',
      intro: 'A proven, AI-accelerated flow with clear milestones and full transparency at every gate.',
      steps: [
        { title: 'Architecture & Specification', meta: 'Workload analysis · PPA targets', text: 'We profile your AI workloads and model the architecture to lock performance, power and area targets before a line of RTL is written.' },
        { title: 'RTL Design', meta: 'SystemVerilog · Chisel · HLS', text: 'Micro-architecture and RTL for compute, memory and interconnect, accelerated by our LLM-assisted design copilots.' },
        { title: 'Verification', meta: 'UVM · Formal · Emulation', text: 'Coverage-driven verification with AI-ranked regressions and formal proofs for critical blocks.' },
        { title: 'Synthesis & DFT', meta: 'Logic synthesis · Scan · MBIST', text: 'Timing-driven synthesis, test insertion and ML-tuned constraints to hit frequency with margin.' },
        { title: 'Physical Design', meta: 'Floorplan · P&R · CTS · STA', text: 'Reinforcement-learning floorplans and automated closure loops deliver sign-off-clean layouts.' },
        { title: 'Tape-out & Manufacturing', meta: 'GDSII · Foundry · OSAT', text: 'We manage the foundry hand-off, packaging and test partners all the way to first silicon.' },
        { title: 'Bring-up & Deployment', meta: 'Validation · SDK · Models', text: 'Silicon bring-up, characterisation and a ready-to-use model stack so your product ships faster.' }
      ]
    }),

    sec('industries', 'industries', {
      eyebrow: 'Industries',
      heading: 'Silicon for the markets *shaping tomorrow*',
      items: [
        { icon: 'car', title: 'Automotive & ADAS', text: 'Functional-safety-minded vision and sensor-fusion processors for driver assistance and autonomy.' },
        { icon: 'server', title: 'Data Centre & Cloud AI', text: 'High-throughput training and inference accelerators with HBM and chiplet scalability.' },
        { icon: 'phoneDevice', title: 'Edge AI & IoT', text: 'Ultra-low-power NPUs that run vision, voice and anomaly detection on battery budgets.' },
        { icon: 'antenna', title: 'Telecom 5G / 6G', text: 'Baseband and AI-RAN silicon for massive MIMO and intelligent networks.' },
        { icon: 'heart', title: 'Healthcare & MedTech', text: 'Imaging and wearable diagnostics chips with on-device AI for privacy and speed.' },
        { icon: 'satellite', title: 'Aerospace & Defence', text: 'Secure-by-design, radiation-aware processors for mission-critical systems.' },
        { icon: 'factory', title: 'Industrial & Robotics', text: 'Real-time control and machine-vision SoCs for smart factories and autonomous robots.' }
      ]
    }),

    sec('academy', 'academy', {
      eyebrow: 'SFA Academy',
      heading: 'Training the next generation of *chip engineers*',
      intro: 'Industry-led programmes built by practising engineers — hands-on labs on professional EDA flows, tape-out style projects and placement support.',
      courses: [
        { title: 'VLSI Design Foundations', level: 'Beginner', duration: '12 weeks', mode: 'Online + Lab', text: 'Digital logic, CMOS, Verilog and the complete ASIC flow — the launchpad for a semiconductor career.', topics: 'Digital design, CMOS, Verilog, ASIC flow' },
        { title: 'Design Verification with UVM', level: 'Intermediate', duration: '16 weeks', mode: 'Hybrid', text: 'Build production-grade testbenches, coverage models and assertions used by leading design teams.', topics: 'SystemVerilog, UVM, SVA, Coverage' },
        { title: 'Physical Design & STA', level: 'Intermediate', duration: '16 weeks', mode: 'Hybrid', text: 'Floorplanning to sign-off: place-and-route, clock trees, timing closure and power integrity.', topics: 'Floorplan, P&R, CTS, STA' },
        { title: 'AI Hardware & Accelerator Design', level: 'Advanced', duration: '10 weeks', mode: 'Live cohort', text: 'Design an NPU from scratch — dataflows, systolic arrays, quantisation and HW/SW co-design.', topics: 'NPU, Systolic arrays, HLS, Quantisation' },
        { title: 'Machine Learning for Chip Design', level: 'Advanced', duration: '8 weeks', mode: 'Live cohort', text: 'Apply ML and LLMs to EDA: RL floorplanning, predictive timing and RTL copilots.', topics: 'RL, GNNs, LLMs, EDA' },
        { title: 'Corporate Upskilling', level: 'Custom', duration: 'Flexible', mode: 'On-site', text: 'Tailored programmes for engineering teams moving into AI silicon, verification or advanced nodes.', topics: 'Custom curriculum, Workshops, Assessments' }
      ],
      ctaLabel: 'Enquire about admissions',
      ctaLink: '#contact'
    }),

    sec('techStack', 'stack', {
      eyebrow: 'Capabilities',
      heading: 'Our *technology* toolkit',
      groups: [
        { title: 'Architectures', items: 'RISC-V, Systolic arrays, Dataflow NPUs, Chiplets / UCIe, 2.5D & 3D packaging, HBM3E' },
        { title: 'Languages & HDL', items: 'SystemVerilog, Verilog, VHDL, Chisel, SystemC / HLS, Python, C++' },
        { title: 'Verification', items: 'UVM, Formal verification, SVA, Emulation, FPGA prototyping, Coverage closure' },
        { title: 'Physical & sign-off', items: 'Floorplanning, Place & route, CTS, STA, IR / EM, DRC / LVS' },
        { title: 'AI & ML', items: 'PyTorch, ONNX, TVM / MLIR, Quantisation, NAS, Reinforcement learning' },
        { title: 'Process nodes', items: '3 nm, 5 nm, 7 nm, 12 nm, 16 nm, 28 nm' }
      ]
    }),

    sec('testimonials', 'voices', {
      eyebrow: 'Voices',
      heading: 'Trusted by teams building *what’s next*',
      items: [
        { quote: 'Their AI-driven verification flow closed coverage on our NPU weeks ahead of plan. The team felt like an extension of ours.', name: 'Engineering Director', role: 'Edge-AI start-up' },
        { quote: 'Chip design and model optimisation under one roof is rare. We got silicon and a model stack that simply worked together.', name: 'Chief Technology Officer', role: 'Industrial robotics company' },
        { quote: 'Graduates from SFA Academy join our team ready to contribute from the first week.', name: 'Head of Talent', role: 'Semiconductor design services firm' }
      ]
    }),

    sec('faq', 'faq', {
      eyebrow: 'FAQ',
      heading: 'Questions, *answered*',
      items: [
        { q: 'What does SFA Semicon do?', a: 'We design AI-focused semiconductors — from architecture and RTL to physical design and tape-out — use AI to speed up chip design itself, optimise and train models for custom silicon, source components, and run training programmes for engineers.' },
        { q: 'Can you take a project from idea to silicon?', a: 'Yes. We offer turnkey RTL-to-GDSII services and manage foundry, packaging and test partners — or we can plug into any single stage of your existing flow.' },
        { q: 'How does AI make chip design faster?', a: 'We use machine learning to rank verification tests, predict timing issues early, explore floorplans with reinforcement learning, and assist engineers with LLM-based RTL generation and review. That means fewer iterations and faster convergence.' },
        { q: 'Do you work with start-ups?', a: 'Absolutely. Engagement models range from fixed-scope feasibility studies to dedicated engineering pods, designed for teams at every stage.' },
        { q: 'How is our IP protected?', a: 'Every engagement is under NDA with strict access controls, isolated project environments and clear IP-ownership terms in the contract.' },
        { q: 'How do I enrol in SFA Academy?', a: 'Send an enquiry through the contact form and choose “Academy admissions”. Our team will share batch dates, eligibility and fees.' }
      ]
    }),

    sec('cta', 'start', {
      eyebrow: 'Let’s build',
      heading: 'Have a chip in mind?\nLet’s make it *real*.',
      text: 'Tell us about your workload, timeline and goals. We’ll come back within one business day with a plan.',
      buttonLabel: 'Start a conversation',
      buttonLink: '#contact',
      secondaryLabel: 'Explore the academy',
      secondaryLink: '#academy'
    }),

    sec('contact', 'contact', {
      eyebrow: 'Contact',
      heading: 'Let’s *talk silicon*',
      text: 'A new accelerator, a verification crunch, model optimisation, component sourcing or academy admissions — we’d love to hear from you.',
      topics: 'Custom AI chip, AI-driven EDA, Verification / Physical design, Model training & optimisation, Component sourcing, Academy admissions, Other',
      buttonLabel: 'Send message',
      successMessage: 'Thank you! Your message is on its way — we’ll reply within one business day.'
    })
  ];
}

function careersSections() {
  return [
    sec('richText', 'intro', {
      eyebrow: 'Careers',
      heading: 'Build the chips that *power AI*',
      body: '<p>We are hiring engineers who love hard problems — from RTL and verification to physical design and machine learning. Join a team where AI is part of every workflow and your work reaches silicon.</p>',
      align: 'center',
      width: 'narrow'
    }),
    sec('cards', 'roles', {
      eyebrow: 'Open roles',
      heading: 'Current *openings*',
      intro: 'Don’t see your role? Send us your CV anyway — we are always looking for exceptional people.',
      columns: '3',
      items: [
        { icon: 'cpu', image: '', kicker: 'Full-time · Hybrid', title: 'Senior RTL Design Engineer', text: 'Own micro-architecture and RTL for NPU compute clusters.', link: '/#contact', linkLabel: 'Apply' },
        { icon: 'shield', image: '', kicker: 'Full-time · Hybrid', title: 'Design Verification Engineer', text: 'Build UVM environments and drive coverage closure with AI-ranked regressions.', link: '/#contact', linkLabel: 'Apply' },
        { icon: 'layers', image: '', kicker: 'Full-time · On-site', title: 'Physical Design Engineer', text: 'Floorplan, P&R and timing closure at advanced nodes.', link: '/#contact', linkLabel: 'Apply' },
        { icon: 'brain', image: '', kicker: 'Full-time · Remote', title: 'ML Engineer — Model Optimisation', text: 'Quantise, prune and compile models for custom accelerators.', link: '/#contact', linkLabel: 'Apply' },
        { icon: 'sparkles', image: '', kicker: 'Full-time · Remote', title: 'ML for EDA Research Engineer', text: 'Apply RL, GNNs and LLMs to automate chip-design tasks.', link: '/#contact', linkLabel: 'Apply' },
        { icon: 'graduation', image: '', kicker: 'Part-time · Hybrid', title: 'Academy Instructor', text: 'Teach VLSI and verification to the next generation of engineers.', link: '/#contact', linkLabel: 'Apply' }
      ]
    }),
    sec('cta', 'apply', {
      eyebrow: 'Join us',
      heading: 'Ready to shape the *future of silicon*?',
      text: 'Send your CV and a note about what you want to build next.',
      buttonLabel: 'Get in touch',
      buttonLink: '/#contact',
      secondaryLabel: '',
      secondaryLink: ''
    })
  ];
}

function defaultPages() {
  return [
    { id: uid(), slug: 'home', title: 'Home', seoTitle: '', seoDescription: '', sections: homeSections() },
    { id: uid(), slug: 'careers', title: 'Careers', seoTitle: 'Careers — SFA Semicon', seoDescription: 'Join SFA Semicon and build AI silicon.', sections: careersSections() }
  ];
}

// Starter content for sections added from the admin panel.
function sectionSamples() {
  const out = {};
  defaultPages().forEach(p => p.sections.forEach(s => { if (!out[s.type]) out[s.type] = s.data; }));
  out.imageText = {
    eyebrow: 'Spotlight',
    heading: 'A new chapter in *AI silicon*',
    body: '<p>Describe a product, a partnership, a facility or a milestone here. Upload an image on the right to bring it to life.</p>',
    image: '',
    imagePosition: 'right',
    ctaLabel: 'Learn more',
    ctaLink: '/#contact'
  };
  out.html = {
    eyebrow: 'Find us',
    heading: 'Visit our *office*',
    html: '<iframe src="https://www.google.com/maps?q=Kasturba+Nagar+Bhopal&output=embed" height="420" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
  };
  return out;
}

module.exports = { uid, defaultSettings, defaultPages, sectionSamples };
