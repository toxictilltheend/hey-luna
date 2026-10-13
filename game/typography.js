'use strict';
// Keep the authored text intact; only add inline wrapping boundaries.
const lunaTerms=['艾达·洛夫莱斯','开盒科技','人工智能','编程先驱','计算技术','数学笔记','分析机','巴贝奇','上线前','她抬起头'];
const lunaSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-CN',{granularity:'word'}):null;
function lunaChineseUnits(text){
  const chunks=text.split(new RegExp('('+lunaTerms.join('|')+')','g'));const raw=[];
  for(const chunk of chunks){if(!chunk)continue;if(lunaTerms.includes(chunk))raw.push(chunk);else if(lunaSegmenter)raw.push(...Array.from(lunaSegmenter.segment(chunk),part=>part.segment));else raw.push(...Array.from(chunk));}
  const units=[];let opening='';
  for(const part of raw){
    if(/^[（《「『【“‘]+$/.test(part)){opening+=part;continue;}
    if(/^[，。！？；：、）》」』】”’％…,.!?;:%)]+$/.test(part)&&units.length&&!opening)units[units.length-1]+=part;
    else{units.push(opening+part);opening='';}
  }
  if(opening)units.push(opening);
  // Pull a short final phrase together, stopping at the preceding sentence.
  let tail='',count=0;
  while(units.length){const next=units[units.length-1];if(tail&&/[。！？][”’」』）]*$/.test(next))break;
    const letters=Array.from(next).filter(ch=>/[㐀-鿿]/.test(ch)).length;
    if(tail&&count+letters>12)break;tail=units.pop()+tail;count+=letters;if(count>=6)break;
  }
  if(tail)units.push(tail);return units;
}
function lunaWrapText(text,lang){
  const fragment=document.createDocumentFragment();
  const keep=value=>{const span=document.createElement('span');span.className='reading-unit';span.textContent=value;fragment.append(span);};
  if(lang==='zh')for(const unit of lunaChineseUnits(text)){if(unit.trim())keep(unit);else fragment.append(document.createTextNode(unit));}
  else{
    // Keep the last two or three words together without splitting long words.
    const match=text.match(/(?:[^\s]+\s+){1,2}[^\s]+\s*$/);
    if(match&&match[0].trim().length<=32){fragment.append(document.createTextNode(text.slice(0,match.index)));keep(match[0]);}
    else fragment.append(document.createTextNode(text));
  }
  return fragment;
}
function applyLunaTypography(root,lang){
  const selector='.scene-note p,.intro,.identity-note,.dialogue-text .text-ink,.narration-text .text-ink,.narration-text:not(.timed-text),.report-message,.report-rule,.comment p,.scene-heading p,#history-body p,.brief-title,.choice-list button';
  for(const element of root.querySelectorAll(selector)){
    if(element.dataset.typeset===lang)continue;
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);const nodes=[];let node;
    while((node=walker.nextNode()))if(node.textContent.trim()&&!node.parentElement.closest('b,.reading-unit'))nodes.push(node);
    for(const textNode of nodes){
      const text=textNode.textContent;
      // The introductory task/company statement is its own reading beat.
      if(element.classList.contains('intro')){
        const boundary=lang==='zh'?text.indexOf('。')+1:(text.match(/\.\s+/)?.index??-1)+1;
        if(boundary>0&&text.slice(boundary).trim()){
          const fragment=document.createDocumentFragment();
          for(const part of [text.slice(0,boundary),text.slice(boundary)]){const block=document.createElement('span');block.className='reading-paragraph';block.append(lunaWrapText(part,lang));fragment.append(block);}
          textNode.replaceWith(fragment);continue;
        }
      }
      textNode.replaceWith(lunaWrapText(text,lang));
    }
    element.dataset.typeset=lang;
  }
}
