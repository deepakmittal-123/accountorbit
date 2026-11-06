// Owner-confirmed brand facts used across the site.
export default {
  name: 'AccountOrbit',
  // The one primary, indexable origin: canonicals, sitemap, robots.txt, structured data and llms.txt all use it.
  // accountorbit.in is the planned domain, but on 2026-11-06 its registry (RDAP) said "available for registration"
  // and DNS returned no record, so it cannot be the canonical yet. Cloudflare Pages serves the live site.
  // When accountorbit.in is registered and connected, change it here, or set SITE_ORIGIN for the build.
  url: process.env.SITE_ORIGIN || 'https://accountorbit.pages.dev',
  plannedDomain: 'https://accountorbit.in',
  publisher: 'AccountOrbit',
  phoneDisplay: '+91\u00a082907\u00a028453', // non-breaking spaces keep the number on one line
  phoneHref: 'tel:+918290728453',
  // Personal profiles of the owner. Never present these as AccountOrbit company pages,
  // and never add them to the Organization schema as sameAs.
  owner: {
    name: 'Deepak Mittal',
    facebook: 'https://www.facebook.com/deepak.mittal050',
    instagram: 'https://www.instagram.com/deepak.mittal050',
  },
  // Each entry links to its page once built, otherwise to the fallback, otherwise it is hidden.
  nav: [
    { label: 'Services', url: '/services/', fallback: '/#work' },
    { label: 'Industries', url: '/industries/' },
    { label: 'Locations', url: '/locations/' },
    { label: 'Guides', url: '/guides/' },
    { label: 'How it works', url: '/how-it-works/', fallback: '/#how' },
    { label: 'About', url: '/about-us/', fallback: '/#about' },
    { label: 'Contact', url: '/contact-us/', fallback: '/#start' },
  ],
  footerExplore: [
    { label: 'Services', url: '/services/' },
    { label: 'Industries', url: '/industries/' },
    { label: 'Locations', url: '/locations/' },
    { label: 'Guides', url: '/guides/' },
  ],
  footerPlatform: [
    { label: 'How it works', url: '/how-it-works/', fallback: '/#how' },
    { label: 'About AccountOrbit', url: '/about-us/', fallback: '/#about' },
    { label: 'About Deepak Mittal', url: '/about-me/' },
    { label: 'Contact', url: '/contact-us/' },
    { label: 'For accounting professionals', url: '/for-accounting-professionals/' },
  ],
  footerLegal: [
    { label: 'Privacy policy', url: '/privacy-policy/' },
    { label: 'Terms and conditions', url: '/terms-and-conditions/' },
    { label: 'Disclaimer', url: '/disclaimer/' },
  ],
};
