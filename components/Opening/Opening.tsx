'use client';

import { useEffect,useState,type ReactNode } from 'react';
import { ResumeIntro } from './ResumeIntro/ResumeIntro';
import styles from './opening.module.css';

export default function Opening({children}:{children:ReactNode}){
 const [complete,setComplete]=useState(false);
 useEffect(()=>{
  if(complete)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=previous;};
 },[complete]);
 return <>
  {!complete&&<div className={styles.overlay} data-opening="active" role="region" aria-label="Opening animation">
   <ResumeIntro openingEdit playOnce onComplete={()=>setComplete(true)}/>
  </div>}
  <div inert={!complete}>{children}</div>
 </>;
}
