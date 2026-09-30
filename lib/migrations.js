// One-time content updates applied to an existing site at startup (see db.load).
// Each migration runs once, only adds what is missing, and never overwrites edits made
// in the admin panel. Fresh installs are seeded with everything and skip them all.
const { uid, ipPortfolioData } = require('./defaults');

const byType = (page, type) => page.sections.findIndex(s => s.type === type);

module.exports = [
  {
    id: '2026-09-30-ip-portfolio',
    description: 'Add the Semiconductor IP section, menu link, contact topic, FAQ and services card',
    run(db) {
      const done = [];
      const home = db.pages.find(p => p.slug === 'home');
      if (!home) return done;

      let anchor = 'ip';
      const existing = home.sections.find(s => s.type === 'ipPortfolio');
      if (existing) anchor = existing.anchor || anchor;
      else {
        if (home.sections.some(s => s.anchor === 'ip')) anchor = 'ip-solutions';
        const after = [byType(home, 'edaSuite'), byType(home, 'edaFlow'), byType(home, 'about')].find(i => i >= 0);
        const at = after !== undefined ? after + 1 : Math.max(0, byType(home, 'contact'));
        home.sections.splice(at, 0, { id: uid(), type: 'ipPortfolio', anchor, visible: true, data: ipPortfolioData() });
        done.push('IP section');
      }

      const nav = db.settings.nav || (db.settings.nav = []);
      if (!nav.some(n => String(n.href).endsWith(`#${anchor}`))) {
        const i = nav.findIndex(n => /#eda$/.test(n.href));
        const j = i >= 0 ? i : nav.findIndex(n => /#about$/.test(n.href));
        nav.splice(j >= 0 ? j + 1 : nav.length, 0, { label: 'IP', href: `/#${anchor}` });
        done.push('menu link');
      }

      const contact = home.sections.find(s => s.type === 'contact');
      if (contact && contact.data.topics !== undefined && !/\bIP\b/.test(contact.data.topics)) {
        const topics = String(contact.data.topics).split(',').map(t => t.trim()).filter(Boolean);
        const k = topics.findIndex(t => /EDA/i.test(t));
        topics.splice(k >= 0 ? k + 1 : Math.max(0, topics.length - 1), 0, 'Semiconductor IP licensing');
        contact.data.topics = topics.join(', ');
        done.push('contact topic');
      }

      const faq = home.sections.find(s => s.type === 'faq');
      if (faq && Array.isArray(faq.data.items) && !faq.data.items.some(q => /licen[cs]e.*\bIP\b|\bIP\b.*licen[cs]/i.test(q.q))) {
        const fresh = ipPortfolioData();
        const k = faq.data.items.findIndex(q => /What does .* do\?/.test(q.q));
        faq.data.items.splice(k >= 0 ? k + 1 : faq.data.items.length, 0, {
          q: 'Do you license semiconductor IP?',
          a: `Yes. We offer ${[...new Set(fresh.items.map(i => i.category.toLowerCase()))].join(', ')} IP — delivered as PHY, controller and verification IP — together with integration, customisation and porting services. Choose “Semiconductor IP licensing” in the contact form to request datasheets.`
        });
        done.push('FAQ');
      }

      const services = home.sections.find(s => s.type === 'services');
      if (services && Array.isArray(services.data.items) && !services.data.items.some(i => /\bIP\b/.test(i.title))) {
        const k = services.data.items.findIndex(i => /Verification/i.test(i.title));
        services.data.items.splice(k >= 0 ? k : Math.min(2, services.data.items.length), 0, {
          icon: 'network', title: 'Semiconductor IP Solutions',
          text: 'Pre-verified interface, memory, chiplet and security IP — PHY, controller and verification IP — plus integration and porting.',
          tags: 'PCIe, CXL, UCIe, HBM, DDR', featured: false, link: `#${anchor}`
        });
        done.push('services card');
      }

      const marquee = home.sections.find(s => s.type === 'marquee');
      if (marquee && Array.isArray(marquee.data.items) && !marquee.data.items.some(i => /\bIP\b/.test(i.text))) {
        const k = marquee.data.items.findIndex(i => /Design Automation/i.test(i.text));
        marquee.data.items.splice(k + 1, 0, { text: 'Interface IP' });
        done.push('marquee');
      }
      return done;
    }
  }
];
