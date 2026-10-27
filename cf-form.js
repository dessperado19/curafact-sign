/* Curafact – Formularbausteine wie im Kundenformular der Desktop-App (kf_ui.js), ohne App-Abhängigkeiten.
   Abschnitte: Person, Pflegegrad (aktuell + früher, Entlastung genommen), Entlastungsbetrag je Jahr, Verhinderungspflege je Jahr,
   Berechnung (Abzug %). Datenformat = Kunden-JSON der Desktop-App (pflegegrade[], entlastung_jahre{}, verhinderungspflege[] …). */
var CFForm=(function(){
  var K=KFC,C=CFC;
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]})}
  function heute(){var d=new Date();return K.mk(d.getFullYear(),d.getMonth()+1,d.getDate())}
  function jahre(){var o=[];for(var y=K.START_JAHR;y<=heute().getFullYear();y++)o.push(y);return o}
  function feld(id,label,wert,span,extra){return '<div class="kfF" style="grid-column:span '+(span||6)+'"><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(wert)+'" '+(extra||'')+'></div>'}

  function frueherZeile(z){
    z=z||{};
    return '<div class="kfPgF"><select class="kfPgFSt"><option value="">PG …</option>'+[1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(String(z.stufe)===String(n)?' selected':'')+'>PG '+n+'</option>'}).join('')+'</select>'+
      '<input class="kfPgFVon" placeholder="von (MM.JJJJ)" value="'+esc(z.von||'')+'"><input class="kfPgFBis" placeholder="bis (MM.JJJJ)" value="'+esc(z.bis||'')+'">'+
      '<label class="kfPgEnt" title="Für die Jahre dieses Zeitraums wird der Entlastungsbetrag als genommen gerechnet"><input type="checkbox" class="kfPgFEnt"> Entlastungsbetrag genommen</label><button type="button" class="kfX" title="Zeile entfernen">&times;</button></div>';
  }
  function pgBlock(data){
    var f=K.phasenZuForm(Array.isArray(data.pflegegrade)?data.pflegegrade:[],heute());
    var a=f.aktuell||{stufe:'',von:'',bis:''},st=String(a.stufe||''),seit=data.pflegegrad_seit_angabe||a.von||'';
    var h='<div class="kfF" style="grid-column:span 12"><label>Aktueller Pflegegrad (bitte wählen)</label><div class="kfPgBtns">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="kfPgBtn'+(String(n)===st?' on':'')+'" data-st="'+n+'">PG '+n+'</button>'}).join('')+'<input type="hidden" id="kf_pg_aktuell" value="'+esc(st)+'"></div></div>';
    h+=feld('kf_pg_seit','Aktueller Pflegegrad gilt seit (TT.MM.JJJJ, Monat und Jahr genügen)',seit,6,'placeholder="z. B. 01.05.2024 oder 05.2024"');
    h+=feld('kf_pg_bis','bis (nur ausfüllen, wenn beendet)',a.bis||'',6,'placeholder="leer = läuft noch"');
    h+='<div class="kfF" style="grid-column:span 12"><label>Hatte die Person früher einen anderen Pflegegrad?</label><div id="kf_pg_frueher">'+f.frueher.map(frueherZeile).join('')+'</div><div class="actions"><button type="button" id="kf_pg_add">+ früheren Pflegegrad eintragen</button></div><p class="mini">Gerechnet wird höchstens ab 01.01.2022 (Verjährung). Ein früherer Beginn wird beim Speichern darauf gekürzt.</p></div>';
    return {html:h,form:f};
  }
  function zeileJahre(z){
    var v=K.parse(z.querySelector('.kfPgFVon').value,false),b=K.parse(z.querySelector('.kfPgFBis').value,true);
    if(!v||!b)return [];var o=[];for(var y=Math.max(K.START_JAHR,v.getFullYear());y<=b.getFullYear();y++)o.push(y);return o;
  }
  function zeileEntSetzen(root,z){
    var g=z.querySelector('.kfPgFEnt').checked;
    zeileJahre(z).forEach(function(y){var tr=root.querySelector('.kfEntRow[data-j="'+y+'"]');if(!tr)return;var r=tr.querySelector('input[value="'+(g?'g':'n')+'"]');if(r){r.checked=true;tr.dataset.touched='1'}});
  }
  function zeilenEntLesen(root){
    [].slice.call(root.querySelectorAll('.kfPgF')).forEach(function(z){
      var ys=zeileJahre(z),c=z.querySelector('.kfPgFEnt');if(!c||!ys.length)return;
      c.checked=ys.every(function(y){var r=root.querySelector('.kfEntRow[data-j="'+y+'"] input[value=g]');return !!(r&&r.checked)});
    });
  }
  function jahrTabelle(prefix,werte,hinweis){
    var h='<table class="kfTab"><tr><th style="width:90px">Jahr</th><th>genommen</th><th>nicht genommen</th><th style="width:48%">Weiteres (Zeitraum, Betrag, Anbieter …)</th></tr>';
    jahre().forEach(function(y){
      var w=werte[y]||{},g=w.genommen!==false;
      h+='<tr class="'+prefix+'Row" data-j="'+y+'" data-bekannt="'+(w.bekannt?'1':'0')+'"><td class="kfJ">'+y+'</td><td><input type="radio" name="'+prefix+'_'+y+'" value="g"'+(g?' checked':'')+'></td><td><input type="radio" name="'+prefix+'_'+y+'" value="n"'+(!g?' checked':'')+'></td><td><input class="kfNote" value="'+esc(w.notiz||'')+'" placeholder="'+esc(w.hinweis||'')+'"></td></tr>';
    });
    return h+'</table>'+(hinweis?'<p class="mini">'+hinweis+'</p>':'');
  }
  function entWerte(data,form){
    var out={},saved=(data.entlastung_jahre&&typeof data.entlastung_jahre==='object')?data.entlastung_jahre:{};
    jahre().forEach(function(y){
      var s=saved[y];
      if(s&&typeof s==='object')out[y]={genommen:s.genommen!==false,notiz:s.notiz||'',bekannt:true};
      else if(form.ent[y]!==undefined)out[y]={genommen:!!form.ent[y],notiz:'',bekannt:true};
      else out[y]={genommen:true,notiz:'',bekannt:false};
    });
    return out;
  }
  function vpWerte(data){
    var out={};
    (Array.isArray(data.verhinderungspflege)?data.verhinderungspflege:[]).forEach(function(r){
      var y=parseInt(r.jahr,10);if(!y)return;
      out[y]={genommen:!!r.genommen,notiz:r.notiz||'',bekannt:true,hinweis:(r.genommen&&r.betrag&&Math.abs(C.parseMoney(r.betrag)-C.vpDefaultAmount(y))>0.009)?('Restbetrag '+r.betrag+' €'):''};
    });
    jahre().forEach(function(y){if(!out[y])out[y]={genommen:true,notiz:'',bekannt:false}});
    return out;
  }
  function vpDefaultPeriod(year,amount){
    year=Number(year);amount=C.parseMoney(amount)||C.vpDefaultAmount(year);
    if(year===2025&&amount>=3539)return {start:'14.07.2025',ende:'04.08.2025'};
    if(amount>=3539)return {start:'22.06.'+year,ende:'13.07.'+year};
    return {start:'17.06.'+year,ende:'30.06.'+year};
  }

  /* ----- Abschnitte als HTML ----- */
  function personHtml(d,opts){
    opts=opts||{};
    return '<div class="kfGrid">'+
      feld('f_pflege_name','Name, Vorname',d.pflege_name,8,opts.nameFix?'disabled title="Der Name ist die Kennung der Kundenakte und wird nur in Studio geändert."':'')+feld('f_pflege_geburtsdatum','Geburtsdatum (TT.MM.JJJJ)',d.pflege_geburtsdatum,4)+
      feld('f_pflege_anschrift','Anschrift (Straße, PLZ, Ort)',d.pflege_anschrift,8)+feld('f_pflege_telefon','Telefon',d.pflege_telefon,4)+
      feld('f_pflege_kasse','Pflegekasse',d.pflege_kasse,6)+feld('f_pflege_kvnr','Versichertennummer',d.pflege_kvnr,6)+'</div>';
  }
  function pflegepersonHtml(d){
    return '<div class="kfGrid">'+feld('f_person_name','Name, Vorname',d.person_name,6)+feld('f_person_geburtsdatum','Geburtsdatum (TT.MM.JJJJ)',d.person_geburtsdatum,6)+
      feld('f_person_anschrift','Anschrift (Straße, PLZ, Ort) – oder „wie oben“',d.person_anschrift,8)+feld('f_person_verhaeltnis','Verhältnis (z. B. Ehefrau, Sohn)',d.person_verhaeltnis,4)+'</div>';
  }
  function pflegegradHtml(d){var pg=pgBlock(d);return {html:'<div class="kfGrid" id="kfPgBlock">'+pg.html+'</div>',form:pg.form}}
  function entHtml(d,form){return '<div id="kfEntBlock">'+jahrTabelle('kfEnt',entWerte(d,form),'Nicht Angegebenes gilt als „genommen“. Ab 2026 „nicht genommen“ heißt: der Betrag wird mit zurückgerechnet.')+'</div>'}
  function vpHtml(d){return '<div id="kfVpBlock">'+jahrTabelle('kfVp',vpWerte(d),'„Nicht genommen“ legt für das Jahr den Standardbetrag (2.418 € bis 2024, 3.539 € ab 2025) und den üblichen Zeitraum an.')+'</div>'}
  function abzugHtml(d){
    return '<div class="kfAbz"><span>Abzug</span><button type="button" class="kfAbzBtn" data-d="-5" title="5 % weniger">&minus;</button><input id="f_abzug_prozent" value="'+esc(d.abzug_prozent||'40')+'" inputmode="decimal"><span>%</span><button type="button" class="kfAbzBtn" data-d="5" title="5 % mehr">+</button></div>';
  }

  /* ----- Bedienung ----- */
  var dirty={};
  function bind(root,onChange){
    dirty={pg:false};
    var ch=function(){if(onChange)onChange()};
    root.querySelectorAll('.kfPgBtn').forEach(function(b){b.onclick=function(){root.querySelectorAll('.kfPgBtn').forEach(function(x){x.classList.toggle('on',x===b)});root.querySelector('#kf_pg_aktuell').value=b.dataset.st;dirty.pg=true;ch()}});
    zeilenEntLesen(root);
    var fr=root.querySelector('#kf_pg_frueher');
    if(fr){
      var sync=function(e){var z=e.target.closest&&e.target.closest('.kfPgF');if(!z)return;if(e.target.classList.contains('kfPgFEnt')||e.target.classList.contains('kfPgFVon')||e.target.classList.contains('kfPgFBis'))zeileEntSetzen(root,z)};
      fr.addEventListener('change',sync);fr.addEventListener('input',sync);
      fr.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('.kfX');if(x){x.closest('.kfPgF').remove();dirty.pg=true;ch()}});
    }
    var ent=root.querySelector('#kfEntBlock');if(ent)ent.addEventListener('change',function(){zeilenEntLesen(root)});
    var add=root.querySelector('#kf_pg_add');if(add)add.onclick=function(){root.querySelector('#kf_pg_frueher').insertAdjacentHTML('beforeend',frueherZeile({}));dirty.pg=true;ch()};
    ['kfPgBlock','kfEntBlock'].forEach(function(id){var el=root.querySelector('#'+id);if(el){el.addEventListener('input',function(){dirty.pg=true;ch()});el.addEventListener('change',function(){dirty.pg=true;ch()})}});
    root.querySelectorAll('.kfVpRow input, .kfEntRow input').forEach(function(i){var f=function(){i.closest('tr').dataset.touched='1';ch()};i.addEventListener('change',f);i.addEventListener('input',f)});
    root.querySelectorAll('.kfF input,.kfF select,.kfF textarea').forEach(function(i){i.addEventListener('input',ch)});
    root.querySelectorAll('.kfAbzBtn').forEach(function(b){b.onclick=function(){var i=root.querySelector('#f_abzug_prozent');var v=parseFloat(String(i.value).replace(',','.'))||0;v=Math.max(0,Math.min(100,v+Number(b.dataset.d)));i.value=String(v).replace('.',',');ch()}});
    var ab=root.querySelector('#f_abzug_prozent');if(ab)ab.addEventListener('input',ch);
  }
  function val(root,id){var e=root.querySelector('#'+id);return e?(e.value||''):''}

  /* Formular -> Kunden-JSON (nur die Teile, die im Formular vorkommen; Rest aus old bleibt) */
  function collect(root,old){
    var data=JSON.parse(JSON.stringify(old||{}));
    ['pflege_name','pflege_anschrift','pflege_kvnr','pflege_kasse','pflege_geburtsdatum','pflege_telefon','person_name','person_anschrift','person_geburtsdatum','person_verhaeltnis'].forEach(function(k){
      var e=root.querySelector('#f_'+k);if(!e||e.disabled)return;var v=e.value||'';if(v!==''||k in data)data[k]=v;
    });
    if(root.querySelector('#kf_pg_aktuell')){
      var pgDirty=dirty.pg||!(Array.isArray(data.pflegegrade)&&data.pflegegrade.length)||root.dataset.pgDirty==='1';
      if(pgDirty){
        var fr=[].slice.call(root.querySelectorAll('.kfPgF')).map(function(z){return {stufe:z.querySelector('.kfPgFSt').value,von:z.querySelector('.kfPgFVon').value,bis:z.querySelector('.kfPgFBis').value}});
        var ent={},entJ={};
        [].slice.call(root.querySelectorAll('.kfEntRow')).forEach(function(tr){
          var y=tr.dataset.j,g=tr.querySelector('input[value=g]').checked;ent[y]=g;
          var note=tr.querySelector('.kfNote').value;entJ[y]={genommen:g};if(note)entJ[y].notiz=note;
        });
        data.pflegegrade=K.formZuPhasen({stufe:val(root,'kf_pg_aktuell'),von:val(root,'kf_pg_seit'),bis:val(root,'kf_pg_bis')},fr,ent,heute());
        data.entlastung_jahre=entJ;
        if(val(root,'kf_pg_seit'))data.pflegegrad_seit_angabe=val(root,'kf_pg_seit');
      }
    }
    if(root.querySelector('.kfVpRow')){
      var rows=Array.isArray(data.verhinderungspflege)?data.verhinderungspflege.slice():[],by={};
      rows.forEach(function(r){by[String(r.jahr)]=r});
      [].slice.call(root.querySelectorAll('.kfVpRow')).forEach(function(tr){
        var j=tr.dataset.j,g=tr.querySelector('input[value=g]').checked,note=tr.querySelector('.kfNote').value,r=by[j];
        if(!r){
          if(tr.dataset.touched!=='1')return;
          var betrag=C.vpDefaultAmount(j),per=vpDefaultPeriod(j,betrag);
          r={jahr:String(j),genommen:g,betrag:String(betrag),start:per.start,ende:per.ende};rows.push(r);by[j]=r;
        }
        if(tr.dataset.touched==='1'||!('genommen' in r))r.genommen=g;
        if(note)r.notiz=note;else if('notiz' in r&&tr.dataset.touched==='1')delete r.notiz;
      });
      data.verhinderungspflege=rows;
    }
    var ab=root.querySelector('#f_abzug_prozent');if(ab)data.abzug_prozent=ab.value;
    return data;
  }
  /* Welche Felder (Schlüssel) sich geändert haben */
  function geaendert(alt,neu){
    var out={};
    Object.keys(neu||{}).forEach(function(k){if(JSON.stringify(neu[k])!==JSON.stringify((alt||{})[k]))out[k]=neu[k]});
    return out;
  }
  return {personHtml:personHtml,pflegepersonHtml:pflegepersonHtml,pflegegradHtml:pflegegradHtml,entHtml:entHtml,vpHtml:vpHtml,abzugHtml:abzugHtml,bind:bind,collect:collect,geaendert:geaendert,jahre:jahre,vpDefaultPeriod:vpDefaultPeriod};
})();
