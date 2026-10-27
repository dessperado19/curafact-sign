/* Curafact – Berechnung (gleiche Formeln wie die Desktop-App, app.py: _calculate_pflegegrade_amounts / _vp_sum_and_rows,
   dazu die Nachweis-Berechnung aus intake.html). Bei neuen Jahren müssen app.py und diese Datei gepflegt werden. */
var CFC=(function(){
  var PFLEGEGELD_TBL={2021:{1:0,2:316,3:545,4:728,5:901},2022:{1:0,2:316,3:545,4:728,5:901},2023:{1:0,2:316,3:545,4:728,5:901},2024:{1:0,2:332,3:573,4:765,5:947},2025:{1:0,2:347,3:599,4:800,5:990}};
  var PSL_TBL={2021:{1:0,2:689,3:1298,4:1612,5:1995},2022:{1:0,2:689,3:1298,4:1612,5:1995},2023:{1:0,2:724,3:1363,4:1693,5:2095},2024:{1:0,2:761,3:1432,4:1778,5:2200},2025:{1:0,2:796,3:1497,4:1859,5:2299}};
  var ENTL_TBL={2021:125,2022:125,2023:125,2024:125,2025:131};
  var MIN_Y=2021,MAX_Y=2025;
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]})}
  function eur(n){return (Math.round(n||0)).toLocaleString('de-DE')+' €'}
  function deMoney(v){var n=Number(v||0);return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}
  /* TT.MM.JJJJ oder JJJJ-MM-TT; Jahr muss vierstellig sein (0022 -> ungültig, nicht 1922) */
  function parseDE(v){
    if(v==null)return null;var t=String(v).trim();if(!t)return null;var y,mo,d,m;
    if((m=t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))){d=+m[1];mo=+m[2];y=+m[3]}
    else if((m=t.match(/^(\d{4})-(\d{2})-(\d{2})$/))){y=+m[1];mo=+m[2];d=+m[3]}
    else return null;
    if(y<1900||y>2100)return null;
    var dt=new Date(y,mo-1,d,12);
    return (dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d)?dt:null;
  }
  function noon(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12)}
  function firstOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1,12)}
  function addMonths(d,n){return new Date(d.getFullYear(),d.getMonth()+n,1,12)}
  function monthKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}

  /* Prüft Pflegegrad-Phasen auf offensichtliche Fehler (z. B. Zahlendreher 01.01.0022) */
  function pruefePhasen(phasen){
    var out=[];
    (phasen||[]).forEach(function(ph,i){
      ['von','bis'].forEach(function(k){
        var raw=String(ph&&ph[k]!=null?ph[k]:'').trim();if(!raw)return;
        var d=parseDE(raw);
        if(!d){
          var m=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,4})$/);
          var vorschlag=(m&&+m[3]<100)?(m[1].padStart(2,'0')+'.'+m[2].padStart(2,'0')+'.'+(2000+(+m[3]))):'';
          out.push({zeile:i,feld:k,wert:raw,vorschlag:vorschlag,text:'„'+raw+'“ ist kein gültiges Datum (Jahr vierstellig, z. B. 2022).'});
        }
      });
    });
    return out;
  }

  /* === Auswertung (Berechnung der Desktop-App, calculate_customer_claim) === */
  function pflegegradBetraege(phasen,heute){
    var today=noon(heute||new Date()),monthMap={};
    (phasen||[]).forEach(function(ph){
      if(!ph||typeof ph!=='object')return;
      var stufe=parseInt(String(ph.stufe||ph.pflegegrad||ph.pg||2).replace('PG','').trim(),10);if(isNaN(stufe))stufe=2;
      var dVon=parseDE(ph.von||ph.seit||ph.ab||'');
      var dBisE=parseDE(ph.bis||'');
      var dBis=dBisE||(ph.fortlaufend?today:null);
      if(!dVon||!dBis||dBis<dVon)return;
      var start=firstOfMonth(dVon),end=firstOfMonth(dBis);
      if(start.getFullYear()<MIN_Y)start=new Date(MIN_Y,0,1,12);
      for(var cur=start;cur<=end;cur=addMonths(cur,1)){
        var key=monthKey(cur),rec={stufe:stufe,ent:!!ph.entlastung_genommen,startedAt:dVon},prev=monthMap[key];
        if(!prev||rec.startedAt>prev.startedAt)monthMap[key]=rec;
      }
    });
    var agg={};
    Object.keys(monthMap).forEach(function(key){
      var rec=monthMap[key],y=parseInt(key.split('-')[0],10),yc=PFLEGEGELD_TBL[y]?y:MAX_Y;
      var pg=(PFLEGEGELD_TBL[yc]||{})[rec.stufe]||0,psl=(PSL_TBL[yc]||{})[rec.stufe]||0,entl=ENTL_TBL[yc]||0;
      var ohne=0.4*psl+0.6*pg,mit=ohne+entl,used=(rec.ent?ohne:mit)-pg;
      var k=rec.stufe+'|'+y;
      var cur=agg[k]||(agg[k]={stufe:rec.stufe,jahr:y,monate:0,pflegegeld_100:pg,zukunftsbetrag_mit_entlastung:mit,zukunftsbetrag_ohne_entlastung:ohne,monat_betrag_mit_entlastung:mit-pg,monat_betrag_ohne_entlastung:ohne-pg,monat_betrag:used,gesamt:0});
      cur.monate+=1;cur.monat_betrag=used;cur.gesamt+=used;
    });
    var details=Object.keys(agg).map(function(k){return agg[k]}).sort(function(a,b){return a.jahr-b.jahr||a.stufe-b.stufe}).map(function(x){
      var o={};Object.keys(x).forEach(function(k){o[k]=typeof x[k]==='number'?Math.round(x[k]):x[k]});return o;
    });
    var total=Math.round(details.reduce(function(s,d){return s+(d.gesamt||0)},0));
    return {details:details,total:total};
  }
  function parseMoney(v){
    if(v==null)return 0;if(typeof v==='number')return v;
    var t=String(v).trim().replace('€','').replace(/\s/g,'');if(!t)return 0;
    try{
      if(t.indexOf(',')>=0)return parseFloat(t.replace(/\./g,'').replace(',','.'))||0;
      if(t.indexOf('.')>=0){var p=t.split('.');
        if(p.length===2){if(p[1].length===1||p[1].length===2)return parseFloat(t)||0;if(p[1].length===3&&p[0].length<=3)return parseFloat(t.replace(/\./g,''))||0}
        if(p.length>2)return parseFloat(t.replace(/\./g,''))||0;return parseFloat(t)||0}
      return parseFloat(t)||0;
    }catch(e){return 0}
  }
  function vpDefaultAmount(y){y=parseInt(y,10);return isNaN(y)?0:(y>=2025?3539:2418)}
  function vpBetraege(rows){
    var out=[],total=0;
    (rows||[]).forEach(function(r){
      if(!r||typeof r!=='object')return;
      var jahr=String(r.jahr==null?'':r.jahr).trim(),betrag=parseMoney(r.betrag),genommen=!!r.genommen,def=vpDefaultAmount(jahr);
      var manual=genommen&&betrag>0&&Math.abs(betrag-def)>0.009,counts=(!genommen&&betrag>0)||manual;
      if(jahr||betrag){out.push({jahr:jahr,genommen:genommen,betrag:Math.round((counts?betrag:0)*100)/100,start:r.start||'',ende:r.ende||'',zaehlt:counts});if(counts)total+=betrag}
    });
    return {rows:out,total:Math.round(total*100)/100};
  }
  function berechne(data,abzugPct,heute){
    data=data||{};
    var pg=pflegegradBetraege(data.pflegegrade,heute),vp=vpBetraege(data.verhinderungspflege);
    var pct=parseFloat(String(abzugPct==null?(data.abzug_prozent||'0'):abzugPct).replace(',','.'));if(isNaN(pct))pct=0;
    var brutto=Math.round((pg.total+vp.total)*100)/100,abzug=Math.round(brutto*pct)/100,netto=Math.round((brutto-abzug)*100)/100;
    return {ok:true,details:pg.details,sumPG:pg.total,total:pg.total,vpRows:vp.rows,sumVP:vp.total,abzugPct:pct,abzug:abzug,brutto:brutto,netto:netto,
      kunde:{name:data.pflege_name||'',anschrift:data.pflege_anschrift||'',kvnr:data.pflege_kvnr||'',kasse:data.pflege_kasse||''}};
  }
  function auswertungHtml(r,heute){
    var k=r.kunde||{};
    var vpRows=(r.vpRows||[]).map(function(x){return '<tr><td>'+esc(x.jahr)+'</td><td>'+esc(x.start||'')+'</td><td>'+esc(x.ende||'')+'</td><td class="num">'+deMoney(x.betrag)+'</td></tr>'}).join('')||'<tr><td colspan="4" class="small muted">Keine Verhinderungspflege eingetragen.</td></tr>';
    var pgRows=(r.details||[]).map(function(d){return '<tr><td>PG '+esc(d.stufe)+'</td><td>'+esc(d.jahr)+'</td><td class="num">'+esc(d.monate)+'</td><td class="num">'+deMoney(d.pflegegeld_100)+'</td><td class="num">'+deMoney(d.zukunftsbetrag_mit_entlastung)+'</td><td class="num">'+deMoney(d.zukunftsbetrag_ohne_entlastung)+'</td><td class="num">'+deMoney(d.monat_betrag)+'</td><td class="num">'+deMoney(d.gesamt)+'</td></tr>'}).join('')||'<tr><td colspan="8" class="small muted">Keine anrechenbaren Pflegegrad-Phasen.</td></tr>';
    var t=heute||new Date(),dstr=String(t.getDate()).padStart(2,'0')+'.'+String(t.getMonth()+1).padStart(2,'0')+'.'+t.getFullYear();
    return '<div class="calcPrint"><div class="calcHead"><div><h3>Auswertung – '+esc(k.name||'—')+'</h3><p>'+esc(k.anschrift||'')+'</p><p>'+esc(k.kasse||'')+(k.kvnr?' · KVNR: '+esc(k.kvnr):'')+'</p></div><div class="muted">Stand: '+dstr+'</div></div>'+
    '<div class="calcBox"><h4>Verhinderungspflege / Kurzzeitpflege (Restbeträge)</h4><table class="calcTable"><thead><tr><th>Jahr</th><th>Von</th><th>Bis</th><th class="num">Restbetrag (€)</th></tr></thead><tbody>'+vpRows+'</tbody><tfoot><tr><td colspan="3" class="num"><b>Summe</b></td><td class="num"><b>'+deMoney(r.sumVP)+'</b></td></tr></tfoot></table><p class="small muted">Standard: 2021–2024 = 2.418 €; ab 2025 = 3.539 €.</p></div>'+
    '<div class="calcBox"><h4>Pflegegrade – Detaillierte Berechnung</h4><table class="calcTable detailed"><thead><tr><th>PG</th><th>Jahr</th><th class="num">Monate</th><th class="num">Aktuelles PG (100%)</th><th class="num">Zukunftsbetrag (mit)</th><th class="num">Zukunftsbetrag (ohne)</th><th class="num">Monatlich Rückwirkend</th><th class="num">Gesamt Rückwirkend</th></tr></thead><tbody>'+pgRows+'</tbody><tfoot><tr><td colspan="7" class="num"><b>Summe Rückwirkend</b></td><td class="num"><b>'+deMoney(r.sumPG)+'</b></td></tr></tfoot></table></div>'+
    '<div class="calcBox summaryCalc"><table class="calcTable"><tbody><tr><td>Gesamt Rückwirkend</td><td class="num"><b>'+deMoney(r.sumPG)+'</b></td></tr><tr><td>+ Verhinderungspflege</td><td class="num"><b>'+deMoney(r.sumVP)+'</b></td></tr><tr class="brutto"><td><b>= Bruttogesamt</b></td><td class="num"><b>'+deMoney(r.brutto)+'</b></td></tr><tr class="abzug"><td><b>Abzug ('+deMoney(r.abzugPct)+' %)</b></td><td class="num"><b>− '+deMoney(r.abzug)+'</b></td></tr><tr class="netto"><td><b>Nettogesamt</b></td><td class="num"><b>'+deMoney(r.netto)+'</b></td></tr></tbody></table></div></div>';
  }

  /* === Nachweis (Zukünftig / Rückwirkend / Referenztabelle / Rechtsgrundlagen) – unverändert aus dem bisherigen Portal === */
  function rechnePflegegrade(phasen,heute){
    var today=noon(heute||new Date()),todayMonth=firstOfMonth(today),cutoff=new Date(today.getFullYear()-4,0,1,12),monthMap={};
    (phasen||[]).forEach(function(ph){
      var stufe=Number(ph.stufe)||2,dVon=parseDE(ph.von),dBis=today;
      if(!dVon||dBis<dVon)return;
      var startM=firstOfMonth(dVon),endM=firstOfMonth(dBis),minM=new Date(MIN_Y,0,1,12);
      if(startM<minM)startM=minM;if(endM<startM)return;
      for(var cur=new Date(startM);cur<=endM;cur=addMonths(cur,1)){
        var key=monthKey(cur),prev=monthMap[key],rec={stufe:stufe,ent:!!ph.entlastung_genommen,startedAt:dVon};
        if(!prev||rec.startedAt>prev.startedAt)monthMap[key]=rec;
      }
    });
    var past=[],sum=0,future=null;
    Object.keys(monthMap).forEach(function(key){
      var rec=monthMap[key],p=key.split('-'),j=+p[0],m=+p[1],jc=PFLEGEGELD_TBL[j]?j:MAX_Y;
      var pg=(PFLEGEGELD_TBL[jc]||{})[rec.stufe]||0,psl=(PSL_TBL[jc]||{})[rec.stufe]||0,entl=ENTL_TBL[jc]||0;
      var ohne=0.4*psl+0.6*pg,mit=ohne+entl,bMit=mit-pg,bOhne=ohne-pg,delta=rec.ent?bOhne:bMit,md=new Date(j,m-1,1,12);
      if(md<todayMonth){if(md>=cutoff){sum+=delta;past.push({jahr:j,monat:m,stufe:rec.stufe,monat_betrag:delta})}}
      else if(!future||md>=future._md){future={_md:md,jahr:j,stufe:rec.stufe,pflegegeld:pg,pflegegeld_nach_umwandlung:0.6*pg,umwandlungsbetrag:0.4*psl,entlastungsleistung:entl,gesamt_mit:mit,gesamt_ohne:ohne,monat_betrag_mit:bMit,monat_betrag_ohne:bOhne,monat_betrag:delta}}
    });
    past.sort(function(a,b){return a.jahr-b.jahr||a.monat-b.monat});
    var gm={},go=[];
    past.forEach(function(d){var key=d.jahr+'|'+Math.round(d.monat_betrag*100),g=gm[key];if(!g){g=gm[key]={jahr:d.jahr,monate:0,betragProMonat:d.monat_betrag,summe:0};go.push(key)}g.monate+=1;g.summe+=d.monat_betrag});
    return {futureRate:future,sumRueckwirkend:sum,pastDetails:past,pastGrouped:go.map(function(k){return gm[k]}),cutoffYear:cutoff.getFullYear()};
  }
  function referenzTabelle(){
    var jahr=MAX_Y;
    var rows=[2,3,4,5].map(function(st){
      var pg=PFLEGEGELD_TBL[jahr][st],psl=PSL_TBL[jahr][st],entl=ENTL_TBL[jahr],u=0.4*psl,pn=0.6*pg,gz=u+pn+entl,gzo=u+pn;
      return {stufe:st,pg:pg,psl:psl,umwandlung:u,pgNachUmwandlung:pn,entl:entl,gesamtZukuenftig:gz,gesamtZukuenftigOhne:gzo,mehrMoeglich:gz-pg,mehrMoeglichOhne:gzo-pg};
    });
    var head='<tr><th></th>'+rows.map(function(r){return '<th class="num">PG '+r.stufe+'</th>'}).join('')+'</tr>';
    var row=function(l,k){return '<tr><td>'+l+'</td>'+rows.map(function(r){return '<td class="num">'+eur(r[k])+'</td>'}).join('')+'</tr>'};
    var blank='<tr><td colspan="'+(rows.length+1)+'">&nbsp;</td></tr>';
    var total=function(l,k){return '<tr class="calcTotalRow"><td>'+l+'</td>'+rows.map(function(r){return '<td class="num">'+eur(r[k])+'</td>'}).join('')+'</tr>'};
    return '<div class="refTableWrap"><table class="calcTable"><thead>'+head+'</thead><tbody>'+row('Pflegegeld','pg')+row('Pflegesachleistung','psl')+blank+row('Umwandlung (zweckgebunden)','umwandlung')+row('Pflegegeld nach Umwandlung (frei verwendbar)','pgNachUmwandlung')+row('Entlastungsleistung (zweckgebunden)','entl')+total('Gesamt Zukünftig','gesamtZukuenftig')+row('Gesamt Zukünftig ohne Entlastung','gesamtZukuenftigOhne')+blank+row('Monatlich mehr möglich für die Pflege','mehrMoeglich')+row('Monatlich mehr möglich für die Pflege, ohne Entlastungsleistung','mehrMoeglichOhne')+'</tbody></table></div><p class="mini" style="font-size:11px;color:#889;margin-top:6px">Werte für '+jahr+', Referenzwerte pro Pflegegrad - unabhängig von den oben eingetragenen individuellen Zeiträumen.</p>';
  }
  function nachweisHtml(c,rueckwirkend,paragraphen,heute){
    var res=rechnePflegegrade(c.pflegegrade||[],heute),vpSum=0;
    (Array.isArray(c.verhinderungspflege)?c.verhinderungspflege:[]).forEach(function(v){if(v.genommen)return;var raw=String(v.betrag||'').replace(',','.').trim();vpSum+=raw?(Number(raw)||0):0});
    var h='<div class="calcHead"><div><h3>'+esc(c.pflege_name||'—')+'</h3><p class="mini">'+esc(c.pflege_kasse||'')+'</p></div></div>';
    if(res.futureRate){var f=res.futureRate;
      h+='<div class="calcBox"><h4>Zukünftig</h4>'+
      '<div class="calcRow"><span class="k">Pflegegeld (frei verfügbar)</span><span class="v">'+eur(f.pflegegeld_nach_umwandlung)+' / Monat</span></div>'+
      '<div class="calcRow"><span class="k">Umwandlungsbetrag (zweckgebunden – anerkannte Angebote)</span><span class="v">'+eur(f.umwandlungsbetrag)+' / Monat</span></div>'+
      '<div class="calcRow"><span class="k">Entlastungsleistung (zweckgebunden – anerkannte Angebote)</span><span class="v">'+eur(f.entlastungsleistung)+' / Monat</span></div>'+
      '<div class="calcRow total"><span class="k">Gesamt monatlich</span><span class="v">'+eur(f.gesamt_mit)+' / Monat</span></div>'+
      '<div class="calcRow"><span class="k">Monatlich mehr möglich für die Pflege (ggü. reinem Pflegegeld)</span><span class="v">'+eur(f.monat_betrag_mit)+' / Monat</span></div>'+
      '<div class="calcRow"><span class="k">Monatlich mehr möglich für die Pflege, ohne Entlastungsleistung</span><span class="v">'+eur(f.monat_betrag_ohne)+' / Monat</span></div></div>';
    }else h+='<div class="calcBox"><p class="mini">Keine laufende Pflegegrad-Phase ab dem aktuellen Monat erfasst.</p></div>';
    if(rueckwirkend){
      h+='<div class="calcBox"><h4>Rückwirkend</h4>';
      if(res.pastGrouped.length)h+='<div class="refTableWrap"><table class="calcTable"><thead><tr><th>Jahr</th><th class="num">Monate</th><th class="num">€ / Monat</th><th class="num">Jahressumme</th></tr></thead><tbody>'+res.pastGrouped.map(function(g){return '<tr><td>'+g.jahr+'</td><td class="num">'+g.monate+'</td><td class="num">'+eur(g.betragProMonat)+'</td><td class="num">'+eur(g.summe)+'</td></tr>'}).join('')+'</tbody></table></div>';
      else h+='<p class="mini">Keine rückwirkend anrechenbaren Monate erfasst.</p>';
      h+='<div style="margin-top:6px"><div class="calcRow"><span class="k">Summe</span><span class="v">'+eur(res.sumRueckwirkend)+'</span></div>'+(vpSum?'<div class="calcRow"><span class="k">+ Verhinderungspflege-Restbeträge</span><span class="v">'+eur(vpSum)+'</span></div>':'')+'<div class="calcRow total"><span class="k">Gesamt rückwirkend</span><span class="v">'+eur(res.sumRueckwirkend+vpSum)+'</span></div></div></div>';
    }
    h+='<div class="calcBox"><h4>Referenztabelle nach Pflegegrad</h4>'+referenzTabelle()+'</div>';
    if(paragraphen)h+='<div class="calcBox calcLegal"><h4>Rechtsgrundlagen</h4><p><b>Umwandlungsanspruch (§ 45a SGB XI)</b><br>Bis zu 40 % des monatlichen Pflegesachleistungsbudgets können in einen Umwandlungsbetrag für anerkannte Angebote zur Unterstützung im Alltag (z. B. Nachbarschaftshilfe) umgewandelt werden. Dadurch reduziert sich das Pflegegeld anteilig auf 60 % des vollen Satzes.</p><p style="margin-top:10px"><b>Entlastungsbetrag (§ 45b SGB XI)</b><br>Zusätzlich und unabhängig davon steht Pflegebedürftigen in häuslicher Pflege ein Entlastungsbetrag von bis zu 131 € monatlich zu, ebenfalls zweckgebunden für anerkannte Angebote zur Unterstützung im Alltag.</p><p style="margin-top:10px"><b>Zweckbindung</b><br>Das (reduzierte) Pflegegeld ist frei verfügbar und ohne Verwendungsnachweis nutzbar. Umwandlungsbetrag und Entlastungsbetrag sind dagegen zweckgebunden und werden nur gegen Nachweis bei anerkannten Angeboten erstattet.</p><p style="margin-top:10px"><b>Rückwirkende Beantragung (§ 45 SGB I)</b><br>Ansprüche auf Sozialleistungen verjähren vier Jahre nach Ablauf des Kalenderjahres, in dem sie entstanden sind – eine rückwirkende Beantragung ist daher regelmäßig für die letzten vier Kalenderjahre möglich.</p></div>';
    return h;
  }

  var PRINT_STYLES=`<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0}.page{padding:18px}.calcHead{display:flex;justify-content:space-between;gap:16px;margin-bottom:10px}.calcHead h3{margin:0 0 4px;color:#0b457f}.calcHead p{margin:2px 0;color:#64748b}.muted{color:#64748b}.small,.mini{font-size:12px}.calcBox{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0}.calcBox h4{margin:0 0 8px;color:#0b457f}.calcTable{width:100%;border-collapse:collapse;font-size:12px}.calcTable th,.calcTable td{padding:7px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}.calcTable .num{text-align:right}.brutto{background:#fef3c7}.abzug{background:#fee2e2}.netto{background:#dcfce7}.detailed{table-layout:fixed;font-size:10px}.detailed td,.detailed th{padding:4px 3px;overflow-wrap:break-word;word-break:break-word}.detailed tfoot td{font-size:9px}.grpEnd{border-right:2px solid #94a3b8}.calcRow{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:2px 12px;padding:5px 0;border-bottom:1px solid #e5e7eb;font-size:12px}.calcRow:last-child{border-bottom:0}.calcRow .k{color:#111;flex:1 1 auto;min-width:0}.calcRow .v{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;flex:none}.calcRow.total{font-weight:700;color:#0b457f;border-top:2px solid #e5e7eb;border-bottom:0;margin-top:2px;padding-top:7px}.calcRowTable{width:100%;border-collapse:collapse;font-size:12px}.calcRowTable td{padding:5px 0;border-bottom:1px solid #e5e7eb;vertical-align:top}.calcRowTable td.v{text-align:right;white-space:nowrap;width:150px}.calcRowTable tr:last-child td{border-bottom:0}.calcRowTable tr.total td{font-weight:700;color:#0b457f;border-top:2px solid #e5e7eb;border-bottom:0;padding-top:7px}.calcTotalRow td{font-weight:700;color:#0b457f;border-top:2px solid #e5e7eb;border-bottom:0}.refTableWrap{overflow-x:auto}.calcLegal p{font-size:11px;color:#64748b}@media print{.page{padding:0}.calcBox,table{break-inside:avoid;page-break-inside:avoid}@page{size:A4 portrait;margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
  function drucken(html,title){
    var f=document.getElementById('cf_print_iframe');
    if(!f){f=document.createElement('iframe');f.id='cf_print_iframe';f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';document.body.appendChild(f)}
    var w=f.contentWindow;w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title||'Curafact Berechnung')+'</title>'+PRINT_STYLES+'</head><body><div class="page">'+html+'</div></body></html>');
    w.document.close();w.focus();setTimeout(function(){w.print()},120);
  }
  return {esc:esc,eur:eur,deMoney:deMoney,parseDE:parseDE,parseMoney:parseMoney,pruefePhasen:pruefePhasen,pflegegradBetraege:pflegegradBetraege,vpBetraege:vpBetraege,vpDefaultAmount:vpDefaultAmount,
    berechne:berechne,auswertungHtml:auswertungHtml,rechnePflegegrade:rechnePflegegrade,nachweisHtml:nachweisHtml,referenzTabelle:referenzTabelle,drucken:drucken,PRINT_STYLES:PRINT_STYLES};
})();
if(typeof module!=='undefined')module.exports=CFC;
