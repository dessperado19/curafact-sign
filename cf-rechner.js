/* Curafact – Rechner als Baustein (rechner.html und Ansicht „Rechner“ in index.html) */
var CFRechner=(function(){
  function mountVoll(el){
    el.innerHTML=
    '<div class="cfTop"><div><h1>Rechner</h1><p>Eigenständig rechnen – mit Abzug, ohne Kundenakte. Es wird nichts gespeichert; alle Eingaben bleiben in diesem Browser-Fenster.</p></div><div class="actions"><button type="button" data-r="einfach">← Einfacher Rechner</button><button type="button" data-r="reset">Alles zurücksetzen</button></div></div>'+
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
    el.querySelector('[data-r="einfach"]').onclick=function(){mountEinfach(el)};
    aufbauen();
  }

  /* ===== Einfacher Rückwirkend-Rechner: Name, Pflegegrad, Beginn, offene Jahre -> was rückwirkend zusteht und wie es sich aufteilt ===== */
  var MONATE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  function mountEinfach(el){
    var K=KFC,C=CFC,F=CFForm,esc=C.esc,JAHRE=F.jahre();
    var st={name:'',stufe:'',jahr:'',monat:'1',entOffen:{},vpOffen:{},pct:'40'};
    function eur2(n){return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
    function startJahr(){return st.jahr==='frueher'?JAHRE[0]:(parseInt(st.jahr,10)||0)}
    function von(){if(!st.jahr)return '';if(st.jahr==='frueher')return '01.01.'+JAHRE[0];return '01.'+String(st.monat).padStart(2,'0')+'.'+st.jahr}
    function jahreAb(){var y0=startJahr();return y0?JAHRE.filter(function(y){return y>=y0}):[]}
    function daten(){
      var ent={},vp=[];
      jahreAb().forEach(function(y){ent[y]=!st.entOffen[y]});
      Object.keys(st.vpOffen).forEach(function(y){
        if(!st.vpOffen[y]||parseInt(y,10)<startJahr())return;
        var b=C.vpDefaultAmount(y),per=F.vpDefaultPeriod(y,b);
        vp.push({jahr:String(y),genommen:false,betrag:String(b),start:per.start,ende:per.ende});
      });
      var ph=(st.stufe&&von())?K.formZuPhasen({stufe:st.stufe,von:von(),bis:''},[],ent,K.mk(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate())):[];
      return {pflege_name:st.name,pflegegrade:ph,verhinderungspflege:vp,abzug_prozent:st.pct};
    }
    function proJahr(r){
      var m={};
      (r.details||[]).forEach(function(d){m[d.jahr]=m[d.jahr]||{pg:0,vp:0};m[d.jahr].pg+=d.gesamt||0});
      (r.vpRows||[]).forEach(function(x){var y=parseInt(x.jahr,10);if(!y)return;m[y]=m[y]||{pg:0,vp:0};m[y].vp+=x.betrag||0});
      return Object.keys(m).map(Number).sort().map(function(y){return {jahr:y,pg:m[y].pg,vp:m[y].vp,sum:m[y].pg+m[y].vp}});
    }
    function druckHtml(r,zeilen){
      var t=new Date(),ds=String(t.getDate()).padStart(2,'0')+'.'+String(t.getMonth()+1).padStart(2,'0')+'.'+t.getFullYear();
      var pct=Math.max(0,Math.min(100,r.abzugPct||0)),kunde=100-pct,pctTxt=String(r.abzugPct).replace('.',',');
      var css='<style>'+
        '@page{size:A4;margin:14mm 15mm}'+
        '.rcP{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;color:#172033;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0}'+
        '.rcP *{box-sizing:border-box}'+
        '.rcP .kopf{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #14213A;padding-bottom:10px;margin-bottom:18px}'+
        '.rcP .kopf img{height:34px}.rcP .kopf span{font-size:12px;color:#5C687D}'+
        '.rcP .eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1496A8;margin:0 0 4px}'+
        '.rcP h1{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:30px;letter-spacing:-.015em;color:#11284B;margin:0 0 4px}'+
        '.rcP .sub{font-size:13.5px;color:#5C687D;margin:0 0 20px}'+
        '.rcP .kacheln{display:flex;gap:10px;margin:0 0 12px}'+
        '.rcP .kachel{flex:1;border:1px solid #D8E0EB;border-radius:8px;padding:12px 14px;background:#fff}'+
        '.rcP .kachel small{display:block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#5C687D;margin:0 0 6px}'+
        '.rcP .kachel strong{display:block;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:23px;letter-spacing:-.01em;color:#11284B}'+
        '.rcP .kachel.kunde{border-color:#1496A8;background:#E7F2F5}.rcP .kachel.kunde strong{color:#0B6F7C}'+
        '.rcP .balken{display:flex;height:26px;border-radius:6px;overflow:hidden;border:1px solid #D8E0EB;margin:0 0 20px}'+
        '.rcP .balken i,.rcP .balken b{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:11px;color:#fff;white-space:nowrap}'+
        '.rcP .balken i{background:#1496A8}.rcP .balken b{background:#11284B}'+
        '.rcP h2{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:16px;color:#11284B;margin:0 0 8px}'+
        '.rcP table{width:100%;border-collapse:collapse;font-size:12.5px}'+
        '.rcP th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#5C687D;padding:8px 8px;border-bottom:1px solid #D8E0EB}'+
        '.rcP td{padding:9px 8px;border-bottom:1px solid #E7ECF3}'+
        '.rcP .num{text-align:right;font-variant-numeric:tabular-nums}'+
        '.rcP tfoot td{font-weight:700;color:#11284B;border-top:2px solid #11284B;border-bottom:0}'+
        '.rcP .hinweis{margin:18px 0 0;font-size:10.5px;line-height:1.5;color:#5C687D}'+
        '</style>';
      return css+'<div class="rcP">'+
        '<div class="kopf"><img src="logo.png" alt="Curafact"><span>Stand: '+ds+'</span></div>'+
        '<p class="eyebrow">Ihre Übersicht</p>'+
        '<h1>'+(st.name?esc(st.name):'Rückwirkende Ansprüche')+'</h1>'+
        '<p class="sub">Pflegegrad '+esc(st.stufe)+' · rückwirkend ab '+esc(von())+'</p>'+
        '<div class="kacheln">'+
          '<div class="kachel"><small>Rückwirkend insgesamt</small><strong>'+eur2(r.brutto)+'</strong></div>'+
          '<div class="kachel kunde"><small>Für Sie</small><strong>'+eur2(r.netto)+'</strong></div>'+
          '<div class="kachel"><small>Unser Anteil ('+esc(pctTxt)+' %)</small><strong>'+eur2(r.abzug)+'</strong></div>'+
        '</div>'+
        '<div class="balken"><i style="width:'+kunde+'%">'+(kunde>=14?'Sie '+Math.round(kunde)+' %':'')+'</i><b style="width:'+pct+'%">'+(pct>=14?Math.round(pct)+' %':'')+'</b></div>'+
        '<h2>Aufteilung nach Jahren</h2>'+
        '<table><thead><tr><th>Jahr</th><th class="num">Pflegegrad (Umwandlung / Entlastung)</th><th class="num">Verhinderungspflege</th><th class="num">Summe</th></tr></thead><tbody>'+
          zeilen.map(function(z){return '<tr><td><b>'+z.jahr+'</b></td><td class="num">'+eur2(z.pg)+'</td><td class="num">'+eur2(z.vp)+'</td><td class="num"><b>'+eur2(z.sum)+'</b></td></tr>'}).join('')+
        '</tbody><tfoot><tr><td>Gesamt</td><td class="num">'+eur2(r.sumPG)+'</td><td class="num">'+eur2(r.sumVP)+'</td><td class="num">'+eur2(r.brutto)+'</td></tr></tfoot></table>'+
        '<p class="hinweis">Unverbindliche Berechnung auf Grundlage Ihrer Angaben und der jeweils geltenden Beträge. Gerechnet wird höchstens ab 01.01.'+JAHRE[0]+' (Verjährung). Die tatsächliche Höhe stellt die Pflegekasse fest.</p>'+
      '</div>';
    }
    el.innerHTML=
      '<div class="cfTop"><div><h1>Rückwirkend-Rechner</h1><p>Zeigt in Zahlen, was rückwirkend zusteht und wie sich der Betrag aufteilt. Es wird nichts gespeichert.</p></div><div class="actions"><button type="button" data-r="reset">Zurücksetzen</button><button type="button" data-r="voll">Ausführlich rechnen</button></div></div>'+
      '<div class="cfPanel rcPanel"><h2>Angaben</h2>'+
        '<div class="rcRow"><label for="rcName">Name</label><input id="rcName" class="cfInput" type="text" autocomplete="off" placeholder="Name der pflegebedürftigen Person"></div>'+
        '<div class="rcRow"><label>Pflegegrad</label><div class="rcChips" data-r="pg">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="rcChip" data-pg="'+n+'">Pflegegrad '+n+'</button>'}).join('')+'</div></div>'+
        '<div class="rcRow"><label>Pflegegrad besteht seit</label><div class="rcSel"><select data-r="jahr" class="cfInput"><option value="">Jahr wählen …</option><option value="frueher">'+(JAHRE[0]-1)+' oder früher</option>'+JAHRE.map(function(y){return '<option value="'+y+'">'+y+'</option>'}).join('')+'</select>'+
          '<select data-r="monat" class="cfInput">'+MONATE.map(function(m,i){return '<option value="'+(i+1)+'">'+m+'</option>'}).join('')+'</select></div></div>'+
        '<div class="rcRow" data-r="entRow"><label>Entlastungsbetrag – in diesen Jahren <b>nicht</b> genutzt</label><div class="rcChips" data-r="ent"></div><div class="mini">Tippen, was nicht genutzt wurde. Nichts angetippt = in allen Jahren genutzt.</div></div>'+
        '<div class="rcRow" data-r="vpRow"><label>Verhinderungspflege / Kurzzeitpflege – in diesen Jahren <b>nicht</b> genutzt</label><div class="rcChips" data-r="vp"></div><div class="mini">Nur angetippte Jahre werden mit dem vollen Jahresbetrag gerechnet.</div></div>'+
        '<div class="rcRow rcPct"><label for="rcPct">Unser Anteil in %</label><input id="rcPct" class="cfInput" type="text" inputmode="decimal" value="40"></div>'+
      '</div>'+
      '<div class="cfPanel rcPanel" data-r="res"></div>';
    function q(n){return el.querySelector('[data-r="'+n+'"]')}
    function chips(box,key,map){
      box.innerHTML=jahreAb().map(function(y){return '<button type="button" class="rcChip'+(st[map][y]?' on':'')+'" data-y="'+y+'">'+y+'</button>'}).join('')||'<span class="mini">Bitte erst den Beginn wählen.</span>';
    }
    function zeichne(){
      el.querySelector('#rcName').value=st.name;
      [].forEach.call(q('pg').children,function(b){b.classList.toggle('on',b.dataset.pg===st.stufe)});
      q('monat').style.display=(st.jahr&&st.jahr!=='frueher')?'':'none';
      chips(q('ent'),'ent','entOffen');chips(q('vp'),'vp','vpOffen');
      rechnen();
    }
    function rechnen(){
      var box=q('res');
      if(!st.stufe||!st.jahr){box.innerHTML='<h2>Ergebnis</h2><div class="empty">Bitte Pflegegrad und Beginn wählen – dann erscheint hier die Berechnung.</div>';return}
      var d=daten(),r=C.berechne(d,st.pct),zeilen=proJahr(r),pct=Math.max(0,Math.min(100,r.abzugPct||0));
      var kunde=100-pct;
      box.innerHTML='<h2>Ergebnis</h2>'+
        '<div class="rcTiles">'+
          '<div class="rcTile"><small>Rückwirkend insgesamt</small><strong>'+eur2(r.brutto)+'</strong></div>'+
          '<div class="rcTile rcOwn"><small>Für den Kunden</small><strong>'+eur2(r.netto)+'</strong></div>'+
          '<div class="rcTile"><small>Unser Anteil ('+esc(String(r.abzugPct).replace('.',','))+' %)</small><strong>'+eur2(r.abzug)+'</strong></div>'+
        '</div>'+
        '<div class="rcBar" aria-hidden="true"><i style="width:'+kunde+'%">'+(kunde>=14?'Kunde '+Math.round(kunde)+' %':'')+'</i><b style="width:'+pct+'%">'+(pct>=14?Math.round(pct)+' %':'')+'</b></div>'+
        '<div class="tablewrap"><table class="cfTable"><thead><tr><th>Jahr</th><th class="num">Pflegegrad (Umwandlung / Entlastung)</th><th class="num">Verhinderungspflege</th><th class="num">Summe</th></tr></thead><tbody>'+
          (zeilen.length?zeilen.map(function(z){return '<tr><td><b>'+z.jahr+'</b></td><td class="num">'+eur2(z.pg)+'</td><td class="num">'+eur2(z.vp)+'</td><td class="num"><b>'+eur2(z.sum)+'</b></td></tr>'}).join(''):'<tr><td colspan="4" class="mini">Für diese Angaben ergibt sich kein rückwirkender Betrag.</td></tr>')+
        '</tbody></table></div>'+
        '<div class="actions" style="margin-top:14px"><button type="button" class="primaryBtn" data-r="print">Übersicht drucken / als PDF</button></div>'+
        '<p class="mini">Unverbindliche Berechnung. Gerechnet wird höchstens ab 01.01.'+JAHRE[0]+' (Verjährung).</p>';
      q('print').onclick=function(){C.drucken(druckHtml(r,zeilen),'Curafact Übersicht')};
    }
    el.querySelector('#rcName').oninput=function(){st.name=this.value;rechnen()};
    el.querySelector('#rcPct').oninput=function(){st.pct=this.value.replace(',','.');rechnen()};
    q('pg').onclick=function(e){var b=e.target.closest('[data-pg]');if(!b)return;st.stufe=b.dataset.pg;zeichne()};
    q('jahr').onchange=function(){st.jahr=this.value;var y0=startJahr();[st.entOffen,st.vpOffen].forEach(function(m){Object.keys(m).forEach(function(y){if(parseInt(y,10)<y0)delete m[y]})});zeichne()};
    q('monat').onchange=function(){st.monat=this.value;rechnen()};
    q('ent').onclick=function(e){var b=e.target.closest('[data-y]');if(!b)return;var y=b.dataset.y;st.entOffen[y]=!st.entOffen[y];b.classList.toggle('on',!!st.entOffen[y]);rechnen()};
    q('vp').onclick=function(e){var b=e.target.closest('[data-y]');if(!b)return;var y=b.dataset.y;st.vpOffen[y]=!st.vpOffen[y];b.classList.toggle('on',!!st.vpOffen[y]);rechnen()};
    el.querySelector('[data-r="reset"]').onclick=function(){if(!confirm('Alle Eingaben löschen?'))return;st={name:'',stufe:'',jahr:'',monat:'1',entOffen:{},vpOffen:{},pct:'40'};q('jahr').value='';q('monat').value='1';el.querySelector('#rcPct').value='40';zeichne()};
    el.querySelector('[data-r="voll"]').onclick=function(){mountVoll(el)};
    zeichne();
  }
  function mount(el){mountEinfach(el)}
  return {mount:mount,mountVoll:mountVoll,mountEinfach:mountEinfach};
})();
