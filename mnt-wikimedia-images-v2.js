/* MN Electronic Assistant - Wikimedia Commons image search fallback V2.
   Load AFTER mnt-image-library-v1.js. Keeps auth, quotas and backend unchanged.
   Images are third-party content; source and license links are displayed.
*/
(()=>{'use strict';
  const previousFetch=window.fetch.bind(window);
  const endpoint='/functions/v1/mn-electronic-chat';
  const imageAsk=/(\b(image|images|picture|pictures|photo|photos|diagram|diagrams|drawing|illustration|show me|show|draw)\b|රූප|පින්තූර|සටහන|ඇඳ|ඇද|පෙන්ව)/i;
  const imageOnly=/^(\s*(image|images|picture|photo|diagram|රූපය|රූප|පින්තූර|සටහන|එකක්|දෙන්න|පෙන්වන්න|මට|ඕන|please|give|send|show|me|a|an|the|of|ekak|denna|pennanna|ona|mata|eka|ekak\s*)[\s.,!?]*)+$/i;
  const stripImageWords=/(\b(images?|pictures?|photos?|diagrams?|draw(ing)?|illustrations?|show|send|give|please|me|a|an|the|of|for|ekak|denna|pennanna|ona|mata)\b|රූප(යක්|ය)?|පින්තූර(යක්|ය)?|සටහන(ක්)?|ඇඳ(ලා)?|ඇද(ලා)?|දෙන්න|පෙන්වන්න|මට|ඕන)/gi;
  let lastTopic='';
  const safeText=s=>String(s||'').replace(/[\\`*_{}\[\]()#+.!|<>]/g,'\\$&').replace(/\s+/g,' ').slice(0,140);
  const safeLink=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href.replace(/\)/g,'%29'):'';}catch{return '';}};
  const commonsImageAlreadyShown=answer=>/mnt-resistor-3band\.svg|upload\.wikimedia\.org|commons\.wikimedia\.org\/wiki\/File:/i.test(answer);
  function extractTopic(message){
    let t=message.replace(stripImageWords,' ').replace(/[?!.,:;]+/g,' ').replace(/\s+/g,' ').trim();
    if(t.length>100)t=t.slice(0,100).trim();
    if(!t||imageOnly.test(message))t=lastTopic;
    return t;
  }
  async function findImages(topic){
    const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:topic,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'600',format:'json',origin:'*'});
    const r=await previousFetch('https://commons.wikimedia.org/w/api.php?'+params.toString(),{method:'GET'});
    if(!r.ok)throw new Error('Wikimedia request failed');
    const json=await r.json();
    const pages=Object.values(json.query?.pages||{}).sort((a,b)=>(a.index??999)-(b.index??999));
    return pages.filter(p=>{const u=p.imageinfo?.[0]?.thumburl||p.imageinfo?.[0]?.url||'';return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u);}).slice(0,3).map(p=>({title:p.title.replace(/^File:/,''),image:p.imageinfo[0].thumburl||p.imageinfo[0].url,source:p.imageinfo[0].descriptionurl,license:p.imageinfo[0].extmetadata?.LicenseShortName?.value||'See source for license'}));
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!url.includes(endpoint))return previousFetch(input,init);
    let message='',hasUpload=false;
    try{const body=JSON.parse(init?.body||'{}');message=String(body.message||'');hasUpload=!!body.image;}catch{}
    const wantsImage=imageAsk.test(message);
    const topic=extractTopic(message);
    const response=await previousFetch(input,init);
    if(!response.ok)return response;
    let data;
    try{data=await response.clone().json();}catch{return response;}
    if(typeof data.answer!=='string')return response;
    // Remember a topic from substantive non-image questions for follow-up requests.
    if(!wantsImage&&message.trim().length>2)lastTopic=message.trim().slice(0,100);
    if(!wantsImage||hasUpload||!topic||commonsImageAlreadyShown(data.answer))return response;
    try{
      const images=await findImages(topic);
      if(!images.length)return response;
      const parts=images.map((x,i)=>{
        const img=safeLink(x.image),source=safeLink(x.source);
        if(!img||!source)return '';
        return `**${i+1}. ${safeText(x.title)}**\n\n![${safeText(x.title)}](${img})\n\n[මූලාශ්‍රය සහ බලපත්‍රය](${source})`;
      }).filter(Boolean);
      if(!parts.length)return response;
      data.answer=`**${safeText(topic)} – පින්තූර**\n\n${parts.join('\n\n')}\n\n*මෙම රූප Wikimedia Commons වෙතින් ලබාගෙන ඇත. භාවිතයට පෙර එක් එක් රූපයේ බලපත්‍රය පරීක්ෂා කරන්න.*`;
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
    }catch(error){console.warn('Wikimedia image fallback unavailable:',error);return response;}
  };
})();
