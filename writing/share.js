/* Share button (paper airplane) under a post. On phones (and browsers that support it)
   it opens the device's own share sheet — Messages, Mail, Instagram,
   LinkedIn, etc. Elsewhere it copies the post's link to the clipboard
   and briefly shows "Link copied" beside the button. No third-party services involved. */
(function(){
  function start(){
    document.querySelectorAll('.post-share').forEach(function(btn){
      var note = btn.parentNode.querySelector('.post-share-note');
      var timer;
      function flash(text){
        if(!note) return;
        note.textContent = text;
        note.classList.add('is-on');
        clearTimeout(timer);
        timer = setTimeout(function(){ note.classList.remove('is-on'); }, 2000);
      }
      btn.addEventListener('click', function(){
        var url = location.href.split('#')[0].split('?')[0];
        var title = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : document.title;
        if(navigator.share){
          navigator.share({ title: title, url: url }).catch(function(){}); // closing the sheet isn't an error worth showing
          return;
        }
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(url).then(function(){ flash('Link copied'); }, function(){ flash('Couldn\u2019t copy link'); });
        } else {
          window.prompt('Copy this link:', url);
        }
      });
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
