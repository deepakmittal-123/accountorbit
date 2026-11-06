// The single navigation mapping for the Services, Industries and Locations mega menus.
// Desktop panels, mobile accordions and their QA all read this file through the `megaMenu` filter
// in eleventy.config.js, which validates every URL against routes.json and drops unbuilt routes,
// so a menu can never link to a page that does not exist.
// Location columns are not listed by hand: each one shows the built children of its category hub,
// and its title links to that hub (there is no separate "All ..." link).
export default {
  services: {
    label: 'Services',
    hub: '/services/',
    all: 'View all services',
    groups: [
      { title: 'Everyday accounts', items: [
        ['/services/accounting-bookkeeping/', 'Accounting and Bookkeeping'],
        ['/services/outsourced-accounting/', 'Outsourced Accounting'],
        ['/services/tally-zoho-accounting/', 'Tally and Zoho Accounting'],
        ['/services/payroll-services/', 'Payroll Services'],
      ] },
      { title: 'GST', items: [
        ['/services/gst-registration/', 'GST Registration'],
        ['/services/gst-return-filing/', 'GST Return Filing'],
        ['/services/gst-notice-litigation/', 'GST Notices and Disputes'],
      ] },
      { title: 'Income tax and TDS', items: [
        ['/services/income-tax-return-filing/', 'Income Tax Return Filing'],
        ['/services/income-tax-notice-handling/', 'Income Tax Notice Handling'],
        ['/services/tds-return-filing/', 'TDS Return Filing'],
      ] },
      { title: 'Company and growth', items: [
        ['/services/company-llp-registration/', 'Company and LLP Registration'],
        ['/services/roc-mca-compliance/', 'ROC and MCA Compliance'],
        ['/services/msme-udyam-registration/', 'MSME / Udyam Registration'],
        ['/services/audit-support/', 'Audit Support'],
        ['/services/virtual-cfo/', 'Virtual CFO'],
      ] },
    ],
  },
  industries: {
    label: 'Industries',
    hub: '/industries/',
    all: 'View all industries',
    groups: [
      { title: 'Professional and healthcare', items: [
        ['/industries/accounting-for-doctors/', 'Doctors'],
        ['/industries/accounting-for-clinics/', 'Clinics'],
        ['/industries/accounting-for-lawyers/', 'Lawyers'],
        ['/industries/accounting-for-consultants/', 'Consultants'],
      ] },
      { title: 'Trading and consumer businesses', items: [
        ['/industries/accounting-for-retail-shops/', 'Retail Shops'],
        ['/industries/accounting-for-traders/', 'Traders'],
        ['/industries/accounting-for-ecommerce-sellers/', 'E-commerce Sellers'],
        ['/industries/accounting-for-restaurants/', 'Restaurants'],
      ] },
      { title: 'Business and growth', items: [
        ['/industries/accounting-for-small-businesses/', 'Small Businesses'],
        ['/industries/accounting-for-startups/', 'Startups'],
        ['/industries/accounting-for-manufacturers/', 'Manufacturers'],
        ['/industries/accounting-for-real-estate-businesses/', 'Real Estate Businesses'],
      ] },
    ],
  },
  locations: {
    label: 'Locations',
    hub: '/locations/',
    all: 'View all Delhi locations',
    groups: [
      { title: 'Commercial and professional areas', hub: '/locations/commercial-professional/' },
      { title: 'Wholesale and trading markets', hub: '/locations/wholesale-trading/' },
      { title: 'Industrial and manufacturing areas', hub: '/locations/industrial-manufacturing/' },
    ],
  },
};
