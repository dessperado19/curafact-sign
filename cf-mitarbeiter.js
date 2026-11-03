/* Curafact – Mitarbeiter verwalten (nur für Admins): Konten anlegen, Bereiche der Web-Ansicht pro Person anhaken, neuer QR-Code, aktiv/inaktiv */
var CFMa=(function(){
  var BEREICHE=[['kunden','Kunden'],['neuer_kunde','Neuer Kunde aufnehmen (Link / QR) – ohne Kundenliste'],['aufnahmebogen','Aufnahmebogen (PDF)'],['aufnahmen','Aufnahmen'],['rechner','Rechner']];
  var ROLLE={user:'Mitarbeiter',admin:'Admin',superadmin:'Superadmin'};
  var el=null,users=[],toastT=null;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function q(s){return el.querySelector(s)}
  function me(){return (CFAPI.user||{}).username||''}
  function istSuper(){return (CFAPI.user||{}).role==='superadmin'}
  function datum(t){if(!t)return '';var d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('de-DE')}
  function meldung(t,fehler){var m=q('#maMsg');m.textContent=t;m.className='maMsg'+(fehler?' err':' ok');m.style.display='block';clearTimeout(toastT);toastT=setTimeout(function(){m.style.display='none'},fehler?6000:2500)}
  function boxen(prefix,aktiv,deaktiviert){
    return BEREICHE.map(function(b){
      return '<label class="maChk"><input type="checkbox" data-b="'+b[0]+'"'+(prefix?' name="'+prefix+'"':'')+(aktiv.indexOf(b[0])>=0?' checked':'')+(deaktiviert?' disabled':'')+'><span>'+esc(b[1])+'</span></label>';
    }).join('');
  }
  function shell(){
    el.innerHTML=
      '<div class="cfTop"><div><h1>Mitarbeiter</h1><p>Hier legst du Konten an und hakst pro Person an, welche Bereiche sie in dieser Web-Ansicht sehen darf. Änderungen gelten sofort und lassen sich jederzeit wieder ändern.</p></div></div>'+
      '<div class="maMsg" id="maMsg" style="display:none"></div>'+
      '<div class="cfPanel"><h2>Neuer Mitarbeiter</h2>'+
        '<div class="maForm"><div><label for="maUser">Benutzername</label><input id="maUser" class="cfInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="z. B. anna"></div>'+
        '<div><label for="maName">Anzeigename</label><input id="maName" class="cfInput" autocomplete="off" placeholder="z. B. Anna"></div></div>'+
        '<label class="maLbl">Sichtbare Bereiche</label><div class="maBoxen" id="maNeuBoxen">'+boxen('',['rechner','aufnahmebogen'])+'</div>'+
        '<p class="mini">Vorbelegt: nur Rechner und Aufnahmebogen (PDF). Alles andere bleibt für diese Person unsichtbar und gesperrt.</p>'+
        '<div class="actions"><button type="button" class="primaryBtn" id="maCreate">Konto anlegen</button></div></div>'+
      '<div class="cfPanel"><h2>Konten</h2><div id="maList"><div class="empty">Lade …</div></div></div>'+
      '<div id="maModal" class="modalOverlay hidden"><div class="modalBox"><div id="maModalBody"></div></div></div>';
    q('#maCreate').onclick=anlegen;
    el.onclick=klick;el.onchange=aenderung;
  }
  function zeichne(){
    if(!users.length){q('#maList').innerHTML='<div class="empty">Noch keine Konten.</div>';return}
    q('#maList').innerHTML='<div class="tablewrap"><table class="cfTable"><thead><tr><th>Konto</th><th>Rolle</th><th>Status</th><th>Sichtbare Bereiche</th><th></th></tr></thead><tbody>'+users.map(function(u){
      var self=u.username===me(),istUser=u.role==='user',alle=!Array.isArray(u.web_zugriff),aktiv=alle?BEREICHE.map(function(b){return b[0]}):u.web_zugriff;
      var bereiche=istUser?'<div class="maBoxen" data-user="'+esc(u.username)+'">'+boxen('',aktiv,false)+'</div>'+(alle?'<div class="mini">Bisher keine Einschränkung (alles sichtbar).</div>':''):'<span class="mini">Admin-Konten sehen immer alles.</span>';
      var kannReset=istUser||istSuper()||self,kannSchalten=!self&&(istUser||istSuper());
      return '<tr class="'+(u.active?'':'off')+'"><td><b>'+esc(u.display_name||u.username)+'</b>'+(self?' <span class="badge">Du</span>':'')+'<br><span class="mini">'+esc(u.username)+(u.created_at?' · angelegt '+esc(datum(u.created_at)):'')+'</span></td>'+
        '<td>'+esc(ROLLE[u.role]||u.role)+'</td><td>'+(u.active?'<span class="badge">aktiv</span>':'<span class="badge warn">deaktiviert</span>')+(u.gesperrt?' <span class="badge warn" title="Zu viele falsche Codes – Anmeldung vorübergehend gesperrt">gesperrt</span>':'')+'</td><td>'+bereiche+'</td>'+
        '<td class="maAct">'+(u.gesperrt?'<button type="button" class="primaryBtn" data-unlock="'+esc(u.username)+'">Sperre aufheben</button>':'')+(kannReset?'<button type="button" data-reset="'+esc(u.username)+'">Neuer QR-Code</button>':'')+(kannSchalten?'<button type="button" class="'+(u.active?'dangerBtn':'')+'" data-active="'+esc(u.username)+'" data-to="'+(u.active?'0':'1')+'">'+(u.active?'Deaktivieren':'Aktivieren')+'</button>':'')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  async function laden(){
    var r=await CFAPI.call('users_list');
    if(!r||!r.ok){q('#maList').innerHTML='<div class="empty">'+esc((r&&r.message)||'Konten konnten nicht geladen werden.')+'</div>';return}
    users=r.users||[];zeichne();
  }
  function qrModal(titel,res){
    var uri='otpauth://totp/'+encodeURIComponent('Curafact Studio:'+res.username)+'?secret='+encodeURIComponent(res.secret)+'&issuer='+encodeURIComponent('Curafact Studio');
    q('#maModalBody').innerHTML='<h3>'+esc(titel)+'</h3><p><b>'+esc(res.display_name||res.username)+'</b> ('+esc(res.username)+')</p>'+
      '<p class="note">Dieser QR-Code wird nur jetzt angezeigt. Bitte mit der Authenticator-App (z. B. Google oder Microsoft Authenticator) scannen, bevor du das Fenster schließt.</p>'+
      '<div id="maQr" style="text-align:center;margin:12px 0"></div><p class="mini">Falls das Scannen nicht klappt, den Schlüssel von Hand eintragen:<br><span class="linkbox" style="display:inline-block">'+esc(res.secret)+'</span></p>'+
      '<div class="actions"><button type="button" class="primaryBtn" id="maModalClose">Fertig</button></div>';
    q('#maModal').classList.remove('hidden');
    try{new QRCode(q('#maQr'),{text:uri,width:200,height:200,correctLevel:QRCode.CorrectLevel.M})}catch(e){q('#maQr').innerHTML='<div class="empty">QR-Code konnte nicht erzeugt werden – bitte den Schlüssel von Hand eintragen.</div>'}
    q('#maModalClose').onclick=function(){q('#maModal').classList.add('hidden');q('#maModalBody').innerHTML=''};
  }
  function gewaehlt(box){return [].filter.call(box.querySelectorAll('input[data-b]'),function(i){return i.checked}).map(function(i){return i.dataset.b})}
  async function anlegen(){
    var u=q('#maUser').value.trim().toLowerCase().replace(/[^\w.\-]/g,''),n=q('#maName').value.trim();
    if(!u){meldung('Bitte einen Benutzernamen eintragen.',true);return}
    var b=q('#maCreate');b.disabled=true;
    var r=await CFAPI.call('users_create',{username:u,display_name:n||u,role:'user',zugriff:gewaehlt(q('#maNeuBoxen'))});b.disabled=false;
    if(!r||!r.ok){meldung((r&&r.message)||'Konto konnte nicht angelegt werden.',true);return}
    q('#maUser').value='';q('#maName').value='';qrModal('Neues Konto angelegt',r);laden();
  }
  async function aenderung(e){
    var cb=e.target.closest('input[data-b]');if(!cb)return;
    var box=cb.closest('.maBoxen[data-user]');if(!box)return;
    var name=box.dataset.user,liste=gewaehlt(box);
    cb.disabled=true;
    var r=await CFAPI.call('users_set_zugriff',{username:name,zugriff:liste});
    cb.disabled=false;
    if(!r||!r.ok){cb.checked=!cb.checked;meldung((r&&r.message)||'Bereiche konnten nicht gespeichert werden.',true);return}
    var u=users.filter(function(x){return x.username===name})[0];if(u)u.web_zugriff=r.zugriff;
    meldung('Gespeichert: '+name+' sieht '+(liste.length?BEREICHE.filter(function(b){return liste.indexOf(b[0])>=0}).map(function(b){return b[1]}).join(', '):'nichts'));
    var hint=box.parentNode.querySelector('.mini');if(hint&&/Bisher keine/.test(hint.textContent))hint.remove();
  }
  async function klick(e){
    var b=e.target.closest('[data-reset]');
    if(b){
      if(!confirm('Für '+b.dataset.reset+' einen neuen QR-Code erzeugen? Der alte Code und alle bestehenden Anmeldungen dieser Person werden ungültig.'))return;
      b.disabled=true;var r=await CFAPI.call('users_reset_totp',{username:b.dataset.reset});b.disabled=false;
      if(!r||!r.ok){meldung((r&&r.message)||'Neuer Code konnte nicht erzeugt werden.',true);return}
      qrModal('Neuer QR-Code',r);return;
    }
    b=e.target.closest('[data-unlock]');
    if(b){
      b.disabled=true;var ru=await CFAPI.call('users_unlock',{username:b.dataset.unlock});
      if(!ru||!ru.ok){meldung((ru&&ru.message)||'Sperre konnte nicht aufgehoben werden.',true);b.disabled=false;return}
      meldung('Sperre für '+b.dataset.unlock+' aufgehoben – die Person kann sich sofort wieder anmelden.');laden();return;
    }
    b=e.target.closest('[data-active]');
    if(b){
      var an=b.dataset.to==='1';
      if(!an&&!confirm(b.dataset.active+' deaktivieren? Die Person kann sich danach nicht mehr anmelden.'))return;
      b.disabled=true;var r2=await CFAPI.call('users_set_active',{username:b.dataset.active,active:an});
      if(!r2||!r2.ok){meldung((r2&&r2.message)||'Konto konnte nicht geändert werden.',true);b.disabled=false;return}
      meldung(an?'Konto aktiviert':'Konto deaktiviert');laden();
    }
  }
  return {mount:function(root){el=root;shell();laden()},reload:function(){if(el)laden()}};
})();
