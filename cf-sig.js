/* Curafact – Unterschrift (glatter Stift, Datei wählen) – übernommen aus der bisherigen Fernaufnahme */
/* Glatte Unterschrift: Pointer-Events (Finger, Apple Pencil, Maus), Strichbreite nach Druck bzw. Geschwindigkeit, Kurvenglättung */
function attachSmoothPen(canvas,opts){
  opts=opts||{};
  var ctx=canvas.getContext('2d'),pts=[],lastW=0,drawing=false,id=null;
  canvas.style.touchAction='none';
  function unit(){var r=canvas.getBoundingClientRect();return r.width?canvas.width/r.width:1}
  function pos(e){var r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height),t:e.timeStamp||Date.now(),p:(e.pointerType==='pen'&&e.pressure>0)?e.pressure:null}}
  function mid(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
  function style(){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=opts.color||'#0b1f3a';ctx.fillStyle=ctx.strokeStyle}
  function widthFor(p0,p1){
    var u=unit(),minW=1.3*u,maxW=3.4*u;
    if(p1.p!=null)return minW+(maxW-minW)*Math.min(1,p1.p*1.2);
    var dt=Math.max(1,p1.t-p0.t),v=Math.hypot(p1.x-p0.x,p1.y-p0.y)/dt/u; /* sichtbare px pro ms */
    return maxW-(maxW-minW)*Math.min(1,v/2.4);
  }
  function seg(){
    var n=pts.length;if(n<2)return;
    var p0=pts[n-2],p1=pts[n-1],w=widthFor(p0,p1);
    lastW=lastW?lastW*0.7+w*0.3:w;
    var m0=n>2?mid(pts[n-3],p0):p0,m1=mid(p0,p1);
    ctx.lineWidth=lastW;ctx.beginPath();ctx.moveTo(m0.x,m0.y);ctx.quadraticCurveTo(p0.x,p0.y,m1.x,m1.y);ctx.stroke();
  }
  function down(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(opts.beforeDraw)opts.beforeDraw();drawing=true;id=e.pointerId;pts=[];lastW=0;style();
    try{canvas.setPointerCapture(id)}catch(x){}
    var p=pos(e);pts.push(p);
    if(opts.onStart)opts.onStart();
    e.preventDefault();
  }
  function move(e){
    if(!drawing||e.pointerId!==id)return;
    var list=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];if(!list.length)list=[e];
    for(var i=0;i<list.length;i++){pts.push(pos(list[i]));seg()}
    e.preventDefault();
  }
  function up(e){
    if(!drawing||(e&&e.pointerId!==id))return;
    drawing=false;
    if(pts.length===1){style();ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,Math.max(1,1.6*unit()),0,Math.PI*2);ctx.fill()}
    else if(pts.length>1){var a=pts[pts.length-2],b=pts[pts.length-1],m=mid(a,b);ctx.lineWidth=lastW||1.8*unit();ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    pts=[];
    if(opts.onEnd)opts.onEnd();
  }
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',up);
}

function setupSigInput(prefix){
  var canvas=document.getElementById('sig_'+prefix);
  var ctx=canvas.getContext('2d');
  function resize(){var r=canvas.getBoundingClientRect();var d=Math.max(2,window.devicePixelRatio||2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}
  resize();
  var hasDrawing=false, uploadedDataUrl=null;
  attachSmoothPen(canvas,{beforeDraw:function(){if(canvas.width<20)resize()},onStart:function(){hasDrawing=true;uploadedDataUrl=null}});

  var fileBtn=document.getElementById('sigfilebtn_'+prefix);
  var fileInput=document.getElementById('sigfile_'+prefix);
  var fileStatus=document.getElementById('sigfilestatus_'+prefix);
  var preview=document.getElementById('sigpreview_'+prefix);
  fileBtn.onclick=function(){fileInput.click()};
  fileInput.onchange=function(){
    var f=fileInput.files[0];
    if(!f)return;
    var reader=new FileReader();
    reader.onload=function(){
      uploadedDataUrl=reader.result;
      fileStatus.textContent=f.name;
      preview.src=uploadedDataUrl;
      preview.classList.remove('hidden');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      hasDrawing=false;
    };
    reader.readAsDataURL(f);
  };
  document.getElementById('sigclear_'+prefix).onclick=function(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    hasDrawing=false;
    uploadedDataUrl=null;
    fileInput.value='';
    fileStatus.textContent='Keine Datei ausgewählt';
    preview.classList.add('hidden');
    preview.src='';
  };

  return {
    hasFn:function(){
      if(uploadedDataUrl)return true;
      if(!hasDrawing)return false;
      /* nur wirklich gezeichnete Pixel zaehlen - ein Antippen ohne Strich ist keine Unterschrift */
      var d=ctx.getImageData(0,0,canvas.width,canvas.height).data,n=0;
      for(var i=3;i<d.length;i+=4){if(d[i]>10){n++;if(n>150)return true}}
      return false;
    },
    getDataUrl:function(){return uploadedDataUrl || (hasDrawing?canvas.toDataURL('image/png'):'')},
    setDataUrl:function(dataurl){
      if(!dataurl)return;
      uploadedDataUrl=dataurl;
      fileStatus.textContent='Vorhandene Unterschrift geladen';
      preview.src=dataurl;
      preview.classList.remove('hidden');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      hasDrawing=false;
    }
  };
}
