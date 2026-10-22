import { setVrsText } from './branding.mjs';

const dialog=document.querySelector('#lightbox');
for(const button of document.querySelectorAll('[data-image]'))button.addEventListener('click',()=>{const original=button.querySelector('img');dialog.querySelector('img').src=button.dataset.image;dialog.querySelector('img').alt=original.alt;setVrsText(dialog.querySelector('p'),original.alt);dialog.showModal()});
dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
