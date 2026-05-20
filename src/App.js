import React, { useState, useMemo, useEffect } from "react";

var BAREME_V = {
  "3CV-": [[5000,.529,0],[20000,.316,1065],[Infinity,.370,0]],
  "4CV":  [[5000,.606,0],[20000,.340,1330],[Infinity,.407,0]],
  "5CV":  [[5000,.636,0],[20000,.357,1395],[Infinity,.427,0]],
  "6CV":  [[5000,.665,0],[20000,.374,1457],[Infinity,.447,0]],
  "7CV+": [[5000,.697,0],[20000,.394,1515],[Infinity,.470,0]],
};
function barem(km, t) {
  for (var i = 0; i < t.length; i++) { if (km <= t[i][0]) return km * t[i][1] + t[i][2]; }
  return 0;
}
var REPAS_DOM = 5.20, F10_MIN = 495, F10_MAX = 14426;
var FUELS = [{v:"essence",l:"Essence"},{v:"diesel",l:"Diesel"},{v:"hybride",l:"Hybride"},{v:"elec_r",l:"Hybride R. +20%"},{v:"elec",l:"Electrique +20%"},{v:"gpl",l:"GPL"}];
var ZONES = [
  {label:"Zone 1",detail:"Dep. 01-19",date:new Date("2026-05-20")},
  {label:"Zone 2",detail:"Dep. 20-54",date:new Date("2026-05-27")},
  {label:"Zone 3",detail:"Dep. 55-976",date:new Date("2026-06-03")},
];
var VILLES = ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims","Saint-Etienne","Toulon","Le Havre","Grenoble","Dijon","Angers","Nimes","Villeurbanne","Le Mans","Aix-en-Provence","Clermont-Ferrand","Brest","Tours","Limoges","Amiens","Perpignan","Metz","Besancon","Orleans","Rouen","Mulhouse","Caen","Nancy","Roubaix","Nanterre","Avignon","Creteil","Poitiers","Versailles","Pau","Antibes","Beziers","Dunkerque","Merignac","Saint-Nazaire","Cannes","Calais","Colmar","Annecy","Lorient","Chambery","Quimper","Niort","Beauvais","Clichy","Bourges","Ajaccio","Chartres","Laval","Montrouge","Albi","Bayonne","La Rochelle","Troyes","Valence","Montauban","Massy","Drancy","Rueil-Malmaison","Champigny-sur-Marne","Courbevoie","Boulogne-Billancourt","Levallois-Perret","Neuilly-sur-Seine","Issy-les-Moulineaux","Montreuil","Aubervilliers","Pantin","Vitry-sur-Seine","Bobigny","Aulnay-sous-Bois"];

function toAn(v, u) { if (u === "semaine") return v * 52; if (u === "mois") return v * 12; return v; }

function sanitize(s) {
  return s
    .replace(/[éèêë]/g,"e").replace(/[àâä]/g,"a").replace(/[ùûü]/g,"u")
    .replace(/[îï]/g,"i").replace(/[ôö]/g,"o").replace(/ç/g,"c")
    .replace(/[ÉÈÊË]/g,"E").replace(/[ÀÂÄ]/g,"A").replace(/Ç/g,"C")
    .replace(/[^\w\s.,;:()\-\/\n]/g," ").replace(/ {2,}/g," ").trim();
}

function genICS(titre, date) {
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function fd(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T090000"; }
  var lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Reelo//FR","BEGIN:VEVENT",
    "UID:" + Date.now() + "@reelo.fr","SUMMARY:" + titre,
    "DTSTART;TZID=Europe/Paris:" + fd(date),"DTEND;TZID=Europe/Paris:" + fd(date),
    "DESCRIPTION:Declaration impots.gouv.fr - Reelo"];
  [14400,7200,1440].forEach(function(m) {
    lines.push("BEGIN:VALARM","TRIGGER:-PT" + m + "M","ACTION:DISPLAY","DESCRIPTION:Rappel : " + titre,"END:VALARM");
  });
  lines.push("END:VEVENT","END:VCALENDAR");
  return lines.join("\r\n");
}

function stoSave(data) {
  try { if (window.storage) { window.storage.set("reelo7", JSON.stringify(data)); } } catch(e) {}
  return Promise.resolve();
}
function stoLoad() {
  try {
    if (window.storage) {
      return window.storage.get("reelo7").then(function(r) {
        if (r && r.value) return JSON.parse(r.value);
        return null;
      }).catch(function() { return null; });
    }
  } catch(e) {}
  return Promise.resolve(null);
}

// ── Colors ──
var G="#22c55e",B="#60a5fa",A="#fbbf24",P="#a78bfa",T="#2dd4bf",O="#f97316",VI="#818cf8";
var BG="#0b0f18",CARD="#131c2a",BD="#1a2535",MU="#4a6070",DIM="#2a3a50";

