/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  generateRobotsTxt: true, // <- this makes robots.txt for you
  sitemapSize: 5000,
  exclude: ['/admin/*'], // optional: remove private routes
};
