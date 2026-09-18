/* cobe 2.0.1 — MIT License — Copyright (c) 2021 Shu Ding — https://github.com/shuding/cobe */
(() => {
  // Everything between the markers below is the upstream cobe bundle, vendored
  // byte-for-byte so it stays diffable against a fresh build and so a cobe upgrade
  // is a straight replacement. Reformatting it or "fixing" its lint findings would
  // destroy both properties and be thrown away on the next upgrade. The exemption is
  // scoped to this one statement ONLY — the component code below it is ours and is
  // fully linted and formatted.
  // biome-ignore format: vendored minified cobe 2.0.1 bundle
  // biome-ignore-start lint: vendored minified cobe 2.0.1 bundle
  const createGlobe = (function () {
function Re(e,t,r){let a=e.createShader(t);return e.shaderSource(a,r),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:(e.deleteShader(a),null)}function Y(e,t,r){let a=Re(e,e.VERTEX_SHADER,t),o=Re(e,e.FRAGMENT_SHADER,r);if(!a||!o)return null;let i=e.createProgram();return e.attachShader(i,a),e.attachShader(i,o),e.linkProgram(i),e.getProgramParameter(i,e.LINK_STATUS)?(e.deleteShader(a),e.deleteShader(o),i):(e.deleteProgram(i),null)}function H(e,t,r){let a={};for(let o of r)a[o]=e.getUniformLocation(t,o);return a}function Q(e,t,r){let a={};for(let o of r)a[o]=e.getAttribLocation(t,o);return a}function Ae(e){let t={},r={},a={},o=document.createElement("style");function i(t,r,a,o){let i=t[r];i||(i=document.createElement("div"),i.style.cssText="position:absolute;width:1px;height:1px;pointer-events:none;anchor-name:"+a,e.append(i),t[r]=i),i.style.left=100*o.x+"%",i.style.top=100*o.y+"%"}return document.head.append(o),{m:function(e,r){let o={};for(let n of e){let e=n.id;if(!e)continue;let f=r(n.location);o[e]=1,i(t,e,"--cobe-"+e,f),f.visible?a["--cobe-visible-"+e]="N":delete a["--cobe-visible-"+e]}for(let e in t)o[e]||(t[e].remove(),delete t[e],delete a["--cobe-visible-"+e])},a:function(e,t){let o={};for(let n of e){let e=n.id;if(!e)continue;let f=t(n);o[e]=1,i(r,e,"--cobe-arc-"+e,f),f.visible?a["--cobe-visible-arc-"+e]="N":delete a["--cobe-visible-arc-"+e]}for(let e in r)o[e]||(r[e].remove(),delete r[e],delete a["--cobe-visible-arc-"+e])},r:function(){for(let e in t)t[e].remove();for(let e in r)r[e].remove();o.remove()},s:function(){let e="";for(let t in a)e+=t+":"+a[t]+";";o.textContent=":root{"+e+"}"}}}var{PI:Z,sin:le,cos:_e}=Math,Be="attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}",Ce="precision highp float;uniform vec2 t,v,s;uniform vec3 F,w;uniform vec4 n;uniform float k,x,y;uniform sampler2D z;float u;mat3 A(float a,float b){float c=cos(a),d=cos(b),e=sin(a),f=sin(b);return mat3(d,f*e,-f*c,0,c,e,f,d*-e,d*c);}vec3 B(vec3 c,out float G){c=c.xzy;float q=max(2.,floor(log2(2.236068*k*3.141593*(1.-c.z*c.z))*.72021));vec2 g=floor(pow(1.618034,q)/2.236068*vec2(1,1.618034)+.5),d=fract((g+1.)*.618034)*6.283185-3.883222,e=-2.*g,f=vec2(atan(c.y,c.x),c.z-1.),r=floor(vec2(e.y*f.x-d.y*(f.y*k+1.),-e.x*f.x+d.x*(f.y*k+1.))/(d.x*e.y-e.x*d.y));float o=3.141593;vec3 C;for(float h=0.;h<4.;h+=1.){vec2 D=vec2(mod(h,2.),floor(h*.5));float j=dot(g,r+D);if(j>k)continue;float a=j,b=0.;a>=16384.?(a-=16384.,b+=.868872):0.,a>=8192.?(a-=8192.,b+=.934436):0.,a>=4096.?(a-=4096.,b+=.467218):0.,a>=2048.?(a-=2048.,b+=.733609):0.,a>=1024.?(a-=1024.,b+=.866804):0.,a>=512.?(a-=512.,b+=.433402):0.,a>=256.?(a-=256.,b+=.216701):0.,a>=128.?(a-=128.,b+=.108351):0.,a>=64.?(a-=64.,b+=.554175):0.,a>=32.?(a-=32.,b+=.777088):0.,a>=16.?(a-=16.,b+=.888544):0.,a>=8.?(a-=8.,b+=.944272):0.,a>=4.?(a-=4.,b+=.472136):0.,a>=2.?(a-=2.,b+=.236068):0.,a>=1.?(a-=1.,b+=.618034):0.;float l=fract(b)*6.283185,i=1.-2.*j*u,m=sqrt(1.-i*i);vec3 p=vec3(cos(l)*m,sin(l)*m,i);float E=length(c-p);if(E<o)o=E,C=p;}G=o;return C.xzy;}void main(){u=1./k;vec2 c=1./t,b=(gl_FragCoord.xy*c*2.-1.)/x-v*vec2(1,-1)*c;b.x*=t.x*c.y;float a=dot(b,b),f=0.;vec4 l=vec4(0);if(a<=.64){float g;vec4 m=vec4(0);vec3 h=normalize(vec3(b,sqrt(.64-a)));mat3 o=A(s.y,s.x);float i=h.z;vec3 d=B(h*o,g);float j=asin(d.y),e=acos(-d.x/cos(j));e=d.z<0.?-e:e;float p=max(texture2D(z,vec2(e*.5/3.141593,-(j/3.141593+.5))).x,y),q=p*smoothstep(8e-3,0.,g)*pow(i,n.y)*n.x;m+=vec4(F*(mix((1.-q)*pow(i,.4),q,n.z)+.1)+pow(1.-i,4.)*w,1),l+=m*(1.+n.w)*.5,f=(1.-a)*(1.-a)*smoothstep(0.,1.,.2/(a-.64));}else{float r=sqrt(.2/(a-.64));f=smoothstep(.5,1.,r/(r+1.));}gl_FragColor=l+vec4(f*w,f);}",be="varying vec2 m;varying vec3 g;varying float h;attribute vec2 n;attribute vec3 p,w;attribute float q,x;uniform vec2 b,r;uniform float i,j,k,s;void main(){float c=cos(j),d=sin(j),e=cos(i),f=sin(i);vec3 a=p*(.8+s),l=vec3(e*a.x+f*a.z,f*d*a.x+c*a.y-e*d*a.z,-f*c*a.x+d*a.y+e*c*a.z);if(l.z<0.&&length(l.xy)<.8){gl_Position=vec4(2,2,0,1);return;}float t=b.y/b.x;vec2 y=(l.xy+n*q*2.)*vec2(t,1)*k+r*vec2(1,-1)*k/b;gl_Position=vec4(y,0,1),m=n,g=w,h=x;}",ge="precision highp float;varying vec2 m;varying vec3 g;varying float h;uniform vec3 v;void main(){if(length(m)>.25)discard;vec3 a=h>.5?g:v;gl_FragColor=vec4(a,1);}",Fe="varying vec3 i;varying float j,s,t;attribute vec2 k;attribute vec3 l,m,N;attribute float v,w,O;uniform vec2 g,x;uniform float y,z,h,A;mat3 B(float a,float b){float c=cos(a),d=cos(b),e=sin(a),f=sin(b);return mat3(d,f*e,-f*c,0,c,e,f,d*-e,d*c);}vec3 C(vec3 c,vec3 d,vec3 e,float a){float b=1.-a;return b*b*c+2.*b*a*d+a*a*e;}vec3 D(vec3 c,vec3 b,vec3 d,float a){float e=1.-a;return 2.*e*(b-c)+2.*a*(d-b);}void main(){mat3 b=B(z,y);float c=.8+A;vec3 d=l*c,e=m*c,f=l+m;float n=length(f);vec3 E=n>1e-3?f/n:vec3(0,1,0),o=E*(.8+v);float p=k.x;vec3 F=C(d,o,e,p),q=b*F,G=D(d,o,e,p),H=b*G;vec2 a=H.xy;float r=length(a);vec2 I=r>1e-3?vec2(-a.y,a.x)/r:vec2(1,0);float J=g.x/g.y;vec2 K=q.xy*vec2(1./J,1)*h+x*vec2(1,-1)*h/g,P=K+I*w*k.y*h;gl_Position=vec4(P,0,1),i=N,j=O,s=q.z,t=length(q.xy);}",Le="precision highp float;varying vec3 i;varying float j,s,t;uniform vec3 M;void main(){if(s<0.&&t<.8)discard;vec3 a=j>.5?i:M;gl_FragColor=vec4(a,1);}",ee=.8;function U([e,t]){let r=e*Z/180,a=t*Z/180-Z,o=_e(r);return[-o*_e(a),le(r),o*le(a)]}var Pe=(e,t)=>{let r={alpha:!0,stencil:!1,antialias:!0,depth:!1,preserveDrawingBuffer:!1,...t.context},a=e.getContext("webgl2",r),o=!!a;if(a||(a=e.getContext("webgl",r)),!a)return{destroy:()=>{},update:()=>{}};let i=o?null:a.getExtension("ANGLE_instanced_arrays"),n=t.devicePixelRatio||1;e.width=t.width*n,e.height=t.height*n;let f=t.phi||0,l=t.theta||0,c=t.markers||[],s=t.arcs||[],A=t.mapSamples||1e4,v=t.mapBrightness||1,d=t.mapBaseBrightness||0,g=t.baseColor||[1,1,1],m=t.markerColor||[1,.5,0],u=t.glowColor||[1,1,1],h=t.arcColor||[.3,.6,1],E=t.arcWidth??1,R=t.arcHeight??.2,b=t.diffuse||1,x=t.dark||0,y=t.opacity??1,T=t.offset||[0,0],B=t.scale||1,p=t.markerElevation??.05,w=Y(a,Be,Ce),C=Y(a,be,ge),F=Y(a,Fe,Le);if(!w)return{destroy:()=>{},update:()=>{}};let D=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,D),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),a.STATIC_DRAW);let _=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,_);let N=[];for(let e=0;e<=32;e++){let t=e/32;N.push(t,-1,t,1)}a.bufferData(a.ARRAY_BUFFER,new Float32Array(N),a.STATIC_DRAW);let k=a.createBuffer(),S=a.createBuffer(),I=H(a,w,["t","s","k","x","v","F","w","n","y","z"]),P=H(a,C,["i","j","b","k","r","v","s"]),L=Q(a,C,["n","p","q","w","x"]),z=H(a,F,["y","z","g","h","x","M","A"]),G=Q(a,F,["k","l","m","v","w","N","O"]),M=a.getAttribLocation(w,"a"),V=a.createTexture();a.bindTexture(a.TEXTURE_2D,V),a.texImage2D(a.TEXTURE_2D,0,a.RGB,1,1,0,a.RGB,a.UNSIGNED_BYTE,new Uint8Array([0,0,0])),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.NEAREST);let j=new Image;j.onload=()=>{a.bindTexture(a.TEXTURE_2D,V),a.texImage2D(a.TEXTURE_2D,0,a.RGB,a.RGB,a.UNSIGNED_BYTE,j),a.generateMipmap(a.TEXTURE_2D),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.NEAREST),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,V)},j.src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAACAAQAAAADMzoqnAAAECklEQVR42u3VsW4jRRzH8d94gzfF4Q0VQaC4vBLTRTp0mze4ggfAPAE5XQEFsGNAVIjwBrmW7h7gJE+giKjyABTZE4g06LKJETdRJvtD65kdz6yduKABiW+TVfzRf2bXYxtcE/59YJCz6YdbgQF6ACSRrwYKYImmh5PbwOewlV3wlQNbAN6SEExjUOO+BU0aCSnxReHABUlK4YFQeJeUT3da8IIkZ6NGoSnFY5KsMoVzMKfECUnqxgPYRArarmUCndHwzIEaQEpg5xVdBXROl8mpAQx5dUgPiHoYAAkg5w3JABR06byGAVgcRGAz5bznj6phBQNRFwyqgdxebH6gshJAesWoFhgYpApAFoG8BIZ/fEhSox5jDjQXmV0Ar5XJfAIrALi3URVs09gHIL4XJCkLC5LH9JWiArABFCSrQjdgkBzRJ0WJeUOSNyQAfJJwUSWUBRlJQ8oGHATACGlBynnzy2kEYLNjrxouigD8BZcgOeVPqh12RtufaCN5wCPVDpvQ9lsIrqndsJtDcWqBCpf4hWN7OdWHBw58FwIaNOU/n1TpMW2DFaD48cmr4185T8NHkpUFX749pQPVdgRKC/DGoQPVeAEKv+WHvY8OOWNTPRp5kHuwSf8wzXtVBKR7YwEH9H3lQUaypUfSATOALyVNu5vZJW31Bnx98nkLfDUWJaz6ixvm+RIQRdl3kmRxxiaDoGnZW4CpPfkaQadlcPim1xOSvETQo7Lv75enVAXJ3xGUlony4KQBBWUM1NiDc6qhyS8RgQs18OCMMtPDaAUIyg0PZkRWDqs+wnKJBTDI1Js6BolegOsKmUxNDBAAKqQyMQmidhegBlLZ+wwKYdv5M/8x1khkb1cgKqP2H+MKyV5vS+whrE8DQDgAlUAoRBX056EElJCjJVACeJBZgNfVp+iCCm4RBWCgKsRxASSA9KgDhDtCiTuMyfHsKXzhC6wNAIjjWb8LKAOA2ctk3FmCOlgKFy8f1N0JJtgsxinYnVAHt4t3gPzZXSCTyCWCQmBT91QE3B5yarSN40dNHYPka4TlDhTUI8zLvl0JSL3vZn6DsCFZOeB2yROEpR68sECQQA++xIGCR2X7DwlEoLRgUrZrqlUg50S1uy43YqDcN6UFBVkhAjWiCV2Q0jgQPdplMKxvBXodcOfAwJYvgdL+1etA1YJJfBcZlQV7sO1i2gHoNiyxtQ5sBsCgWyoxCHiFFd2L5nUTCqMAqGUgsQ9f5kCcCiZgRYkMgMTd5WsB1rTzj0Em14BE4r+QxN1lCEsVur2PoF5Wbg8RJXR4djgvBgauhLywoEZQrt1KKRdVS4CdlJ8qafyP+9KIj/nE/d7kKwH9jgS72e9DV+kvfTWgct4ZyP8Byb8BPG7MaaIIkAQAAAAASUVORK5CYII=";let J=0;function O(t){let r=Math.cos(l),a=Math.cos(f),o=Math.sin(l),i=Math.sin(f),c=a*t[0]+i*t[2],s=i*o*t[0]+r*t[1]-a*o*t[2];return[(c/(e.width/e.height)*B+T[0]*B*n/e.width+1)/2,(-s*B+T[1]*B*n/e.height+1)/2,-i*r*t[0]+o*t[1]+a*r*t[2]>=0||c*c+s*s>=.64]}function W(e){let t=U(e),r=ee+p,a=O([t[0]*r,t[1]*r,t[2]*r]);return{x:a[0],y:a[1],visible:a[2]}}function X(e){let t=U(e.from),r=U(e.to),a=[t[0]+r[0],t[1]+r[1],t[2]+r[2]],o=(a[0]**2+a[1]**2+a[2]**2)**.5;if(o<.001)return null;let i=.25*(ee+p)+.5*(ee+R+p)/o,n=O([a[0]*i,a[1]*i,a[2]*i]);return{x:n[0],y:n[1],visible:n[2]}}function K(e,t,r,n,f){e<0||(a.enableVertexAttribArray(e),a.vertexAttribPointer(e,t,a.FLOAT,!1,r,n),o?a.vertexAttribDivisor(e,f):i&&i.vertexAttribDivisorANGLE(e,f))}let q,Z=document.createElement("div");Z.style.cssText="position:relative;width:100%;height:100%",e.parentElement?.insertBefore(Z,e),Z.append(e);let $=Ae(Z);function te(t){if(t.phi!=q&&(f=t.phi),t.theta!=q&&(l=t.theta),t.markers&&function(e){c=e;let t=new Float32Array(8*c.length);c.forEach((e,r)=>{t.set([...U(e.location),e.size,...e.color||[0,0,0],e.color?1:0],8*r)}),a.bindBuffer(a.ARRAY_BUFFER,k),a.bufferData(a.ARRAY_BUFFER,t,a.DYNAMIC_DRAW)}(t.markers),t.arcs&&function(e){s=e,J=s.length;let t=new Float32Array(12*s.length);s.forEach((e,r)=>{t.set([...U(e.from),...U(e.to),R+p,.005*E,...e.color||[0,0,0],e.color?1:0],12*r)}),a.bindBuffer(a.ARRAY_BUFFER,S),a.bufferData(a.ARRAY_BUFFER,t,a.DYNAMIC_DRAW)}(t.arcs),t.width&&t.height&&(e.width=t.width*n,e.height=t.height*n),t.mapSamples!=q&&(A=t.mapSamples),t.mapBrightness!=q&&(v=t.mapBrightness),t.mapBaseBrightness!=q&&(d=t.mapBaseBrightness),t.baseColor!=q&&(g=t.baseColor),t.markerColor!=q&&(m=t.markerColor),t.glowColor!=q&&(u=t.glowColor),t.arcColor!=q&&(h=t.arcColor),t.arcWidth!=q&&(E=t.arcWidth),t.arcHeight!=q&&(R=t.arcHeight),t.diffuse!=q&&(b=t.diffuse),t.dark!=q&&(x=t.dark),t.opacity!=q&&(y=t.opacity),t.offset!=q&&(T=t.offset),t.scale!=q&&(B=t.scale),t.markerElevation!=q&&(p=t.markerElevation),$.m(c,W),$.a(s,X),$.s(),a.viewport(0,0,e.width,e.height),a.clearColor(0,0,0,0),a.clear(a.COLOR_BUFFER_BIT),a.enable(a.BLEND),a.blendFunc(a.SRC_ALPHA,a.ONE_MINUS_SRC_ALPHA),a.useProgram(w),a.bindBuffer(a.ARRAY_BUFFER,D),a.enableVertexAttribArray(M),a.vertexAttribPointer(M,2,a.FLOAT,!1,0,0),o?a.vertexAttribDivisor(M,0):i&&i.vertexAttribDivisorANGLE(M,0),a.uniform2f(I.t,e.width,e.height),a.uniform2f(I.s,f,l),a.uniform1f(I.k,A),a.uniform1f(I.x,B),a.uniform2f(I.v,T[0]*n,T[1]*n),a.uniform3fv(I.F,g),a.uniform3fv(I.w,u),a.uniform4f(I.n,v,b,x,y),a.uniform1f(I.y,d),a.uniform1i(I.z,0),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,V),a.drawArrays(a.TRIANGLES,0,6),F&&J>0){a.useProgram(F),a.bindBuffer(a.ARRAY_BUFFER,_),G.k>=0&&(a.enableVertexAttribArray(G.k),a.vertexAttribPointer(G.k,2,a.FLOAT,!1,0,0),o?a.vertexAttribDivisor(G.k,0):i&&i.vertexAttribDivisorANGLE(G.k,0)),a.bindBuffer(a.ARRAY_BUFFER,S);let t=48;if(K(G.l,3,t,0,1),K(G.m,3,t,12,1),K(G.v,1,t,24,1),K(G.w,1,t,28,1),K(G.N,3,t,32,1),K(G.O,1,t,44,1),a.uniform1f(z.y,f),a.uniform1f(z.z,l),a.uniform2f(z.g,e.width,e.height),a.uniform1f(z.h,B),a.uniform2f(z.x,T[0]*n,T[1]*n),a.uniform3fv(z.M,h),a.uniform1f(z.A,p),o)a.drawArraysInstanced(a.TRIANGLE_STRIP,0,66,J);else if(i)i.drawArraysInstancedANGLE(a.TRIANGLE_STRIP,0,66,J);else for(let e=0;e<J;e++)a.drawArrays(a.TRIANGLE_STRIP,0,66)}if(C&&c.length>0){a.useProgram(C),a.bindBuffer(a.ARRAY_BUFFER,D),L.n>=0&&(a.enableVertexAttribArray(L.n),a.vertexAttribPointer(L.n,2,a.FLOAT,!1,0,0),o?a.vertexAttribDivisor(L.n,0):i&&i.vertexAttribDivisorANGLE(L.n,0)),a.bindBuffer(a.ARRAY_BUFFER,k);let t=32;K(L.p,3,t,0,1),K(L.q,1,t,12,1),K(L.w,3,t,16,1),K(L.x,1,t,28,1),a.uniform1f(P.i,f),a.uniform1f(P.j,l),a.uniform2f(P.b,e.width,e.height),a.uniform1f(P.k,B),a.uniform2f(P.r,T[0]*n,T[1]*n),a.uniform3fv(P.v,m),a.uniform1f(P.s,p),function(e){if(o)a.drawArraysInstanced(a.TRIANGLES,0,6,e);else if(i)i.drawArraysInstancedANGLE(a.TRIANGLES,0,6,e);else for(let t=0;t<e;t++)a.drawArrays(a.TRIANGLES,0,6)}(c.length)}}return te({markers:c,arcs:s}),{update:te,destroy:()=>{a.deleteBuffer(D),a.deleteBuffer(_),a.deleteBuffer(k),a.deleteBuffer(S),a.deleteProgram(w),C&&a.deleteProgram(C),F&&a.deleteProgram(F),$.r()}}};return Pe;
})();
  // biome-ignore-end lint: vendored minified cobe 2.0.1 bundle
  if (typeof createGlobe !== "function") return;

  const P = {
    sf: [37.78, -122.44],
    nyc: [40.71, -74.01],
    lon: [51.51, -0.13],
    tky: [35.68, 139.69],
    syd: [-33.87, 151.21],
    sin: [1.35, 103.82],
    dxb: [25.2, 55.27],
    sao: [-23.55, -46.63],
    ber: [52.52, 13.4],
    shl: [31.23, 121.47],
  };
  const mark = (id, size = 0.03) => ({ location: P[id], size });
  const arc = (from, to) => ({ from: P[from], to: P[to] });

  const PRESETS = {
    cities: ["sf", "nyc", "lon", "tky", "syd", "sin", "dxb", "sao"].map((id) => mark(id, 0.032)),
  };
  const PRESET_ARCS = {
    cities: [arc("sf", "tky"), arc("nyc", "lon")],
  };

  const GLOBE = {
    speed: 0.0026,
    theta: 0.22,
    scale: 1,
    samples: 16000,
    mapBrightness: 6,
    opacity: 1,
    offset: [0, 0],
  };

  const EFFECTS = {
    builders: {
      markers: [mark("sf", 0.038), mark("tky", 0.036), mark("ber", 0.03), mark("shl", 0.034)],
      arcs: [arc("sf", "tky"), arc("ber", "shl"), arc("sf", "ber")],
    },
    users: {
      markers: [mark("nyc", 0.04), mark("lon", 0.036), mark("sin", 0.032), mark("sao", 0.03)],
      arcs: [],
    },
    ai: {
      markers: [mark("sf", 0.042), mark("tky", 0.038), mark("lon", 0.036)],
      arcs: [arc("sf", "tky"), arc("lon", "sf")],
    },
    chain: {
      markers: [
        mark("syd", 0.028),
        mark("sin", 0.028),
        mark("dxb", 0.028),
        mark("lon", 0.028),
        mark("nyc", 0.028),
        mark("sao", 0.028),
      ],
      arcs: [
        arc("syd", "sin"),
        arc("sin", "dxb"),
        arc("dxb", "lon"),
        arc("lon", "nyc"),
        arc("nyc", "sao"),
      ],
    },
    already: {
      markers: [mark("sf", 0.03)],
      arcs: [],
    },
  };
  EFFECTS.late = EFFECTS.already;
  EFFECTS["new-year"] = EFFECTS.already;
  EFFECTS["year-end"] = EFFECTS.already;
  EFFECTS.cjk = {
    markers: [mark("tky", 0.04), mark("shl", 0.036), mark("sin", 0.032)],
    arcs: [arc("tky", "shl"), arc("shl", "sin")],
  };

  function lookFor(name) {
    const deco =
      EFFECTS[name] ||
      (PRESETS[name]
        ? { markers: PRESETS[name], arcs: PRESET_ARCS[name] || [] }
        : EFFECTS.builders);
    return { ...GLOBE, ...deco };
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function on(value) {
    return value === "1" || value === "true";
  }

  function parseList(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function toMarker(item) {
    if (!item) return null;
    if (Array.isArray(item.location) && item.location.length >= 2) {
      return {
        location: [Number(item.location[0]), Number(item.location[1])],
        size: num(item.size, 0.03),
      };
    }
    if (item.lat != null && item.lon != null) {
      return { location: [Number(item.lat), Number(item.lon)], size: num(item.size, 0.03) };
    }
    return null;
  }

  function toArc(item) {
    if (!item) return null;
    if (Array.isArray(item.from) && Array.isArray(item.to)) {
      return {
        from: [Number(item.from[0]), Number(item.from[1])],
        to: [Number(item.to[0]), Number(item.to[1])],
      };
    }
    if (item.fromLat != null) {
      return {
        from: [Number(item.fromLat), Number(item.fromLon)],
        to: [Number(item.toLat), Number(item.toLon)],
      };
    }
    return null;
  }

  function hexToRgb01(hex) {
    const raw = String(hex || "")
      .replace("#", "")
      .trim();
    if (raw.length !== 6) return [0, 0.56, 0.48];
    const n = parseInt(raw, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function accent() {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent")
      .trim();
    return hexToRgb01(color.startsWith("#") ? color : "#008f7a");
  }

  function isDark(theme) {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    const mode = document.documentElement.dataset.mode;
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function palette(theme) {
    const mark = accent();
    if (isDark(theme)) {
      return {
        dark: 1,
        diffuse: 1.15,
        mapBrightness: 7,
        baseColor: [0.1, 0.16, 0.14],
        markerColor: mark,
        glowColor: [0.18, 0.72, 0.64],
        arcColor: mark,
      };
    }
    return {
      dark: 0,
      diffuse: 1.2,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: mark,
      glowColor: [0.93, 0.97, 0.96],
      arcColor: mark,
    };
  }

  function bind(root) {
    if (root.dataset.bound) return;
    const cls = root.className || "";
    const fromClass = (re) => (cls.match(re) || [])[1] || "";
    if (!root.dataset.variant) {
      const v = fromClass(/site-globe--(figure|scene|backdrop)/);
      if (v) root.dataset.variant = v;
    }
    if (!root.dataset.preset) {
      const p = fromClass(/(?:^|\s)preset-([a-z0-9-]+)/);
      if (p) root.dataset.preset = p;
    }
    if (!root.dataset.effect) {
      const e = fromClass(/(?:^|\s)effect-([a-z0-9-]+)/);
      if (e) root.dataset.effect = e;
    }
    let canvas = root.querySelector(".site-globe-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "site-globe-canvas";
      root.appendChild(canvas);
    }
    root.dataset.bound = "1";
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const variant = root.dataset.variant || "figure";
    const onHome = !!root.closest("#xy-globe");
    if (variant === "backdrop" && window.innerWidth <= 760 && !onHome) return;
    const theme = root.dataset.theme || "auto";
    const rotate = root.dataset.rotate ? on(root.dataset.rotate) && !reduce : !reduce;
    const drag = root.dataset.drag
      ? on(root.dataset.drag) && !reduce
      : variant !== "backdrop" && !reduce;
    const preset = root.dataset.preset || "";
    let markers = parseList(root.dataset.markers).map(toMarker).filter(Boolean);
    let arcs = parseList(root.dataset.arcs).map(toArc).filter(Boolean);
    if (!markers.length && PRESETS[preset]) markers = PRESETS[preset];
    if (!arcs.length && PRESET_ARCS[preset]) arcs = PRESET_ARCS[preset];
    function applyLookOverrides(next) {
      const speed = num(root.dataset.speed, NaN);
      const thetaN = num(root.dataset.theta, NaN);
      const scaleN = num(root.dataset.scale, NaN);
      const samplesN = num(root.dataset.samples, NaN);
      if (Number.isFinite(speed) && speed > 0) next = { ...next, speed };
      if (Number.isFinite(thetaN)) next = { ...next, theta: thetaN };
      if (Number.isFinite(scaleN) && scaleN > 0) next = { ...next, scale: scaleN };
      if (Number.isFinite(samplesN) && samplesN > 0) next = { ...next, samples: samplesN };
      return next;
    }
    let look = applyLookOverrides(lookFor(root.dataset.effect || preset || "builders"));
    if (markers.length) look = { ...look, markers };
    if (arcs.length) look = { ...look, arcs };

    let phi = 0;
    let theta = look.theta;
    let scale = look.scale;
    let globe = null;
    let frame = 0;
    let visible = true;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const declaredSize = num(root.dataset.size, NaN);
    if (Number.isFinite(declaredSize) && declaredSize > 0) {
      root.style.setProperty("--globe-size", `${declaredSize}px`);
    }

    function cssSize() {
      const box = canvas.getBoundingClientRect();
      const fallback =
        Number.isFinite(declaredSize) && declaredSize > 0
          ? declaredSize
          : variant === "scene"
            ? 560
            : variant === "backdrop"
              ? 720
              : 360;
      return Math.max(120, Math.round((box.width > 1 ? box.width : 0) || fallback));
    }

    function opts() {
      const size = cssSize();
      return {
        devicePixelRatio: Math.min(2, window.devicePixelRatio || 1),
        width: size * 2,
        height: size * 2,
        arcWidth: 0.45,
        arcHeight: 0.28,
        markerElevation: 0.02,
        ...palette(theme),
        phi,
        theta: look.theta,
        scale: look.scale,
        mapSamples: look.samples,
        mapBrightness: look.mapBrightness,
        opacity: look.opacity,
        offset: look.offset || [0, 0],
        markers: look.markers || [],
        arcs: look.arcs || [],
      };
    }

    function draw() {
      if (!globe) return;
      globe.update({
        ...palette(theme),
        phi,
        theta: look.theta,
        scale: look.scale,
        mapSamples: look.samples,
        mapBrightness: look.mapBrightness,
        opacity: look.opacity,
        offset: look.offset || [0, 0],
        markers: look.markers || [],
        arcs: look.arcs || [],
      });
    }

    function tick() {
      if (!visible) return;
      if (rotate && !dragging) phi += look.speed;
      draw();
      if (rotate) frame = requestAnimationFrame(tick);
    }

    function setEffect(name) {
      look = applyLookOverrides(lookFor(name));
      if (markers.length) look = { ...look, markers };
      if (arcs.length) look = { ...look, arcs };
      theta = look.theta;
      scale = look.scale;
      root.dataset.effect = name || "";
      pinToCover();
      draw();
    }
    root.__globeSetEffect = setEffect;

    function start() {
      visible = true;
      if (!rotate) {
        draw();
        return;
      }
      if (frame) return;
      tick();
    }

    function stop() {
      visible = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function mount() {
      if (globe) globe.destroy();
      globe = createGlobe(canvas, opts());
      if (rotate) start();
      else draw();
    }

    function pinToCover() {
      if (!onHome) return;
      const stage = document.querySelector(".for-sentence-stage");
      const home = document.querySelector("#xy-globe");
      if (!stage || !home) return;
      const box = stage.getBoundingClientRect();
      const origin = home.getBoundingClientRect();
      root.style.left = `${box.left + box.width / 2 - origin.left}px`;
      root.style.top = `${box.top + box.height / 2 - origin.top}px`;
      root.style.right = "auto";
      root.style.transform = "translate(-50%, -50%)";
    }

    mount();
    pinToCover();

    const ro = new ResizeObserver(() => {
      pinToCover();
      if (!globe) return;
      const size = cssSize();
      globe.update({ width: size * 2, height: size * 2, phi, theta: look.theta });
    });
    ro.observe(root);
    const stage = document.querySelector(".for-sentence-stage");
    if (stage) ro.observe(stage);

    const io = new IntersectionObserver(
      (entries) => {
        const show = entries.some((entry) => entry.isIntersecting);
        if (show) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(root);

    if (drag) {
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        phi += (event.clientX - lastX) * 0.005;
        look.theta = Math.max(-1, Math.min(1, look.theta + (event.clientY - lastY) * 0.005));
        theta = look.theta;
        lastX = event.clientX;
        lastY = event.clientY;
        if (!rotate) draw();
      });
      canvas.addEventListener("pointerup", () => {
        dragging = false;
      });
      canvas.addEventListener("pointercancel", () => {
        dragging = false;
      });
    }

    window.addEventListener("pagehide", (event) => {
      stop();
      if (event.persisted) return;
      if (globe) globe.destroy();
      globe = null;
      ro.disconnect();
      io.disconnect();
    });
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      if (globe) {
        start();
        return;
      }
      delete root.dataset.bound;
      bind(root);
    });
  }

  function boot() {
    document.querySelectorAll(".site-globe").forEach(bind);
  }

  document.addEventListener("site-globe:effect", (event) => {
    const name = event.detail && event.detail.effect;
    document.querySelectorAll(".site-globe").forEach((el) => {
      if (typeof el.__globeSetEffect === "function") el.__globeSetEffect(name);
    });
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
