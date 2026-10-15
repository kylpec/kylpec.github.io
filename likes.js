/* Anonymous like button for blog posts.
   Counts live in Firebase (Firestore, free Spark plan), project
   "kylepec-blog-likes", collection "likes", one document per post
   (document id = the button's data-like-id), holding a single "count".
   Talks to Firestore's REST API with plain fetch(), so there is no
   Firebase library to load and it works when previewing files locally.
   Security rules on the Firebase side only allow +1 or -1 at a time
   (never below 0) — no edits, resets, or deletes from the browser.
   One like per browser, remembered in localStorage (honor system);
   clicking again unlikes.
   The count sits beside the button, hidden at 0, and rolls like an
   odometer: up from below when it rises, down from above when it falls. */
(function(){
  var PROJECT = 'kylepec-blog-likes';
  var KEY = 'AIzaSyDcJANnNm5S_Ds04LuandAZEluQCl_Ij7E';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(k, v){
    try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; }
  }
  function unstore(k){ try{ localStorage.removeItem(k); }catch(e){} }

  // Celebration on like: small dots fly outward in a ring.
  // (A ring-burst style, .lb-ring, still exists in style.css if wanted back.) Built fresh each click, removed after.
  function burst(btn){
    if(reduced) return;
    var b = document.createElement('span');
    b.className = 'like-burst';
    b.setAttribute('aria-hidden', 'true');
    var n = 12;
    for(var i = 0; i < n; i++){
      var d = document.createElement('span');
      d.className = 'lb-dot' + (i % 2 ? ' lb-dot--sm' : '');
      d.style.setProperty('--a', ((360 / n) * i + (Math.random() * 16 - 8)) + 'deg');
      d.style.setProperty('--d', (i % 2 ? 16 : 26) + Math.random() * 10 + 'px');
      d.style.animationDelay = (i % 2 ? 50 : 0) + 'ms';
      b.appendChild(d);
    }
    btn.appendChild(b);
    setTimeout(function(){ b.remove(); }, 900);
  }

  function init(btn){
    var id = btn.getAttribute('data-like-id');
    if(!id) return;
    var countEl = btn.parentNode.querySelector('.like-count');
    var likedKey = 'liked:' + id;
    var count = 0;

    // dir: 1 = rolls up (count rose), -1 = rolls down (count fell), 0 = no animation
    function showCount(dir){
      if(!countEl) return;
      var current = countEl.querySelector('.lc-num:not(.lc-out)');
      if(count === 0 && !current){ countEl.hidden = true; return; }
      var next = null;
      if(count > 0){
        next = document.createElement('span');
        next.className = 'lc-num';
        next.textContent = count;
      }
      if(!dir || reduced){
        countEl.textContent = '';
        if(next){ countEl.appendChild(next); countEl.hidden = false; } else countEl.hidden = true;
        return;
      }
      countEl.hidden = false;
      var way = dir > 0 ? 'lc-up' : 'lc-down';
      if(current){
        current.classList.add('lc-out', way);
        current.addEventListener('animationend', function(){
          current.remove();
          if(!countEl.querySelector('.lc-num')) countEl.hidden = true;
        }, { once:true });
      }
      if(next){
        next.classList.add('lc-in', way);
        countEl.appendChild(next);
        next.addEventListener('animationend', function(){ next.classList.remove('lc-in', way); }, { once:true });
      }
    }

    function render(dir){
      var liked = store(likedKey) === '1';
      btn.classList.toggle('is-liked', liked);
      btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      btn.setAttribute('aria-label', (liked ? 'Liked, click to unlike' : 'Like this post') + ' — ' + count + (count === 1 ? ' like' : ' likes'));
      showCount(dir);
    }

    fetch(BASE + '/likes/' + encodeURIComponent(id) + '?key=' + KEY)
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(doc){
        count = doc && doc.fields && doc.fields.count ? parseInt(doc.fields.count.integerValue, 10) || 0 : 0;
        btn.hidden = false; render(1);
      })
      .catch(function(){ btn.hidden = false; render(0); });

    var busy = false;
    btn.addEventListener('click', function(){
      if(busy) return;
      busy = true;
      var wasLiked = store(likedKey) === '1';
      var step = wasLiked ? -1 : 1;
      if(wasLiked) unstore(likedKey);
      else {
        store(likedKey, '1');
        btn.classList.remove('just-liked'); void btn.offsetWidth;
        btn.classList.add('just-liked');
        setTimeout(function(){ btn.classList.remove('just-liked'); }, 600);
        burst(btn);
        if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
      }
      count = Math.max(0, count + step); render(step);
      fetch(BASE + ':commit?key=' + KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: [{ transform: {
          document: 'projects/' + PROJECT + '/databases/(default)/documents/likes/' + id,
          fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: String(step) } }]
        }}]})
      }).then(function(r){ if(!r.ok) throw 0; })
        .catch(function(){
          // Firebase didn't accept it: put the button and count back
          if(wasLiked) store(likedKey, '1'); else unstore(likedKey);
          count = Math.max(0, count - step); render(-step);
        })
        .then(function(){ busy = false; });
    });
  }

  function start(){ document.querySelectorAll('.like-btn[data-like-id]').forEach(init); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
