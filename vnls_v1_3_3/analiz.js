// Doğruluk tanı aracı: hatalar nerede toplanıyor, sınır nerede?
//   node analiz.js                      varsayılan (NT=6000 eğitim, ~2-3 dk)
//   NT=3500 PRE=center node analiz.js   ön işleme: center (sakkad benzeri ortalama), poolN (NxN havuzlama), cpoolN
//   FIX=1 node analiz.js                konum ve ölçek değişimini kapat (tavan)
//   OV=INH=2,THR=6 node analiz.js       CFG'yi geçersiz kıl;  PN=1 isim öğretme olasılığı
//   WARP=train,test NORM=56 CEN=1 POOL=4 EV=14   el yazısı taklidi, ölçek normalizasyonu, ortalama, havuzlama, harf başına sınav sayısı
// Çıktı: isim doğruluğu, Türkçe işaretli çiftlerin payı, en kötü harfler ve aynı korteks etkinliğinden denetimli en yakın merkez okuyucunun doğruluğu (isim bağlamayı değil temsil sınırını gösterir).
// Accuracy diagnostic: where do the errors pile up, where is the limit?
//   node analiz.js                      default (NT=6000 training trials, ~2-3 min)
//   NT=3500 PRE=center node analiz.js   preprocessing: center (saccade-like centering), poolN (NxN pooling), cpoolN
//   FIX=1 node analiz.js                switch off position and scale variation (ceiling)
//   OV=INH=2,THR=6 node analiz.js       override CFG;  PN=1 chance of teaching a name
//   WARP=train,test NORM=56 CEN=1 POOL=4 EV=14   handwriting imitation, scale normalization, centering, pooling, tests per letter
// Output: name accuracy, share of the Turkish diacritic pairs, worst letters, and the accuracy of a SUPERVISED nearest-centroid reader on the same cortex activity (it shows the representation limit, not the name binding).
// Karışıklık analizi: hangi harfler karışıyor? | Confusion analysis: which letters get mixed up?
const C=require(__dirname+'/src/config.js');global.CFG=C;
const ov=(process.env.OV||'').split(',').filter(Boolean);ov.forEach(p=>{const[a,b]=p.split('=');C[a]=+b});
const Brain=require(__dirname+'/src/brain.js');
var R=C.RES;const src=require('fs').readFileSync(__dirname+'/test.js','utf8').split('\n'); const __gs=src.findIndex(l=>l.startsWith('const G = [')),__ge=src.findIndex((l,i)=>i>__gs&&l.startsWith('];'))+1,__is=src.findIndex(l=>l.startsWith('function img(k)'));
var G;eval(src.slice(__gs,__ge).join('\n').replace('const G','G'));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
Math.random=mulberry32(+process.env.SEED||1);
let imgsrc=src.slice(__is,__is+2).join('\n');
if(process.env.FIX){imgsrc=imgsrc.replace(/Math\.floor\(Math\.random\(\) \* 9\) - 4/g,'0').replace(/6 \+ Math\.floor\(Math\.random\(\) \* 3\)/,'7');}
eval(imgsrc);
const img0=img;
function center(im){let m=0,sx=0,sy=0;for(let y=0;y<R;y++)for(let x=0;x<R;x++){const v=im[y*R+x];if(v>0){m+=v;sx+=v*x;sy+=v*y}}if(!m)return im;const dx=Math.round(R/2-sx/m),dy=Math.round(R/2-sy/m),o=new Float32Array(R*R);for(let y=0;y<R;y++)for(let x=0;x<R;x++){const v=im[y*R+x];if(v>0){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<R&&ny>=0&&ny<R)o[ny*R+nx]=v}}return o}
function pool(im,b){const o=new Float32Array(R*R);for(let by=0;by<R;by+=b)for(let bx=0;bx<R;bx+=b){let m=0;for(let y=by;y<by+b&&y<R;y++)for(let x=bx;x<bx+b&&x<R;x++)if(im[y*R+x]>m)m=im[y*R+x];if(m>0)for(let y=by;y<by+b&&y<R;y++)for(let x=bx;x<bx+b&&x<R;x++)o[y*R+x]=m}return o}
const PRE=process.env.PRE||'';
// el yazısı taklidi: rastgele ölçek, en-boy oranı, dönme, eğim, dalgalanma ve kalınlık değişimi | handwriting imitation: random scale, aspect ratio, rotation, shear, wobble and stroke thickness change
function warp(im){const o=new Float32Array(R*R),sc=.65+Math.random()*.8,ar=.8+Math.random()*.4,rot=(Math.random()-.5)*.45,sh=(Math.random()-.5)*.4,wob=Math.random()*2.5,f=.06+Math.random()*.08,p1=Math.random()*6.28,p2=Math.random()*6.28,c=Math.cos(rot),s_=Math.sin(rot);
 for(let y=0;y<R;y++)for(let x=0;x<R;x++){let u=x-R/2,v=y-R/2;u+=wob*Math.sin(v*f+p1);v+=wob*Math.sin(u*f+p2);let a=(c*u+s_*v)/(sc*ar),b=(-s_*u+c*v)/sc;a-=sh*b;const sx=Math.round(a+R/2),sy=Math.round(b+R/2);if(sx>=0&&sx<R&&sy>=0&&sy<R)o[y*R+x]=im[sy*R+sx]}
 const t=Math.random();if(t<.4||t>.75){const o2=new Float32Array(R*R),dil=t<.4;for(let y=1;y<R-1;y++)for(let x=1;x<R-1;x++){let m=dil?0:1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const v=o[(y+dy)*R+x+dx];m=dil?Math.max(m,v):Math.min(m,v)}o2[y*R+x]=m}return o2}return o}
