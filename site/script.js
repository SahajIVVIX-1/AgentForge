(function () {
  'use strict';

  // Pipeline tabs
  var rail = document.querySelector('.rail');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.rail [role="tab"]'));
  var panes = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

  function select(i, focus) {
    tabs.forEach(function (t, n) {
      var on = n === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
      t.classList.toggle('reached', n <= i);
      panes[n].hidden = !on;
    });
    rail.style.setProperty('--stage', i);
    if (focus) tabs[i].focus();
  }

  if (rail && tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });
    select(0, false);
  }

  // Copy button
  var btn = document.getElementById('copy');
  var status = document.getElementById('copy-s');
  var code = document.getElementById('cmd');
  if (btn && code) {
    btn.addEventListener('click', function () {
      var done = function (msg) {
        btn.textContent = msg;
        if (status) status.textContent = msg;
        setTimeout(function () { btn.textContent = 'Copy'; if (status) status.textContent = ''; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent).then(function () { done('Copied'); }, function () { done('Select and copy'); });
      } else {
        done('Select and copy');
      }
    });
  }
})();
