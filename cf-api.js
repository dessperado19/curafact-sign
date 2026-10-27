/* Curafact – Zugriff auf die Studio-API (privates Supabase-Projekt) + Anmeldung per Authenticator-Code */
var CFAPI=(function(){
  var BASE='https://nhxofktmsawvjrzngzft.supabase.co/functions/v1',KEY='sb_publishable_lqh2IU2DmT0NRQssFY3R3w_gnKvMRbK';
  var SKEY='curafact_web_session',IDLE_MS=30*60*1000;
  var session=null;
  function load(){try{var r=localStorage.getItem(SKEY);if(r){var s=JSON.parse(r);if(s&&s.token&&Date.now()-(s.last||0)<IDLE_MS){session=s;return s}}}catch(e){}session=null;return null}
  function save(s){session=s;s.last=Date.now();try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(e){}}
  function clear(){session=null;try{localStorage.removeItem(SKEY)}catch(e){}}
  function touch(){if(!session)return;session.last=Date.now();try{localStorage.setItem(SKEY,JSON.stringify(session))}catch(e){}}
  async function post(path,body,headers){
    var res=await fetch(BASE+'/'+path,{method:'POST',headers:Object.assign({'Content-Type':'application/json',apikey:KEY},headers||{}),body:JSON.stringify(body||{})});
    var j=null;try{j=await res.json()}catch(e){j={ok:false,message:'Ungültige Antwort ('+res.status+').'}}
    j.http_status=res.status;return j;
  }
  /* Aufruf mit Sitzung; bei abgelaufener Sitzung wird zur Anmeldung gewechselt */
  async function call(action,params){
    if(!session)return {ok:false,auth_required:true,message:'Nicht angemeldet.'};
    var r=await post('studio-api',Object.assign({action:action},params||{}),{'x-curafact-session':session.token});
    if(r&&r.auth_required){clear();if(CFAPI.onExpired)CFAPI.onExpired()}
    else touch();
    return r;
  }
  async function login(username,code){
    var r=await post('studio-api',{action:'login',username:username,code:code});
    if(r&&r.ok&&r.token){save({token:r.token,user:r.user});return r}
    return r;
  }
  async function logout(){try{await call('logout')}catch(e){}clear()}
  return {load:load,login:login,logout:logout,call:call,post:post,get user(){return session&&session.user},get session(){return session},BASE:BASE,KEY:KEY,onExpired:null};
})();
/* gemeinsame Seitenleiste */
function cfSide(active,extra){
  var items=[['index.html','kunden','Kunden'],['rechner.html','rechner','Rechner']];
  return '<div class="cfBrand"><img src="logo.png" alt="Curafact"></div><div class="cfNav">'+items.map(function(i){return '<a href="'+i[0]+'" class="'+(active===i[1]?'active':'')+'">'+i[2]+'</a>'}).join('')+(extra||'')+'</div>';
}
