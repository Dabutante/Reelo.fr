import React, { useState, useMemo, useEffect } from "react";

const BAREME_V={
  "3CV-":[[5000,.529,0],[20000,.316,1065],[Infinity,.370,0]],
  "4CV": [[5000,.606,0],[20000,.340,1330],[Infinity,.407,0]],
  "5CV": [[5000,.636,0],[20000,.357,1395],[Infinity,.427,0]],
  "6CV": [[5000,.665,0],[20000,.374,1457],[Infinity,.447,0]],
  "7CV+":[[5000,.697,0],[20000,.394,1515],[Infinity,.470,0]],
};
function barem(km,t){for(var i=0;i<t.length;i++){if(km<=t[i][0])return km*t[i][1]+t[i][2];}return 0;}
const REPAS_DOM=5.20,F10_MIN=495,F10_MAX=14426;
const FUELS=[{v:"essence",l:"Essence"},{v:"diesel",l:"Diesel"},{v:"hybride",l:"Hybride"},{v:"elec_r",l:"Hybride R. +20%"},{v:"elec",l:"Electrique +20%"},{v:"gpl",l:"GPL"}];
function toAn(v,u){if(u==="semaine")return v*52;if(u==="mois")return v*12;return v;}

const G="#22c55e",B="#60a5fa",A="#fbbf24",P="#a78bfa",T="#2dd4bf",O="#f97316",VI="#818cf8";
const BG="#0b0f18",CARD="#131c2a",BD="#1a2535",MU="#4a6070",DIM="#2a3a50";

const ZONES=[
  {label:"Zone 1",detail:"Dep. 01-19 et non-residents",date:new Date("2026-05-20")},
  {label:"Zone 2",detail:"Dep. 20-54",date:new Date("2026-05-27")},
  {label:"Zone 3",detail:"Dep. 55-976",date:new Date("2026-06-03")},
];

const VILLES=["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims","Saint-Etienne","Toulon","Le Havre","Grenoble","Dijon","Angers","Nimes","Villeurbanne","Le Mans","Aix-en-Provence","Clermont-Ferrand","Brest","Tours","Limoges","Amiens","Perpignan","Metz","Besancon","Orleans","Argenteuil","Rouen","Mulhouse","Caen","Nancy","Roubaix","Nanterre","Avignon","Creteil","Poitiers","Versailles","Pau","Antibes","Beziers","Dunkerque","Merignac","Saint-Nazaire","Cannes","Calais","Colmar","Annecy","Lorient","Chambery","Quimper","Niort","Beauvais","Clichy","Bourges","Ajaccio","Chartres","Laval","Montrouge","Albi","Bayonne","La Rochelle","Troyes","Valence","Montauban","Massy","Drancy","Rueil-Malmaison","Champigny-sur-Marne","Courbevoie","Colombes","Boulogne-Billancourt","Levallois-Perret","Neuilly-sur-Seine","Issy-les-Moulineaux","Montreuil","Nanterre","Aubervilliers","Pantin","Epinay-sur-Seine","Sarcelles","Argenteuil","Vitry-sur-Seine","Creteil","Bobigny","Aulnay-sous-Bois"];

function sanitize(s){
  return s.replace(/[éèêë]/g,"e").replace(/[àâä]/g,"a").replace(/[ùûü]/g,"u")
    .replace(/[îï]/g,"i").replace(/[ôö]/g,"o").replace(/ç/g,"c")
    .replace(/[ÉÈÊË]/g,"E").replace(/[ÀÂÄ]/g,"A").replace(/[ÙÛÜ]/g,"U")
    .replace(/[ÎÏ]/g,"I").replace(/[ÔÖ]/g,"O").replace(/Ç/g,"C")
    .replace(/[^\w\s.,;:()\-\/\n]/g," ").replace(/ {2,}/g," ").trim();
}

function genICS(titre,date){
  function pad(n){return n<10?"0"+n:String(n);}
  function fd(d){return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"T090000";}
  var lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Reelo//FR","BEGIN:VEVENT",
    "UID:"+Date.now()+"@reelo.fr","SUMMARY:"+titre,
    "DTSTART;TZID=Europe/Paris:"+fd(date),"DTEND;TZID=Europe/Paris:"+fd(date),
    "DESCRIPTION:Declaration revenus impots.gouv.fr - Reelo"];
  [14400,7200,1440].forEach(function(m){
    lines.push("BEGIN:VALARM","TRIGGER:-PT"+m+"M","ACTION:DISPLAY","DESCRIPTION:Rappel : "+titre,"END:VALARM");
  });
  lines.push("END:VEVENT","END:VCALENDAR");
  return lines.join("\r\n");
}

// Storage
async function stoSave(data){
  try{if(window.storage){await window.storage.set("reelo6",JSON.stringify(data));}}catch(e){}
}
async function stoLoad(){
  try{if(window.storage){var r=await window.storage.get("reelo6");if(r&&r.value)return JSON.parse(r.value);}}catch(e){}
  return null;
}

