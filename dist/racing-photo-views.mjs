// Four views supplied by the club. RGB pixels come from the uploaded JPEGs;
// only the alpha silhouette changes. No mirrored or recoloured variants.
export const OCTAVIA_PHOTOS={
 rear:{path:'assets/octavia-photo/rear.png',source:'assets/octavia-photo/source-rear.jpg',bounds:[131,1,1018,711]},
 'rear-left':{path:'assets/octavia-photo/rear-left.png',source:'assets/octavia-photo/source-rear-left.jpg',bounds:[47,21,1192,675],rims:[[306,540,36,97],[91,467,19,71]]},
 'rear-right':{path:'assets/octavia-photo/rear-right.png',source:'assets/octavia-photo/source-rear-right.jpg',bounds:[38,13,1191,690],rims:[[1009,547,38,100],[1191,446,18,65]]},
 front:{path:'assets/octavia-photo/front.png',source:'assets/octavia-photo/source-front.jpg',bounds:[112,2,1055,698]}
};
export function octaviaPhotoView(x,y,z,previous='rear'){
 const horizontal=Math.hypot(x,z);if(horizontal<.8||Math.abs(y-.75)/horizontal>.50)return null;
 const side=x/horizontal,back=z/horizontal;
 if(back<-.88)return 'front';
 // No full side or front-quarter view was supplied: keep real 3D volume there.
 if(back<.35)return null;
 const threshold=previous==='rear'?.27:.19;
 return Math.abs(side)<threshold?'rear':side<0?'rear-left':'rear-right';
}
export function photoDimensions(key,height=1.49){const photo=OCTAVIA_PHOTOS[key],b=photo.bounds;return {width:height*1280/b[3],height:height*720/b[3],centerX:(b[0]+b[2]/2)/1280,centerY:1-(b[1]+b[3])/720};}
export function photoViewFromWorld(frame,carPosition,cameraPosition,previous){const d=cameraPosition.map((v,i)=>v-carPosition[i]),x=d[0]*frame.r[0]+d[2]*frame.r[2],z=-d[0]*frame.t[0]-d[2]*frame.t[2];return octaviaPhotoView(x,d[1],z,previous);}
export function drawOriginalOctavia(ctx,images,key,x,y,height,distance=0){const photo=OCTAVIA_PHOTOS[key],image=images?.[key];if(!photo||!image)return false;const [left,top,w,h]=photo.bounds,width=height*w/h;ctx.drawImage(image,left,top,w,h,x-width/2,y-height,width,height);if(height>45)for(const [cx,cy,rx,ry]of photo.rims||[]){const scale=height/h;ctx.save();ctx.translate(x-width/2+(cx-left)*scale,y-height+(cy-top)*scale);ctx.scale(rx*scale,ry*scale);ctx.beginPath();ctx.arc(0,0,.9,0,Math.PI*2);ctx.clip();ctx.rotate(-distance/.335);ctx.drawImage(image,cx-rx,cy-ry,rx*2,ry*2,-1,-1,2,2);ctx.restore();}return true;}