// ölçek normalizasyonu: şeklin sınır kutusunu sabit boyuta getir (gözün yakınlaşması) | scale normalization: bring the shape's bounding box to a fixed size (the eye zooming in)
function scaleNorm(im,T){let x0=R,x1=0,y0=R,y1=0;for(let y=0;y<R;y++)for(let x=0;x<R;x++)if(im[y*R+x]>.5){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}if(x1<x0)return im;
 const cx=(x0+x1)/2,cy=(y0+y1)/2,s=T/Math.max(x1-x0+1,y1-y0+1),o=new Float32Array(R*R);for(let y=0;y<R;y++)for(let x=0;x<R;x++){const sx=Math.round(cx+(x-R/2)/s),sy=Math.round(cy+(y-R/2)/s);if(sx>=0&&sx<R&&sy>=0&&sy<R)o[y*R+x]=im[sy*R+sx]}return o}
const WP=process.env.WARP||'',NORM=+(process.env.NORM||0);
const CEN=+(process.env.CEN||0);
const POOL=+(process.env.POOL||0);   // POOL=N: NxN blok en-büyük havuzlama (karmaşık hücre benzeri konum esnekliği) | POOL=N: NxN max pooling (position tolerance like complex cells)
const pipe0=im=>NORM?scaleNorm(center(im),NORM):(CEN?center(im):im), pipe=im=>POOL?pool(pipe0(im),POOL):pipe0(im);   // CEN=1: sakkad (ortalama), NORM=N: ortalama + ölçek normalizasyonu (N piksel) | CEN=1: saccade (centering), NORM=N: centering + scale normalization (N pixels)
img=PRE==='center'?(k=>center(img0(k))):PRE.startsWith('pool')?(k=>pool(img0(k),+PRE.slice(4))):PRE.startsWith('cpool')?(k=>pool(center(img0(k)),+PRE.slice(5))):img0;