// ── Logo ──
function Logo({size}){size=size||32;return(
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="rg6" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#15803d"/>
    </linearGradient></defs>
    <rect width="36" height="36" rx="9" fill="url(#rg6)"/>
    <text x="7" y="26" fontSize="19" fill="white" fontWeight="900" fontFamily="Georgia,serif">€</text>
    <path d="M25 9L30 9L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 9L23 16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);}

// ── Atoms ──
function Inp({label,value,onChange,suffix,hint,note}){
  var [d,setD]=useState(String(value));
  useEffect(function(){setD(String(value));},[value]);
  return(
    <div style={{marginTop:12}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      {hint&&<div style={{fontSize:11,color:DIM,marginBottom:5,lineHeight:1.4}}>{hint}</div>}
      <div style={{display:"flex"}}>
        <input type="number" min="0" value={d}
          onFocus={function(){if(parseFloat(d)===0)setD("");}}
          onBlur={function(){if(d===""||isNaN(parseFloat(d))){setD("0");onChange(0);}}}
          onChange={function(e){setD(e.target.value);var p=parseFloat(e.target.value);if(!isNaN(p))onChange(p);}}
          style={{flex:1,padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,
            borderRadius:suffix?"8px 0 0 8px":"8px",color:"#dde4f0",fontSize:15,outline:"none",minWidth:0,boxSizing:"border-box"}}/>
        {suffix&&<span style={{padding:"11px 10px",background:"#060910",border:"1px solid "+BD,borderLeft:"none",
          borderRadius:"0 8px 8px 0",fontSize:12,color:DIM,whiteSpace:"nowrap",display:"flex",alignItems:"center"}}>{suffix}</span>}
      </div>
      {note&&<div style={{fontSize:11,color:G,marginTop:5,fontFamily:"monospace"}}>{note}</div>}
    </div>
  );
}

function TxtInp({label,value,onChange,placeholder,hint,list}){return(
  <div style={{marginTop:12}}>
    {label&&<div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
    {hint&&<div style={{fontSize:11,color:DIM,marginBottom:5}}>{hint}</div>}
    <input type="text" value={value} placeholder={placeholder||""} list={list}
      onChange={function(e){onChange(e.target.value);}}
      style={{width:"100%",padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,
        borderRadius:8,color:"#dde4f0",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
    {list&&<datalist id={list}>{VILLES.map(function(v,i){return React.createElement("option",{key:i,value:v});})}</datalist>}
  </div>
);}

function Sel({label,value,onChange,opts,hint}){return(
  <div style={{marginTop:12}}>
    {label&&<div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
    {hint&&<div style={{fontSize:11,color:DIM,marginBottom:5}}>{hint}</div>}
    <select value={value} onChange={function(e){onChange(e.target.value);}}
      style={{width:"100%",padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,
        borderRadius:8,color:"#dde4f0",fontSize:14,outline:"none"}}>
      {opts.map(function(o){return <option key={o.v} value={o.v}>{o.l}</option>;})}
    </select>
  </div>
);}

function Tog({label,sub,value,onChange}){return(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid "+BD+"33"}}>
    <div style={{flex:1,paddingRight:14}}>
      <div style={{fontSize:14,color:"#9ab0c0"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:DIM,marginTop:2}}>{sub}</div>}
    </div>
    <button onClick={function(){onChange(!value);}} style={{
      width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",flexShrink:0,
      background:value?G:BD,position:"relative",transition:"background .2s"}}>
      <span style={{position:"absolute",top:3,left:value?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .15s"}}/>
    </button>
  </div>
);}

function Info({children,color}){color=color||MU;return(
  <div style={{marginTop:10,padding:"10px 12px",background:color+"10",border:"1px solid "+color+"25",borderRadius:8,fontSize:12,color:"#9ab0b8",lineHeight:1.6}}>{children}</div>
);}

function Sec({icon,title,badge,badgeColor,open,onToggle,children,color}){
  color=color||G;
  var bc=badgeColor||color;
  return(
    <div style={{background:CARD,border:"1px solid "+(open?color+"55":BD),borderRadius:12,marginBottom:10}}>
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>{icon} {title}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {badge!=null&&badge!==""&&<span style={{fontSize:12,fontWeight:800,color:bc,background:bc+"18",padding:"2px 10px",borderRadius:20,fontFamily:"monospace"}}>{typeof badge==="number"?badge.toFixed(0)+" €":badge}</span>}
          <span style={{color:MU,fontSize:24,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform .2s",lineHeight:1}}>▾</span>
        </div>
      </div>
      {open&&<div style={{padding:"4px 16px 18px",borderTop:"1px solid "+BD}}>{children}</div>}
    </div>
  );
}

// ── AlerteDelai ──
function AlerteDelai(){
  var [zone,setZone]=useState(0);
  var [calOk,setCalOk]=useState(false);
  var now=new Date();
  var deadline=ZONES[zone].date;
  var diff=Math.ceil((deadline-now)/(864e5));
  var expired=diff<0;
  var urgent=!expired&&diff<=5;
  var warn=!expired&&diff>5&&diff<=15;
  var color=expired||urgent?"#f87171":warn?A:G;
  var bg=(expired||urgent)?"#f8717115":warn?A+"15":G+"12";
  var border=(expired||urgent)?"#f8717140":warn?A+"40":G+"30";
  var msg=expired?"Delai depasse.":diff===0?"C'est aujourd'hui !":"Il reste "+diff+" jour"+(diff>1?"s":"")+" pour declarer.";
  var icsUrl="data:text/calendar;charset=utf8,"+encodeURIComponent(genICS("Limite declaration impots - "+ZONES[zone].label,ZONES[zone].date));
  return(
    <div style={{background:bg,border:"1px solid "+border,borderRadius:12,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{expired||urgent?"🔴":warn?"🟡":"🟢"}</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:color}}>Declaration en ligne 2026</div>
            <div style={{fontSize:11,color:MU,marginTop:1}}>Revenus 2025 · impots.gouv.fr</div>
          </div>
        </div>
        {!expired&&<div style={{textAlign:"center",background:color+"20",borderRadius:10,padding:"6px 12px",minWidth:52}}>
          <div style={{fontSize:24,fontWeight:800,color,fontFamily:"monospace",lineHeight:1}}>{diff}</div>
          <div style={{fontSize:9,color,textTransform:"uppercase",letterSpacing:"0.06em"}}>jour{diff>1?"s":""}</div>
        </div>}
      </div>
      <div style={{fontSize:12,color,marginBottom:12,fontWeight:600}}>{msg}</div>
      <div style={{fontSize:11,color:MU,marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Votre zone :</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {ZONES.map(function(z,i){
          var sel=zone===i;
          var dz=Math.ceil((z.date-now)/(864e5));
          return(
            <button key={i} onClick={function(){setZone(i);}} style={{
              padding:"10px 14px",borderRadius:8,border:"1px solid "+(sel?color:BD),
              background:sel?color+"18":"transparent",cursor:"pointer",textAlign:"left",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:sel?color:"#9ab0c0"}}>{z.label}</div>
                <div style={{fontSize:11,color:MU}}>{z.detail}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:sel?color:MU,fontFamily:"monospace"}}>
                {dz<0?"Expire":z.date.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}
              </div>
            </button>
          );
        })}
      </div>
      {!expired&&<div style={{borderTop:"1px solid "+border,paddingTop:12}}>
        <div style={{fontSize:11,color:MU,marginBottom:10,lineHeight:1.5}}>
          Rappels inclus : J-10, J-5 et J-1. Ouvre le fichier .ics dans Calendrier iPhone ou Google Calendar.
        </div>
        <a href={icsUrl} download={"reelo-rappel-impots.ics"}
          onClick={function(){setCalOk(true);setTimeout(function(){setCalOk(false);},6000);}}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            padding:"13px 16px",borderRadius:10,cursor:"pointer",
            background:calOk?G+"22":color,color:calOk?G:"#000",
            fontSize:14,fontWeight:800,textDecoration:"none",boxSizing:"border-box",
            border:calOk?"2px solid "+G:"2px solid transparent"}}>
          <span>📆</span>
          <span>{calOk?"Fichier pret — ouvre Fichiers > Telechargements":"Ajouter au calendrier"}</span>
        </a>
        {calOk&&<div style={{marginTop:10,padding:"12px",borderRadius:8,background:G+"15",border:"1px solid "+G+"40",fontSize:12,color:G,lineHeight:1.7}}>
          <b>Sur iPhone :</b> App Fichiers → Telechargements<br/>
          Appuie sur le fichier .ics → "Ouvrir dans Calendrier" → Ajouter<br/>
          <span style={{color:"#9ab0c0"}}>3 rappels inclus : J-10, J-5, J-1</span>
        </div>}
      </div>}
    </div>
  );
}

// ── mkEmp ──
function mkEmp(id){return{
  id:id,open:true,nom:"",lieu:"",dureeMois:12,
  tcMontant:0,tcUnit:"mois",tcTaux:50,tcTauxType:"pct",
  trajetsV:[{id:1,desc:"",kmAller:0,joursV:0,cv:"5CV",fuel:"essence"}],
  douxKm:0,douxJours:0,douxDesc:"",
  peageOn:false,peageMontant:0,peageDesc:"",
  repasOn:false,repasType:"normal",repasCout:0,repasJours:0,repasAvant:0,
  teleOn:false,teleMeth:"forfait",teleJours:0,teleSurf:0,teleSurfTot:0,teleLoy:0,teleCharg:0,
  formOn:false,formCout:0,docCout:0,
};}

// ── EmpBloc ──
function EmpBloc({emp,index,onChange,onDelete,joursPresent,joursTele}){
  var ratio=emp.dureeMois/12;
  var an=toAn(emp.tcMontant,emp.tcUnit)*ratio;
  var remb=emp.tcTauxType==="pct"?an*(emp.tcTaux/100):toAn(emp.tcTaux,emp.tcUnit)*ratio;
  var tcDed=Math.max(0,an-remb);
  var vMnt=0;
  (emp.trajetsV||[]).forEach(function(tr){
    var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;
    vMnt+=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);
  });
  var douxMnt=emp.douxKm*2*emp.douxJours*0.25;
  var repasMnt=emp.repasOn?Math.max(0,emp.repasCout-REPAS_DOM-emp.repasAvant)*emp.repasJours:0;
  var peageMnt=emp.peageOn?(emp.peageMontant||0):0;
  var joursMaxEmp=Math.round(joursPresent*ratio);
  var jTeleEmp=Math.round(joursTele*ratio);
  var teleMnt=0;
  if(emp.teleOn){
    if(emp.teleMeth==="forfait")teleMnt=Math.min(emp.teleJours*2.5,580*ratio);
    else{var rr=emp.teleSurfTot>0?emp.teleSurf/emp.teleSurfTot:0;teleMnt=(emp.teleLoy+emp.teleCharg)*12*rr*ratio;}
  }
  var formMnt=emp.formOn?emp.formCout+emp.docCout:0;
  var total=tcDed+vMnt+douxMnt+peageMnt+repasMnt+teleMnt+formMnt;
  var nomAff=emp.nom||(index===0?"Employeur principal":"Employeur "+(index+1));
  var [si,setSi]=useState(null);
  function oi(id){setSi(function(p){return p===id?null:id;});}

  return(
    <div style={{border:"1px solid "+(emp.open?P+"55":BD),borderRadius:12,marginBottom:10,background:"#0e1524",overflow:"hidden"}}>
      <div onClick={function(){onChange("open",!emp.open);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🏢</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>{nomAff}</div>
            <div style={{fontSize:11,color:MU}}>{emp.lieu||"Ville non renseignee"} · {emp.dureeMois===12?"Annee entiere":emp.dureeMois+" mois"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {total>0&&<span style={{fontSize:12,fontWeight:800,color:P,background:P+"18",padding:"2px 10px",borderRadius:20,fontFamily:"monospace"}}>{total.toFixed(0)} €</span>}
          {index>0&&<button onClick={function(e){e.stopPropagation();onDelete();}} style={{background:"#f8717120",border:"1px solid #f8717140",color:"#f87171",cursor:"pointer",fontSize:13,padding:"5px 10px",borderRadius:7,marginRight:4}}>Suppr.</button>}
          <span style={{color:MU,fontSize:26,display:"inline-block",transform:emp.open?"rotate(180deg)":"none",transition:"transform .2s",lineHeight:1,marginLeft:4}}>▾</span>
        </div>
      </div>

      {emp.open&&<div style={{padding:"4px 16px 16px",borderTop:"1px solid "+BD}}>
        <TxtInp label="Nom de l'employeur" value={emp.nom} onChange={function(v){onChange("nom",v);}} placeholder="Ex : Hospices Civils de Lyon"/>
        <TxtInp label="Ville du lieu de travail" value={emp.lieu} onChange={function(v){onChange("lieu",v);}} placeholder="Recherchez une ville..." list={"vlst"+index}/>
        <datalist id={"vlst"+index}>{VILLES.map(function(v,i){return React.createElement("option",{key:i,value:v});})}</datalist>

        <div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Duree chez cet employeur</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(function(m){
              var sel=emp.dureeMois===m;
              return <button key={m} onClick={function(){onChange("dureeMois",m);}} style={{
                padding:"7px 11px",borderRadius:8,border:"1px solid "+(sel?G:BD),
                background:sel?G+"22":"transparent",color:sel?G:MU,fontWeight:sel?700:400,fontSize:12,cursor:"pointer"}}>
                {m===12?"Annee entiere":m+" mois"}</button>;
            })}
          </div>
          <div style={{fontSize:11,color:G,marginTop:6,fontFamily:"monospace"}}>
            → {emp.dureeMois} mois · max {joursMaxEmp} jours · ~{jTeleEmp} j teletravail
          </div>
        </div>

        <Sec icon="🚇" title="Transports en commun" badge={tcDed} open={si==="tc"} onToggle={function(){oi("tc");}} color={B}>
          <Info color={B}>Saisissez le cout total puis le remboursement employeur (min legal 50%). Seule votre part est deductible.</Info>
          <Inp label="Cout abonnement" value={emp.tcMontant} onChange={function(v){onChange("tcMontant",v);}} suffix="€"/>
          <Sel label="Periode" value={emp.tcUnit} onChange={function(v){onChange("tcUnit",v);}} opts={[{v:"semaine",l:"/sem."},{v:"mois",l:"/mois"},{v:"annee",l:"/an"}]}/>
          <Sel label="Remboursement employeur" value={emp.tcTauxType} onChange={function(v){onChange("tcTauxType",v);}} opts={[{v:"pct",l:"En %"},{v:"montant",l:"Montant fixe"}]}/>
          <Inp label={emp.tcTauxType==="pct"?"Taux %":"Montant"} value={emp.tcTaux} onChange={function(v){onChange("tcTaux",v);}} suffix={emp.tcTauxType==="pct"?"%":"€/"+emp.tcUnit}/>
          {emp.tcMontant>0&&<div style={{marginTop:8,fontSize:11,color:B,fontFamily:"monospace"}}>
            {toAn(emp.tcMontant,emp.tcUnit).toFixed(0)} €/an × {emp.dureeMois}/12 = {an.toFixed(0)} € − {remb.toFixed(0)} € remb. = <b>{tcDed.toFixed(2)} €</b>
          </div>}
        </Sec>

        <Sec icon="🚗" title="Frais kilométriques" badge={vMnt} open={si==="v"} onToggle={function(){oi("v");}} color={P}>
          <Info color={P}>Ajoutez autant de trajets que nécessaire. Ex : voiture jusqu'à la gare + train, ou domicile → client A et domicile → client B.</Info>
          {(emp.trajetsV||[]).map(function(tr,ti){
            var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;
            var mnt=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);
            return(
              <div key={tr.id} style={{background:"#0a0f1a",border:"1px solid "+P+"33",borderRadius:10,padding:"12px 14px",marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:P}}>Trajet {ti+1}</span>
                  {ti>0&&<button onClick={function(){
                    var next=(emp.trajetsV||[]).filter(function(t){return t.id!==tr.id;});
                    onChange("trajetsV",next);
                  }} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:15}}>✕</button>}
                </div>
                <TxtInp label="Description" value={tr.desc}
                  onChange={function(v){var next=(emp.trajetsV||[]).map(function(t){return t.id===tr.id?Object.assign({},t,{desc:v}):t;});onChange("trajetsV",next);}}
                  placeholder="Ex : Domicile → Gare de Lyon · voiture"/>
                <Sel label="Puissance fiscale (carte grise P.6)" value={tr.cv}
                  onChange={function(v){var next=(emp.trajetsV||[]).map(function(t){return t.id===tr.id?Object.assign({},t,{cv:v}):t;});onChange("trajetsV",next);}}
                  opts={Object.keys(BAREME_V).map(function(k){return{v:k,l:k};})}/>
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Carburant / motorisation</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {FUELS.map(function(f){var on=tr.fuel===f.v;return(
                      <span key={f.v} onClick={function(){var next=(emp.trajetsV||[]).map(function(t){return t.id===tr.id?Object.assign({},t,{fuel:f.v}):t;});onChange("trajetsV",next);}} style={{
                        padding:"5px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
                        border:"1px solid "+(on?P:BD),background:on?P+"22":"transparent",color:on?P:MU,fontWeight:on?700:400}}>{f.l}</span>
                    );})}
                  </div>
                </div>
                <Inp label="Distance aller" value={tr.kmAller}
                  onChange={function(v){var next=(emp.trajetsV||[]).map(function(t){return t.id===tr.id?Object.assign({},t,{kmAller:v}):t;});onChange("trajetsV",next);}}
                  suffix="km" hint="Trajet simple — A/R calculé auto"/>
                <Inp label="Jours sur la période" value={tr.joursV}
                  onChange={function(v){var next=(emp.trajetsV||[]).map(function(t){return t.id===tr.id?Object.assign({},t,{joursV:v}):t;});onChange("trajetsV",next);}}
                  suffix="jours" hint={"Max : "+joursMaxEmp+" j"}/>
                {tr.kmAller>0&&tr.joursV>0&&<div style={{marginTop:6,fontSize:11,color:P,fontFamily:"monospace"}}>
                  {(tr.kmAller*2*tr.joursV).toFixed(0)} km × barème {tr.cv}{bst>1?" × 1,20":""} = <b>{mnt.toFixed(2)} €</b>
                </div>}
              </div>
            );
          })}
          <button onClick={function(){
            var next=(emp.trajetsV||[]).concat([{id:Date.now(),desc:"",kmAller:0,joursV:0,cv:"5CV",fuel:"essence"}]);
            onChange("trajetsV",next);
          }} style={{width:"100%",marginTop:10,padding:"10px",background:P+"10",border:"1px dashed "+P+"44",
            borderRadius:8,color:P,cursor:"pointer",fontSize:12,fontWeight:700}}>
            + Ajouter un trajet voiture
          </button>
        </Sec>

        <Sec icon="🚴" title="Velo / Trottinette" badge={douxMnt} open={si==="doux"} onToggle={function(){oi("doux");}} color={T}>
          <Info color={T}>Taux legal : 0,25 €/km A/R (LOM 2019) — velo classique, VAE, trottinette personnelle.</Info>
          <TxtInp label="Description du trajet" value={emp.douxDesc||""} onChange={function(v){onChange("douxDesc",v);}} placeholder="Ex : Résidence Les Pins → Gare de Bourg-en-Bresse"/>
          <Inp label="Distance aller" value={emp.douxKm} onChange={function(v){onChange("douxKm",v);}} suffix="km"/>
          <Inp label="Jours/an" value={emp.douxJours} onChange={function(v){onChange("douxJours",v);}} suffix="jours"/>
          {emp.douxKm>0&&emp.douxJours>0&&<div style={{marginTop:6,fontSize:11,color:T,fontFamily:"monospace"}}>
            {(emp.douxKm*2*emp.douxJours).toFixed(0)} km × 0,25 € = <b>{douxMnt.toFixed(2)} €</b>
          </div>}
        </Sec>

        <Sec icon="🛣️" title="Péages autoroutiers" badge={peageMnt} open={si==="peage"} onToggle={function(){oi("peage");}} color="#94a3b8">
          <Tog label="Activer les frais de péage" value={emp.peageOn||false} onChange={function(v){onChange("peageOn",v);}}/>
          {(emp.peageOn)&&<div>
            <Info color="#94a3b8">
              Les frais de péage sont déductibles en frais réels si vous utilisez votre véhicule personnel pour vous rendre au travail. Conservez vos relevés de badge télépéage (Sanef, Vinci…) ou tickets de péage.
            </Info>
            <TxtInp label="Description (optionnel)" value={emp.peageDesc||""} onChange={function(v){onChange("peageDesc",v);}} placeholder="Ex : A6 Lyon - Paris · badge Sanef"/>
            <Inp label="Montant total sur la période" value={emp.peageMontant||0} onChange={function(v){onChange("peageMontant",v);}} suffix="€"
              hint={"Pour "+emp.dureeMois+" mois — relevé de compte ou badge télépéage"}/>
            <div style={{marginTop:8,fontSize:11,color:"#94a3b8",fontFamily:"monospace"}}>
              Déductible : <b>{peageMnt.toFixed(2)} €</b>
            </div>
          </div>}
        </Sec>

        <Sec icon="🍽️" title="Frais de repas" badge={repasMnt} open={si==="repas"} onToggle={function(){oi("repas");}} color={O}>
          <Tog label="Activer les frais de repas" value={emp.repasOn} onChange={function(v){onChange("repasOn",v);}}/>
          {emp.repasOn&&<div>
            <Sel label="Situation" value={emp.repasType} onChange={function(v){onChange("repasType",v);}} opts={[{v:"normal",l:"Pas d'avantage employeur"},{v:"ticket",l:"Ticket-restaurant"},{v:"cantine",l:"Cantine subventionnee"},{v:"panier",l:"Panier repas"}]}/>
            <Info color={O}>
              {emp.repasType==="normal"&&"Deductible = cout reel - 5,20 EUR. Ex : repas 10 EUR → 4,80 EUR/repas."}
              {emp.repasType==="ticket"&&"Deductible = cout - 5,20 EUR - part patronale. Ex : repas 12 EUR, ticket 11 EUR patron 60% (6,60 EUR) → 0,20 EUR/repas."}
              {emp.repasType==="cantine"&&"Deductible = cout - 5,20 EUR - subvention. Si vous payez moins de 5,20 EUR, rien a deduire."}
              {emp.repasType==="panier"&&"Deductible = cout - 5,20 EUR - montant panier. Ex : panier 8 EUR, repas 14 EUR → 0,80 EUR/repas."}
            </Info>
            <Inp label="Cout reel par repas" value={emp.repasCout} onChange={function(v){onChange("repasCout",v);}} suffix="€"/>
            <Inp label="Nombre de repas sur la periode" value={emp.repasJours} onChange={function(v){onChange("repasJours",v);}} suffix="repas" hint={"Max : "+joursMaxEmp+" j de presentiel"}/>
            <Inp label={emp.repasType==="ticket"?"Part patronale":emp.repasType==="panier"?"Montant panier":"Subvention/repas"} value={emp.repasAvant} onChange={function(v){onChange("repasAvant",v);}} suffix="€"/>
            <div style={{marginTop:6,fontSize:11,color:O,fontFamily:"monospace"}}>
              {Math.max(0,emp.repasCout-REPAS_DOM-emp.repasAvant).toFixed(2)} €/repas × {emp.repasJours} = <b>{repasMnt.toFixed(2)} €</b>
            </div>
          </div>}
        </Sec>

        <Sec icon="🏠" title="Teletravail / Bureau" badge={teleMnt} open={si==="tele"} onToggle={function(){oi("tele");}} color={VI}>
          <Tog label="Activer teletravail" value={emp.teleOn} onChange={function(v){onChange("teleOn",v);}}/>
          {emp.teleOn&&<div>
            <Info color={VI}>Jours estimes pour cet employeur : {jTeleEmp} j. Modifiez si besoin ci-dessous.</Info>
            <Sel label="Methode" value={emp.teleMeth} onChange={function(v){onChange("teleMeth",v);}} opts={[{v:"forfait",l:"Forfait 2,50 EUR/j (max 580 EUR/an)"},{v:"reel",l:"Frais reels (loyer + charges)"}]}/>
            {emp.teleMeth==="forfait"
              ?<Inp label="Jours de teletravail sur la periode" value={emp.teleJours} onChange={function(v){onChange("teleJours",v);}} suffix="jours" hint={"Suggestion : "+jTeleEmp+" j"}/>
              :<div>
                <Inp label="Surface bureau dedie" value={emp.teleSurf} onChange={function(v){onChange("teleSurf",v);}} suffix="m2"/>
                <Inp label="Surface totale logement" value={emp.teleSurfTot} onChange={function(v){onChange("teleSurfTot",v);}} suffix="m2"/>
                <Inp label="Loyer mensuel" value={emp.teleLoy} onChange={function(v){onChange("teleLoy",v);}} suffix="EUR/mois"/>
                <Inp label="Charges mensuelles" value={emp.teleCharg} onChange={function(v){onChange("teleCharg",v);}} suffix="EUR/mois" hint="Elec, internet, chauffage"/>
                {emp.teleSurfTot>0&&<div style={{marginTop:6,fontSize:11,color:VI,fontFamily:"monospace"}}>
                  {((emp.teleSurf/emp.teleSurfTot)*100).toFixed(1)}% × {emp.dureeMois}/12 = <b>{teleMnt.toFixed(2)} €</b>
                </div>}
              </div>}
          </div>}
        </Sec>

        <Sec icon="📚" title="Formation et documentation" badge={formMnt} open={si==="form"} onToggle={function(){oi("form");}} color={A}>
          <Tog label="Activer formation/documentation" value={emp.formOn} onChange={function(v){onChange("formOn",v);}}/>
          {emp.formOn&&<div>
            <Inp label="Frais de formation" value={emp.formCout} onChange={function(v){onChange("formCout",v);}} suffix="€" hint="Non rembourses par l'employeur"/>
            <Inp label="Documentation professionnelle" value={emp.docCout} onChange={function(v){onChange("docCout",v);}} suffix="€" hint="Livres, revues, abonnements pro"/>
            <Info color={A}>Cotisations syndicales : preferez le credit d'impot case 7AC (66% du montant).</Info>
          </div>}
        </Sec>
      </div>}
    </div>
  );
}

// ── ExportBox ──
function ExportBox({calc,emps}){
  var [mode,setMode]=useState("lire");
  var [copied,setCopied]=useState(false);

  function buildDetail(forImpots){
    var S=forImpots?sanitize:function(s){return s;};
    var lines=[];
    if(!forImpots){
      lines.push("╔══════════════════════════════════════════╗");
      lines.push("║  REELO — Frais Réels 2024                ║");
      lines.push("║  Déclaration 2025 · Art. 83 CGI          ║");
      lines.push("╚══════════════════════════════════════════╝");
    } else {
      lines.push("REELO - FRAIS REELS 2024 - art. 83 CGI");
    }
    lines.push("");
    lines.push(S("Salaire net imposable    : "+calc.salaire.toFixed(0)+" €"));
    lines.push(S("Jours travailles         : "+calc.joursTotal+" (dont "+calc.joursTele+" teletravail)"));
    lines.push(S("Deduction forfaitaire 10%: "+calc.forfait.toFixed(0)+" €"));
    lines.push("");
    lines.push(S(forImpots?"=== FRAIS DE TRANSPORT ===":"─── 🚉 FRAIS DE TRANSPORT ─────────────────"));
    lines.push("");
    emps.forEach(function(e,i){
      var ratio=e.dureeMois/12;
      var an=toAn(e.tcMontant,e.tcUnit)*ratio;
      var remb=e.tcTauxType==="pct"?an*(e.tcTaux/100):toAn(e.tcTaux,e.tcUnit)*ratio;
      var tc=Math.max(0,an-remb);
      var boost=(e.fuel==="elec"||e.fuel==="elec_r")?1.20:1;
      var v=e.vOn?Math.max(0,barem(e.kmAller*2*e.joursV,BAREME_V[e.cv])*boost):0;
      var d=e.douxKm*2*e.douxJours*0.25;
      var nom=e.nom||"Employeur "+(i+1);
      if(tc>0||v>0||d>0){
        lines.push(S("• "+nom+(e.lieu?" ("+e.lieu+")":"")+" - "+e.dureeMois+" mois"));
        if(tc>0)lines.push(S("  TC : "+toAn(e.tcMontant,e.tcUnit).toFixed(0)+"€/an x "+e.dureeMois+"/12 = "+tc.toFixed(2)+" €"));
        (e.trajetsV||[]).forEach(function(tr){var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;var vm=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);if(vm>0){var desc=tr.desc?" ("+tr.desc+")":"";lines.push(S("  KM"+desc+" : "+tr.kmAller+"km x2 x"+tr.joursV+"j "+tr.cv+(bst>1?" x1,20":"")+" = "+vm.toFixed(2)+" €"));}});
        if(d>0){var ddesc=e.douxDesc?" ("+e.douxDesc+")":"";lines.push(S("  Velo/Trottinette"+ddesc+" : "+(e.douxKm*2*e.douxJours).toFixed(0)+"km x0,25EUR = "+d.toFixed(2)+" €"));}
      if(e.peageOn&&(e.peageMontant||0)>0){var pdesc=e.peageDesc?" ("+e.peageDesc+")":"";lines.push(S("  Peages"+pdesc+" : "+(e.peageMontant||0).toFixed(2)+" €"));}
        lines.push("");
      }
    });
    lines.push(S("TOTAL TRANSPORT NET       : "+calc.transport.toFixed(2)+" €"));
    lines.push("");
    if(calc.repas>0||calc.tele>0||calc.form>0||calc.autres>0){
      lines.push(S(forImpots?"=== AUTRES FRAIS PROFESSIONNELS ===":"─── 📋 AUTRES FRAIS PROFESSIONNELS ────────"));
      lines.push("");
      if(calc.repas>0){
        lines.push(S("• Frais de repas"));
        emps.forEach(function(e){
          if(!e.repasOn)return;
          var m=Math.max(0,e.repasCout-REPAS_DOM-e.repasAvant)*e.repasJours;
          if(m>0)lines.push(S("  "+(e.nom||"Emp.")+" : "+Math.max(0,e.repasCout-REPAS_DOM-e.repasAvant).toFixed(2)+"EUR/repas x"+e.repasJours+" = "+m.toFixed(2)+" €"));
        });
        lines.push(S("  Sous-total repas : "+calc.repas.toFixed(2)+" €"));
        lines.push("");
      }
      if(calc.tele>0){
        lines.push(S("• Teletravail / Bureau"));
        emps.forEach(function(e){
          if(!e.teleOn)return;
          var r2=e.dureeMois/12;
          var t=0;
          if(e.teleMeth==="forfait")t=Math.min(e.teleJours*2.5,580*r2);
          else{var rr=e.teleSurfTot>0?e.teleSurf/e.teleSurfTot:0;t=(e.teleLoy+e.teleCharg)*12*rr*r2;}
          if(t>0)lines.push(S("  "+(e.nom||"Emp.")+(e.teleMeth==="forfait"?" : "+e.teleJours+"j x2,50EUR":" : methode reelle")+" = "+t.toFixed(2)+" €"));
        });
        lines.push(S("  Sous-total teletravail : "+calc.tele.toFixed(2)+" €"));
        lines.push("");
      }
      if(calc.form>0)lines.push(S("• Formation et documentation : "+calc.form.toFixed(2)+" €"));
      if(calc.autres>0)lines.push(S("• Autres frais professionnels : "+calc.autres.toFixed(2)+" €"));
      var totalAutres=calc.repas+calc.tele+calc.form+calc.autres;
      lines.push("");
      lines.push(S("TOTAL AUTRES FRAIS PROF.  : "+totalAutres.toFixed(2)+" €"));
      lines.push("");
    }
    lines.push(S(forImpots?"==================================":"═══════════════════════════════════════════"));
    lines.push(S("TOTAL FRAIS REELS         : "+calc.total.toFixed(2)+" €"));
    lines.push(S("Deduction forfaitaire 10% : "+calc.forfait.toFixed(2)+" €"));
    lines.push(S((calc.gain>=0?"GAIN":"DEFICIT")+" vs forfait      : "+(calc.gain>=0?"+":"")+calc.gain.toFixed(2)+" €"));
    lines.push("");
    lines.push(S(calc.gain>0?"RECOMMANDATION : Optez pour les frais reels.":"RECOMMANDATION : Gardez le forfait 10% (+"+Math.abs(calc.gain).toFixed(0)+" EUR)."));
    if(!forImpots){
      lines.push("");
      lines.push("─── COMMENT SAISIR SUR IMPOTS.GOUV.FR ─────");
      lines.push("1. Connexion → Ma déclaration → Étape 3");
      lines.push("2. Traitements et salaires → cocher « Frais réels »");
      lines.push("3. Case transport/déplacement : "+calc.transport.toFixed(2)+" €");
      var ta=calc.repas+calc.tele+calc.form+calc.autres;
      if(ta>0)lines.push("4. Case autres frais professionnels : "+ta.toFixed(2)+" €");
      lines.push("⚠️  Conservez TOUS vos justificatifs !");
      lines.push("");lines.push("Généré par Reelo · reelo.fr");
    }
    return lines.join("\n");
  }

  var txtLisible=buildDetail(false);
  var txtImpots=sanitize(buildDetail(true));
  if(txtImpots.length>1500)txtImpots=txtImpots.substring(0,1497)+"...";

  function dlWord(){
    var ta=calc.repas+calc.tele+calc.form+calc.autres;
    var rows="";
    emps.forEach(function(e,i){
      var ratio=e.dureeMois/12;
      var an=toAn(e.tcMontant,e.tcUnit)*ratio;
      var remb=e.tcTauxType==="pct"?an*(e.tcTaux/100):toAn(e.tcTaux,e.tcUnit)*ratio;
      var tc=Math.max(0,an-remb);
      var boost=(e.fuel==="elec"||e.fuel==="elec_r")?1.20:1;
      var v=e.vOn?Math.max(0,barem(e.kmAller*2*e.joursV,BAREME_V[e.cv])*boost):0;
      var d=e.douxKm*2*e.douxJours*0.25;
      var nom=e.nom||"Employeur "+(i+1);
      if(tc>0)rows+="<tr><td>"+nom+" — Transports en commun</td><td>"+toAn(e.tcMontant,e.tcUnit).toFixed(0)+"€/an × "+e.dureeMois+"/12</td><td><b>"+tc.toFixed(2)+" €</b></td></tr>";
      (e.trajetsV||[]).forEach(function(tr){var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;var vm=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);if(vm>0)rows+="<tr><td>"+nom+" — Voiture"+(tr.desc?" · "+tr.desc:"")+" ("+tr.cv+")</td><td>"+tr.kmAller+"km×2×"+tr.joursV+"j"+(bst>1?" ×1,20":"")+"</td><td><b>"+vm.toFixed(2)+" €</b></td></tr>";});
      if(d>0)rows+="<tr><td>"+nom+" — Vélo / Trottinette</td><td>"+(e.douxKm*2*e.douxJours).toFixed(0)+"km × 0,25€</td><td><b>"+d.toFixed(2)+" €</b></td></tr>";
    });
    var html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2.5cm}h1{color:#15803d;font-size:16pt;border-bottom:2px solid #15803d;padding-bottom:6pt}h2{color:#166534;font-size:13pt;margin-top:16pt}table{border-collapse:collapse;width:100%;margin-top:8pt}th{background:#f0fdf4;border:1px solid #a7f3d0;padding:7pt;text-align:left}td{border:1px solid #d1fae5;padding:7pt}.total{background:#f0fdf4;font-weight:bold;color:#15803d}.warn{background:#fffbeb;color:#92400e}.note{font-size:9pt;color:#6b7280;font-style:italic;margin-top:8pt}</style></head><body>'+
      '<h1>Reelo — Frais Réels 2024</h1><p>Déclaration 2025 · Art. 83 CGI · <em>Document indicatif</em></p>'+
      '<table><tr><th>Paramètre</th><th>Valeur</th></tr>'+
      '<tr><td>Salaire net imposable</td><td><b>'+calc.salaire.toFixed(2)+' €</b></td></tr>'+
      '<tr><td>Jours travaillés</td><td>'+calc.joursTotal+' j (dont '+calc.joursTele+' tél.)</td></tr>'+
      '<tr><td>Déduction forfaitaire 10%</td><td>'+calc.forfait.toFixed(2)+' €</td></tr>'+
      '</table>'+
      '<h2>🚉 Frais de transport et déplacement</h2>'+
      '<table><tr><th>Employeur / Trajet</th><th>Détail</th><th>Montant</th></tr>'+rows+
      '<tr class="total"><td colspan="2">TOTAL TRANSPORT NET</td><td>'+calc.transport.toFixed(2)+' €</td></tr></table>';
    if(ta>0){
      html+='<h2>📋 Autres frais professionnels</h2><table><tr><th>Catégorie</th><th>Détail</th><th>Montant</th></tr>';
      if(calc.repas>0)html+='<tr><td>Frais de repas</td><td>Voir détail par employeur</td><td>'+calc.repas.toFixed(2)+' €</td></tr>';
      if(calc.tele>0)html+='<tr><td>Télétravail / Bureau</td><td>Voir détail par employeur</td><td>'+calc.tele.toFixed(2)+' €</td></tr>';
      if(calc.form>0)html+='<tr><td>Formation & Documentation</td><td></td><td>'+calc.form.toFixed(2)+' €</td></tr>';
      if(calc.autres>0)html+='<tr><td>Autres frais professionnels</td><td></td><td>'+calc.autres.toFixed(2)+' €</td></tr>';
      html+='<tr class="total"><td colspan="2">TOTAL AUTRES FRAIS</td><td>'+ta.toFixed(2)+' €</td></tr></table>';
    }
    html+='<h2>📊 Récapitulatif final</h2><table>'+
      '<tr class="total"><td>TOTAL FRAIS RÉELS</td><td><b>'+calc.total.toFixed(2)+' €</b></td></tr>'+
      '<tr><td>Forfait 10%</td><td>'+calc.forfait.toFixed(2)+' €</td></tr>'+
      '<tr class="'+(calc.gain>0?"total":"warn")+'"><td>'+(calc.gain>0?"✓ GAIN vs forfait":"⚠ Déficit vs forfait")+'</td><td>'+(calc.gain>=0?"+":"")+calc.gain.toFixed(2)+' €</td></tr></table>'+
      '<h2>📝 Comment saisir sur impots.gouv.fr</h2>'+
      '<ol style="line-height:1.9"><li>Connexion → Ma déclaration → Étape 3 → Traitements et salaires</li>'+
      '<li>Cocher <b>« Frais réels »</b> (décocher forfait)</li>'+
      '<li><b>Case transport et déplacement</b> : saisir <b>'+calc.transport.toFixed(2)+' €</b></li>'+
      (ta>0?'<li><b>Case autres frais professionnels</b> : saisir <b>'+ta.toFixed(2)+' €</b></li>':'')+
      '<li>Coller le résumé Reelo dans "Informations complémentaires"</li></ol>'+
      '<p class="note">⚠️ Conservez TOUS vos justificatifs (tickets, factures, relevés).</p>'+
      '<p class="note">Généré par Reelo · reelo.fr · Barèmes DGFIP 2024 · À titre indicatif</p></body></html>';
    // iOS-compatible : ouvrir dans un nouvel onglet
    try {
      var blob=new Blob([html],{type:"application/msword"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url;a.download="Reelo-FraisReels-2024.doc";
      a.style.display="none";
      document.body.appendChild(a);a.click();
      setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},300);
    } catch(e) {
      // Fallback iOS : data URI dans nouvel onglet
      var encoded=encodeURIComponent(html);
      var win=window.open("","_blank");
      if(win){win.document.write(html);win.document.close();}
      else{alert("Autorisez les popups pour télécharger le document, ou essayez depuis un ordinateur.");}
    }
  }

  return(
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[{k:"lire",l:"📄 Lecture"},{k:"impots",l:"🏛 Impôts.gouv"},{k:"word",l:"📥 Word"}].map(function(tab){
          var sel=mode===tab.k;
          return <button key={tab.k} onClick={function(){setMode(tab.k);}} style={{
            flex:1,padding:"10px 4px",borderRadius:9,border:"1px solid "+(sel?G:BD),
            background:sel?G+"18":"transparent",color:sel?G:"#8a9ab0",
            fontSize:12,fontWeight:sel?700:400,cursor:"pointer"}}>{tab.l}</button>;
        })}
      </div>

      {mode==="lire"&&<div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
        <div style={{fontSize:11,color:MU,marginBottom:10}}>Résumé complet lisible — vérifiez vos données avant de déclarer</div>
        <pre style={{fontSize:11.5,color:"#4a9060",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:420,overflowY:"auto"}}>{txtLisible}</pre>
      </div>}

      {mode==="impots"&&<div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#8a9ab0"}}>Texte pour impots.gouv.fr</div>
            <div style={{fontSize:10,color:DIM,marginTop:2}}>{txtImpots.length}/1500 caracteres · sans accents</div>
          </div>
          <button onClick={function(){navigator.clipboard.writeText(txtImpots).then(function(){setCopied(true);setTimeout(function(){setCopied(false);},3000);});}}
            style={{padding:"8px 16px",borderRadius:7,border:"none",cursor:"pointer",
              background:copied?G+"22":G,color:copied?G:"#000",fontSize:13,fontWeight:700,flexShrink:0,marginLeft:8}}>
            {copied?"Copie !":"Copier"}
          </button>
        </div>
        <div style={{height:4,background:BD,borderRadius:4,marginBottom:10,overflow:"hidden"}}>
          <div style={{height:"100%",width:Math.min(100,(txtImpots.length/1500)*100)+"%",background:txtImpots.length>1400?"#f87171":G,borderRadius:4}}/>
        </div>
        <pre style={{fontSize:11,color:"#4a8060",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:260,overflowY:"auto",background:"#060910",padding:"10px",borderRadius:8}}>{txtImpots}</pre>
        <div style={{marginTop:12,padding:"10px 12px",background:G+"10",border:"1px solid "+G+"25",borderRadius:8,fontSize:11,color:MU,lineHeight:1.9}}>
          <b style={{color:G}}>Où saisir sur impots.gouv.fr :</b><br/>
          1. Étape 3 → Traitements → cocher Frais réels<br/>
          2. Case transport/déplacement : <b style={{color:G,fontFamily:"monospace"}}>{calc.transport.toFixed(2)} €</b><br/>
          {(calc.repas+calc.tele+calc.form+calc.autres)>0&&<span>3. Case autres frais pro : <b style={{color:A,fontFamily:"monospace"}}>{(calc.repas+calc.tele+calc.form+calc.autres).toFixed(2)} €</b><br/></span>}
          Coller ce texte dans "Informations complémentaires"
        </div>
      </div>}

      {mode==="word"&&<div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
        <div style={{fontSize:12,color:MU,lineHeight:1.7,marginBottom:14}}>
          Le document Word inclut :<br/>
          • Tableau par employeur et par poste<br/>
          • Instructions de saisie impots.gouv.fr<br/>
          • Mise en page prête à imprimer ou envoyer
        </div>
        <button onClick={dlWord} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",
          background:B,color:"#000",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:18}}>📥</span> Télécharger document Word
        </button>
        <div style={{fontSize:10,color:DIM,marginTop:8,textAlign:"center"}}>Fichier .doc · Compatible Word, LibreOffice, Pages</div>
      </div>}
    </div>
  );
}

// ════════════════════════ APP ════════════════════════
export default function App(){
  var [sec,setSec]=useState("jours");
  function o(id){setSec(function(p){return p===id?null:id;});}
  var [salaire,setSalaire]=useState(36000);
  var [joursOuvres,setJO]=useState(228);
  var [joursCP,setJCP]=useState(25);
  var [joursFeries,setJF]=useState(8);
  var [joursArret,setJA]=useState(0);
  var [teleParSem,setTPS]=useState(0);
  var [emps,setEmps]=useState([mkEmp(1)]);
  var [autres,setAutres]=useState(0);
  var [showExp,setShowExp]=useState(false);
  var [loaded,setLoaded]=useState(false);
  var [saved,setSaved]=useState(false);

  useEffect(function(){
    stoLoad().then(function(data){
      if(data){
        try{
          if(data.salaire)setSalaire(data.salaire);
          if(data.joursOuvres)setJO(data.joursOuvres);
          if(data.joursCP)setJCP(data.joursCP);
          if(data.joursFeries)setJF(data.joursFeries);
          if(data.joursArret)setJA(data.joursArret);
          if(data.teleParSem!==undefined)setTPS(data.teleParSem);
          if(data.emps&&data.emps.length)setEmps(data.emps);
          if(data.autres!==undefined)setAutres(data.autres);
        }catch(e){}
      }
      setLoaded(true);
    });
  },[]);

  useEffect(function(){
    if(!loaded)return;
    var t=setTimeout(function(){
      stoSave({salaire,joursOuvres,joursCP,joursFeries,joursArret,teleParSem,emps,autres});
      setSaved(true);setTimeout(function(){setSaved(false);},2000);
    },1000);
    return function(){clearTimeout(t);};
  },[loaded,salaire,joursOuvres,joursCP,joursFeries,joursArret,teleParSem,emps,autres]);

  useEffect(function(){
    document.title="Reelo — Frais Réels";
    try{
      var cv=document.createElement("canvas");cv.width=192;cv.height=192;
      var ctx=cv.getContext("2d");
      var gr=ctx.createLinearGradient(0,0,192,192);gr.addColorStop(0,"#22c55e");gr.addColorStop(1,"#15803d");
      var r=42;ctx.fillStyle=gr;ctx.beginPath();
      ctx.moveTo(r,0);ctx.lineTo(192-r,0);ctx.quadraticCurveTo(192,0,192,r);
      ctx.lineTo(192,192-r);ctx.quadraticCurveTo(192,192,192-r,192);
      ctx.lineTo(r,192);ctx.quadraticCurveTo(0,192,0,192-r);
      ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();ctx.fill();
      ctx.fillStyle="white";ctx.font="bold 105px Georgia,serif";ctx.textBaseline="middle";ctx.fillText("€",35,104);
      ctx.strokeStyle="white";ctx.lineWidth=13;ctx.lineCap="round";ctx.lineJoin="round";
      ctx.beginPath();ctx.moveTo(125,43);ctx.lineTo(165,43);ctx.lineTo(165,83);ctx.stroke();
      ctx.beginPath();ctx.moveTo(165,43);ctx.lineTo(110,98);ctx.stroke();
      var ico=cv.toDataURL("image/png");
      ["apple-touch-icon","icon"].forEach(function(rel){var prev=document.querySelector("link[rel='"+rel+"']");if(prev)prev.remove();var el=document.createElement("link");el.rel=rel;el.href=ico;document.head.appendChild(el);});
      var mf={name:"Reelo",short_name:"Reelo",start_url:"/",display:"standalone",background_color:"#0b0f18",theme_color:"#22c55e",icons:[{src:ico,sizes:"192x192",type:"image/png"}]};
      var mb=new Blob([JSON.stringify(mf)],{type:"application/manifest+json"});
      var prev2=document.querySelector("link[rel='manifest']");if(prev2)prev2.remove();
      var ml=document.createElement("link");ml.rel="manifest";ml.href=URL.createObjectURL(mb);document.head.appendChild(ml);
      var metas=[["theme-color","#22c55e"],["apple-mobile-web-app-capable","yes"],["apple-mobile-web-app-title","Reelo"]];
      metas.forEach(function(m){var prev3=document.querySelector("meta[name='"+m[0]+"']");if(prev3)prev3.remove();var mt=document.createElement("meta");mt.name=m[0];mt.content=m[1];document.head.appendChild(mt);});
    }catch(e){}
  },[]);

  function addEmp(){setEmps(function(p){return p.concat([mkEmp(Date.now())]);});}
  function delEmp(id){setEmps(function(p){return p.filter(function(e){return e.id!==id;});});}
  function updEmp(id,k,v){setEmps(function(p){return p.map(function(e){return e.id===id?Object.assign({},e,{[k]:v}):e;});});}

  var calc=useMemo(function(){
    var joursTele=Math.round(teleParSem*52);
    var joursTotal=Math.max(0,joursOuvres-joursCP-joursFeries-joursArret);
    var joursPresent=Math.max(0,joursTotal-joursTele);
    var totalTC=0,totalV=0,totalDoux=0,totalRepas=0,totalTele=0,totalForm=0;
    emps.forEach(function(e){
      var ratio=e.dureeMois/12;
      var an=toAn(e.tcMontant,e.tcUnit)*ratio;
      var remb=e.tcTauxType==="pct"?an*(e.tcTaux/100):toAn(e.tcTaux,e.tcUnit)*ratio;
      totalTC+=Math.max(0,an-remb);
      (e.trajetsV||[]).forEach(function(tr){var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;totalV+=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);});
      totalDoux+=e.douxKm*2*e.douxJours*0.25;
      if(e.peageOn)totalV+=(e.peageMontant||0);
      if(e.repasOn)totalRepas+=Math.max(0,e.repasCout-REPAS_DOM-e.repasAvant)*e.repasJours;
      if(e.teleOn){var r2=e.dureeMois/12;if(e.teleMeth==="forfait")totalTele+=Math.min(e.teleJours*2.5,580*r2);else{var rr=e.teleSurfTot>0?e.teleSurf/e.teleSurfTot:0;totalTele+=(e.teleLoy+e.teleCharg)*12*rr*r2;}}
      if(e.formOn)totalForm+=e.formCout+e.docCout;
    });
    var transport=totalTC+totalV+totalDoux;
    var total=transport+totalRepas+totalTele+totalForm+autres;
    var forfait=Math.min(Math.max(salaire*0.10,F10_MIN),F10_MAX);
    return{joursTotal,joursPresent,joursTele,totalTC,totalV,totalDoux,transport,repas:totalRepas,tele:totalTele,form:totalForm,autres,total,forfait,gain:total-forfait,salaire};
  },[salaire,joursOuvres,joursCP,joursFeries,joursArret,teleParSem,emps,autres]);

  var now=new Date();
  var minDiff=Infinity,minLabel="";
  ZONES.forEach(function(z){var d=Math.ceil((z.date-now)/(864e5));if(d>=0&&d<minDiff){minDiff=d;minLabel=z.label+" : J-"+d;}});

  return(
    <div style={{minHeight:"100vh",background:BG,color:"#dde4f0",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#0f1520",borderBottom:"1px solid "+BD,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:99}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Logo size={30}/>
          <div>
            <div style={{fontWeight:800,fontSize:18,letterSpacing:"-0.03em",lineHeight:1}}>Ree<span style={{color:G}}>lo</span></div>
            <div style={{fontSize:9,color:DIM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Frais réels · 2025</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {saved&&<span style={{fontSize:10,color:G,opacity:0.7}}>💾 sauvegardé</span>}
          <span style={{fontSize:10,fontWeight:700,color:G,background:G+"15",border:"1px solid "+G+"30",padding:"3px 10px",borderRadius:20}}>Bêta</span>
        </div>
      </div>

      <div style={{background:"linear-gradient(160deg,#0d1a0d,#0b0f18 70%)",borderBottom:"1px solid "+BD,padding:"20px 16px 18px"}}>
        <h1 style={{fontSize:"clamp(18px,4vw,26px)",fontWeight:800,color:"#fff",margin:"0 0 6px",lineHeight:1.2}}>
          Calculez vos frais réels<br/><span style={{color:G}}>et récupérez ce qui vous appartient.</span>
        </h1>
        <p style={{fontSize:12,color:"#3a6040",margin:0,lineHeight:1.5}}>Barèmes DGFIP 2024 · Tous postes · Export impôts.gouv.fr + Word</p>
      </div>

      <div style={{background:"#0f1a0f",borderBottom:"1px solid #1a3020",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:DIM,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total frais réels</div>
          <div style={{fontSize:26,fontWeight:800,color:G,fontFamily:"monospace",lineHeight:1.1}}>{calc.total.toFixed(0)} €</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:DIM,marginBottom:2}}>Forfait 10%</div>
          <div style={{fontSize:14,fontWeight:700,color:A,fontFamily:"monospace"}}>{calc.forfait.toFixed(0)} €</div>
          <div style={{fontSize:11,fontWeight:700,color:calc.gain>0?G:A,marginTop:3}}>{calc.gain>0?"✅ +"+calc.gain.toFixed(0)+"€ gagné":"⚠️ Forfait préférable"}</div>
        </div>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"14px 12px"}}>

        <Sec icon="⏰" title="Délai de déclaration"
          badge={minDiff<Infinity?"‼️ "+minLabel:null} badgeColor="#f87171"
          open={sec==="alerte"} onToggle={function(){o("alerte");}} color="#f87171">
          <AlerteDelai/>
        </Sec>

        <Sec icon="💰" title="Salaire net imposable" open={sec==="sal"} onToggle={function(){o("sal");}} color={B}>
          <Inp label="Salaire net imposable annuel" value={salaire} onChange={setSalaire} suffix="€/an" hint="Case 1AJ de votre déclaration"/>
        </Sec>

        <Sec icon="📅" title="Jours travaillés" badge={calc.joursTotal} open={sec==="jours"} onToggle={function(){o("jours");}} color={B}>
          <Info color={B}>228 j = salarié classique 2025. 218 j = cadre forfait-jours. Ajustez selon votre situation.</Info>
          <Inp label="Jours ouvrés de l'année" value={joursOuvres} onChange={setJO} suffix="j" hint="228 salarié / 218 cadre"/>
          <Inp label="Congés payés (+ RTT)" value={joursCP} onChange={setJCP} suffix="j" hint="Légal : 25 jours CP"/>
          <Inp label="Jours fériés en semaine" value={joursFeries} onChange={setJF} suffix="j" hint="~8 en 2025"/>
          <Inp label="Arrêts / absences" value={joursArret} onChange={setJA} suffix="j" hint="Maladie, congé parental…"/>
          <Inp label="Jours de télétravail par semaine" value={teleParSem} onChange={setTPS} suffix="j/sem."
            hint="Calcul auto × 52 semaines"
            note={"→ "+calc.joursTele+" j/an télétravail · "+calc.joursPresent+" j/an présentiel"}/>
        </Sec>

        <Sec icon="🚉" title="Transports par employeur" badge={calc.transport} open={sec==="trans"} onToggle={function(){o("trans");}} color={P}>
          <Info color={P}>Un bloc par employeur. Les frais de repas, télétravail et formation de chaque employeur sont configurables dans son bloc.</Info>
          <div style={{marginTop:12}}>
            {emps.map(function(e,i){return(
              <EmpBloc key={e.id} emp={e} index={i}
                joursPresent={calc.joursPresent} joursTele={calc.joursTele}
                onChange={function(k,v){updEmp(e.id,k,v);}}
                onDelete={function(){delEmp(e.id);}}/>
            );})}
          </div>
          <button onClick={addEmp} style={{width:"100%",padding:"12px",background:P+"12",border:"1px dashed "+P+"44",borderRadius:8,color:P,cursor:"pointer",fontSize:13,fontWeight:700}}>
            + Ajouter un employeur
          </button>
        </Sec>

        <Sec icon="📎" title="Autres frais professionnels" badge={autres>0?autres:0} open={sec==="autres"} onToggle={function(){o("autres");}} color="#94a3b8">
          <Inp label="Montant total" value={autres} onChange={setAutres} suffix="€/an" hint="Matériel pro, vêtements imposés, double résidence, déménagement…"/>
          <Info color="#94a3b8">
            EPI / uniforme imposé · Outillage ≤500€ · Double résidence · Déménagement contraint.<br/>
            Ce montant sera saisi dans la case "Autres frais professionnels" sur impots.gouv.fr.
          </Info>
        </Sec>

        <Sec icon="📊" title="Récapitulatif & Export" badge={calc.total} open={sec==="recap"} onToggle={function(){o("recap");}} color={G}>
          <div style={{paddingTop:8}}>
            {[[" 🚇 TC",calc.totalTC,B],["🚗 Voiture",calc.totalV,P],["🚴 Doux",calc.totalDoux,T],["🍽️ Repas",calc.repas,O],["🏠 Teletravail",calc.tele,VI],["📚 Formation",calc.form,A],["📎 Autres",calc.autres,"#94a3b8"]].map(function(row,i){return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+BD+"33",opacity:row[1]===0?0.3:1}}>
                <span style={{fontSize:13,color:MU}}>{row[0]}</span>
                <span style={{fontSize:13,fontWeight:700,color:row[2],fontFamily:"monospace"}}>{row[1].toFixed(0)} €</span>
              </div>
            );})}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid "+BD,marginTop:4}}>
              <span style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>Transport net</span>
              <span style={{fontSize:14,fontWeight:800,color:B,fontFamily:"monospace"}}>{calc.transport.toFixed(0)} €</span>
            </div>
          </div>
          <div style={{display:"flex",gap:8,margin:"12px 0"}}>
            <div style={{flex:1,background:"#090d14",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:DIM,marginBottom:4}}>Frais réels Reelo</div>
              <div style={{fontSize:22,fontWeight:800,color:G,fontFamily:"monospace"}}>{calc.total.toFixed(0)} €</div>
            </div>
            <div style={{flex:1,background:"#090d14",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:DIM,marginBottom:4}}>Forfait 10%</div>
              <div style={{fontSize:22,fontWeight:800,color:A,fontFamily:"monospace"}}>{calc.forfait.toFixed(0)} €</div>
            </div>
          </div>
          <div style={{padding:"12px 14px",borderRadius:10,background:calc.gain>0?G+"12":A+"12",border:"1px solid "+(calc.gain>0?G+"30":A+"30"),marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:calc.gain>0?G:A}}>
              {calc.gain>0?"✅ Les frais réels vous font économiser +"+calc.gain.toFixed(0)+" €":"⚠️ Le forfait 10% est plus avantageux"}
            </div>
            <div style={{fontSize:12,color:MU,marginTop:4}}>
              {calc.gain>0?"Optez pour les frais réels dans votre déclaration.":"Frais réels inférieurs au forfait de "+Math.abs(calc.gain).toFixed(0)+" €."}
            </div>
          </div>
          <button onClick={function(){setShowExp(function(p){return !p;});}} style={{
            width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,
            background:showExp?G+"18":G,color:showExp?G:"#000"}}>
            {showExp?"▲ Masquer l'export":"📄 Voir l'export (Lecture / Impôts.gouv / Word)"}
          </button>
          {showExp&&<ExportBox calc={calc} emps={emps}/>}
          <div style={{padding:"10px 0",display:"flex",alignItems:"center",gap:8,marginTop:8}}>
            <Logo size={16}/><span style={{fontSize:10,color:DIM}}>Reelo · DGFIP 2024 · Indicatif · Conservez vos justificatifs</span>
          </div>
        </Sec>

      </div>
      <style>{"* { box-sizing:border-box } input[type=number]::-webkit-inner-spin-button { opacity:.25 } select option { background:#090d14 }"}</style>
    </div>
  );
}