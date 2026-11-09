/* Curafact – Unterschrift: Vollbild-Fenster (nur Querformat) mit „Füller“-Strich.
   Wird von setupSigInput() (Formulare) und von unterschrift.html (Link-Unterschrift) genutzt.
   Ergebnis: transparentes PNG, 1500 x 500 px (3:1), Tinte #0b1f3a. */
(function(){
  if(window.SignaturFenster)return;
  var INK='#0b1f3a',CW=1500,CH=500;
  /* „Füller“: Breiten in Einheiten der 1500 px breiten Zeichenfläche */
  var STIL={min:2,max:12.5,vref:3.0,glatt:0.78,spitz:150,druck:0.8};

  function SignaturFeld(canvas){
    var ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
    var pts=[],drawing=false,id=null,lastW=0,laenge=0,hatInk=false,penGesehen=false,stil=STIL,onInk=null;
    function p2c(e){var r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height,t:e.timeStamp||Date.now(),pr:(e.pointerType==='pen'&&e.pressure>0)?e.pressure:null}}
    function mid(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
    function stempel(x,y,w){ctx.beginPath();ctx.arc(x,y,Math.max(.5,w/2),0,Math.PI*2);ctx.fill()}
    function ziel(a,b){
      var dt=Math.max(1,b.t-a.t),v=Math.hypot(b.x-a.x,b.y-a.y)/dt;
      var wv=stil.max-(stil.max-stil.min)*Math.min(1,v/stil.vref);
      if(b.pr!=null){var wp=stil.min+(stil.max-stil.min)*Math.pow(b.pr,0.85);return wp*stil.druck+wv*(1-stil.druck)}
      return wv;
    }
    function kurve(p0,p1,m0,m1,w0,w1){
      var len=Math.hypot(m1.x-m0.x,m1.y-m0.y)+Math.hypot(p1.x-m0.x,p1.y-m0.y)*0.2;
      var n=Math.max(2,Math.ceil(len/1.2));
      for(var i=1;i<=n;i++){
        var t=i/n,u=1-t,x=u*u*m0.x+2*u*t*p1.x+t*t*m1.x,y=u*u*m0.y+2*u*t*p1.y+t*t*m1.y;
        var w=w0+(w1-w0)*t;
        if(stil.spitz&&laenge<stil.spitz)w*=0.3+0.7*(laenge/stil.spitz);
        laenge+=len/n;
        stempel(x,y,w);
      }
    }
    function down(e){
      if(e.pointerType==='pen')penGesehen=true;
      if(e.pointerType==='touch'&&penGesehen)return; /* Handballen-Schutz: mit dem Pencil zählt nur der Pencil */
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.preventDefault();drawing=true;id=e.pointerId;laenge=0;lastW=0;
      try{canvas.setPointerCapture(id)}catch(x){}
      ctx.fillStyle=INK;var p=p2c(e);pts=[p];
      stempel(p.x,p.y,(stil.min+stil.max)/2*0.55);hatInk=true;
      if(onInk)onInk();
    }
    function move(e){
      if(!drawing||e.pointerId!==id)return;e.preventDefault();
      var list=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];if(!list.length)list=[e];
      for(var i=0;i<list.length;i++){
        var p=p2c(list[i]),q=pts[pts.length-1];
        if(Math.hypot(p.x-q.x,p.y-q.y)<1.5)continue;
        pts.push(p);var n=pts.length;
        var tw=ziel(pts[n-2],pts[n-1]);lastW=lastW?lastW*stil.glatt+tw*(1-stil.glatt):tw;
        if(n>=3){
          var p0=pts[n-3],p1=pts[n-2],p2=pts[n-1];
          var m0=n>3?mid(pts[n-3],pts[n-2]):p0,m1=mid(p1,p2);
          var w0=pts[n-2].w!=null?pts[n-2].w:lastW;
          kurve(p0,p1,m0,m1,w0,lastW);pts[n-1].w=lastW;
        }else pts[n-1].w=lastW;
      }
    }
    function up(e){
      if(!drawing||(e&&e.pointerId!==id))return;
      drawing=false;
      var n=pts.length;
      if(n>=2){
        var a=pts[n-2],b=pts[n-1],w0=b.w||lastW||stil.min,steps=10;
        var dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,ext=Math.min(26,w0*3.2);
        ctx.fillStyle=INK;
        for(var i=1;i<=steps;i++){var t=i/steps;stempel(b.x+ux*ext*t,b.y+uy*ext*t,Math.max(stil.min*0.35,w0*(1-t)))}
      }
      pts=[];
    }
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
    canvas.addEventListener('touchstart',function(e){e.preventDefault()},{passive:false});
    canvas.addEventListener('touchmove',function(e){e.preventDefault()},{passive:false});
    return {
      leeren:function(){ctx.clearRect(0,0,W,H);hatInk=false;penGesehen=false},
      leer:function(){if(!hatInk)return true;var d=ctx.getImageData(0,0,W,H).data,n=0;for(var i=3;i<d.length;i+=4){if(d[i]>10){n++;if(n>400)return false}}return true},
      png:function(){return canvas.toDataURL('image/png')},
      beiTinte:function(f){onInk=f}
    };
  }

  var CSS='#cfSg{position:fixed;inset:0;z-index:100000;background:#eef3f9;display:none;flex-direction:column;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font-family:"Avenir Next",-apple-system,system-ui,sans-serif;color:#10223b}'+
  '#cfSg.open{display:flex}'+
  '#cfSg *{box-sizing:border-box}'+
  '#cfSg .sgTop{padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 16px) 4px calc(env(safe-area-inset-left) + 16px)}'+
  '#cfSg .sgTop b{color:#0f3f7a;font-size:16px}#cfSg .sgTop span{display:block;font-size:12px;color:#5a6b85;margin-top:2px}'+
  '#cfSg .sgArea{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:4px calc(env(safe-area-inset-right) + 16px) 4px calc(env(safe-area-inset-left) + 16px)}'+
  '#cfSg .sgPad{position:relative;background:#fff;border:1.5px solid #b9c7da;border-radius:14px;box-shadow:0 6px 24px rgba(15,63,122,.12);touch-action:none}'+
  '#cfSg canvas{display:block;width:100%;height:100%;margin:0;border:0;border-radius:14px;touch-action:none;background:transparent}'+
  '#cfSg .sgGuide{position:absolute;left:4%;right:4%;top:72%;border-top:1.5px dashed #c5d1e2;pointer-events:none}'+
  '#cfSg .sgGuide i{position:absolute;left:-1px;top:-20px;font-style:normal;color:#9db0c9;font-size:18px}'+
  '#cfSg .sgBar{display:flex;gap:10px;justify-content:space-between;padding:6px calc(env(safe-area-inset-right) + 16px) calc(env(safe-area-inset-bottom) + 10px) calc(env(safe-area-inset-left) + 16px)}'+
  '#cfSg .sgBar .l{display:flex;gap:10px}'+
  '#cfSg button{font:inherit;font-weight:600;border:1px solid #d7e0ee;background:#fff;color:#0f3f7a;border-radius:12px;padding:12px 18px;cursor:pointer}'+
  '#cfSg button.sgPrimary{background:#16a9ba;border-color:#16a9ba;color:#fff}'+
  '#cfSg .sgGate{position:absolute;inset:0;background:#eef3f9;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:30px;z-index:5}'+
  '#cfSg.hoch .sgGate{display:flex}'+
  '#cfSg .sgGate svg{width:96px;height:96px;animation:cfSgDreh 2.4s ease-in-out infinite}'+
  '@keyframes cfSgDreh{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}'+
  '#cfSg .sgGate b{font-size:20px;color:#0f3f7a}#cfSg .sgGate small{font-size:13px;color:#5a6b85;line-height:1.5}'+
  '#cfSg .sgGate a{font-size:13px;color:#5a6b85;text-decoration:underline}'+
  '.sigOpenBtn{display:block;width:100%;margin-top:8px;padding:16px 18px;border:1.5px dashed #16a9ba;background:#f2fbfc;color:#0f3f7a;border-radius:14px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;touch-action:manipulation}'+
  '.sigOpenBtn.done{border-style:solid;background:#fff;font-weight:600;font-size:14px;padding:10px 14px;width:auto}';

  var sg=null,pad,area,feld=null,cb=null,trotz=false,scrollY0=0,gesperrt=false;
  function bauen(){
    if(sg)return;
    var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    sg=document.createElement('div');sg.id='cfSg';sg.setAttribute('role','dialog');sg.setAttribute('aria-modal','true');
    sg.innerHTML='<div class="sgTop"><b id="cfSgTitel">Unterschrift</b><span>Mit dem Finger oder Apple Pencil auf der Linie unterschreiben</span></div>'+
      '<div class="sgArea"><div class="sgPad"><canvas width="'+CW+'" height="'+CH+'"></canvas><div class="sgGuide"><i>✕</i></div></div></div>'+
      '<div class="sgBar"><div class="l"><button type="button" id="cfSgClear">Löschen</button><button type="button" id="cfSgCancel">Abbrechen</button></div><button type="button" class="sgPrimary" id="cfSgDone">Fertig</button></div>'+
      '<div class="sgGate"><svg viewBox="0 0 96 96" fill="none" stroke="#0f3f7a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="30" y="8" width="36" height="64" rx="7"/><line x1="44" y1="64" x2="52" y2="64"/><path d="M14 80c10 10 28 12 42 6"/><polyline points="52,90 58,86 54,80"/></svg><b>Bitte Gerät quer halten</b><small>Zum Unterschreiben bitte das iPhone / iPad drehen.<br>Das Fenster öffnet sich dann von selbst.</small><a href="#" id="cfSgTrotz">Drehsperre aktiv? Trotzdem hier unterschreiben</a><button type="button" id="cfSgGateCancel">Abbrechen</button></div>';
    document.body.appendChild(sg);
    pad=sg.querySelector('.sgPad');area=sg.querySelector('.sgArea');
    feld=SignaturFeld(sg.querySelector('canvas'));
    sg.querySelector('#cfSgClear').onclick=function(){feld.leeren()};
    sg.querySelector('#cfSgCancel').onclick=zu;sg.querySelector('#cfSgGateCancel').onclick=zu;
    sg.querySelector('#cfSgTrotz').onclick=function(e){e.preventDefault();trotz=true;layout()};
    sg.querySelector('#cfSgDone').onclick=function(){
      if(feld.leer()){alert('Bitte zuerst unterschreiben.');return}
      var url=feld.png(),f=cb;zu();if(f)f(url);
    };
    window.addEventListener('resize',function(){if(sg.classList.contains('open'))layout()});
    window.addEventListener('orientationchange',function(){setTimeout(function(){if(sg.classList.contains('open'))layout()},250)});
    ['gesturestart','gesturechange'].forEach(function(n){document.addEventListener(n,function(e){if(sg.classList.contains('open'))e.preventDefault()},{passive:false})});
  }
  function quer(){return trotz||window.innerWidth>window.innerHeight}
  function layout(){
    sg.classList.toggle('hoch',!quer());
    if(!quer())return;
    var aw=area.clientWidth-32,ah=area.clientHeight-8;
    var w=Math.min(aw,ah*3),h=w/3;
    pad.style.width=Math.floor(w)+'px';pad.style.height=Math.floor(h)+'px';
  }
  function sperre(an){
    var d=document.documentElement,b=document.body;
    if(an&&!gesperrt){gesperrt=true;scrollY0=window.scrollY;b.style.position='fixed';b.style.top=(-scrollY0)+'px';b.style.width='100%';d.style.overflow='hidden'}
    else if(!an&&gesperrt){gesperrt=false;b.style.position='';b.style.top='';b.style.width='';d.style.overflow='';window.scrollTo(0,scrollY0)}
  }
  function zu(){if(!sg)return;sg.classList.remove('open');sperre(false);cb=null;trotz=false}
  window.SignaturFeld=SignaturFeld;
  window.SignaturFenster={
    oeffnen:function(titel,fertig){
      bauen();cb=fertig;sg.querySelector('#cfSgTitel').textContent=titel||'Unterschrift';
      feld.leeren();sg.classList.add('open');sperre(true);layout();setTimeout(layout,300);
    },
    zu:zu
  };
})();