function Logo(props) {
  var size = props.size || 32;
  return React.createElement("svg", {width:size,height:size,viewBox:"0 0 36 36",fill:"none"},
    React.createElement("defs", null,
      React.createElement("linearGradient", {id:"rg7",x1:"0",y1:"0",x2:"36",y2:"36",gradientUnits:"userSpaceOnUse"},
        React.createElement("stop", {offset:"0%",stopColor:"#22c55e"}),
        React.createElement("stop", {offset:"100%",stopColor:"#15803d"})
      )
    ),
    React.createElement("rect", {width:"36",height:"36",rx:"9",fill:"url(#rg7)"}),
    React.createElement("text", {x:"7",y:"26",fontSize:"19",fill:"white",fontWeight:"900",fontFamily:"Georgia,serif"}, "\u20ac"),
    React.createElement("path", {d:"M25 9L30 9L30 14",stroke:"white",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"}),
    React.createElement("path", {d:"M30 9L23 16",stroke:"white",strokeWidth:"2.5",strokeLinecap:"round"})
  );
}

// ── mkEmp ──
function mkEmp(id) {
  return {
    id:id, open:true, nom:"", lieu:"", dureeMois:12,
    tcMontant:0, tcUnit:"mois", tcTaux:50, tcTauxType:"pct",
    trajetsV:[{id:1,desc:"",kmAller:0,joursV:0,cv:"5CV",fuel:"essence"}],
    douxKm:0, douxJours:0, douxDesc:"",
    peageOn:false, peageMontant:0, peageDesc:"",
    repasOn:false, repasType:"normal", repasCout:0, repasJours:0, repasAvant:0,
    teleOn:false, teleMeth:"forfait", teleJours:0, teleSurf:0, teleSurfTot:0, teleLoy:0, teleCharg:0,
    formOn:false, formCout:0, docCout:0,
  };
}

// ── Compute employer totals ──
function empCalc(e, joursPresent, joursTele) {
  var ratio = e.dureeMois / 12;
  var an = toAn(e.tcMontant, e.tcUnit) * ratio;
  var remb = e.tcTauxType === "pct" ? an * (e.tcTaux / 100) : toAn(e.tcTaux, e.tcUnit) * ratio;
  var tcDed = Math.max(0, an - remb);
  var vMnt = 0;
  var vKm = 0;
  (e.trajetsV || []).forEach(function(tr) {
    var bst = (tr.fuel === "elec" || tr.fuel === "elec_r") ? 1.20 : 1;
    vMnt += Math.max(0, barem(tr.kmAller * 2 * tr.joursV, BAREME_V[tr.cv]) * bst);
    vKm += tr.kmAller * 2 * tr.joursV;
  });
  var douxMnt = e.douxKm * 2 * e.douxJours * 0.25;
  var douxKm = e.douxKm * 2 * e.douxJours;
  var peageMnt = e.peageOn ? (e.peageMontant || 0) : 0;
  var repasMnt = e.repasOn ? Math.max(0, e.repasCout - REPAS_DOM - e.repasAvant) * e.repasJours : 0;
  var teleMnt = 0;
  if (e.teleOn) {
    var r2 = e.dureeMois / 12;
    if (e.teleMeth === "forfait") {
      teleMnt = Math.min(e.teleJours * 2.5, 580 * r2);
    } else {
      var rr = e.teleSurfTot > 0 ? e.teleSurf / e.teleSurfTot : 0;
      teleMnt = (e.teleLoy + e.teleCharg) * 12 * rr * r2;
    }
  }
  var formMnt = e.formOn ? e.formCout + e.docCout : 0;
  var joursMax = Math.round(joursPresent * ratio);
  var jTele = Math.round(joursTele * ratio);
  return {tcDed:tcDed,vMnt:vMnt,vKm:vKm,douxMnt:douxMnt,douxKm:douxKm,peageMnt:peageMnt,repasMnt:repasMnt,teleMnt:teleMnt,formMnt:formMnt,joursMax:joursMax,jTele:jTele};
}

// ── UI primitives ──
function Inp(props) {
  var label=props.label,value=props.value,onChange=props.onChange,suffix=props.suffix,hint=props.hint,note=props.note;
  var disp = useState(String(value));
  var d = disp[0], setD = disp[1];
  useEffect(function() { setD(String(value)); }, [value]);
  var inputStyle = {flex:1,padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,color:"#dde4f0",fontSize:15,outline:"none",minWidth:0,boxSizing:"border-box",borderRadius:suffix?"8px 0 0 8px":"8px"};
  return (
    <div style={{marginTop:12}}>
      {label && <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      {hint && <div style={{fontSize:11,color:DIM,marginBottom:5,lineHeight:1.4}}>{hint}</div>}
      <div style={{display:"flex"}}>
        <input type="number" min="0" value={d}
          onFocus={function(){if(parseFloat(d)===0)setD("");}}
          onBlur={function(){if(d===""||isNaN(parseFloat(d))){setD("0");onChange(0);}}}
          onChange={function(e){setD(e.target.value);var p=parseFloat(e.target.value);if(!isNaN(p))onChange(p);}}
          style={inputStyle}/>
        {suffix && <span style={{padding:"11px 10px",background:"#060910",border:"1px solid "+BD,borderLeft:"none",borderRadius:"0 8px 8px 0",fontSize:12,color:DIM,whiteSpace:"nowrap",display:"flex",alignItems:"center"}}>{suffix}</span>}
      </div>
      {note && <div style={{fontSize:11,color:G,marginTop:5,fontFamily:"monospace"}}>{note}</div>}
    </div>
  );
}

function TxtInp(props) {
  var label=props.label,value=props.value,onChange=props.onChange,placeholder=props.placeholder,hint=props.hint,listId=props.listId;
  return (
    <div style={{marginTop:12}}>
      {label && <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      {hint && <div style={{fontSize:11,color:DIM,marginBottom:5}}>{hint}</div>}
      <input type="text" value={value} placeholder={placeholder||""} list={listId}
        onChange={function(e){onChange(e.target.value);}}
        style={{width:"100%",padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,borderRadius:8,color:"#dde4f0",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
      {listId && <datalist id={listId}>{VILLES.map(function(v,i){return <option key={i} value={v}/>;})}</datalist>}
    </div>
  );
}

function Sel(props) {
  var label=props.label,value=props.value,onChange=props.onChange,opts=props.opts,hint=props.hint;
  return (
    <div style={{marginTop:12}}>
      {label && <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>}
      {hint && <div style={{fontSize:11,color:DIM,marginBottom:5}}>{hint}</div>}
      <select value={value} onChange={function(e){onChange(e.target.value);}}
        style={{width:"100%",padding:"11px 12px",background:"#090d14",border:"1px solid "+BD,borderRadius:8,color:"#dde4f0",fontSize:14,outline:"none"}}>
        {opts.map(function(o){return <option key={o.v} value={o.v}>{o.l}</option>;})}
      </select>
    </div>
  );
}

function Tog(props) {
  var label=props.label,sub=props.sub,value=props.value,onChange=props.onChange;
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid "+BD+"33"}}>
      <div style={{flex:1,paddingRight:14}}>
        <div style={{fontSize:14,color:"#9ab0c0"}}>{label}</div>
        {sub && <div style={{fontSize:11,color:DIM,marginTop:2}}>{sub}</div>}
      </div>
      <button onClick={function(){onChange(!value);}} style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",flexShrink:0,background:value?G:BD,position:"relative",transition:"background .2s"}}>
        <span style={{position:"absolute",top:3,left:value?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .15s"}}/>
      </button>
    </div>
  );
}

function InfoBox(props) {
  var color = props.color || MU;
  return <div style={{marginTop:10,padding:"10px 12px",background:color+"10",border:"1px solid "+color+"25",borderRadius:8,fontSize:12,color:"#9ab0b8",lineHeight:1.6}}>{props.children}</div>;
}

function Sec(props) {
  var icon=props.icon,title=props.title,badge=props.badge,badgeColor=props.badgeColor,open=props.open,onToggle=props.onToggle,color=props.color||G;
  var bc = badgeColor || color;
  return (
    <div style={{background:CARD,border:"1px solid "+(open?color+"55":BD),borderRadius:12,marginBottom:10,transition:"border-color .2s"}}>
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>{icon} {title}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {badge != null && badge !== "" && badge > 0 && <span style={{fontSize:12,fontWeight:800,color:bc,background:bc+"18",padding:"2px 10px",borderRadius:20,fontFamily:"monospace"}}>{badge.toFixed ? badge.toFixed(0) + " €" : badge}</span>}
          <span style={{color:MU,fontSize:26,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform .2s",lineHeight:1}}>&#9660;</span>
        </div>
      </div>
      {open && <div style={{padding:"4px 16px 18px",borderTop:"1px solid "+BD}}>{props.children}</div>}
    </div>
  );
}

// ── AlerteDelai ──
function AlerteDelai() {
  var zoneState = useState(0); var zone = zoneState[0]; var setZone = zoneState[1];
  var calState = useState(false); var calOk = calState[0]; var setCalOk = calState[1];
  var now = new Date();
  var deadline = ZONES[zone].date;
  var diff = Math.ceil((deadline - now) / 864e5);
  var expired = diff < 0;
  var urgent = !expired && diff <= 5;
  var warn = !expired && diff > 5 && diff <= 15;
  var color = (expired || urgent) ? "#f87171" : warn ? A : G;
  var bg = (expired || urgent) ? "#f8717115" : warn ? A+"15" : G+"12";
  var border = (expired || urgent) ? "#f8717140" : warn ? A+"40" : G+"30";
  var icsData = "data:text/calendar;charset=utf8," + encodeURIComponent(genICS("Limite declaration impots - " + ZONES[zone].label, ZONES[zone].date));
  return (
    <div style={{background:bg,border:"1px solid "+border,borderRadius:12,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{(expired||urgent) ? "🔴" : warn ? "🟡" : "🟢"}</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:color}}>Declaration en ligne 2026</div>
            <div style={{fontSize:11,color:MU,marginTop:1}}>Revenus 2025 · impots.gouv.fr</div>
          </div>
        </div>
        {!expired && <div style={{textAlign:"center",background:color+"20",borderRadius:10,padding:"6px 12px",minWidth:52}}>
          <div style={{fontSize:24,fontWeight:800,color:color,fontFamily:"monospace",lineHeight:1}}>{diff}</div>
          <div style={{fontSize:9,color:color,textTransform:"uppercase",letterSpacing:"0.06em"}}>jour{diff > 1 ? "s" : ""}</div>
        </div>}
      </div>
      <div style={{fontSize:12,color:color,marginBottom:12,fontWeight:600}}>
        {expired ? "Delai depasse." : diff === 0 ? "C'est aujourd'hui !" : "Il reste " + diff + " jour" + (diff > 1 ? "s" : "") + " pour declarer."}
      </div>
      <div style={{fontSize:11,color:MU,marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Votre zone :</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {ZONES.map(function(z, i) {
          var sel = zone === i;
          var dz = Math.ceil((z.date - now) / 864e5);
          return (
            <button key={i} onClick={function(){setZone(i);}} style={{padding:"10px 14px",borderRadius:8,border:"1px solid "+(sel?color:BD),background:sel?color+"18":"transparent",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:sel?color:"#9ab0c0"}}>{z.label}</div>
                <div style={{fontSize:11,color:MU}}>{z.detail}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:sel?color:MU,fontFamily:"monospace"}}>
                {dz < 0 ? "Expire" : z.date.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}
              </div>
            </button>
          );
        })}
      </div>
      {!expired && (
        <div style={{borderTop:"1px solid "+border,paddingTop:12}}>
          <div style={{fontSize:11,color:MU,marginBottom:10,lineHeight:1.5}}>Rappels inclus : J-10, J-5 et J-1. Ouvre le fichier .ics dans Calendrier iPhone ou Google Calendar.</div>
          <a href={icsData} download="reelo-rappel-impots.ics"
            onClick={function(){setCalOk(true);setTimeout(function(){setCalOk(false);},6000);}}
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",borderRadius:10,cursor:"pointer",background:calOk?G+"22":color,color:calOk?G:"#000",fontSize:14,fontWeight:800,textDecoration:"none",boxSizing:"border-box",border:calOk?"2px solid "+G:"2px solid transparent"}}>
            <span>&#128198;</span>
            <span>{calOk ? "Fichier pret — ouvre Fichiers > Telechargements" : "Ajouter au calendrier"}</span>
          </a>
          {calOk && <div style={{marginTop:10,padding:"12px",borderRadius:8,background:G+"15",border:"1px solid "+G+"40",fontSize:12,color:G,lineHeight:1.7}}>
            <b>Sur iPhone :</b> App Fichiers → Telechargements → fichier .ics → Ouvrir dans Calendrier
          </div>}
        </div>
      )}
    </div>
  );
}

// ── EmpBloc ──
function EmpBloc(props) {
  var emp=props.emp,index=props.index,onChange=props.onChange,onDelete=props.onDelete,joursPresent=props.joursPresent,joursTele=props.joursTele;
  var ec = empCalc(emp, joursPresent, joursTele);
  var total = ec.tcDed + ec.vMnt + ec.douxMnt + ec.peageMnt + ec.repasMnt + ec.teleMnt + ec.formMnt;
  var nomAff = emp.nom || (index === 0 ? "Employeur principal" : "Employeur " + (index + 1));

  var siState = useState(null); var si = siState[0]; var setSi = siState[1];
  function oi(id) { setSi(function(p){return p===id?null:id;}); }

  function updTrajet(tid, k, v) {
    var next = (emp.trajetsV || []).map(function(t) {
      if (t.id !== tid) return t;
      var u = Object.assign({}, t);
      u[k] = v;
      return u;
    });
    onChange("trajetsV", next);
  }

  return (
    <div style={{border:"1px solid "+(emp.open?P+"55":BD),borderRadius:12,marginBottom:10,background:"#0e1524",overflow:"hidden"}}>
      <div onClick={function(){onChange("open",!emp.open);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>&#127970;</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>{nomAff}</div>
            <div style={{fontSize:11,color:MU}}>{emp.lieu || "Ville non renseignee"} · {emp.dureeMois === 12 ? "Annee entiere" : emp.dureeMois + " mois"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {total > 0 && <span style={{fontSize:12,fontWeight:800,color:P,background:P+"18",padding:"2px 10px",borderRadius:20,fontFamily:"monospace"}}>{total.toFixed(0)} €</span>}
          {index > 0 && <button onClick={function(e){e.stopPropagation();onDelete();}} style={{background:"#f8717120",border:"1px solid #f8717140",color:"#f87171",cursor:"pointer",fontSize:13,padding:"5px 10px",borderRadius:7,marginRight:4}}>Suppr.</button>}
          <span style={{color:MU,fontSize:26,display:"inline-block",transform:emp.open?"rotate(180deg)":"none",transition:"transform .2s",lineHeight:1}}>&#9660;</span>
        </div>
      </div>

      {emp.open && (
        <div style={{padding:"4px 16px 16px",borderTop:"1px solid "+BD}}>
          <TxtInp label="Nom de l'employeur" value={emp.nom} onChange={function(v){onChange("nom",v);}} placeholder="Ex : Hospices Civils de Lyon"/>
          <TxtInp label="Ville du lieu de travail" value={emp.lieu} onChange={function(v){onChange("lieu",v);}} placeholder="Recherchez une ville..." listId={"vl"+index}/>

          <div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Duree chez cet employeur</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(function(m) {
                var sel = emp.dureeMois === m;
                return <button key={m} onClick={function(){onChange("dureeMois",m);}} style={{padding:"7px 11px",borderRadius:8,border:"1px solid "+(sel?G:BD),background:sel?G+"22":"transparent",color:sel?G:MU,fontWeight:sel?700:400,fontSize:12,cursor:"pointer"}}>{m === 12 ? "Annee entiere" : m + " mois"}</button>;
              })}
            </div>
            <div style={{fontSize:11,color:G,marginTop:6,fontFamily:"monospace"}}>
              {emp.dureeMois} mois · max {ec.joursMax} jours ouvrés · ~{ec.jTele} j teletravail
            </div>
          </div>

          <Sec icon="&#128663;" title="Transports en commun" badge={ec.tcDed} open={si==="tc"} onToggle={function(){oi("tc");}} color={B}>
            <InfoBox color={B}>Saisissez le cout total puis le remboursement employeur (min legal 50%). Seule votre part est deductible.</InfoBox>
            <Inp label="Cout abonnement" value={emp.tcMontant} onChange={function(v){onChange("tcMontant",v);}} suffix="EUR"/>
            <Sel label="Periode" value={emp.tcUnit} onChange={function(v){onChange("tcUnit",v);}} opts={[{v:"semaine",l:"/sem."},{v:"mois",l:"/mois"},{v:"annee",l:"/an"}]}/>
            <Sel label="Remboursement employeur" value={emp.tcTauxType} onChange={function(v){onChange("tcTauxType",v);}} opts={[{v:"pct",l:"En %"},{v:"montant",l:"Montant fixe"}]}/>
            <Inp label={emp.tcTauxType==="pct"?"Taux %":"Montant"} value={emp.tcTaux} onChange={function(v){onChange("tcTaux",v);}} suffix={emp.tcTauxType==="pct"?"%":"EUR/"+emp.tcUnit}/>
            {emp.tcMontant > 0 && <div style={{marginTop:8,fontSize:11,color:B,fontFamily:"monospace"}}>
              {toAn(emp.tcMontant,emp.tcUnit).toFixed(0)} EUR/an x {emp.dureeMois}/12 mois = {empCalc(emp,joursPresent,joursTele).tcDed.toFixed(2)} EUR deductibles
            </div>}
          </Sec>

          <Sec icon="&#128663;" title="Frais kilométriques" badge={ec.vMnt} open={si==="v"} onToggle={function(){oi("v");}} color={P}>
            <InfoBox color={P}>Ajoutez autant de trajets que nécessaire. Ex : voiture jusqu'a la gare, puis train separement.</InfoBox>
            {(emp.trajetsV || []).map(function(tr, ti) {
              var bst = (tr.fuel==="elec"||tr.fuel==="elec_r") ? 1.20 : 1;
              var mnt = Math.max(0, barem(tr.kmAller*2*tr.joursV, BAREME_V[tr.cv]) * bst);
              return (
                <div key={tr.id} style={{background:"#0a0f1a",border:"1px solid "+P+"33",borderRadius:10,padding:"12px 14px",marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:P}}>Trajet {ti+1}</span>
                    {ti > 0 && <button onClick={function(){
                      var next = (emp.trajetsV||[]).filter(function(t){return t.id!==tr.id;});
                      onChange("trajetsV",next);
                    }} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:15}}>✕</button>}
                  </div>
                  <TxtInp label="Description" value={tr.desc} onChange={function(v){updTrajet(tr.id,"desc",v);}} placeholder="Ex : Domicile → Gare · voiture"/>
                  <Sel label="Puissance fiscale (carte grise P.6)" value={tr.cv} onChange={function(v){updTrajet(tr.id,"cv",v);}} opts={Object.keys(BAREME_V).map(function(k){return{v:k,l:k};})}/>
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Carburant</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {FUELS.map(function(f) {
                        var on = tr.fuel===f.v;
                        return <span key={f.v} onClick={function(){updTrajet(tr.id,"fuel",f.v);}} style={{padding:"5px 10px",borderRadius:20,fontSize:11,cursor:"pointer",border:"1px solid "+(on?P:BD),background:on?P+"22":"transparent",color:on?P:MU,fontWeight:on?700:400}}>{f.l}</span>;
                      })}
                    </div>
                  </div>
                  <Inp label="Distance aller" value={tr.kmAller} onChange={function(v){updTrajet(tr.id,"kmAller",v);}} suffix="km" hint="Trajet simple — A/R calcule auto"/>
                  <Inp label="Jours sur la periode" value={tr.joursV} onChange={function(v){updTrajet(tr.id,"joursV",v);}} suffix="jours" hint={"Max : "+ec.joursMax+" j"}/>
                  {tr.kmAller > 0 && tr.joursV > 0 && <div style={{marginTop:6,fontSize:11,color:P,fontFamily:"monospace"}}>
                    {(tr.kmAller*2*tr.joursV).toFixed(0)} km x bareme {tr.cv}{bst>1?" x 1,20":""} = {mnt.toFixed(2)} EUR
                  </div>}
                </div>
              );
            })}
            <button onClick={function(){
              var next = (emp.trajetsV||[]).concat([{id:Date.now(),desc:"",kmAller:0,joursV:0,cv:"5CV",fuel:"essence"}]);
              onChange("trajetsV",next);
            }} style={{width:"100%",marginTop:10,padding:"10px",background:P+"10",border:"1px dashed "+P+"44",borderRadius:8,color:P,cursor:"pointer",fontSize:12,fontWeight:700}}>
              + Ajouter un trajet voiture
            </button>
          </Sec>

          <Sec icon="&#128690;" title="Velo / Trottinette" badge={ec.douxMnt} open={si==="doux"} onToggle={function(){oi("doux");}} color={T}>
            <InfoBox color={T}>Taux legal : 0,25 EUR/km A/R (LOM 2019) — velo classique, VAE, trottinette.</InfoBox>
            <TxtInp label="Description du trajet" value={emp.douxDesc||""} onChange={function(v){onChange("douxDesc",v);}} placeholder="Ex : Domicile → Gare de Lyon"/>
            <Inp label="Distance aller" value={emp.douxKm} onChange={function(v){onChange("douxKm",v);}} suffix="km"/>
            <Inp label="Jours/an" value={emp.douxJours} onChange={function(v){onChange("douxJours",v);}} suffix="jours"/>
            {emp.douxKm > 0 && emp.douxJours > 0 && <div style={{marginTop:6,fontSize:11,color:T,fontFamily:"monospace"}}>
              {(emp.douxKm*2*emp.douxJours).toFixed(0)} km x 0,25 EUR = {ec.douxMnt.toFixed(2)} EUR
            </div>}
          </Sec>

          <Sec icon="&#128739;" title="Peages autoroutiers" badge={ec.peageMnt} open={si==="peage"} onToggle={function(){oi("peage");}} color="#94a3b8">
            <Tog label="Activer les frais de peage" value={emp.peageOn||false} onChange={function(v){onChange("peageOn",v);}}/>
            {emp.peageOn && (
              <div>
                <InfoBox color="#94a3b8">Conservez vos releves de badge tele-peage (Sanef, Vinci...) ou tickets de peage.</InfoBox>
                <TxtInp label="Description (optionnel)" value={emp.peageDesc||""} onChange={function(v){onChange("peageDesc",v);}} placeholder="Ex : A6 Lyon - Paris, badge Sanef"/>
                <Inp label="Montant total sur la periode" value={emp.peageMontant||0} onChange={function(v){onChange("peageMontant",v);}} suffix="EUR" hint={"Pour " + emp.dureeMois + " mois"}/>
              </div>
            )}
          </Sec>

          <Sec icon="&#127869;&#65039;" title="Frais de repas" badge={ec.repasMnt} open={si==="repas"} onToggle={function(){oi("repas");}} color={O}>
            <Tog label="Activer les frais de repas" value={emp.repasOn} onChange={function(v){onChange("repasOn",v);}}/>
            {emp.repasOn && (
              <div>
                <Sel label="Situation" value={emp.repasType} onChange={function(v){onChange("repasType",v);}} opts={[{v:"normal",l:"Pas d'avantage employeur"},{v:"ticket",l:"Ticket-restaurant"},{v:"cantine",l:"Cantine subventionnee"},{v:"panier",l:"Panier repas"}]}/>
                <InfoBox color={O}>
                  {emp.repasType==="normal" && "Deductible = cout reel - 5,20 EUR. Ex : repas 10 EUR → 4,80 EUR/repas."}
                  {emp.repasType==="ticket" && "Deductible = cout - 5,20 EUR - part patronale. Ex : repas 12 EUR, ticket 11 EUR part patron 60% → 0,20 EUR/repas."}
                  {emp.repasType==="cantine" && "Deductible = cout - 5,20 EUR - subvention. Si vous payez moins de 5,20 EUR, rien a deduire."}
                  {emp.repasType==="panier" && "Deductible = cout - 5,20 EUR - montant panier. Ex : panier 8 EUR, repas 14 EUR → 0,80 EUR/repas."}
                </InfoBox>
                <Inp label="Cout reel par repas" value={emp.repasCout} onChange={function(v){onChange("repasCout",v);}} suffix="EUR"/>
                <Inp label="Nombre de repas sur la periode" value={emp.repasJours} onChange={function(v){onChange("repasJours",v);}} suffix="repas" hint={"Max : " + ec.joursMax + " j"}/>
                <Inp label={emp.repasType==="ticket"?"Part patronale":emp.repasType==="panier"?"Montant panier":"Subvention/repas"} value={emp.repasAvant} onChange={function(v){onChange("repasAvant",v);}} suffix="EUR"/>
                <div style={{marginTop:6,fontSize:11,color:O,fontFamily:"monospace"}}>
                  {Math.max(0,emp.repasCout-REPAS_DOM-emp.repasAvant).toFixed(2)} EUR/repas x {emp.repasJours} = {ec.repasMnt.toFixed(2)} EUR
                </div>
              </div>
            )}
          </Sec>

          <Sec icon="&#127968;" title="Teletravail / Bureau" badge={ec.teleMnt} open={si==="tele"} onToggle={function(){oi("tele");}} color={VI}>
            <Tog label="Activer teletravail" value={emp.teleOn} onChange={function(v){onChange("teleOn",v);}}/>
            {emp.teleOn && (
              <div>
                <InfoBox color={VI}>Jours estimes pour cet employeur : {ec.jTele} j. Modifiez si besoin.</InfoBox>
                <Sel label="Methode" value={emp.teleMeth} onChange={function(v){onChange("teleMeth",v);}} opts={[{v:"forfait",l:"Forfait 2,50 EUR/j (max 580 EUR/an)"},{v:"reel",l:"Frais reels (loyer + charges)"}]}/>
                {emp.teleMeth==="forfait"
                  ? <Inp label="Jours de teletravail sur la periode" value={emp.teleJours} onChange={function(v){onChange("teleJours",v);}} suffix="jours" hint={"Suggestion : " + ec.jTele + " j"}/>
                  : (
                    <div>
                      <Inp label="Surface bureau dedie" value={emp.teleSurf} onChange={function(v){onChange("teleSurf",v);}} suffix="m2"/>
                      <Inp label="Surface totale logement" value={emp.teleSurfTot} onChange={function(v){onChange("teleSurfTot",v);}} suffix="m2"/>
                      <Inp label="Loyer mensuel" value={emp.teleLoy} onChange={function(v){onChange("teleLoy",v);}} suffix="EUR/mois"/>
                      <Inp label="Charges mensuelles" value={emp.teleCharg} onChange={function(v){onChange("teleCharg",v);}} suffix="EUR/mois" hint="Elec, internet, chauffage"/>
                      {emp.teleSurfTot > 0 && <div style={{marginTop:6,fontSize:11,color:VI,fontFamily:"monospace"}}>
                        {((emp.teleSurf/emp.teleSurfTot)*100).toFixed(1)}% x {emp.dureeMois}/12 = {ec.teleMnt.toFixed(2)} EUR
                      </div>}
                    </div>
                  )
                }
              </div>
            )}
          </Sec>

          <Sec icon="&#128218;" title="Formation et documentation" badge={ec.formMnt} open={si==="form"} onToggle={function(){oi("form");}} color={A}>
            <Tog label="Activer formation/documentation" value={emp.formOn} onChange={function(v){onChange("formOn",v);}}/>
            {emp.formOn && (
              <div>
                <Inp label="Frais de formation" value={emp.formCout} onChange={function(v){onChange("formCout",v);}} suffix="EUR" hint="Non rembourses par l'employeur"/>
                <Inp label="Documentation professionnelle" value={emp.docCout} onChange={function(v){onChange("docCout",v);}} suffix="EUR" hint="Livres, revues, abonnements pro"/>
                <InfoBox color={A}>Cotisations syndicales : preferez le credit d'impot case 7AC (66% du montant).</InfoBox>
              </div>
            )}
          </Sec>
        </div>
      )}
    </div>
  );
}

// ── ExportBox ──
function ExportBox(props) {
  var calc = props.calc; var emps = props.emps;
  var modeState = useState("lire"); var mode = modeState[0]; var setMode = modeState[1];
  var copState = useState(false); var copied = copState[0]; var setCopied = copState[1];

  function buildText(forImpots) {
    var S = forImpots ? sanitize : function(s){return s;};
    var L = [];
    L.push(S(forImpots ? "REELO - FRAIS REELS 2024 - art. 83 CGI" : "REELO — Frais Réels 2024 · Art. 83 CGI"));
    L.push("");
    L.push(S("Salaire net imposable    : " + calc.salaire.toFixed(0) + " EUR"));
    L.push(S("Jours travailles         : " + calc.joursTotal + " (dont " + calc.joursTele + " teletravail)"));
    L.push(S("Deduction forfaitaire 10%: " + calc.forfait.toFixed(0) + " EUR"));
    L.push("");
    L.push(S(forImpots ? "=== FRAIS DE TRANSPORT ===" : "─── FRAIS DE TRANSPORT ────────────────────"));
    L.push("");
    emps.forEach(function(e, i) {
      var ec2 = empCalc(e, calc.joursPresent, calc.joursTele);
      var nom = e.nom || "Employeur " + (i+1);
      if (ec2.tcDed > 0 || ec2.vMnt > 0 || ec2.douxMnt > 0 || ec2.peageMnt > 0) {
        L.push(S("• " + nom + (e.lieu?" ("+e.lieu+")":"") + " - " + e.dureeMois + " mois"));
        if (ec2.tcDed > 0) L.push(S("  TC : " + ec2.tcDed.toFixed(2) + " EUR"));
        (e.trajetsV||[]).forEach(function(tr){
          var bst=(tr.fuel==="elec"||tr.fuel==="elec_r")?1.20:1;
          var vm=Math.max(0,barem(tr.kmAller*2*tr.joursV,BAREME_V[tr.cv])*bst);
          if(vm>0){var desc=tr.desc?" ("+tr.desc+")":"";L.push(S("  KM"+desc+" : "+(tr.kmAller*2*tr.joursV).toFixed(0)+"km - bareme "+tr.cv+(bst>1?" x1,20":"")+" = "+vm.toFixed(2)+" EUR"));}
        });
        if (ec2.douxMnt > 0) { var dd=e.douxDesc?" ("+e.douxDesc+")":""; L.push(S("  Velo/Trottinette"+dd+" : "+ec2.douxMnt.toFixed(2)+" EUR")); }
        if (ec2.peageMnt > 0) { var pd=e.peageDesc?" ("+e.peageDesc+")":""; L.push(S("  Peages"+pd+" : "+ec2.peageMnt.toFixed(2)+" EUR")); }
        L.push("");
      }
    });
    L.push(S("TOTAL KM PARCOURUS        : " + calc.totalKm.toFixed(0) + " km"));
    L.push(S("TOTAL AUTRES TRANSPORT    : " + (calc.totalTC + calc.totalDoux + calc.totalPeage).toFixed(2) + " EUR (TC + peages)"));
    L.push(S("TOTAL TRANSPORT NET       : " + calc.transport.toFixed(2) + " EUR"));
    L.push("");
    if (calc.autresNonTransport > 0) {
      L.push(S(forImpots ? "=== AUTRES FRAIS PROFESSIONNELS ===" : "─── AUTRES FRAIS PROFESSIONNELS ───────────"));
      L.push("");
      if (calc.repas > 0) L.push(S("• Frais de repas           : " + calc.repas.toFixed(2) + " EUR"));
      if (calc.tele > 0)  L.push(S("• Teletravail / Bureau     : " + calc.tele.toFixed(2) + " EUR"));
      if (calc.form > 0)  L.push(S("• Formation & documentation: " + calc.form.toFixed(2) + " EUR"));
      if (calc.autres > 0) L.push(S("• Autres frais pro         : " + calc.autres.toFixed(2) + " EUR"));
      L.push(S("TOTAL AUTRES FRAIS PROF.  : " + calc.autresNonTransport.toFixed(2) + " EUR"));
      L.push("");
    }
    L.push(S("=================================="));
    L.push(S("TOTAL FRAIS REELS         : " + calc.total.toFixed(2) + " EUR"));
    L.push(S("Deduction forfaitaire 10% : " + calc.forfait.toFixed(2) + " EUR"));
    L.push(S((calc.gain >= 0 ? "GAIN" : "DEFICIT") + " vs forfait      : " + (calc.gain>=0?"+":"") + calc.gain.toFixed(2) + " EUR"));
    L.push("");
    L.push(S(calc.gain > 0 ? "RECOMMANDATION : Optez pour les frais reels." : "RECOMMANDATION : Gardez le forfait 10%."));
    return L.join("\n");
  }

  var txtLisible = buildText(false);
  var txtImpots = buildText(true);
  if (txtImpots.length > 1500) txtImpots = txtImpots.substring(0, 1497) + "...";

  var TABS = [{k:"lire",l:"Lecture"},{k:"impots",l:"Impots.gouv"},{k:"word",l:"Word"}];
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {TABS.map(function(tab) {
          var sel = mode===tab.k;
          return <button key={tab.k} onClick={function(){setMode(tab.k);}} style={{flex:1,padding:"10px 4px",borderRadius:9,border:"1px solid "+(sel?G:BD),background:sel?G+"18":"transparent",color:sel?G:"#8a9ab0",fontSize:12,fontWeight:sel?700:400,cursor:"pointer"}}>{tab.l}</button>;
        })}
      </div>

      {mode==="lire" && (
        <div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
          <div style={{fontSize:11,color:MU,marginBottom:10}}>Resume complet — verifiez vos donnees avant de declarer</div>
          <pre style={{fontSize:11.5,color:"#4a9060",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:420,overflowY:"auto"}}>{txtLisible}</pre>
        </div>
      )}

      {mode==="impots" && (
        <div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#8a9ab0"}}>Texte pour impots.gouv.fr</div>
              <div style={{fontSize:10,color:DIM,marginTop:2}}>{txtImpots.length}/1500 caracteres · sans accents</div>
            </div>
            <button onClick={function(){navigator.clipboard.writeText(txtImpots).then(function(){setCopied(true);setTimeout(function(){setCopied(false);},3000);});}}
              style={{padding:"8px 16px",borderRadius:7,border:"none",cursor:"pointer",background:copied?G+"22":G,color:copied?G:"#000",fontSize:13,fontWeight:700,flexShrink:0,marginLeft:8}}>
              {copied?"Copie !":"Copier"}
            </button>
          </div>
          <div style={{height:4,background:BD,borderRadius:4,marginBottom:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.min(100,(txtImpots.length/1500)*100)+"%",background:txtImpots.length>1400?"#f87171":G,borderRadius:4}}/>
          </div>
          <pre style={{fontSize:11,color:"#4a8060",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:240,overflowY:"auto",background:"#060910",padding:"10px",borderRadius:8}}>{txtImpots}</pre>
          <div style={{marginTop:12,padding:"10px 12px",background:G+"10",border:"1px solid "+G+"25",borderRadius:8,fontSize:11,color:MU,lineHeight:2}}>
            <b style={{color:G,fontSize:12}}>Comment saisir sur impots.gouv.fr :</b><br/>
            1. Etape 3 → Traitements et salaires → cocher Frais reels<br/>
            <div style={{margin:"6px 0",padding:"8px 10px",background:"#090d14",borderRadius:7,border:"1px solid "+B+"30"}}>
              <div style={{fontSize:10,color:B,fontWeight:700}}>Case 1 — Frais de transport kilométrique</div>
              <div style={{fontSize:13,color:"#c4ddc9",fontFamily:"monospace"}}>{calc.totalKm.toFixed(0)} km parcourus</div>
            </div>
            {(calc.totalTC+calc.totalDoux+calc.totalPeage) > 0 && <div style={{margin:"6px 0",padding:"8px 10px",background:"#090d14",borderRadius:7,border:"1px solid "+P+"30"}}>
              <div style={{fontSize:10,color:P,fontWeight:700}}>Case 2 — Autres frais de transport (TC, peages)</div>
              <div style={{fontSize:13,color:"#c4ddc9",fontFamily:"monospace"}}>{(calc.totalTC+calc.totalDoux+calc.totalPeage).toFixed(2)} EUR</div>
            </div>}
            {calc.autresNonTransport > 0 && <div style={{margin:"6px 0",padding:"8px 10px",background:"#090d14",borderRadius:7,border:"1px solid "+A+"30"}}>
              <div style={{fontSize:10,color:A,fontWeight:700}}>Case 3 — Autres frais professionnels</div>
              <div style={{fontSize:13,color:"#c4ddc9",fontFamily:"monospace"}}>{calc.autresNonTransport.toFixed(2)} EUR</div>
            </div>}
            Coller le texte ci-dessus dans "Informations complementaires"
          </div>
        </div>
      )}

      {mode==="word" && (
        <div style={{background:"#090d14",border:"1px solid "+BD,borderRadius:10,padding:"14px"}}>
          <div style={{fontSize:12,color:MU,lineHeight:1.7,marginBottom:14}}>Le document Word inclut : tableau par employeur et par poste, instructions de saisie impots.gouv.fr, mise en page imprimable.</div>
          <button onClick={function(){
            var html = "<html><head><meta charset='utf-8'><style>body{font-family:Arial,font-size:11pt;margin:2cm}h1{color:#15803d}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6pt}th{background:#f0fdf4}</style></head><body><h1>Reelo - Frais Reels 2024</h1><p>Declaration 2025 - Art. 83 CGI</p><pre>" + txtLisible + "</pre></body></html>";
            try {
              var blob = new Blob([html],{type:"application/msword"});
              var url = URL.createObjectURL(blob);
              var a = document.createElement("a");
              a.href=url; a.download="Reelo-FraisReels-2024.doc"; a.style.display="none";
              document.body.appendChild(a); a.click();
              setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},300);
            } catch(e) {
              var win = window.open("","_blank");
              if(win){win.document.write(html);win.document.close();}
              else{alert("Autorisez les popups ou essayez depuis un ordinateur.");}
            }
          }} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",background:B,color:"#000",fontSize:14,fontWeight:800}}>
            Telecharger document Word
          </button>
        </div>
      )}
    </div>
  );
}


// ── MentionsLegales ──
function MentionsLegales(props) {
  var onBack = props.onBack;
  var G="#22c55e",BD="#1a2535",BG="#0b0f18",MU="#4a6070",DIM="#2a3a50";
  var s = {h2:{fontSize:16,fontWeight:700,color:"white",margin:"28px 0 10px",paddingTop:8,borderTop:"1px solid "+BD},p:{fontSize:13,color:"#a7c4ae",marginBottom:12,lineHeight:1.75},a:{color:G,textDecoration:"none"},block:{background:"#131c2a",border:"1px solid "+BD,borderRadius:10,padding:"16px 18px",margin:"12px 0",fontSize:13,color:"#a7c4ae",lineHeight:1.8},warn:{background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.2)",borderRadius:10,padding:"14px 16px",margin:"16px 0",fontSize:12,color:"#fde68a",lineHeight:1.6}};
  return (
    <div style={{minHeight:"100vh",background:BG,color:"#dde4f0",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"rgba(11,15,24,.95)",borderBottom:"1px solid "+BD,padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:99}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:"white"}}>€</div>
          <span style={{fontWeight:800,fontSize:16,color:"white"}}>Ree<span style={{color:G}}>lo</span></span>
        </div>
        <button onClick={onBack} style={{fontSize:12,color:MU,background:"none",border:"1px solid "+BD,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>← Retour</button>
      </div>
      <div style={{maxWidth:680,margin:"0 auto",padding:"40px 20px 80px"}}>
        <div style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Informations légales</div>
        <h1 style={{fontFamily:"serif",fontSize:"clamp(26px,5vw,38px)",color:"white",marginBottom:6,lineHeight:1.1}}>Mentions légales</h1>
        <div style={{fontSize:11,color:MU,marginBottom:36,paddingBottom:20,borderBottom:"1px solid "+BD}}>Dernière mise à jour : mai 2025</div>

        <h2 style={s.h2}>1. Éditeur du site</h2>
        <div style={s.block}>
          <b style={{color:"white",display:"block",marginBottom:4}}>Dénomination</b> Reelo<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Statut juridique</b> Micro-entrepreneur (immatriculation en cours)<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Adresse</b> Saint-Étienne-sur-Chalaronne, Ain (01140), France<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Contact</b> <a href="mailto:contact@reelo.fr" style={s.a}>contact@reelo.fr</a>
        </div>

        <h2 style={s.h2}>2. Hébergement</h2>
        <div style={s.block}>
          <b style={{color:"white",display:"block",marginBottom:4}}>Hébergeur</b> Vercel Inc.<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Adresse</b> 340 Pine Street, Suite 701 — San Francisco, CA 94104 — États-Unis<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Site</b> <a href="https://vercel.com" target="_blank" style={s.a}>vercel.com</a>
        </div>

        <h2 style={s.h2}>3. Nature du service</h2>
        <p style={s.p}>Reelo est un outil de simulation et d'aide au calcul des frais réels professionnels déductibles dans le cadre de la déclaration annuelle de revenus en France (article 83 du Code général des impôts).</p>
        <div style={s.warn}>⚠️ Reelo est un outil indicatif. Les calculs sont basés sur les barèmes officiels DGFIP 2024 mais ne constituent pas un conseil fiscal, comptable ou juridique. En cas de doute, consultez un professionnel habilité.</div>

        <h2 style={s.h2}>4. Propriété intellectuelle</h2>
        <p style={s.p}>L'ensemble des éléments constituant le site Reelo (nom, logo, design, code source, textes) est la propriété exclusive de son éditeur et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.</p>

        <h2 style={s.h2}>5. Données personnelles</h2>
        <p style={s.p}>Reelo a été conçu selon le principe de <b style={{color:"#c4ddc9"}}>privacy by design</b> : les données saisies dans le calculateur restent sur votre appareil et ne sont jamais transmises à un serveur distant.</p>

        <h2 style={s.h2}>6. Cookies</h2>
        <p style={s.p}>Reelo n'utilise aucun cookie de traçage ou publicitaire. La sauvegarde des données s'effectue via le stockage local de votre appareil, accessible uniquement depuis votre appareil.</p>

        <h2 style={s.h2}>7. Limitation de responsabilité</h2>
        <p style={s.p}>L'éditeur ne saurait être tenu responsable d'erreurs dans les calculs, ni des conséquences fiscales d'une déclaration basée sur les résultats fournis. L'utilisateur est seul responsable de l'exactitude des informations saisies et doit conserver tous ses justificatifs.</p>

        <h2 style={s.h2}>8. Contact</h2>
        <p style={s.p}>Pour toute question : <a href="mailto:contact@reelo.fr" style={s.a}>contact@reelo.fr</a></p>
      </div>
    </div>
  );
}

// ── Confidentialite ──
function Confidentialite(props) {
  var onBack = props.onBack;
  var G="#22c55e",A="#fbbf24",BD="#1a2535",BG="#0b0f18",MU="#4a6070";
  var s = {h2:{fontSize:16,fontWeight:700,color:"white",margin:"28px 0 10px",paddingTop:8,borderTop:"1px solid "+BD},h3:{fontSize:14,fontWeight:700,color:"#c4ddc9",margin:"16px 0 6px"},p:{fontSize:13,color:"#a7c4ae",marginBottom:12,lineHeight:1.75},a:{color:G,textDecoration:"none"},block:{background:"#131c2a",border:"1px solid "+BD,borderRadius:10,padding:"16px 18px",margin:"12px 0",fontSize:13,color:"#a7c4ae",lineHeight:1.8},hi:{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.18)",borderRadius:10,padding:"14px 16px",margin:"14px 0",fontSize:13,color:"#a7ddb5",lineHeight:1.7}};
  var droits = [
    {ic:"👁️",t:"Droit d'accès",d:"Savoir quelles données nous détenons sur vous"},
    {ic:"✏️",t:"Droit de rectification",d:"Corriger des données inexactes"},
    {ic:"🗑️",t:"Droit à l'effacement",d:"Demander la suppression de vos données"},
    {ic:"🚫",t:"Droit d'opposition",d:"Vous opposer au traitement"},
    {ic:"📦",t:"Droit à la portabilité",d:"Recevoir vos données dans un format lisible"},
    {ic:"⏸️",t:"Droit à la limitation",d:"Limiter l'usage de vos données"},
  ];
  return (
    <div style={{minHeight:"100vh",background:BG,color:"#dde4f0",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"rgba(11,15,24,.95)",borderBottom:"1px solid "+BD,padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:99}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:"white"}}>€</div>
          <span style={{fontWeight:800,fontSize:16,color:"white"}}>Ree<span style={{color:G}}>lo</span></span>
        </div>
        <button onClick={onBack} style={{fontSize:12,color:MU,background:"none",border:"1px solid "+BD,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>← Retour</button>
      </div>
      <div style={{maxWidth:680,margin:"0 auto",padding:"40px 20px 80px"}}>
        <div style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>RGPD · Vie privée</div>
        <h1 style={{fontFamily:"serif",fontSize:"clamp(26px,5vw,38px)",color:"white",marginBottom:6,lineHeight:1.1}}>Politique de confidentialité</h1>
        <div style={{fontSize:11,color:MU,marginBottom:36,paddingBottom:20,borderBottom:"1px solid "+BD}}>Dernière mise à jour : mai 2025 · Conforme au RGPD (UE) 2016/679</div>

        <div style={s.hi}><b style={{color:G}}>L'essentiel en 3 lignes :</b> Reelo ne collecte aucune donnée via son calculateur. Vos données fiscales restent sur votre appareil. Seul votre email est collecté si vous vous inscrivez volontairement pour un rappel annuel.</div>

        <h2 style={s.h2}>1. Responsable du traitement</h2>
        <div style={s.block}>
          <b style={{color:"white",display:"block",marginBottom:4}}>Reelo</b> Micro-entrepreneur · Saint-Étienne-sur-Chalaronne (01140)<br/>
          <b style={{color:"white",display:"block",marginTop:10,marginBottom:4}}>Contact DPO</b> <a href="mailto:privacy@reelo.fr" style={s.a}>privacy@reelo.fr</a>
        </div>

        <h2 style={s.h2}>2. Le calculateur — aucune donnée collectée</h2>
        <p style={s.p}>Le calculateur Reelo fonctionne entièrement sur votre appareil. Les données saisies (salaire, frais, employeurs…) ne sont <b style={{color:"#c4ddc9"}}>jamais envoyées à un serveur</b>. La sauvegarde automatique s'effectue via le stockage local de votre appareil, accessible uniquement par vous.</p>

        <h2 style={s.h2}>3. Le formulaire email — rappel annuel</h2>
        <p style={s.p}>Si vous laissez votre email via le formulaire "Me rappeler pour 2026" :</p>
        <div style={{overflowX:"auto",margin:"12px 0"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <tr><th style={{background:"#131c2a",border:"1px solid "+BD,padding:"8px 10px",textAlign:"left",color:"white"}}>Donnée</th><th style={{background:"#131c2a",border:"1px solid "+BD,padding:"8px 10px",textAlign:"left",color:"white"}}>Finalité</th><th style={{background:"#131c2a",border:"1px solid "+BD,padding:"8px 10px",textAlign:"left",color:"white"}}>Base légale</th><th style={{background:"#131c2a",border:"1px solid "+BD,padding:"8px 10px",textAlign:"left",color:"white"}}>Durée</th></tr>
            <tr><td style={{border:"1px solid "+BD,padding:"8px 10px",color:"#a7c4ae"}}>Adresse email</td><td style={{border:"1px solid "+BD,padding:"8px 10px",color:"#a7c4ae"}}>Rappel annuel déclaration</td><td style={{border:"1px solid "+BD,padding:"8px 10px",color:"#a7c4ae"}}>Consentement (art. 6.1.a RGPD)</td><td style={{border:"1px solid "+BD,padding:"8px 10px",color:"#a7c4ae"}}>Jusqu'au désabonnement</td></tr>
          </table>
        </div>
        <h3 style={s.h3}>Ce que nous ne faisons PAS avec votre email :</h3>
        <p style={s.p}>Nous ne le vendons pas · Pas de publicité ciblée · Pas de démarchage intensif · Pas d'enrichissement avec d'autres données</p>

        <h2 style={s.h2}>4. Cookies</h2>
        <p style={s.p}>Reelo n'utilise aucun cookie de traçage ou publicitaire. Aucune régie publicitaire (Google Ads, Meta Pixel…) n'est installée.</p>

        <h2 style={s.h2}>5. Vos droits</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"12px 0"}}>
          {droits.map(function(d,i){return(
            <div key={i} style={{background:"#131c2a",border:"1px solid "+BD,borderRadius:9,padding:"12px"}}>
              <div style={{fontSize:18,marginBottom:6}}>{d.ic}</div>
              <div style={{fontSize:12,fontWeight:700,color:"white",marginBottom:3}}>{d.t}</div>
              <div style={{fontSize:11,color:MU}}>{d.d}</div>
            </div>
          );})}
        </div>
        <p style={s.p}>Pour exercer ces droits : <a href="mailto:privacy@reelo.fr" style={s.a}>privacy@reelo.fr</a>. Réponse sous 30 jours.</p>
        <p style={s.p}>Vous pouvez aussi contacter la <b style={{color:"#c4ddc9"}}>CNIL</b> : <a href="https://www.cnil.fr" target="_blank" style={s.a}>cnil.fr</a></p>

        <h2 style={s.h2}>6. Sécurité</h2>
        <p style={s.p}>Communications chiffrées en HTTPS · Accès restreint aux données · Prestataires conformes RGPD. En cas de violation de données, vous serez informé dans les délais RGPD.</p>

        <h2 style={s.h2}>7. Contact</h2>
        <p style={s.p}><a href="mailto:privacy@reelo.fr" style={s.a}>privacy@reelo.fr</a></p>
      </div>
    </div>
  );
}

// ── LandingPage ──
function LandingPage(props) {
  var onStart = props.onStart;
  var onMentions = props.onMentions;
  var onConfidentialite = props.onConfidentialite;
  var now = new Date();
  var minDiff = 9999; var minZone = "";
  var ZONES_L = [
    {label:"Zone 1",detail:"Dep. 01-19",date:new Date("2026-05-20")},
    {label:"Zone 2",detail:"Dep. 20-54",date:new Date("2026-05-27")},
    {label:"Zone 3",detail:"Dep. 55-976",date:new Date("2026-06-03")},
  ];
  ZONES_L.forEach(function(z){
    var d = Math.ceil((z.date - now) / 864e5);
    if(d >= 0 && d < minDiff){ minDiff = d; minZone = z.label + " : " + d + " jour" + (d > 1 ? "s" : "") + " restant" + (d > 1 ? "s" : ""); }
  });
  var G="#22c55e",A="#fbbf24";
  var BG="#0b0f18",BD="#1a2535",MU="#4a6070",DIM="#2a3a50";
  var POSTES = ["Frais kilométriques (barème officiel)","Transports en commun","Vélo & trottinette","Péages autoroutiers","Frais de repas","Télétravail & bureau","Formation & documentation","Multi-employeurs"];
  var STEPS = [
    {n:"01",t:"Renseignez votre situation",d:"Salaire, employeur(s), jours travaillés, moyens de transport. Reelo s'adapte à toutes les situations."},
    {n:"02",t:"Reelo calcule tout automatiquement",d:"Barème kilométrique officiel DGFIP, frais de repas, télétravail, TC, péages... Chaque euro déductible est comptabilisé."},
    {n:"03",t:"Exportez et déclarez en 2 minutes",d:"Reelo génère le texte pour impots.gouv.fr et un document Word détaillé. Deux cases à remplir, c'est tout."},
  ];
  var TESTIS = [
    {q:"J'avais toujours pris le forfait 10% sans me poser de questions. Avec Reelo j'ai découvert",gain:"+823 €",nom:"Margaux D.",role:"Infirmière · Lyon"},
    {q:"J'ai changé d'employeur en cours d'année. Reelo m'a permis de tout séparer correctement.",gain:"+1 240 €",nom:"Kevin T.",role:"Consultant IT · Paris"},
    {q:"En télétravail 3 jours/semaine avec 45 km de trajet, Reelo a tout calculé automatiquement.",gain:"+610 €",nom:"Amina S.",role:"RH · Bordeaux"},
    {q:"L'export pour impots.gouv est une vraie innovation. J'ai déclaré en moins de 10 minutes.",gain:"10 min",nom:"Jean-Baptiste L.",role:"Technicien · Strasbourg"},
  ];

  return (
    <div style={{minHeight:"100vh",background:BG,color:"#dde4f0",fontFamily:"system-ui,-apple-system,sans-serif",overflowX:"hidden"}}>
      {/* NAV */}
      <div style={{background:"rgba(11,15,24,.92)",borderBottom:"1px solid "+BD,padding:"0 20px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:99,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:"white",flexShrink:0}}>€</div>
          <span style={{fontWeight:800,fontSize:17,letterSpacing:"-0.03em",color:"white"}}>Ree<span style={{color:G}}>lo</span></span>
        </div>
        <button onClick={onStart} style={{background:G,color:"#000",border:"none",cursor:"pointer",padding:"8px 18px",borderRadius:20,fontWeight:700,fontSize:13,fontFamily:"system-ui,sans-serif"}}>Calculer →</button>
      </div>

      {/* URGENCE */}
      {minDiff < 9999 && (
        <div style={{background:"rgba(251,191,36,.08)",borderBottom:"1px solid rgba(251,191,36,.2)",padding:"12px 20px",textAlign:"center",fontSize:12,color:"#fbbf24",fontWeight:600}}>
          ⏰ Déclaration en ligne 2026 — {minZone} pour déclarer !
        </div>
      )}

      {/* HERO */}
      <div style={{padding:"60px 20px 50px",textAlign:"center",position:"relative",background:"radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,197,94,.1) 0%, transparent 70%)"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",borderRadius:20,padding:"5px 14px",marginBottom:24,fontSize:11,fontWeight:700,color:G,letterSpacing:"0.05em"}}>
          ✦ Barèmes DGFIP 2024 officiels
        </div>
        <div style={{fontFamily:"serif",fontSize:"clamp(36px,8vw,64px)",fontWeight:700,color:"white",lineHeight:1.05,marginBottom:20}}>
          Calculez vos frais réels.<br/>
          <span style={{color:G,fontStyle:"italic"}}>Récupérez ce qui vous appartient.</span>
        </div>
        <p style={{fontSize:"clamp(14px,2.5vw,17px)",color:MU,maxWidth:520,margin:"0 auto 36px",lineHeight:1.65}}>
          Des millions de salariés passent à côté de <b style={{color:"#a7d8b5"}}>centaines d'euros</b> chaque année. Reelo calcule vos frais réels en 5 minutes — gratuitement.
        </p>
        <button onClick={onStart} style={{display:"inline-flex",alignItems:"center",gap:10,background:G,color:"#000",padding:"16px 32px",borderRadius:50,fontWeight:800,fontSize:16,border:"none",cursor:"pointer",boxShadow:"0 0 32px rgba(34,197,94,.3)",fontFamily:"system-ui,sans-serif"}}>
          → Calculer mes frais réels
        </button>
        <div style={{fontSize:12,color:MU,marginTop:14}}>Gratuit · Sans inscription · Données sur votre appareil</div>

        {/* Stats */}
        <div style={{display:"flex",justifyContent:"center",gap:0,marginTop:48,maxWidth:600,margin:"48px auto 0",flexWrap:"wrap"}}>
          {[{n:"547 €",l:"Gain moyen par déclaration"},{n:"5 min",l:"Pour tout calculer"},{n:"Art.83",l:"CGI · Barèmes DGFIP"}].map(function(s,i){return(
            <div key={i} style={{flex:1,minWidth:140,padding:"20px 16px",textAlign:"center",background:"#131c2a",border:"1px solid "+BD,borderRadius:i===0?"12px 0 0 12px":i===2?"0 12px 12px 0":"0"}}>
              <div style={{fontFamily:"serif",fontSize:36,color:G,lineHeight:1,marginBottom:6}}>{s.n}</div>
              <div style={{fontSize:11,color:MU,lineHeight:1.4}}>{s.l}</div>
            </div>
          );})}
        </div>
      </div>

      {/* COMMENT CA MARCHE */}
      <div style={{padding:"60px 20px",maxWidth:720,margin:"0 auto"}}>
        <div style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Comment ça marche</div>
        <div style={{fontFamily:"serif",fontSize:"clamp(24px,4vw,38px)",color:"white",marginBottom:36,lineHeight:1.1}}>Simple comme <span style={{color:G,fontStyle:"italic"}}>1, 2, 3.</span></div>
        {STEPS.map(function(s,i){return(
          <div key={i} style={{display:"flex",gap:20,alignItems:"flex-start",padding:"24px 0",borderBottom:"1px solid "+BD}}>
            <div style={{width:44,height:44,borderRadius:10,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:15,color:G,flexShrink:0}}>{s.n}</div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"white",marginBottom:6}}>{s.t}</div>
              <div style={{fontSize:13,color:MU,lineHeight:1.6}}>{s.d}</div>
            </div>
          </div>
        );})}
      </div>

      {/* POSTES */}
      <div style={{padding:"0 20px 60px",maxWidth:720,margin:"0 auto"}}>
        <div style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Ce que Reelo calcule</div>
        <div style={{fontFamily:"serif",fontSize:"clamp(22px,4vw,36px)",color:"white",marginBottom:24,lineHeight:1.1}}>Tous les postes <span style={{color:G,fontStyle:"italic"}}>déductibles.</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {POSTES.map(function(p,i){return(
            <div key={i} style={{background:"#131c2a",border:"1px solid "+BD,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#a7c4ae"}}>
              <span style={{color:G,fontSize:16}}>✓</span>{p}
            </div>
          );})}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{padding:"0 20px 60px",maxWidth:720,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {ic:"⚡",t:"Calcul en temps réel",d:"Chaque chiffre que vous saisissez met à jour le total instantanément."},
            {ic:"🔒",t:"Données sur votre appareil",d:"Vos données ne quittent jamais votre téléphone. Aucun serveur, aucun compte."},
            {ic:"📄",t:"Export impôts.gouv + Word",d:"Reelo génère le texte exact à copier et un document Word avec les instructions."},
            {ic:"📱",t:"Installable sur iPhone",d:"Ajoutez Reelo à votre écran d'accueil depuis Safari. Fonctionne hors connexion."},
          ].map(function(f,i){return(
            <div key={i} style={{background:"#131c2a",border:"1px solid "+BD,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:26,marginBottom:10}}>{f.ic}</div>
              <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:6}}>{f.t}</div>
              <div style={{fontSize:12,color:MU,lineHeight:1.55}}>{f.d}</div>
            </div>
          );})}
        </div>
      </div>

      {/* TEMOIGNAGES */}
      <div style={{padding:"0 20px 60px",maxWidth:720,margin:"0 auto"}}>
        <div style={{fontFamily:"serif",fontSize:"clamp(22px,4vw,36px)",color:"white",marginBottom:24,lineHeight:1.1}}>Ce qu'ils <span style={{color:G,fontStyle:"italic"}}>récupèrent.</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {TESTIS.map(function(t,i){return(
            <div key={i} style={{background:"#131c2a",border:"1px solid "+BD,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:13,color:"#c4ddc9",lineHeight:1.7,marginBottom:14,fontStyle:"italic"}}>"{t.q} <b style={{color:G,fontStyle:"normal",fontFamily:"monospace",fontSize:16}}>{t.gain}</b>"</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>{t.nom[0]}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"white"}}>{t.nom}</div>
                  <div style={{fontSize:10,color:MU}}>{t.role}</div>
                </div>
              </div>
            </div>
          );})}
        </div>
      </div>

      {/* CTA */}
      <div style={{padding:"60px 20px 80px",textAlign:"center",background:"radial-gradient(ellipse 60% 70% at 50% 50%, rgba(34,197,94,.07) 0%, transparent 70%)"}}>
        <div style={{fontFamily:"serif",fontSize:"clamp(26px,5vw,44px)",color:"white",marginBottom:14,lineHeight:1.1}}>
          Calculez maintenant.<br/><span style={{color:G,fontStyle:"italic"}}>C'est gratuit.</span>
        </div>
        <p style={{fontSize:14,color:MU,marginBottom:30}}>Aucune inscription requise. Vos données restent sur votre appareil.</p>
        <button onClick={onStart} style={{display:"inline-flex",alignItems:"center",gap:10,background:G,color:"#000",padding:"16px 32px",borderRadius:50,fontWeight:800,fontSize:16,border:"none",cursor:"pointer",boxShadow:"0 0 32px rgba(34,197,94,.25)",fontFamily:"system-ui,sans-serif"}}>
          → Ouvrir Reelo gratuitement
        </button>
        <div style={{fontSize:12,color:MU,marginTop:12}}>Compatible iPhone · Android · PC · Mac</div>
      </div>

      {/* EMAIL */}
      <div style={{borderTop:"1px solid "+BD,padding:"40px 20px",textAlign:"center",background:"#0d1117"}}>
        <div style={{fontSize:16,fontWeight:700,color:"white",marginBottom:6}}>Ne ratez pas la déclaration 2026</div>
        <div style={{fontSize:13,color:MU,marginBottom:20}}>Laissez votre email — on vous rappelle quand la déclaration ouvre l'année prochaine.</div>
        <div style={{display:"flex",gap:8,maxWidth:400,margin:"0 auto",flexWrap:"wrap",justifyContent:"center"}}>
          <input type="email" placeholder="votre@email.fr" id="land-email"
            style={{flex:1,minWidth:200,padding:"12px 16px",background:"#131c2a",border:"1px solid "+BD,borderRadius:50,color:"#dde4f0",fontSize:13,outline:"none"}}/>
          <button onClick={function(){
            var el=document.getElementById("land-email");
            if(el&&el.value){el.value="";alert("Merci ! On vous rappelle pour la déclaration 2026.");}
          }} style={{padding:"12px 20px",background:G,color:"#000",border:"none",borderRadius:50,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"system-ui,sans-serif"}}>
            Me rappeler →
          </button>
        </div>
        <div style={{fontSize:11,color:DIM,marginTop:10}}>Pas de spam · Un seul email par an · Désabonnement en un clic</div>
      </div>

      {/* FOOTER */}
      <div style={{borderTop:"1px solid "+BD,padding:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,maxWidth:720,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",fontSize:12,fontWeight:900,color:"white"}}>€</div>
          <span style={{fontSize:13,fontWeight:700,color:"white"}}>Ree<span style={{color:G}}>lo</span></span>
        </div>
        <div style={{display:"flex",gap:16}}>
          <span style={{fontSize:11,color:MU,cursor:"pointer"}} onClick={function(){onMentions();}}>Mentions légales</span>
          <span style={{fontSize:11,color:MU,cursor:"pointer"}} onClick={function(){onConfidentialite();}}>Confidentialité</span>
          <a href="mailto:contact@reelo.fr" style={{fontSize:11,color:MU,textDecoration:"none"}}>Contact</a>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"0 20px 24px",fontSize:10,color:DIM}}>Reelo est un outil indicatif. Barèmes DGFIP 2024. Conservez vos justificatifs. © 2025 Reelo</div>

      <style>{"* { box-sizing:border-box } @media(max-width:500px){ div[style*='grid-template-columns: 1fr 1fr']{ grid-template-columns:1fr !important; } }"}</style>
    </div>
  );
}

// ── APP ──
export default function App() {
  var viewState = useState("landing"); var view = viewState[0]; var setView = viewState[1];
  var secState = useState("jours"); var sec = secState[0]; var setSec = secState[1];
  function o(id) { setSec(function(p){return p===id?null:id;}); }

  var s1 = useState(36000);  var salaire = s1[0]; var setSalaire = s1[1];
  var s2 = useState(228);    var joursOuvres = s2[0]; var setJO = s2[1];
  var s3 = useState(25);     var joursCP = s3[0]; var setJCP = s3[1];
  var s4 = useState(8);      var joursFeries = s4[0]; var setJF = s4[1];
  var s5 = useState(0);      var joursArret = s5[0]; var setJA = s5[1];
  var s6 = useState(0);      var teleParSem = s6[0]; var setTPS = s6[1];
  var s7 = useState([mkEmp(1)]); var emps = s7[0]; var setEmps = s7[1];
  var s8 = useState(0);      var autres = s8[0]; var setAutres = s8[1];
  var s9 = useState(false);  var showExp = s9[0]; var setShowExp = s9[1];
  var s10 = useState(false); var loaded = s10[0]; var setLoaded = s10[1];
  var s11 = useState(false); var saved = s11[0]; var setSaved = s11[1];

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
    }).catch(function(){setLoaded(true);});
  },[]);

  useEffect(function(){
    if(!loaded)return;
    var t = setTimeout(function(){
      try{stoSave({salaire:salaire,joursOuvres:joursOuvres,joursCP:joursCP,joursFeries:joursFeries,joursArret:joursArret,teleParSem:teleParSem,emps:emps,autres:autres});}catch(e){}
      setSaved(true); setTimeout(function(){setSaved(false);},2000);
    },1000);
    return function(){clearTimeout(t);};
  },[loaded,salaire,joursOuvres,joursCP,joursFeries,joursArret,teleParSem,emps,autres]);

  function addEmp(){setEmps(function(p){return p.concat([mkEmp(Date.now())]);});}
  function delEmp(id){setEmps(function(p){return p.filter(function(e){return e.id!==id;});});}
  function updEmp(id,k,v){
    setEmps(function(p){return p.map(function(e){
      if(e.id!==id)return e;
      var u=Object.assign({},e); u[k]=v; return u;
    });});
  }

  var calc = useMemo(function(){
    var joursTele = Math.round(teleParSem * 52);
    var joursTotal = Math.max(0, joursOuvres - joursCP - joursFeries - joursArret);
    var joursPresent = Math.max(0, joursTotal - joursTele);
    var totalTC=0,totalV=0,totalDoux=0,totalPeage=0,totalRepas=0,totalTele=0,totalForm=0;
    var totalKm=0;
    emps.forEach(function(e){
      var ec = empCalc(e, joursPresent, joursTele);
      totalTC += ec.tcDed;
      totalV += ec.vMnt;
      totalKm += ec.vKm + ec.douxKm;
      totalDoux += ec.douxMnt;
      totalPeage += ec.peageMnt;
      totalRepas += ec.repasMnt;
      totalTele += ec.teleMnt;
      totalForm += ec.formMnt;
    });
    var transport = totalTC + totalV + totalDoux + totalPeage;
    var autresNonTransport = totalRepas + totalTele + totalForm + autres;
    var total = transport + autresNonTransport;
    var forfait = Math.min(Math.max(salaire * 0.10, F10_MIN), F10_MAX);
    return {
      joursTotal:joursTotal, joursPresent:joursPresent, joursTele:joursTele,
      totalTC:totalTC, totalV:totalV, totalDoux:totalDoux, totalPeage:totalPeage,
      transport:transport, repas:totalRepas, tele:totalTele, form:totalForm, autres:autres,
      total:total, forfait:forfait, gain:total-forfait, salaire:salaire,
      totalKm:totalKm, autresNonTransport:autresNonTransport
    };
  },[salaire,joursOuvres,joursCP,joursFeries,joursArret,teleParSem,emps,autres]);

  var now = new Date();
  var minDiff = 9999; var minLabel = "";
  ZONES.forEach(function(z){
    var d = Math.ceil((z.date - now) / 864e5);
    if(d >= 0 && d < minDiff){ minDiff = d; minLabel = z.label + " : J-" + d; }
  });

  var ROW_DATA = [
    ["TC",calc.totalTC,B],["Voiture",calc.totalV,P],["Velo/Trottinette",calc.totalDoux,T],
    ["Peages",calc.totalPeage,"#94a3b8"],["Repas",calc.repas,O],
    ["Teletravail",calc.tele,VI],["Formation",calc.form,A],["Autres",calc.autres,"#94a3b8"]
  ];

  if(view === "landing") {
    if(view === "mentions") return <MentionsLegales onBack={function(){setView("landing");}}/>;
    if(view === "confidentialite") return <Confidentialite onBack={function(){setView("landing");}}/>;
    return <LandingPage onStart={function(){setView("app");}} onMentions={function(){setView("mentions");}} onConfidentialite={function(){setView("confidentialite");}}/>;
  }

  return (
    <div style={{minHeight:"100vh",background:BG,color:"#dde4f0",fontFamily:"system-ui,-apple-system,sans-serif"}}>

      <div style={{background:"#0f1520",borderBottom:"1px solid "+BD,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:99}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Logo size={30}/>
          <div>
            <div style={{fontWeight:800,fontSize:18,letterSpacing:"-0.03em",lineHeight:1}}>Ree<span style={{color:G}}>lo</span></div>
            <div style={{fontSize:9,color:DIM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Frais reels · 2025</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {saved && <span style={{fontSize:10,color:G,opacity:0.7}}>💾 sauvegarde</span>}
          <button onClick={function(){setView("landing");}} style={{fontSize:11,color:MU,background:"none",border:"1px solid "+BD,borderRadius:20,padding:"4px 10px",cursor:"pointer",marginRight:4}}>Accueil</button>
          <span style={{fontSize:10,fontWeight:700,color:G,background:G+"15",border:"1px solid "+G+"30",padding:"3px 10px",borderRadius:20}}>Beta</span>
        </div>
      </div>

      <div style={{background:"linear-gradient(160deg,#0d1a0d,#0b0f18 70%)",borderBottom:"1px solid "+BD,padding:"20px 16px 18px"}}>
        <h1 style={{fontSize:"clamp(18px,4vw,26px)",fontWeight:800,color:"#fff",margin:"0 0 6px",lineHeight:1.2}}>
          Calculez vos frais reels<br/><span style={{color:G}}>et recuperez ce qui vous appartient.</span>
        </h1>
        <p style={{fontSize:12,color:"#3a6040",margin:0,lineHeight:1.5}}>Baremes DGFIP 2024 · Tous postes · Export impots.gouv.fr + Word</p>
      </div>

      <div style={{background:"#0f1a0f",borderBottom:"1px solid #1a3020",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:DIM,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total frais reels</div>
          <div style={{fontSize:26,fontWeight:800,color:G,fontFamily:"monospace",lineHeight:1.1}}>{calc.total.toFixed(0)} EUR</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:DIM,marginBottom:2}}>Forfait 10%</div>
          <div style={{fontSize:14,fontWeight:700,color:A,fontFamily:"monospace"}}>{calc.forfait.toFixed(0)} EUR</div>
          <div style={{fontSize:11,fontWeight:700,color:calc.gain>0?G:A,marginTop:3}}>{calc.gain>0?"Frais reels +"+calc.gain.toFixed(0)+" EUR":"Forfait preferable"}</div>
        </div>
      </div>

      <div style={{display:"flex",gap:16,alignItems:"flex-start",maxWidth:1100,margin:"0 auto",padding:"14px 12px"}}>

        <div style={{flex:1,minWidth:0}}>

          <Sec icon="&#9200;" title="Delai de declaration" badge={minDiff < 9999 ? minDiff : 0} badgeColor="#f87171" open={sec==="alerte"} onToggle={function(){o("alerte");}} color="#f87171">
            <AlerteDelai/>
          </Sec>

          <Sec icon="&#128176;" title="Salaire net imposable" open={sec==="sal"} onToggle={function(){o("sal");}} color={B}>
            <Inp label="Salaire net imposable annuel" value={salaire} onChange={setSalaire} suffix="EUR/an" hint="Case 1AJ de votre declaration"/>
          </Sec>

          <Sec icon="&#128197;" title="Jours travailles" badge={calc.joursTotal} open={sec==="jours"} onToggle={function(){o("jours");}} color={B}>
            <InfoBox color={B}>228 j = salarie classique 2025. 218 j = cadre forfait-jours.</InfoBox>
            <Inp label="Jours ouvres de l'annee" value={joursOuvres} onChange={setJO} suffix="j" hint="228 salarie / 218 cadre"/>
            <Inp label="Conges payes (+ RTT)" value={joursCP} onChange={setJCP} suffix="j" hint="Legal : 25 jours CP"/>
            <Inp label="Jours feries en semaine" value={joursFeries} onChange={setJF} suffix="j" hint="~8 en 2025"/>
            <Inp label="Arrets / absences" value={joursArret} onChange={setJA} suffix="j" hint="Maladie, conge parental..."/>
            <Inp label="Jours de teletravail par semaine" value={teleParSem} onChange={setTPS} suffix="j/sem." hint="Calcul auto x 52 semaines"
              note={"→ " + calc.joursTele + " j/an teletravail · " + calc.joursPresent + " j/an presentiel"}/>
          </Sec>

          <Sec icon="&#128649;" title="Transports par employeur" badge={calc.transport} open={sec==="trans"} onToggle={function(){o("trans");}} color={P}>
            <InfoBox color={P}>Un bloc par employeur. Repas, teletravail et formation sont configurables dans chaque bloc.</InfoBox>
            <div style={{marginTop:12}}>
              {emps.map(function(e, i){
                return <EmpBloc key={e.id} emp={e} index={i} joursPresent={calc.joursPresent} joursTele={calc.joursTele}
                  onChange={function(k,v){updEmp(e.id,k,v);}} onDelete={function(){delEmp(e.id);}}/>;
              })}
            </div>
            <button onClick={addEmp} style={{width:"100%",padding:"12px",background:P+"12",border:"1px dashed "+P+"44",borderRadius:8,color:P,cursor:"pointer",fontSize:13,fontWeight:700}}>
              + Ajouter un employeur
            </button>
          </Sec>

          <Sec icon="&#128206;" title="Autres frais professionnels" badge={autres>0?autres:0} open={sec==="autres"} onToggle={function(){o("autres");}} color="#94a3b8">
            <Inp label="Montant total" value={autres} onChange={setAutres} suffix="EUR/an" hint="Materiel pro, vetements imposes, double residence, demenagement contraint..."/>
            <InfoBox color="#94a3b8">EPI / uniforme impose · Outillage inf. 500 EUR · Double residence · Demenagement contraint. Ce montant ira dans la case Autres frais professionnels sur impots.gouv.fr.</InfoBox>
          </Sec>

          <Sec icon="&#128202;" title="Recapitulatif et Export" badge={calc.total} open={sec==="recap"} onToggle={function(){o("recap");}} color={G}>
            <div style={{paddingTop:8}}>
              {ROW_DATA.map(function(row, i){
                return (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+BD+"33",opacity:row[1]===0?0.3:1}}>
                    <span style={{fontSize:13,color:MU}}>{row[0]}</span>
                    <span style={{fontSize:13,fontWeight:700,color:row[2],fontFamily:"monospace"}}>{row[1].toFixed(0)} EUR</span>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid "+BD,marginTop:4}}>
                <span style={{fontSize:14,fontWeight:700,color:"#c0d4e8"}}>Transport net</span>
                <span style={{fontSize:14,fontWeight:800,color:B,fontFamily:"monospace"}}>{calc.transport.toFixed(0)} EUR</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,margin:"12px 0"}}>
              <div style={{flex:1,background:"#090d14",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:DIM,marginBottom:4}}>Frais reels Reelo</div>
                <div style={{fontSize:22,fontWeight:800,color:G,fontFamily:"monospace"}}>{calc.total.toFixed(0)} EUR</div>
              </div>
              <div style={{flex:1,background:"#090d14",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:DIM,marginBottom:4}}>Forfait 10%</div>
                <div style={{fontSize:22,fontWeight:800,color:A,fontFamily:"monospace"}}>{calc.forfait.toFixed(0)} EUR</div>
              </div>
            </div>
            <div style={{padding:"12px 14px",borderRadius:10,background:calc.gain>0?G+"12":A+"12",border:"1px solid "+(calc.gain>0?G+"30":A+"30"),marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:calc.gain>0?G:A}}>
                {calc.gain>0?"Les frais reels vous font economiser +" + calc.gain.toFixed(0) + " EUR":"Le forfait 10% est plus avantageux"}
              </div>
              <div style={{fontSize:12,color:MU,marginTop:4}}>
                {calc.gain>0?"Optez pour les frais reels dans votre declaration.":"Frais reels inferieurs au forfait de " + Math.abs(calc.gain).toFixed(0) + " EUR."}
              </div>
            </div>
            <button onClick={function(){setShowExp(function(p){return !p;});}} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,background:showExp?G+"18":G,color:showExp?G:"#000"}}>
              {showExp ? "Masquer l'export" : "Voir l'export (Lecture / Impots.gouv / Word)"}
            </button>
            {showExp && <ExportBox calc={calc} emps={emps}/>}
            <div style={{padding:"10px 0",display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <Logo size={16}/>
              <span style={{fontSize:10,color:DIM}}>Reelo · DGFIP 2024 · Indicatif · Conservez vos justificatifs</span>
            </div>
          </Sec>

        </div>

        <div id="reelo-side" style={{width:280,flexShrink:0,position:"sticky",top:64,display:"none"}}>
          <div style={{background:CARD,border:"1px solid "+BD,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px",background:"#0d1520",borderBottom:"1px solid "+BD,textAlign:"center"}}>
              <div style={{fontSize:10,color:DIM,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Total frais reels</div>
              <div style={{fontSize:28,fontWeight:800,color:G,fontFamily:"monospace",lineHeight:1}}>{calc.total.toFixed(0)} EUR</div>
              <div style={{fontSize:10,color:DIM,marginTop:4}}>{calc.joursTotal} j · {calc.joursPresent} presentiel · {calc.joursTele} teletravail</div>
            </div>
            <div style={{padding:"10px 14px"}}>
              {ROW_DATA.map(function(row,i){return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD+"22",opacity:row[1]===0?0.3:1}}>
                  <span style={{fontSize:11,color:MU}}>{row[0]}</span>
                  <span style={{fontSize:11,fontWeight:700,color:row[2],fontFamily:"monospace"}}>{row[1].toFixed(0)} EUR</span>
                </div>
              );})}
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:"2px solid "+BD,marginTop:3}}>
                <span style={{fontSize:12,fontWeight:700,color:"#c0d4e8"}}>Transport net</span>
                <span style={{fontSize:12,fontWeight:800,color:B,fontFamily:"monospace"}}>{calc.transport.toFixed(0)} EUR</span>
              </div>
            </div>
            <div style={{padding:"10px 14px",borderTop:"1px solid "+BD}}>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1,background:"#090d14",borderRadius:7,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:DIM,marginBottom:2}}>Frais reels</div>
                  <div style={{fontSize:16,fontWeight:800,color:G,fontFamily:"monospace"}}>{calc.total.toFixed(0)}</div>
                </div>
                <div style={{flex:1,background:"#090d14",borderRadius:7,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:DIM,marginBottom:2}}>Forfait 10%</div>
                  <div style={{fontSize:16,fontWeight:800,color:A,fontFamily:"monospace"}}>{calc.forfait.toFixed(0)}</div>
                </div>
              </div>
              <div style={{padding:"8px 10px",borderRadius:7,background:calc.gain>0?G+"12":A+"12",border:"1px solid "+(calc.gain>0?G+"30":A+"30")}}>
                <div style={{fontSize:11,fontWeight:800,color:calc.gain>0?G:A}}>{calc.gain>0?"+"+calc.gain.toFixed(0)+" EUR avec frais reels":"Forfait preferable"}</div>
              </div>
            </div>
            <div style={{padding:"10px 14px",borderTop:"1px solid "+BD}}>
              <div style={{fontSize:9,color:DIM,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Cases impots.gouv.fr</div>
              <div style={{padding:"7px 9px",background:"#090d14",borderRadius:6,marginBottom:5}}>
                <div style={{fontSize:9,color:B,fontWeight:700}}>KM parcourus</div>
                <div style={{fontSize:14,fontWeight:800,color:"#c4ddc9",fontFamily:"monospace"}}>{calc.totalKm.toFixed(0)} km</div>
              </div>
              {(calc.totalTC+calc.totalDoux+calc.totalPeage) > 0 && <div style={{padding:"7px 9px",background:"#090d14",borderRadius:6,marginBottom:5}}>
                <div style={{fontSize:9,color:P,fontWeight:700}}>Autres transport (TC+peages)</div>
                <div style={{fontSize:14,fontWeight:800,color:"#c4ddc9",fontFamily:"monospace"}}>{(calc.totalTC+calc.totalDoux+calc.totalPeage).toFixed(2)} EUR</div>
              </div>}
              {calc.autresNonTransport > 0 && <div style={{padding:"7px 9px",background:"#090d14",borderRadius:6}}>
                <div style={{fontSize:9,color:A,fontWeight:700}}>Autres frais professionnels</div>
                <div style={{fontSize:14,fontWeight:800,color:"#c4ddc9",fontFamily:"monospace"}}>{calc.autresNonTransport.toFixed(2)} EUR</div>
              </div>}
            </div>
          </div>
        </div>

      </div>

      <div style={{textAlign:"center",padding:"16px",borderTop:"1px solid #1a2535",marginTop:8,display:"flex",justifyContent:"center",gap:20}}>
        <span onClick={function(){setView("mentions");}} style={{fontSize:11,color:"#4a6070",cursor:"pointer",textDecoration:"underline"}}>Mentions légales</span>
        <span onClick={function(){setView("confidentialite");}} style={{fontSize:11,color:"#4a6070",cursor:"pointer",textDecoration:"underline"}}>Confidentialité</span>
        <a href="mailto:contact@reelo.fr" style={{fontSize:11,color:"#4a6070",textDecoration:"underline"}}>Contact</a>
      </div>
      <style>{"* { box-sizing:border-box } input[type=number]::-webkit-inner-spin-button { opacity:.25 } select option { background:#090d14 } @media(min-width:860px){ #reelo-side { display:block !important; } }"}</style>
    </div>
  );
}
