// أفضل مسار: ترتيب زيارات اليوم حسب الأقرب (من روابط الخرائط) + رابط المسار في خرائط Google
(function(){
  function ll(u){ u=String(u||''); var m=u.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)||u.match(/[?&](?:q|ll|query|destination|daddr)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/)||u.match(/(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
    if(!m) return null; var a=parseFloat(m[1]), b=parseFloat(m[2]); return (a>=15&&a<=33&&b>=33&&b<=57)?{lat:a,lng:b}:null; }
  function km(a,b){ var R=6371,dl=(b.lat-a.lat)*Math.PI/180,dg=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dg/2)*Math.sin(dg/2); return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))*1.3; } // ×1.3 تقريب لطول الطريق
  function len(start,pts){ var d=0,c=start; pts.forEach(function(p){ if(c) d+=km(c,p.pt); c=p.pt; }); return d; }
  // items: [{...,maps}] → {order, km, base, url, skipped}
  function plan(items,start){
    var pts=[],skip=[]; items.forEach(function(x){ var p=(x.lat!=null&&x.lng!=null)?{lat:+x.lat,lng:+x.lng}:ll(x.maps); if(p) pts.push({x:x,pt:p}); else skip.push(x); });
    if(pts.length<2) return null;
    var left=pts.slice(), cur=start||left[0].pt, ord=[]; if(!start){ ord.push(left.shift()); cur=ord[0].pt; }
    while(left.length){ var bi=0,bd=1e9; left.forEach(function(p,i){ var d=km(cur,p.pt); if(d<bd){bd=d;bi=i;} }); var p=left.splice(bi,1)[0]; ord.push(p); cur=p.pt; }
    var base=len(start,pts), best=len(start,ord), dest=ord[ord.length-1].pt, wp=ord.slice(0,-1).map(function(p){return p.pt.lat+','+p.pt.lng;}).join('|');
    var url='https://www.google.com/maps/dir/?api=1'+(start?'&origin='+start.lat+','+start.lng:'')+'&destination='+dest.lat+','+dest.lng+(wp?'&waypoints='+encodeURIComponent(wp):'')+'&travelmode=driving';
    return { order:ord.map(function(p){return p.x;}), km:Math.round(best), base:Math.round(base), url:url, skipped:skip, legs:ord.map(function(p,i){ return Math.round(km(i?ord[i-1].pt:(start||p.pt),p.pt)); }) };
  }
  window.MNQ_ROUTE={ ll:ll, plan:plan, here:function(cb){ if(!navigator.geolocation) return cb(null); var done=false; setTimeout(function(){ if(!done){ done=true; cb(null); } },3500); navigator.geolocation.getCurrentPosition(function(p){ if(done)return; done=true; cb({lat:p.coords.latitude,lng:p.coords.longitude}); },function(){ if(done)return; done=true; cb(null); },{maximumAge:300000,timeout:3000}); } };
})();
