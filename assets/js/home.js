    const o=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');o.unobserve(x.target)}}),{threshold:.08,rootMargin:'0px 0px -24px 0px'});
    document.querySelectorAll('.reveal').forEach(el=>o.observe(el));
    const n=document.getElementById('nav');
    window.addEventListener('scroll',()=>n.classList.toggle('scrolled',scrollY>50),{passive:true});

    /* Ecosystem animated connection lines */
    function drawEcoLines(){
      const svg=document.getElementById('ecoChainSvg');
      if(!svg)return;
      const wrap=svg.parentElement;
      const wr=wrap.getBoundingClientRect();
      svg.setAttribute('viewBox','0 0 '+wr.width+' '+wr.height);
      // Clear previous dynamic elements (keep defs)
      svg.querySelectorAll('line,path,circle,polygon').forEach(e=>e.remove());

      const ids=[['eco-n-toolkit','eco-n-aicore'],['eco-n-aicore','eco-n-hexagon'],['eco-n-hexagon','eco-n-hexclaw']];
      ids.forEach(function(pair,i){
        const a=document.getElementById(pair[0]);
        const b=document.getElementById(pair[1]);
        if(!a||!b)return;
        const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
        const x1=ar.right-wr.left, y1=ar.top+ar.height/2-wr.top;
        const x2=br.left-wr.left, y2=br.top+br.height/2-wr.top;

        // Dashed line
        var line=document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1',x1);line.setAttribute('y1',y1);
        line.setAttribute('x2',x2);line.setAttribute('y2',y2);
        line.setAttribute('stroke','#5fb3ea');line.setAttribute('stroke-width','1.5');
        line.setAttribute('stroke-dasharray','5 4');line.setAttribute('opacity','0.18');
        svg.appendChild(line);

        // Arrow tip
        var arrow=document.createElementNS('http://www.w3.org/2000/svg','polygon');
        arrow.setAttribute('points',(x2-1)+','+y2+' '+(x2-7)+','+(y2-4)+' '+(x2-7)+','+(y2+4));
        arrow.setAttribute('fill','#5fb3ea');arrow.setAttribute('opacity','0.25');
        svg.appendChild(arrow);

        // Motion path
        var pathId='eco-mp-'+i;
        var p=document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('id',pathId);p.setAttribute('d','M'+x1+','+y1+' L'+x2+','+y2);
        p.setAttribute('fill','none');p.setAttribute('stroke','none');
        svg.appendChild(p);

        // Animated dot
        var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('r','3');c.setAttribute('fill','#5fb3ea');
        c.setAttribute('filter','url(#eco-glow)');
        var dur=(2.4+i*0.2)+'s';var begin=(i*0.5)+'s';
        c.innerHTML='<animateMotion dur="'+dur+'" repeatCount="indefinite" begin="'+begin+'"><mpath href="#'+pathId+'"/></animateMotion><animate attributeName="opacity" values="0;0.75;0.75;0" dur="'+dur+'" repeatCount="indefinite" begin="'+begin+'"/>';
        svg.appendChild(c);
      });
    }

    function drawFanoutLines(){
      var svg=document.getElementById('ecoFanoutSvg');
      if(!svg)return;
      var wrap=svg.parentElement;
      var wr=wrap.getBoundingClientRect();
      svg.setAttribute('viewBox','0 0 '+wr.width+' 28');
      svg.querySelectorAll('line,path,circle').forEach(function(e){e.remove();});

      var apps=['eco-a-desktop','eco-a-ui','eco-a-hexui'];
      var startX=wr.width/2, startY=0;

      apps.forEach(function(id,i){
        var el=document.getElementById(id);
        if(!el)return;
        var er=el.getBoundingClientRect();
        var endX=er.left+er.width/2-wr.left;
        var endY=28;
        var midY=10;

        var pathId='eco-fp-'+i;
        var d='M'+startX+','+startY+' C'+startX+','+midY+' '+endX+','+midY+' '+endX+','+endY;
        var p=document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('id',pathId);p.setAttribute('d',d);
        p.setAttribute('fill','none');p.setAttribute('stroke','#5fb3ea');
        p.setAttribute('stroke-width','1.2');p.setAttribute('stroke-dasharray','4 3');
        p.setAttribute('opacity','0.16');
        svg.appendChild(p);

        var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('r','2.5');c.setAttribute('fill','#5fb3ea');
        c.setAttribute('filter','url(#eco-glow2)');
        var dur='2.8s';var begin=(i*0.7)+'s';
        c.innerHTML='<animateMotion dur="'+dur+'" repeatCount="indefinite" begin="'+begin+'"><mpath href="#'+pathId+'"/></animateMotion><animate attributeName="opacity" values="0;0.65;0.65;0" dur="'+dur+'" repeatCount="indefinite" begin="'+begin+'"/>';
        svg.appendChild(c);
      });
    }

    function initEcoAnimations(){
      requestAnimationFrame(function(){requestAnimationFrame(function(){drawEcoLines();drawFanoutLines();});});
    }
    window.addEventListener('load',initEcoAnimations);
    window.addEventListener('resize',function(){drawEcoLines();drawFanoutLines();});

    /* ===== ENHANCEMENT: Navigation Active Section Highlight ===== */
    (function(){
      var sections=['hero','features','quickstart','cases','ecosystem'];
      var navLinks=document.querySelectorAll('.nav-links a[href^="#"]');
      var linkMap={};
      navLinks.forEach(function(a){
        var id=a.getAttribute('href').replace('#','');
        if(id)linkMap[id]=a;
      });
      function highlightNav(){
        var scrollPos=window.scrollY+120;
        var activeId='';
        for(var i=sections.length-1;i>=0;i--){
          var el=document.getElementById(sections[i]);
          if(el&&el.offsetTop<=scrollPos){activeId=sections[i];break;}
        }
        navLinks.forEach(function(a){a.classList.remove('nav-active');});
        if(activeId&&linkMap[activeId])linkMap[activeId].classList.add('nav-active');
      }
      window.addEventListener('scroll',highlightNav,{passive:true});
      highlightNav();
    })();

    (function(){
      var menus = Array.prototype.slice.call(document.querySelectorAll('[data-lang-menu]'));
      function setMenuState(menu, open) {
        menu.classList.toggle('open', open);
        var trigger = menu.querySelector('.lang-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      function closeMenus(except) {
        menus.forEach(function(menu){
          if (menu !== except) setMenuState(menu, false);
        });
      }
      menus.forEach(function(menu){
        var trigger = menu.querySelector('.lang-trigger');
        if (!trigger) return;
        var items = Array.prototype.slice.call(menu.querySelectorAll('.lang-menu-list a'));
        trigger.addEventListener('click', function(event){
          event.stopPropagation();
          var nextOpen = !menu.classList.contains('open');
          closeMenus(menu);
          setMenuState(menu, nextOpen);
        });
        trigger.addEventListener('keydown', function(event){
          if (!items.length) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            closeMenus(menu); setMenuState(menu, true);
            (event.key === 'ArrowDown' ? items[0] : items[items.length-1]).focus();
          }
        });
        menu.addEventListener('keydown', function(event){
          if (!items.length) return;
          var i = items.indexOf(document.activeElement);
          if (event.key === 'ArrowDown') { event.preventDefault(); items[(i+1)%items.length].focus(); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); items[(i-1+items.length)%items.length].focus(); }
          else if (event.key === 'Home') { event.preventDefault(); items[0].focus(); }
          else if (event.key === 'End') { event.preventDefault(); items[items.length-1].focus(); }
        });
      });
      document.addEventListener('click', function(){ closeMenus(); });
      document.addEventListener('keydown', function(event){
        if (event.key === 'Escape') {
          var open = menus.filter(function(m){ return m.classList.contains('open'); })[0];
          if (open) { var t = open.querySelector('.lang-trigger'); if (t) t.focus(); }
          closeMenus();
        }
      });
    })();

    /* Mobile hamburger: close menu on link click */
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.remove('open');
      });
    });
    /* Eco chain staggered reveal is handled by the existing IntersectionObserver via the .reveal class on .eco-chain-wrapper */

    /* Dark mode toggle */
    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hexclaw-theme', next);
    }
    (function() {
      const saved = localStorage.getItem('hexclaw-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  
// GitHub stars realtime
(function(){
  var el=document.getElementById('gh-stars');
  if(!el)return;
  fetch('https://api.github.com/repos/hexagon-codes/hexclaw-desktop')
    .then(function(r){return r.json()})
    .then(function(d){
      var s=d.stargazers_count;
      if(s>0)el.textContent='★ '+( s>=1000?(s/1000).toFixed(1)+'k':s);
    })
    .catch(function(){});
})();

