/* Kundenformular: reine Rechenfunktionen (ohne Oberfläche), werden in index.html eingebettet und per Node getestet. */
var KFC=(function(){
  var START_JAHR=2022;               /* Rückwirkend wird höchstens ab 01.01.2022 gerechnet (Verjährung) */
  function pad(n){return String(n).padStart(2,'0')}
  function mk(y,m,d){return new Date(y,m-1,d,12)}
  function fmt(d){return d?pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear():''}
  function letzterTag(y,m){return new Date(y,m,0,12).getDate()}
  /* "TT.MM.JJJJ", "TT.MM.JJ", "MM.JJJJ", "MM.JJ", "JJJJ" -> Date; ende=true: bei fehlendem Tag letzter Tag des Monats/Jahres */
  function parse(txt,ende){
    var t=String(txt==null?'':txt).trim().replace(/[\/\-]/g,'.');if(!t)return null;
    var p=t.split('.').filter(function(x){return x!==''}).map(function(x){return parseInt(x,10)});
    if(p.some(isNaN))return null;
    function jahr(y){return y<100?2000+y:y}
    var d,m,y;
    if(p.length>=3){d=p[0];m=p[1];y=jahr(p[2])}
    else if(p.length===2){m=p[0];y=jahr(p[1]);d=ende?letzterTag(y,m):1}
    else{y=jahr(p[0]);if(y<1900||y>2100)return null;m=ende?12:1;d=ende?31:1}
    if(m<1||m>12||d<1||d>31||y<1900||y>2100)return null;
    var r=mk(y,m,d);return r.getMonth()===m-1?r:null;
  }
  function tag(d,n){var r=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,12);return r}
  function stufeStr(s){var x=String(s==null?'':s).replace(/PG|Pflegegrad/gi,'').trim();return x}
  /* Bestehende Phasen -> Formularansicht */
  function phasenZuForm(phasen,heute){
    heute=heute||mk(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());
    var liste=[];
    (phasen||[]).forEach(function(ph){
      if(!ph||typeof ph!=='object')return;
      var von=parse(ph.von,false),bisE=parse(ph.bis,true);
      var bis=bisE||(ph.fortlaufend?null:undefined);
      if(!von)return;
      if(bisE===null&&!ph.fortlaufend&&String(ph.bis||'').trim()==='')return; /* ohne Ende und ohne "fortlaufend": rechnet das Programm nicht */
      liste.push({stufe:stufeStr(ph.stufe),von:von,bis:bisE,fort:!bisE,ent:!!ph.entlastung_genommen});
    });
    liste.sort(function(a,b){return a.von-b.von});
    var merged=[];
    liste.forEach(function(p){
      var l=merged[merged.length-1];
      if(l&&l.stufe===p.stufe&&l.bis&&p.von<=tag(l.bis,1)){ if(!p.bis){l.bis=null;l.fort=true} else if(p.bis>l.bis){l.bis=p.bis} }
      else if(l&&l.stufe===p.stufe&&!l.bis){ /* l läuft noch: p liegt darin */ }
      else merged.push({stufe:p.stufe,von:p.von,bis:p.bis,fort:p.fort});
    });
    var res={aktuell:null,frueher:[],ent:{},mixed:false};
    if(merged.length){
      var a=merged[merged.length-1];
      res.aktuell={stufe:a.stufe,von:fmt(a.von),bis:a.bis?fmt(a.bis):''};
      res.frueher=merged.slice(0,-1).map(function(m){return {stufe:m.stufe,von:fmt(m.von),bis:m.bis?fmt(m.bis):''}});
    }
    for(var y=START_JAHR;y<=heute.getFullYear();y++){
      var j0=mk(y,1,1),j1=mk(y,12,31),flags=[];
      liste.forEach(function(p){var e=p.bis||mk(2100,12,31);if(p.von<=j1&&e>=j0)flags.push(p.ent)});
      if(!flags.length)continue;
      if(flags.every(function(f){return f}))res.ent[y]=true;
      else if(flags.every(function(f){return !f}))res.ent[y]=false;
      else{res.ent[y]=false;res.mixed=true}
    }
    return res;
  }
  /* Formular -> Phasen (an Jahresgrenzen aufgeteilt, wenn sich "Entlastung genommen" ändert) */
  function formZuPhasen(aktuell,frueher,ent,heute){
    heute=heute||mk(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());
    var start=mk(START_JAHR,1,1),raw=[];
    (frueher||[]).forEach(function(f){
      var von=parse(f.von,false),bis=parse(f.bis,true),st=stufeStr(f.stufe);
      if(!st||!von||!bis)return;raw.push({stufe:st,von:von,bis:bis});
    });
    if(aktuell&&stufeStr(aktuell.stufe)){
      var von=parse(aktuell.von,false),abis=parse(aktuell.bis,true);
      if(von)raw.push({stufe:stufeStr(aktuell.stufe),von:von,bis:abis||null});
    }
    raw.sort(function(a,b){return a.von-b.von});
    var out=[];
    raw.forEach(function(p){
      var von=p.von<start?start:p.von;
      var endeJ=p.bis?p.bis.getFullYear():heute.getFullYear();
      if(p.bis&&p.bis<start)return;
      function flag(y){var v=ent&&ent[y];return v===undefined||v===null?true:!!v}
      var seg=[],y0=von.getFullYear();
      for(var y=y0;y<=endeJ;y++){
        var f=flag(y),l=seg[seg.length-1];
        if(l&&l.f===f)l.y1=y;else seg.push({f:f,y0:y,y1:y});
      }
      seg.forEach(function(s,i){
        var sv=i===0?von:mk(s.y0,1,1);
        var letzte=i===seg.length-1;
        var sb=letzte?(p.bis||null):mk(s.y1,12,31);
        out.push({stufe:p.stufe,von:fmt(sv),bis:sb?fmt(sb):'',fortlaufend:!sb,entlastung_genommen:s.f});
      });
    });
    return out;
  }
  return {parse:parse,fmt:fmt,phasenZuForm:phasenZuForm,formZuPhasen:formZuPhasen,START_JAHR:START_JAHR,mk:mk};
})();
if(typeof module!=='undefined')module.exports=KFC;
