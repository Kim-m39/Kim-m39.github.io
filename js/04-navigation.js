/* ==========================================================
   js/04-navigation.js
   Switching between the two pages (resources and schedule)
   ========================================================== */


/* ---------- 4. Page navigation ---------- */

// Show the page named in the address (#resources or #schedule)
function showCurrentPage() {
  let page = location.hash.slice(1);
  if (!PAGES.includes(page)) page = PAGES[0];

  PAGES.forEach(name => {
    $('#page-' + name).hidden = name !== page;
    $('[data-page="' + name + '"]').setAttribute('aria-current', name === page ? 'page' : 'false');
  });
}
addEventListener('hashchange', showCurrentPage);
