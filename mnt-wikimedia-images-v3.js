/* MN Electronic Assistant - Wikimedia Commons image search V3.
   Load AFTER mnt-image-library-v1.js. No auth, quota, or backend changes.
   Image requests still pass through existing authenticated chat endpoint.
*/
(()=>{'use strict';
  const previousFetch=window.fetch.bind(window);
  const endpoint='/functions/v1/mn-electronic-chat';
  const imageAsk=/(\b(images?|pictures?|photos?|diagrams?|draw(ing)?|illustrations?)\b|රූප|පින්තූර|සටහන|ඇඳ|ඇද|පෙන්ව)/i;
  const imageWords=/(\b(images?|pictures?|photos?|diagrams?|draw(ing)?|illustrations?|show|send|give|please|me|a|an|the|of|for|ekak|denna|pennanna|ona|mata)\b|රූප(යක්|ය)?|පින්තූර(යක්|ය)?|සටහන(ක්)?|ඇඳ(ලා)?|ඇද(ලා)?|දෙන්න|පෙන්වන්න|මට|ඕන|එකක්|එකේ)/gi;
  const alreadyShown=s=>/mnt-resistor-3band\.svg|upload\.wikimedia\.org|commons\.wikimedia\.org\/wiki\/File:/i.test(s);
  let lastTopic='';
  function topicFrom(s){
    let t=s.replace(imageWords,' ').replace(/[?!.,:;]+/g,' ').replace(/\s+/g,' ').trim();
    // Sinhala suffixes commonly attached to Latin component names: "NE555 IC එකේ".
    t=t.replace(/\s*(එකේ|එක|ගේ|ගැන)\s*$/,'').trim();
    return (t||lastTopic).slice(0,90);
  }
  const clean=s=>String(s||'').replace(/[\[\]()*_`<>|\\]/g,' ').replace(/\s+/g,' ').slice(0,110);
  const link=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href.replace(/\)/g,'%29'):'';}catch{return '';}};
  async function searchCommons(topic){
    const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:topic,gsrnamespace:'6',gsrlimit:'10',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'500',format:'json',origin:'*'});
    const r=await previousFetch('https://commons.wikimedia.org/w/api.php?'+params,{method:'GET'});
    if(!r.ok)throw new Error('Wikimedia HTTP '+r.status);
    const json=await r.json();
    return Object.values(json.query?.pages||{}).sort((a,b)=>(a.index??999)-(b.index??999))
      .filter(p=>/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(p.imageinfo?.[0]?.thumburl||p.imageinfo?.[0]?.url||''))
      .slice(0,3).map(p=>({name:p.title.replace(/^File:/,''),image:p.imageinfo[0].thumburl||p.imageinfo[0].url,source:p.imageinfo[0].descriptionurl}));
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!url.includes(endpoint))return previousFetch(input,init);
    let message='',hasUpload=false;
    try{const b=JSON.parse(init?.body||'{}');message=String(b.message||'');hasUpload=!!b.image;}catch{}
    const wantsImage=imageAsk.test(message),topic=topicFrom(message);
    const response=await previousFetch(input,init);
    if(!response.ok)return response; // Never hide authorization/quota/backend errors.
    let data;try{data=await response.clone().json();}catch{return response;}
    if(typeof data.answer!=='string')return response;
    if(!wantsImage&&message.trim().length>2)lastTopic=message.trim().slice(0,90);
    if(!wantsImage||hasUpload||!topic||alreadyShown(data.answer))return response;
    try{
      let images=await searchCommons(topic);
      // A simple fallback for queries with extra Sinhala/English words.
      if(!images.length){const simplified=topic.replace(/[^a-zA-Z0-9\- ]/g,' ').replace(/\s+/g,' ').trim();if(simplified&&simplified!==topic)images=await searchCommons(simplified);}
      const lines=images.map(x=>{const img=link(x.image),src=link(x.source);return img&&src?`**${clean(x.name)}**\n\n![${clean(x.name)}](${img})\n\n[මූලාශ්‍රය / බලපත්‍රය](${src})`:'';}).filter(Boolean);
      if(!lines.length)return response;
      data.answer=`**${clean(topic)} – පින්තූර**\n\n${lines.join('\n\n')}\n\n*රූපවල බලපත්‍ර සහ හිමිකම් මූලාශ්‍ර පිටුවෙන් පරීක්ෂා කරන්න.*`;
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
    }catch(err){console.warn('Wikimedia search unavailable',err);return response;}
  };
})();
