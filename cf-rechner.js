/* Curafact – Rechner als Baustein (rechner.html und Ansicht „Rechner“ in index.html) */
var CFRechner=(function(){
  function mount(el){
    el.innerHTML=
    '<div class="cfTop"><div><h1>Rechner</h1><p>Eigenständig rechnen – mit Abzug, ohne Kundenakte. Es wird nichts gespeichert; alle Eingaben bleiben in diesem Browser-Fenster.</p></div><div class="actions"><button type="button" data-r="reset">Alles zurücksetzen</button></div></div>'+
    '<form class="cfPanel kf" data-r="root" onsubmit="return false">'+
      '<div class="wizardSteps"><span data-jump="s1">1 Person</span><span data-jump="s2">2 Pflegegrad</span><span data-jump="s5">3 Entlastung</span><span data-jump="s6">4 Verhinderungspflege</span><span data-jump="s9">5 Berechnung</span></div>'+
      '<h3 class="kfH" data-a="s1">1. Pflegebedürftige Person <small>– nur der Name wird für den Ausdruck gebraucht</small></h3><div data-r="person"></div>'+
      '<h3 class="kfH" data-a="s2">2. Pflegegrad</h3><div data-r="pg"></div>'+
      '<h3 class="kfH" data-a="s5">3. Entlastungsbetrag (§ 45b SGB XI) <small>– je Jahr</small></h3><div data-r="ent"></div>'+
      '<h3 class="kfH" data-a="s6">4. Verhinderungspflege / Kurzzeitpflege <small>– je Jahr</small></h3><div data-r="vp"></div>'+
      '<h3 class="kfH" data-a="s9">5. Berechnung</h3><div class="actions" style="gap:22px;align-items:center"><div data-r="abz"></div></div><div data-r="warn"></div>'+
    '</form>'+
    '<div class="cfPanel"><div class="cfHead"><h2>Auswertung mit Abzug</h2><div class="actions"><button type="button" class="primaryBtn" data-r="printCalc">Berechnung drucken / als PDF</button></div></div><div data-r="resAus"></div></div>'+
    '<div class="cfPanel"><div class="cfHead"><h2>Nachweis</h2><div class="actions"><label style="display:flex;align-items:center;font-size:13.5px"><input type="checkbox" data-r="optRueck">Rückwirkend</label><label style="display:flex;align-items:center;font-size:13.5px"><input type="checkbox" data-r="optPar" checked>Rechtsgrundlagen (§)</label><button type="button" data-r="printNach">Nachweis drucken / als PDF</button></div></div><div data-r="resNach"></div></div>';
    function q(n){return el.querySelector('[data-r="'+n+'"]')}
    var root=q('root'),timer=null;
    function aufbauen(){
      var d={abzug_prozent:'40'};
      q('person').innerHTML='<div class="kfGrid">'+
        '<div class="kfF" style="grid-column:span 6"><label>Name, Vorname</label><input id="f_pflege_name" value=""></div>'+
        '<div class="kfF" style="grid-column:span 6"><label>Pflegekasse (optional)</label><input id="f_pflege_kasse" value=""></div>'+
        '<div class="kfF" style="grid-column:span 8"><label>Anschrift (optional)</label><input id="f_pflege_anschrift" value=""></div>'+
        '<div class="kfF" style="grid-column:span 4"><label>Versichertennummer (optional)</label><input id="f_pflege_kvnr" value=""></div></div>';
      var pg=CFForm.pflegegradHtml(d);
      q('pg').innerHTML=pg.html;q('ent').innerHTML=CFForm.entHtml(d,pg.form);q('vp').innerHTML=CFForm.vpHtml(d);q('abz').innerHTML=CFForm.abzugHtml(d);
      CFForm.bind(root,geaendert);
      root.querySelectorAll('.wizardSteps [data-jump]').forEach(function(s){s.onclick=function(){var t=root.querySelector('[data-a="'+s.dataset.jump+'"]');if(t)t.scrollIntoView({behavior:'smooth',block:'start'})}});
      rechnen();
    }
    function daten(){return CFForm.collect(root,{})}
    function geaendert(){clearTimeout(timer);timer=setTimeout(rechnen,150)}
    function rechnen(){
      var d=daten(),r=CFC.berechne(d,d.abzug_prozent);
      q('resAus').innerHTML=CFC.auswertungHtml(r);
      q('resNach').innerHTML=CFC.nachweisHtml(d,q('optRueck').checked,q('optPar').checked);
      var w=CFC.pruefePhasen(d.pflegegrade);
      q('warn').innerHTML=w.length?'<div class="note noteBad">'+w.map(function(x){return CFC.esc(x.text)}).join('<br>')+'</div>':'';
    }
    q('optRueck').onchange=rechnen;q('optPar').onchange=rechnen;
    q('printCalc').onclick=function(){rechnen();CFC.drucken(q('resAus').innerHTML,'Curafact Berechnung')};
    q('printNach').onclick=function(){rechnen();CFC.drucken(q('resNach').innerHTML,'Curafact Nachweis')};
    el.querySelector('[data-r="reset"]').onclick=function(){if(confirm('Alle Eingaben löschen?'))aufbauen()};
    aufbauen();
  }
  return {mount:mount};
})();
