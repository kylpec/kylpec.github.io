/* ===== Blog post list — the ONE place to add a new post =====
   Every post page (its Archive row) and the Archive page read
   this list, so adding a post here updates all of them at once.
   Each entry: title, date (YYYY-MM-DD), file (the post's filename
   inside the writing folder), thumb (small 320x180 copy of the hero).
   Order doesn't matter — it's sorted by date, newest first.
   NOTE: the entries marked placeholder are fake, for previewing the
   layout only — delete them before publishing real posts. */
var POSTS = [
  { title: 'Sample Post Title', date: '2026-10-15', file: 'sample-post.html', thumb: 'images/placeholder-1-thumb.jpg' },
  { title: 'Placeholder: On Brand Systems', date: '2026-10-08', file: '#', thumb: 'images/placeholder-2-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Type Pairings That Hold Up Under Pressure', date: '2026-10-02', file: '#', thumb: 'images/placeholder-3-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Notes From a Shoot', date: '2026-09-20', file: '#', thumb: 'images/placeholder-4-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Why Fewer Projects', date: '2026-09-03', file: '#', thumb: 'images/placeholder-5-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Designing for Streaming', date: '2026-06-18', file: '#', thumb: 'images/placeholder-6-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Summer Reading List', date: '2026-05-11', file: '#', thumb: 'images/placeholder-7-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Field Research Notes', date: '2026-03-27', file: '#', thumb: 'images/placeholder-8-thumb.jpg', placeholder: true },
  { title: 'Placeholder: On Taste', date: '2026-01-14', file: '#', thumb: 'images/placeholder-9-thumb.jpg', placeholder: true },
  { title: 'Placeholder: A Year in Review', date: '2025-12-19', file: '#', thumb: 'images/placeholder-1-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Holiday Campaign Notes', date: '2025-12-04', file: '#', thumb: 'images/placeholder-2-thumb.jpg', placeholder: true },
  { title: 'Placeholder: Starting Over', date: '2025-03-21', file: '#', thumb: 'images/placeholder-3-thumb.jpg', placeholder: true }
];

(function(){
  var LIMIT = 10; // most posts shown in the Archive row; past this, "View All" links to the Archive page


  function sorted(){ return POSTS.slice().sort(function(a, b){ return a.date < b.date ? 1 : -1; }); }
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  // one card: photo on top, title underneath (+ optional date)
  function card(p, current, withDate){
    return '<a href="' + p.file + '"' + (current ? ' aria-current="page"' : '') + ' title="' + esc(p.title) + '">' +
      (p.thumb ? '<img class="post-index-thumb" src="' + p.thumb + '" alt="" loading="lazy" width="320" height="180">' : '') +
      '<span class="post-index-name">' + esc(p.title) + '</span>' +
      (withDate ? '<span class="post-card-date">' + p.date.slice(5, 7) + '.' + p.date.slice(8, 10) + '.' + p.date.slice(0, 4) + '</span>' : '') +
      '</a>';
  }

  /* "Archive" row below each post: the other posts in one horizontally
     scrolling row (the current post is left out), up to 10. Past 10
     posts, a "View All" link goes to archive.html. */
  function buildSidebar(posts, here){
    var nav = document.querySelector('.post-index');
    if(!nav) return -1;
    var currentIndex = -1;
    var html = '<p class="post-index-year">Archive</p><ul>';
    posts.forEach(function(p, i){
      var current = p.file === here;
      if(current) currentIndex = i;
      var cls = [];
      if(current) cls.push('is-current');
      if(i >= LIMIT) cls.push('is-overflow');
      html += '<li' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + card(p, current, false) + '</li>';
    });
    html += '</ul>';
    if(posts.length > LIMIT) html += '<a class="post-index-all" href="archive.html">View All</a>';
    nav.innerHTML = html;

    // In the mobile row, cards snap to the same left edge as the "Archive"
    // heading: match the snap offset to the row's left padding.
    var row = nav.querySelector('ul');
    var syncSnap = function(){
      row.style.scrollPaddingLeft = getComputedStyle(row).paddingLeft;
      if(row.scrollLeft < 2) row.scrollLeft = 0;
    };
    // right-edge fade only while there's more to scroll to
    var syncFade = function(){
      row.classList.toggle('at-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 2);
    };
    var sync = function(){ syncSnap(); syncFade(); };
    sync();
    row.addEventListener('scroll', syncFade, { passive:true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);

    return currentIndex;
  }

  // Archive page: every post as a card in a grid, newest first.
  function buildArchive(posts){
    var grid = document.querySelector('.post-archive-grid');
    if(!grid) return;
    grid.innerHTML = posts.map(function(p){ return '<li>' + card(p, false, true) + '</li>'; }).join('');
    var n = document.querySelector('.archive-count');
    if(n) n.textContent = posts.length + (posts.length === 1 ? ' Post' : ' Posts');
  }

  function start(){
    var posts = sorted();
    var here = location.pathname.split('/').pop();
    buildSidebar(posts, here);
    buildArchive(posts);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
