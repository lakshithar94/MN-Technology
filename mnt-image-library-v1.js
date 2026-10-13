/* MN Electronic Assistant: free, curated diagram library V1.
 * Non-invasive response decorator. No keys, quota, login or backend changes.
 * Must be loaded on the chat page before a student submits a question.
 */
(()=>{'use strict';
  const originalFetch=window.fetch.bind(window);
  const diagram='mnt-resistor-3band.svg';
  const resistor=/(resistor|resistance|රෙසිස්ට|ප්‍රතිරෝධ|color\s*code|colour\s*code|වර්ණ\s*සංකේත)/i;
  const threeBand=/(3\s*[- ]?\s*band|three\s*[- ]?\s*band|පටි\s*3|3\s*පටි)/i;
  const imageAsk=/(image|picture|photo|diagram|draw|illustrat|රූප|පින්තූර|සටහන|ඇඳ|ඇද)/i;
  let lastTopic='';
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!url.includes('/functions/v1/mn-electronic-chat')) return originalFetch(input,init);
    let message='';
    try{const body=JSON.parse(init?.body||'{}');message=String(body.message||'');}catch{}
    const response=await originalFetch(input,init);
    if(!response.ok) return response;
    const text=await response.clone().text();
    let data;try{data=JSON.parse(text);}catch{return response;}
    if(typeof data.answer!=='string')return response;
    const prior=lastTopic;
    if(resistor.test(message))lastTopic=message;
    const topic=(resistor.test(message)?message:prior);
    const requestImage=imageAsk.test(message);
    const relevant=resistor.test(topic) && (threeBand.test(topic)||/color\s*code|colour\s*code|වර්ණ\s*සංකේත/i.test(topic));
    if(requestImage&&relevant){
      data.answer='**3-Band Resistor Color Code – Diagram**\n\n![3-Band Resistor Color Code]('+diagram+')\n\n**Example:** Brown–Black–Red = 1 kΩ (±20%).';
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
    }
    return response;
  };
})();