const LET=[...C.LET],NL=LET.length,NT=+process.env.NT||6000,PN=+(process.env.PN||.3);
const br=new Brain();
const imgT=k=>pipe(WP.includes('train')?warp(img(k)):img(k)), imgE=k=>pipe(WP.includes('test')?warp(img(k)):img(k));
for(let n=0;n<NT;n++){const k=(Math.random()*NL)|0;br.present(imgT(k),true);if(Math.random()<PN)br.teach(k)}
const pairs=[['C','Ç'],['G','Ğ'],['I','İ'],['O','Ö'],['S','Ş'],['U','Ü']].map(p=>p.map(x=>LET.indexOf(x)));
const pairOf={};pairs.forEach(([a,b])=>{pairOf[a]=b;pairOf[b]=a});
const conf=Array.from({length:NL},()=>new Array(NL).fill(0)),per=new Array(NL).fill(0),tot=new Array(NL).fill(0);
const VEC=[];const EV=+(process.env.EV||40);for(let k=0;k<NL;k++)for(let i=0;i<EV;i++){br.present(imgE(k),false);VEC.push([Array.from(br.cnt),k,i]);const sc=br.name();let w=-1;for(let j=0;j<NL;j++)if(sc[j]>0&&(w<0||sc[j]>sc[w]))w=j;tot[k]++;if(w===k)per[k]++;if(w>=0)conf[k][w]++}
const acc=a=>a.reduce((x,y)=>x+y,0);
let okAll=acc(per)/acc(tot),pl=[...Object.keys(pairOf)].map(Number),oth=[...Array(NL).keys()].filter(k=>!(k in pairOf));
const pa=acc(pl.map(k=>per[k]))/acc(pl.map(k=>tot[k])),oa=acc(oth.map(k=>per[k]))/acc(oth.map(k=>tot[k]));
let errPair=0,errAll=0;for(let k=0;k<NL;k++)for(let w=0;w<NL;w++)if(w!==k){errAll+=conf[k][w];if(pairOf[k]===w)errPair+=conf[k][w]}
const worst=LET.map((l,k)=>[l,per[k]/tot[k]]).sort((a,b)=>a[1]-b[1]).slice(0,8).map(x=>x[0]+':'+Math.round(x[1]*100)).join(' ');
let none=0;for(let k=0;k<NL;k++)none+=tot[k]-acc(conf[k]);
console.log(`POOL=${POOL} WARP=${WP||'yok'} CEN=${CEN} NORM=${NORM} PRE=${PRE||'yok'} ${process.env.OV||'varsayilan'} PN=${PN} NT=${NT} | dogruluk %${(okAll*100)|0} | Turkce isaretli cift harfler %${(pa*100)|0} | diger harfler %${(oa*100)|0} | hatalarin %${(errPair/errAll*100)|0}'i cift-ici karisma | cevapsiz %${(none/acc(tot)*100)|0} | en kotu: ${worst}`);

// üst sınır: aynı korteks etkinliğinden, etiketle eğitilmiş en yakın merkez okuyucu | upper bound: nearest-centroid reader trained with labels on the same cortex activity
const cen=Array.from({length:NL},()=>new Float64Array(C.E));const trv=VEC.filter(v=>v[2]<EV/2),tev=VEC.filter(v=>v[2]>=EV/2);
trv.forEach(([x,k])=>{let n=Math.sqrt(x.reduce((a,b)=>a+b*b,0))||1;x.forEach((v,i)=>cen[k][i]+=v/n/(EV/2))});
let cok=0;tev.forEach(([x,k])=>{let n=Math.sqrt(x.reduce((a,b)=>a+b*b,0))||1,bw=0,bs=-1;for(let j=0;j<NL;j++){let d=0;x.forEach((v,i)=>d+=v/n*cen[j][i]);if(d>bs){bs=d;bw=j}}if(bw===k)cok++});
const act=VEC.map(v=>v[0].filter(c=>c>0).length),spk=VEC.map(v=>v[0].reduce((a,b)=>a+b,0));
console.log(`  -> denetimli en yakin merkez okuyucu (ayni etkinlikten): %${(cok/tev.length*100)|0} | sunumda ort. ${(spk.reduce((a,b)=>a+b)/spk.length).toFixed(1)} spike, ${(act.reduce((a,b)=>a+b)/act.length).toFixed(1)} farkli noron ateşliyor`);
