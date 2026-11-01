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
    var C=CFC,F=CFForm,esc=C.esc,JAHRE=F.jahre(),J0=JAHRE[0];
    function pad(n){return String(n).padStart(2,'0')}
    function neuePhase(vor){return {stufe:vor?vor.stufe:'',vJahr:'',vMon:'1',bis:'heute',bJahr:'',bMon:'12',ent:true}}
    var st={name:'',phasen:[neuePhase()],vpOffen:{},vpBetrag:{},pct:'40'};
    function eur2(n){return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
    function pz(x){return String(Math.round(x*100)/100).replace('.',',')+' %'}
    /* ---- Zeiträume ---- */
    function vonStr(p){if(!p.vJahr)return '';if(p.vJahr==='frueher')return '01.01.'+J0;return '01.'+pad(p.vMon)+'.'+p.vJahr}
    function bisStr(p){if(p.bis==='heute')return '';if(!p.bJahr)return null;var y=+p.bJahr,m=+p.bMon;return pad(new Date(y,m,0).getDate())+'.'+pad(m)+'.'+y}
    function monatNr(txt){var m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(txt||'');return m?(+m[3])*12+(+m[2]-1):null}
    function gueltigePhasen(){
      var out=[],hinweise=[];
      st.phasen.forEach(function(p,i){
        var v=vonStr(p);if(!p.stufe||!v){return}
        var b=bisStr(p);
        if(b===null){hinweise.push('Zeitraum '+(i+1)+': bitte das Ende wählen.');return}
        if(b&&monatNr(b)<monatNr(v)){hinweise.push('Zeitraum '+(i+1)+': das Ende liegt vor dem Beginn.');return}
        out.push({idx:i,stufe:p.stufe,von:v,bis:b,fortlaufend:!b,ent:!!p.ent});
      });
      return {liste:out,hinweise:hinweise};
    }
    function startJahr(){var g=gueltigePhasen().liste;if(!g.length)return 0;return Math.min.apply(null,g.map(function(x){return +x.von.slice(6)}))}
    function daten(){
      var g=gueltigePhasen().liste,vp=[];
      Object.keys(st.vpOffen).forEach(function(y){
        if(!st.vpOffen[y]||parseInt(y,10)<startJahr())return;
        var betrag=C.parseMoney(st.vpBetrag[y]!=null&&st.vpBetrag[y]!==''?st.vpBetrag[y]:C.vpDefaultAmount(y));
        var per=F.vpDefaultPeriod(y,C.vpDefaultAmount(y));
        vp.push({jahr:String(y),genommen:false,betrag:String(betrag),start:per.start,ende:per.ende});
      });
      return {pflege_name:st.name,pflegegrade:g.map(function(x){return {stufe:x.stufe,von:x.von,bis:x.bis,fortlaufend:x.fortlaufend,entlastung_genommen:x.ent}}),verhinderungspflege:vp,abzug_prozent:st.pct};
    }
    function proJahr(r){
      var m={};
      (r.details||[]).forEach(function(d){m[d.jahr]=m[d.jahr]||{pg:0,vp:0};m[d.jahr].pg+=d.gesamt||0});
      (r.vpRows||[]).forEach(function(x){var y=parseInt(x.jahr,10);if(!y)return;m[y]=m[y]||{pg:0,vp:0};m[y].vp+=x.betrag||0});
      return Object.keys(m).map(Number).sort().map(function(y){return {jahr:y,pg:m[y].pg,vp:m[y].vp,sum:m[y].pg+m[y].vp}});
    }
    var MONATE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    function monName(n){return MONATE[(+n)-1]}
    function zeitText(x){var b=x.bis?monName(+x.bis.slice(3,5))+' '+x.bis.slice(6):'heute';return monName(+x.von.slice(3,5))+' '+x.von.slice(6)+' – '+b}
    function phasenText(g){var u=[];g.forEach(function(x){if(u.indexOf(x.stufe)<0)u.push(x.stufe)});return 'Pflegegrad '+u.join(' → ')}
    function druckHtml(r,zeilen,g){
      var t=new Date(),ds=pad(t.getDate())+'.'+pad(t.getMonth()+1)+'.'+t.getFullYear();
      var pct=Math.max(0,Math.min(100,r.abzugPct||0)),kunde=100-pct;
      var frueh=g.slice().sort(function(a,b){return monatNr(a.von)-monatNr(b.von)})[0];
      var css='<style>'+
        '@page{size:A4;margin:0}'+
        '.rcP{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;color:#172033;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:14mm 15mm}'+
        '.rcP *{box-sizing:border-box}'+
        '.page{padding:0!important}'+
        '.rcP .eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1496A8;margin:0 0 4px}'+
        '.rcP h1{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:30px;letter-spacing:-.015em;color:#11284B;margin:0 0 4px}'+
        '.rcP .sub{font-size:13.5px;color:#5C687D;margin:0 0 20px}'+
        '.rcP .kacheln{display:flex;gap:10px;margin:0 0 12px}'+
        '.rcP .kachel{flex:1;border:1px solid #D8E0EB;border-radius:8px;padding:12px 14px;background:#fff}'+
        '.rcP .kachel small{display:block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#5C687D;margin:0 0 6px}'+
        '.rcP .kachel strong{display:block;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:23px;letter-spacing:-.01em;color:#11284B}'+
        '.rcP .kachel.kunde{border-color:#1496A8;background:#E7F2F5}.rcP .kachel.kunde strong{color:#0B6F7C}'+
        '.rcP .kachel.unser{border-color:#11284B;background:#E4EAF2}'+
        '.rcP .balken{display:flex;height:26px;border-radius:6px;overflow:hidden;border:1px solid #D8E0EB;margin:0 0 20px}'+
        '.rcP .balken i,.rcP .balken b{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:11px;color:#fff;white-space:nowrap}'+
        '.rcP .balken i{background:#1496A8}.rcP .balken b{background:#11284B}'+
        '.rcP h2{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;font-size:16px;color:#11284B;margin:0 0 8px}'+
        '.rcP table{width:100%;border-collapse:collapse;font-size:12.5px}'+
        '.rcP th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#5C687D;padding:8px 8px;border-bottom:1px solid #D8E0EB}'+
        '.rcP td{padding:9px 8px;border-bottom:1px solid #E7ECF3}'+
        '.rcP .num{text-align:right;font-variant-numeric:tabular-nums}'+
        '.rcP tfoot td{font-weight:700;color:#11284B;border-top:2px solid #11284B;border-bottom:0}'+
        '.rcP .grundlage{margin:16px 0 0;font-size:11.5px;color:#172033}.rcP .grundlage li{margin:0 0 3px}'+
        '.rcP .hinweis{margin:16px 0 0;font-size:10.5px;line-height:1.5;color:#5C687D}'+
        '</style>';
      return css+'<div class="rcP">'+
        '<p class="eyebrow">Ihre Übersicht</p>'+
        '<h1>'+(st.name?esc(st.name):'Rückwirkende Ansprüche')+'</h1>'+
        '<p class="sub">'+esc(phasenText(g))+' · rückwirkend ab '+esc(frueh?frueh.von:'')+' · Stand: '+ds+'</p>'+
        '<div class="kacheln">'+
          '<div class="kachel"><small>Rückwirkend insgesamt</small><strong>'+eur2(r.brutto)+'</strong></div>'+
          '<div class="kachel kunde"><small>'+pz(kunde)+'</small><strong>'+eur2(r.netto)+'</strong></div>'+
          '<div class="kachel unser"><small>'+pz(pct)+'</small><strong>'+eur2(r.abzug)+'</strong></div>'+
        '</div>'+
        '<div class="balken"><i style="width:'+kunde+'%">'+(kunde>=14?Math.round(kunde)+' %':'')+'</i><b style="width:'+pct+'%">'+(pct>=14?Math.round(pct)+' %':'')+'</b></div>'+
        '<h2>Aufteilung nach Jahren</h2>'+
        '<table><thead><tr><th>Jahr</th><th class="num">Pflegegrad (Umwandlung / Entlastung)</th><th class="num">Verhinderungspflege</th><th class="num">Summe</th></tr></thead><tbody>'+
          zeilen.map(function(z){return '<tr><td><b>'+z.jahr+'</b></td><td class="num">'+eur2(z.pg)+'</td><td class="num">'+eur2(z.vp)+'</td><td class="num"><b>'+eur2(z.sum)+'</b></td></tr>'}).join('')+
        '</tbody><tfoot><tr><td>Gesamt</td><td class="num">'+eur2(r.sumPG)+'</td><td class="num">'+eur2(r.sumVP)+'</td><td class="num">'+eur2(r.brutto)+'</td></tr></tfoot></table>'+
        '<h2 style="margin-top:18px">Grundlage der Berechnung</h2><ul class="grundlage">'+
          g.map(function(x){return '<li>Pflegegrad '+esc(x.stufe)+': '+esc(zeitText(x))+' – Entlastungsbetrag '+(x.ent?'genutzt':'nicht genutzt')+'</li>'}).join('')+
          (r.vpRows&&r.vpRows.length?'<li>Verhinderungspflege / Kurzzeitpflege offen in: '+r.vpRows.filter(function(x){return x.betrag>0}).map(function(x){return esc(x.jahr)}).join(', ')+'</li>':'')+
        '</ul>'+
        '<p class="hinweis">Unverbindliche Berechnung auf Grundlage Ihrer Angaben und der jeweils geltenden Beträge. Gerechnet wird höchstens ab 01.01.'+J0+' (Verjährung). Die tatsächliche Höhe stellt die Pflegekasse fest.</p>'+
      '</div>';
    }
    /* ---- Oberfläche ---- */
    function optJahr(sel,mitFrueher){return (mitFrueher?'<option value="frueher"'+(sel==='frueher'?' selected':'')+'>'+(J0-1)+' oder früher</option>':'')+JAHRE.map(function(y){return '<option value="'+y+'"'+(String(sel)===String(y)?' selected':'')+'>'+y+'</option>'}).join('')}
    function optMon(sel){return MONATE.map(function(m,i){return '<option value="'+(i+1)+'"'+(String(sel)===String(i+1)?' selected':'')+'>'+m+'</option>'}).join('')}
    function phaseHtml(p,i){
      var vMonSicht=p.vJahr&&p.vJahr!=='frueher';
      return '<div class="rcPh" data-i="'+i+'"><div class="rcPhHead"><b>Zeitraum '+(i+1)+'</b>'+(st.phasen.length>1?'<button type="button" class="rcX" data-del="'+i+'" title="Zeitraum entfernen" aria-label="Zeitraum entfernen">✕</button>':'')+'</div>'+
        '<div class="rcRow"><label>Pflegegrad</label><div class="rcChips">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="rcChip sm'+(String(p.stufe)===String(n)?' on':'')+'" data-pg="'+n+'">Pflegegrad '+n+'</button>'}).join('')+'</div></div>'+
        '<div class="rcPhGrid"><div class="rcRow"><label>Von</label><div class="rcSel"><select class="cfInput" data-f="vJahr"><option value="">Jahr …</option>'+optJahr(p.vJahr,true)+'</select>'+(vMonSicht?'<select class="cfInput" data-f="vMon">'+optMon(p.vMon)+'</select>':'')+'</div></div>'+
        '<div class="rcRow"><label>Bis</label><div class="rcSel"><select class="cfInput" data-f="bis"><option value="heute"'+(p.bis==='heute'?' selected':'')+'>läuft noch</option><option value="datum"'+(p.bis==='datum'?' selected':'')+'>bis …</option></select>'+
          (p.bis==='datum'?'<select class="cfInput" data-f="bJahr"><option value="">Jahr …</option>'+optJahr(p.bJahr,false)+'</select><select class="cfInput" data-f="bMon">'+optMon(p.bMon)+'</select>':'')+'</div></div></div>'+
        '<div class="rcRow"><label>Entlastungsbetrag in diesem Zeitraum</label><div class="rcChips"><button type="button" class="rcChip sm'+(p.ent?' on':'')+'" data-ent="1">genutzt</button><button type="button" class="rcChip sm'+(p.ent?'':' on')+'" data-ent="0">nicht genutzt</button></div></div></div>';
    }
    el.innerHTML=
      '<div class="cfTop"><div><h1>Rückwirkend-Rechner</h1><p>Zeigt in Zahlen, was rückwirkend zusteht und wie sich der Betrag aufteilt. Es wird nichts gespeichert.</p></div><div class="actions"><button type="button" data-r="reset">Zurücksetzen</button><button type="button" data-r="voll">Ausführlich rechnen</button></div></div>'+
      '<div class="cfPanel rcPanel"><h2>Angaben</h2>'+
        '<div class="rcRow"><label for="rcName">Name</label><input id="rcName" class="cfInput" type="text" autocomplete="off" placeholder="Name der pflegebedürftigen Person"></div>'+
        '<div data-r="phasen"></div>'+
        '<div class="actions" style="margin:0 0 6px"><button type="button" data-r="addPh">+ weiteren Zeitraum</button></div>'+
        '<p class="mini" data-r="phHinweis">Hat sich der Pflegegrad geändert oder wurde der Entlastungsbetrag nur zeitweise genutzt (z. B. die ersten 6 Monate)? Dann einfach einen weiteren Zeitraum anlegen.</p>'+
        '<div class="rcRow" data-r="vpRow" style="margin-top:18px"><label>Verhinderungspflege / Kurzzeitpflege – in diesen Jahren <b>nicht</b> genutzt</label><div class="rcChips" data-r="vp"></div><div data-r="vpBetraege"></div><div class="mini">Nur angetippte Jahre werden gerechnet. Voreingestellt ist der volle Jahresbetrag; bei teilweiser Nutzung den offenen Restbetrag eintragen.</div></div>'+
        '<div class="rcRow rcPct"><label for="rcPct">Unser Anteil in %</label><input id="rcPct" class="cfInput" type="text" inputmode="decimal" value="40"></div>'+
      '</div>'+
      '<div class="cfPanel rcPanel" data-r="res"></div>';
    function q(n){return el.querySelector('[data-r="'+n+'"]')}
    function zeichnePhasen(){q('phasen').innerHTML=st.phasen.map(phaseHtml).join('')}
    function zeichneVp(){
      var y0=startJahr(),jahre=y0?JAHRE.filter(function(y){return y>=y0}):[];
      q('vp').innerHTML=jahre.map(function(y){return '<button type="button" class="rcChip'+(st.vpOffen[y]?' on':'')+'" data-y="'+y+'">'+y+'</button>'}).join('')||'<span class="mini">Bitte erst Pflegegrad und Beginn wählen.</span>';
      q('vpBetraege').innerHTML=jahre.filter(function(y){return st.vpOffen[y]}).map(function(y){
        var v=st.vpBetrag[y]!=null?st.vpBetrag[y]:eur2(C.vpDefaultAmount(y)).replace(' €','');
        return '<div class="rcVpRow"><b>'+y+'</b><label>Offener Betrag</label><input class="cfInput" data-vpb="'+y+'" inputmode="decimal" value="'+esc(v)+'"><span>€</span></div>';
      }).join('');
    }
    function rechnen(){
      var box=q('res'),gp=gueltigePhasen(),g=gp.liste;
      q('phHinweis').innerHTML=gp.hinweise.length?'<span style="color:#B4332F;font-weight:600">'+gp.hinweise.map(esc).join(' ')+'</span>':'Hat sich der Pflegegrad geändert oder wurde der Entlastungsbetrag nur zeitweise genutzt (z. B. die ersten 6 Monate)? Dann einfach einen weiteren Zeitraum anlegen.';
      if(!g.length){box.innerHTML='<h2>Ergebnis</h2><div class="empty">Bitte Pflegegrad und Beginn wählen – dann erscheint hier die Berechnung.</div>';return}
      var d=daten(),r=C.berechne(d,st.pct),zeilen=proJahr(r),pct=Math.max(0,Math.min(100,r.abzugPct||0)),kunde=100-pct;
      box.innerHTML='<h2>Ergebnis</h2>'+
        '<div class="rcTiles">'+
          '<div class="rcTile"><small>Rückwirkend insgesamt</small><strong>'+eur2(r.brutto)+'</strong></div>'+
          '<div class="rcTile rcOwn"><small>'+pz(kunde)+'</small><strong>'+eur2(r.netto)+'</strong></div>'+
          '<div class="rcTile rcOur"><small>'+pz(pct)+'</small><strong>'+eur2(r.abzug)+'</strong></div>'+
        '</div>'+
        '<div class="rcBar" aria-hidden="true"><i style="width:'+kunde+'%">'+(kunde>=14?Math.round(kunde)+' %':'')+'</i><b style="width:'+pct+'%">'+(pct>=14?Math.round(pct)+' %':'')+'</b></div>'+
        '<div class="tablewrap"><table class="cfTable"><thead><tr><th>Jahr</th><th class="num">Pflegegrad (Umwandlung / Entlastung)</th><th class="num">Verhinderungspflege</th><th class="num">Summe</th></tr></thead><tbody>'+
          (zeilen.length?zeilen.map(function(z){return '<tr><td><b>'+z.jahr+'</b></td><td class="num">'+eur2(z.pg)+'</td><td class="num">'+eur2(z.vp)+'</td><td class="num"><b>'+eur2(z.sum)+'</b></td></tr>'}).join(''):'<tr><td colspan="4" class="mini">Für diese Angaben ergibt sich kein rückwirkender Betrag.</td></tr>')+
        '</tbody></table></div>'+
        '<div class="actions" style="margin-top:14px"><button type="button" class="primaryBtn" data-r="print">Übersicht drucken / als PDF</button></div>'+
        '<p class="mini">Unverbindliche Berechnung. Gerechnet wird höchstens ab 01.01.'+J0+' (Verjährung). Überschneiden sich Zeiträume, gilt für jeden Monat der später beginnende.</p>';
      q('print').onclick=function(){C.drucken(druckHtml(r,zeilen,g),'Curafact Übersicht')};
    }
    function alles(){zeichnePhasen();zeichneVp();rechnen()}
    /* Ereignisse */
    var phBox=q('phasen');
    phBox.addEventListener('click',function(e){
      var row=e.target.closest('.rcPh');if(!row)return;var i=+row.dataset.i,p=st.phasen[i],b;
      if((b=e.target.closest('[data-pg]'))){p.stufe=b.dataset.pg;[].forEach.call(row.querySelectorAll('[data-pg]'),function(x){x.classList.toggle('on',x===b)});zeichneVp();rechnen();return}
      if((b=e.target.closest('[data-ent]'))){p.ent=b.dataset.ent==='1';[].forEach.call(row.querySelectorAll('[data-ent]'),function(x){x.classList.toggle('on',x===b)});rechnen();return}
      if((b=e.target.closest('[data-del]'))){st.phasen.splice(i,1);alles();return}
    });
    phBox.addEventListener('change',function(e){
      var s=e.target.closest('select[data-f]');if(!s)return;var i=+s.closest('.rcPh').dataset.i,p=st.phasen[i],f=s.dataset.f;p[f]=s.value;
      if(f==='bis'||f==='vJahr'){zeichnePhasen()}
      if(f==='vJahr'||f==='vMon'||f==='bJahr'||f==='bMon'||f==='bis'){/* offene Jahre vor dem Beginn entfernen */var y0=startJahr();Object.keys(st.vpOffen).forEach(function(y){if(y0&&+y<y0)delete st.vpOffen[y]})}
      zeichneVp();rechnen();
    });
    q('addPh').onclick=function(){
      var last=st.phasen[st.phasen.length-1];
      var p=neuePhase(last);
      if(last&&last.bis==='datum'&&last.bJahr){var m=+last.bMon+1,y=+last.bJahr;if(m>12){m=1;y++}if(y<=JAHRE[JAHRE.length-1]){p.vJahr=String(y);p.vMon=String(m)}}
      st.phasen.push(p);alles();
    };
    q('vp').onclick=function(e){var b=e.target.closest('[data-y]');if(!b)return;var y=b.dataset.y;st.vpOffen[y]=!st.vpOffen[y];zeichneVp();rechnen()};
    q('vpBetraege').addEventListener('input',function(e){var i=e.target.closest('[data-vpb]');if(!i)return;st.vpBetrag[i.dataset.vpb]=i.value;rechnen()});
    el.querySelector('#rcName').oninput=function(){st.name=this.value;rechnen()};
    el.querySelector('#rcPct').oninput=function(){st.pct=this.value.replace(',','.');rechnen()};
    el.querySelector('[data-r="reset"]').onclick=function(){if(!confirm('Alle Eingaben löschen?'))return;st={name:'',phasen:[neuePhase()],vpOffen:{},vpBetrag:{},pct:'40'};el.querySelector('#rcName').value='';el.querySelector('#rcPct').value='40';alles()};
    el.querySelector('[data-r="voll"]').onclick=function(){mountVoll(el)};
    alles();
  }
  function mount(el){mountEinfach(el)}
  return {mount:mount,mountVoll:mountVoll,mountEinfach:mountEinfach};
})();
