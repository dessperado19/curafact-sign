/* Curafact – ausgefüllter Neukunden-Aufnahmebogen zum Drucken / als PDF sichern.
   Gleiche Gliederung wie der leere Bogen (Neukunden-Aufnahmebogen.pdf), befüllt aus dem Kunden-JSON.
   Nur Angaben, die in der Akte stehen; Unbekanntes bleibt leer (keine Annahmen). Keine Abhängigkeiten. */
var CFAufnahmeDruck=(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]})}
  function ymd(s){var m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$|^(\d{1,2})\.(\d{4})$/.exec(String(s||'').trim());if(!m)return null;return m[3]?{y:+m[3],m:+m[2]}:{y:+m[5],m:+m[4]}}
  function jahre(){var o=[],h=new Date().getFullYear();for(var y=2022;y<=h;y++)o.push(y);return o}
  function f(label,wert,span){return '<div class="f" style="grid-column:span '+(span||6)+'"><div class="l">'+esc(label)+'</div><div class="v">'+(esc(wert)||'&nbsp;')+'</div></div>'}
  function sec(n,t,sub,inner){return '<h2><i></i>'+n+'. '+esc(t)+(sub?' <small>'+esc(sub)+'</small>':'')+'</h2>'+inner}
  function box(checked){return '<span class="cb'+(checked?' on':'')+'">'+(checked?'&#10003;':'')+'</span>'}

  function pflegegradTeil(d){
    var ph=(Array.isArray(d.pflegegrade)?d.pflegegrade:[]).filter(function(p){return p&&p.stufe}).slice();
    if(!ph.length)return '<div class="grid">'+f('Aktueller Pflegegrad','',6)+f('Aktueller Pflegegrad gilt seit','',6)+'</div>';
    ph.sort(function(a,b){var x=ymd(a.von),y=ymd(b.von);return (x?x.y*12+x.m:0)-(y?y.y*12+y.m:0)});
    var akt=ph[ph.length-1],frueher=ph.slice(0,-1);
    var h='<div class="pg"><span class="l">Aktueller Pflegegrad</span>'+[1,2,3,4,5].map(function(n){return '<span class="pgo">'+box(String(akt.stufe)===String(n))+' PG '+n+'</span>'}).join('')+'</div>';
    h+='<div class="grid">'+f('Aktueller Pflegegrad gilt seit',d.pflegegrad_seit_angabe||akt.von||'',6)+f('Bis (nur wenn beendet)',akt.fortlaufend?'':(akt.bis||''),6)+'</div>';
    h+='<div class="pg"><span class="l">Hatte die Person früher einen anderen Pflegegrad?</span><span class="pgo">'+box(!frueher.length)+' Nein, immer gleich</span><span class="pgo">'+box(frueher.length>0)+' Ja, bitte eintragen:</span></div>';
    if(frueher.length){
      h+='<table class="tab"><tr><th>Früherer Pflegegrad</th><th>von</th><th>bis</th></tr>'+frueher.map(function(p){return '<tr><td>PG '+esc(p.stufe)+'</td><td>'+esc(p.von||'')+'</td><td>'+esc(p.fortlaufend?'':(p.bis||''))+'</td></tr>'}).join('')+'</table>';
    }
    return h;
  }

  function jahrTab(werte){
    return '<table class="tab"><tr><th style="width:70px">Jahr</th><th>genommen</th><th>nicht genommen</th><th style="width:48%">Weiteres (Zeitraum, Betrag, Anbieter …)</th></tr>'+
      jahre().map(function(y){var w=werte[y];return '<tr><td class="j">'+y+'</td><td>'+box(w&&w.genommen===true)+'</td><td>'+box(w&&w.genommen===false)+'</td><td>'+esc(w?w.notiz:'')+'</td></tr>'}).join('')+'</table>';
  }
  function entlastungWerte(d){
    var out={},saved=(d.entlastung_jahre&&typeof d.entlastung_jahre==='object')?d.entlastung_jahre:null;
    if(saved)Object.keys(saved).forEach(function(y){var s=saved[y];if(s&&typeof s==='object')out[y]={genommen:s.genommen!==false,notiz:s.notiz||''}});
    // sonst nur dort, wo der Pflegegrad-Zeitraum ausdrücklich „Entlastung genommen“ sagt
    (Array.isArray(d.pflegegrade)?d.pflegegrade:[]).forEach(function(p){
      if(!p||!p.entlastung_genommen)return;
      var v=ymd(p.von),b=p.fortlaufend||!p.bis?{y:new Date().getFullYear()}:ymd(p.bis);if(!v||!b)return;
      for(var y=Math.max(2022,v.y);y<=b.y;y++)if(!out[y])out[y]={genommen:true,notiz:''};
    });
    return out;
  }
  function vpWerte(d){
    var out={};
    (Array.isArray(d.verhinderungspflege)?d.verhinderungspflege:[]).forEach(function(r){
      var y=parseInt(r.jahr,10);if(!y)return;
      var n=[];if(r.genommen){if(r.betrag)n.push(r.betrag+' €');if(r.start||r.ende)n.push((r.start||'')+' – '+(r.ende||''))}
      if(r.notiz)n.push(r.notiz);
      out[y]={genommen:!!r.genommen,notiz:n.join(', ')};
    });
    return out;
  }

  function helfer(d){
    var o=[];
    for(var i=1;i<=6;i++){
      var p=i===1?'hilfe':'hilfe'+i;
      var h={name:d[p+'_name']||'',anschrift:d[p+'_anschrift']||'',geb:d[p+'_geburtsdatum']||'',tel:d[p+'_telefon']||'',sig:d[p+'_sig_dataurl']||''};
      if(h.name||h.anschrift||h.geb||h.tel||h.sig)o.push(h);
    }
    return o;
  }

  function sigBox(url,unter){
    return '<div class="sig"><div class="sb">'+(url?'<img src="'+esc(url)+'" alt="Unterschrift">':'')+'</div><div class="sl">'+esc(unter)+'</div><div class="ort">&nbsp;</div><div class="sl">Ort, Datum</div></div>';
  }

  var CSS='@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Avenir Next",Avenir,"Helvetica Neue",Arial,sans-serif;color:#16324f;font-size:9pt}'+
    '.page{width:210mm;min-height:296mm;position:relative;padding:0 20mm 26mm;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}'+
    '.bar{height:7mm;background:#16A9BA;margin:0 -20mm 5mm}.logo{text-align:right;height:17mm}.logo img{height:16mm}'+
    'h1{font-size:18pt;color:#0F3F7A;margin:2mm 0 1mm}.sub{color:#66788a;margin:0 0 4mm}'+
    'h2{font-size:11.5pt;color:#0F3F7A;margin:5mm 0 2mm;display:flex;align-items:center;gap:6px}h2 i{display:inline-block;width:3px;height:14px;background:#16A9BA}h2 small{font-weight:400;font-size:8pt;color:#66788a}'+
    '.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:2mm 5mm;margin-bottom:2mm}.l{font-size:7.5pt;color:#4f6a85}.v{min-height:6.5mm;background:#f3f9fd;border-bottom:1.5px solid #16A9BA;padding:1.4mm 2mm;font-size:9.5pt}'+
    '.pg{display:flex;gap:5mm;align-items:center;margin:2mm 0}.pgo{display:inline-flex;gap:2mm;align-items:center}'+
    '.cb{display:inline-block;width:4mm;height:4mm;border:1px solid #16A9BA;border-radius:1mm;text-align:center;line-height:3.6mm;font-size:8pt;color:#0F3F7A;font-weight:700;vertical-align:middle}.cb.on{background:#e6f6f8}'+
    '.tab{width:100%;border-collapse:collapse;margin:1mm 0}.tab th{text-align:left;font-size:7.5pt;color:#4f6a85;font-weight:600;padding:1mm 2mm}.tab td{padding:1.6mm 2mm;border-bottom:1px solid #cfe9ee;height:6.2mm}.tab tr:nth-child(odd) td{background:#f3f9fd}.tab td.j{font-weight:800;color:#0F3F7A}'+
    '.notiz{min-height:22mm;border:1px solid #16A9BA;border-radius:2mm;padding:2mm;white-space:pre-wrap}'+
    '.sigs{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.sig .sb{height:30mm;border:1px solid #16A9BA;border-radius:2mm;display:flex;align-items:center;justify-content:center}.sig img{max-width:100%;max-height:28mm}.sig .sl{font-size:7.5pt;color:#4f6a85;margin:1mm 0 6mm}.ort{border-bottom:1px solid #0F3F7A;height:6mm;font-size:9pt;padding-top:1mm}'+
    '.h2name{font-size:8.5pt;color:#0F3F7A;font-weight:700;margin:3mm 0 1mm}'+
    '.foot{position:absolute;left:20mm;right:20mm;bottom:8mm;border-top:1px solid #cfe9ee;padding-top:2mm;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:6mm;font-size:6.5pt;color:#66788a;line-height:1.35}.foot b{color:#0F3F7A}';

  function html(d,logoUrl){
    var foot=function(n){return '<div class="foot"><div><b>Curafact PflegeAbrechnung Direkt UG (haftungsbeschränkt)</b><br>Berliner Str. 36<br>33378 Rheda-Wiedenbrück</div><div>Tel. 05242 182649-0<br>kontakt@curafact.de<br>curafact.de</div><div>Geschäftsführer: Önder Sülüngür<br>Amtsgericht Gütersloh, HRB 14607<br>IK 590537042<span style="float:right">Seite '+n+' von 3</span></div></div>'};
    var kopf='<div class="bar"></div><div class="logo">'+(logoUrl?'<img src="'+esc(logoUrl)+'" alt="Curafact">':'')+'</div>';
    var hs=helfer(d);
    var p1=kopf+'<h1>Neukunden-Aufnahmebogen</h1><p class="sub">Ausgefüllt aus der Kundenakte'+(d.pflege_name?' – '+esc(d.pflege_name):'')+'. Gedruckt am '+new Date().toLocaleDateString('de-DE')+'.</p>'+
      sec(1,'Pflegebedürftige Person','','<div class="grid">'+f('Name, Vorname',d.pflege_name,8)+f('Geburtsdatum',d.pflege_geburtsdatum,4)+f('Anschrift (Straße, PLZ, Ort)',d.pflege_anschrift,12)+f('Telefon',d.pflege_telefon,4)+f('Pflegekasse',d.pflege_kasse,8)+f('Versichertennummer',d.pflege_kvnr,6)+'</div>')+
      sec(2,'Pflegegrad','(Monat und Jahr genügen)',pflegegradTeil(d))+
      sec(3,'Entlastungsbetrag (§ 45b SGB XI)','– bitte je Jahr ankreuzen',jahrTab(entlastungWerte(d)))+
      foot(1);
    var sigPflege=d.pflege_sig_dataurl||'';
    var p2=kopf+
      sec(4,'Pflegeperson','(gesetzliche Vertretung / bevollmächtigte Person, falls abweichend)','<div class="grid">'+f('Name, Vorname',d.person_name,8)+f('Geburtsdatum',d.person_geburtsdatum,4)+f('Anschrift (Straße, PLZ, Ort)',d.person_anschrift,8)+f('Verhältnis (z. B. Ehefrau, Sohn)',d.person_verhaeltnis,4)+'</div>')+
      sec(5,'Nachbarschaftshilfe','',(hs.length?hs:[{}]).map(function(h,i){return (hs.length>1?'<div class="h2name">'+(i+1)+'. Nachbarschaftshilfe</div>':'')+'<div class="grid">'+f('Name, Vorname',h.name,8)+f('Geburtsdatum',h.geb,4)+f('Anschrift (Straße, PLZ, Ort)',h.anschrift,8)+f('Telefon',h.tel,4)+'</div>'}).join(''))+
      sec(6,'Verhinderungspflege / Kurzzeitpflege','– bitte je Jahr ankreuzen',jahrTab(vpWerte(d)))+
      foot(2);
    var sigList=sigBox(sigPflege,'Unterschrift pflegebedürftige Person / Pflegeperson')+(hs.length?hs:[{}]).map(function(h,i){return sigBox(h.sig||'','Unterschrift '+(hs.length>1?(i+1)+'. ':'')+'Nachbarschaftshilfe')}).join('');
    var abz=String(d.abzug_prozent||'').trim();
    var p3=kopf+
      sec(7,'Zusätzliche Notizen / Informationen','','<div class="notiz">'+esc(d.aufnahme_notizen||'')+'</div>')+
      sec(8,'Unterschriften','','<div class="sigs">'+sigList+'</div>')+
      sec(9,'Berechnung','(erstellen wir aus Ihren Angaben)','<div class="pg"><span class="pgo"><span class="cb'+(d.rueckwirkend_beantragen?' on':'')+'">'+(d.rueckwirkend_beantragen?'&#10003;':'')+'</span> Rückwirkend beantragen</span></div><div class="grid">'+f('Abzug in %',abz,4)+'</div>')+
      foot(3);
    return '<div class="page">'+p1+'</div><div class="page">'+p2+'</div><div class="page">'+p3+'</div>';
  }

  function drucken(d){
    d=d||{};
    var logo='';try{logo=new URL('logo.png',location.href).href}catch(e){}
    var fr=document.getElementById('cf_aufn_iframe');
    if(!fr){fr=document.createElement('iframe');fr.id='cf_aufn_iframe';fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';document.body.appendChild(fr)}
    var w=fr.contentWindow;w.document.open();
    w.document.write('<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Curafact Aufnahmebogen'+(d.pflege_name?' – '+esc(d.pflege_name):'')+'</title><style>'+CSS+'</style></head><body>'+html(d,logo)+'</body></html>');
    w.document.close();w.focus();
    var go=function(){w.print()};
    var imgs=[].slice.call(w.document.images),offen=imgs.filter(function(i){return !i.complete}).length;
    if(!offen)setTimeout(go,150);else{var n=0,fertig=function(){if(++n>=offen)setTimeout(go,100)};imgs.forEach(function(i){if(!i.complete){i.onload=fertig;i.onerror=fertig}});setTimeout(function(){if(n<offen){n=offen;go()}},2500)}
  }
  return {html:html,drucken:drucken,CSS:CSS};
})();
if(typeof module!=='undefined')module.exports=CFAufnahmeDruck;
