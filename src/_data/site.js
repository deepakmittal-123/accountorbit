// Owner-confirmed brand facts used across the site.
export default {
  name: 'AccountOrbit',
  url: 'https://accountorbit.in',
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
