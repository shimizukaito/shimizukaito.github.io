import { writeFileSync, mkdirSync } from 'node:fs';

const outDir = new URL('../manufacturing/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const nets = new Map([['',0],['GND',1],['+12V_RAW',2],['+12V_PROTECTED',3]]);
for (let i=0;i<11;i++) nets.set(`PWM${i}`,4+i);
for (let i=0;i<11;i++) nets.set(`PUMP${i}_PLUS`,15+i);
const net = n => nets.get(n);
const q = s => `\"${s}\"`;
const uuid = (()=>{let n=1;return()=>`00000000-0000-4000-8000-${String(n++).padStart(12,'0')}`})();

function pad(num,x,y,nm,shape='circle',size=2.3,drill=1.0){
  return `    (pad ${q(String(num))} thru_hole ${shape} (at ${x} ${y}) (size ${size} ${size}) (drill ${drill}) (layers \"*.Cu\" \"*.Mask\")${nm?` (net ${net(nm)} ${q(nm)})`:''} (uuid ${q(uuid())}))`;
}
function fp(ref,val,x,y,body,pads,rotation=0){
  return `(footprint ${q(`EmerFlux:${val}`)} (layer \"F.Cu\") (at ${x} ${y} ${rotation})
    (property \"Reference\" ${q(ref)} (at 0 -3 0) (layer \"F.SilkS\"))
    (property \"Value\" ${q(val)} (at 0 3 0) (layer \"F.Fab\") hide)
    ${body}
${pads.join('\n')}
  )`;
}
function xh2(ref,x,n){
  const body=`(fp_rect (start -2 -2.5) (end 4.5 2.5) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))\n    (fp_text user ${q(`P${n+1} +`)} (at 1.25 -3.8) (layer \"F.SilkS\"))`;
  return fp(ref,'JST_XH_B2B-XH-A_1x02_P2.50mm',x,6,body,[pad(1,0,0,`PUMP${n}_PLUS`,'rect'),pad(2,2.5,0,'GND')]);
}
function dip18(ref,x,second=false){
  const p=[];
  for(let i=1;i<=9;i++){
    let nm='GND';
    // The package is rotated 180 degrees below. Reverse channel assignment so
    // PWM and pump numbering still run left-to-right without crossing traces.
    if(i<=8) nm=second?(i<=5?`PWM${11-i}`:'GND'):(i<=6?`PWM${6-i}`:'GND');
    if(i===9) nm='+12V_PROTECTED';
    p.push(pad(i,(i-1)*2.54,0,nm,i===1?'rect':'circle'));
  }
  for(let i=10;i<=18;i++){
    const col=18-i; let nm='';
    if(i===10) nm='GND';
    if(second && i>=14) nm=`PUMP${i-8}_PLUS`;
    if(!second && i>=13) nm=`PUMP${i-13}_PLUS`;
    p.push(pad(i,col*2.54,7.62,nm));
  }
  const body=`(fp_rect (start -1.5 -1.5) (end 21.82 9.12) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))\n    (fp_arc (start 8.66 -1.5) (mid 10.16 0) (end 11.66 -1.5) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))`;
  // Rotate the DIP so its output row faces the pump connectors and its input
  // row faces the PWM header. This prevents output traces crossing input pads.
  return fp(ref,'DIP-18_W7.62mm_TBD62783APG',x,25.62,body,p,180);
}
function pwmHeader(){
  const p=[pad(1,0,0,'GND','rect')];
  for(let i=0;i<11;i++)p.push(pad(i+2,(i+1)*2.54,0,`PWM${i}`));
  const body=`(fp_rect (start -1.4 -1.4) (end 29.4 1.4) (stroke (width 0.25) (type default)) (fill none) (layer \"F.SilkS\"))\n    (fp_text user ${q('GND PWM0...PWM10')} (at 14 -2.5) (layer \"F.SilkS\"))`;
  return fp('J12','PinHeader_1x12_P2.54mm',34,43,body,p);
}
function terminal(){
  const body=`(fp_rect (start -3.79 -6.65) (end 8.87 6.65) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))\n    (fp_text user ${q('12V IN')} (at 2.54 -7.7) (layer \"F.SilkS\"))`;
  return fp('J13','WJ142V-5.08-02P-14G-00A',85,42,body,[pad(1,0,0,'+12V_RAW','rect',3.4,1.4),pad(2,5.08,0,'GND','circle',3.4,1.4)]);
}
function fuse(){
  // MF-R300: 5.1 mm nominal lead pitch, 12.0 mm max body width,
  // 3.0 mm max body thickness (Bourns MF-R series datasheet, Style 2).
  const body=`(fp_rect (start -3.45 -1.5) (end 8.55 1.5) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))`;
  return fp('F1','MF-R300_PTC_3A_30V_P5.10mm',75,33,body,[pad(1,0,0,'+12V_PROTECTED','rect',3,1.2),pad(2,5.1,0,'+12V_RAW','circle',3,1.2)]);
}
function cap(ref,val,x,y,plusNet='+12V_PROTECTED'){
  const body=`(fp_circle (center 0 0) (end 4.2 0) (stroke (width 0.3) (type default)) (fill none) (layer \"F.SilkS\"))\n    (fp_text user ${q('+')} (at -3 -3) (layer \"F.SilkS\"))`;
  return fp(ref,val,x,y,body,[pad(1,-1.75,0,plusNet,'rect'),pad(2,1.75,0,'GND')]);
}
function twoPad(ref,val,x,y){
  const body=`(fp_rect (start -2.8 -1.8) (end 2.8 1.8) (stroke (width 0.25) (type default)) (fill none) (layer \"F.SilkS\"))`;
  return fp(ref,val,x,y,body,[pad(1,-1.5,0,'+12V_PROTECTED','rect'),pad(2,1.5,0,'GND')]);
}
function seg(nm,w,layer,pts){
  let s=''; for(let i=0;i<pts.length-1;i++)s+=`  (segment (start ${pts[i][0]} ${pts[i][1]}) (end ${pts[i+1][0]} ${pts[i+1][1]}) (width ${w}) (layer ${q(layer)}) (net ${net(nm)}) (uuid ${q(uuid())}))\n`; return s;
}

const footprints=[];
for(let i=0;i<11;i++)footprints.push(xh2(`J${i+1}`,8+8.2*i,i));
footprints.push(dip18('U1',30.32,false),dip18('U2',85.32,true),pwmHeader(),terminal(),fuse());
footprints.push(cap('C1','25PX470MEFC8X11.5_470uF_25V',68,43),twoPad('C2','100nF_U1',4,31),twoPad('C3','100nF_U2',89,31));

let tracks='';
for(let i=0;i<6;i++){const sx=17.62+2.54*i,cx=8+8.2*i; tracks+=seg(`PUMP${i}_PLUS`,0.6,'F.Cu',[[sx,18],[sx,15],[cx,9],[cx,6]]);}
for(let i=6;i<11;i++){const k=i-6,sx=75.16+2.54*k,cx=8+8.2*i; tracks+=seg(`PUMP${i}_PLUS`,0.6,'F.Cu',[[sx,18],[sx,15],[cx,9],[cx,6]]);}
for(let i=0;i<6;i++){const sx=36.54+2.54*i,tx=17.62+2.54*i; tracks+=seg(`PWM${i}`,0.3,'B.Cu',[[sx,43],[sx,34],[tx,29],[tx,25.62]]);}
for(let i=6;i<10;i++){const k=i-6,sx=36.54+2.54*i,tx=75.16+2.54*k; tracks+=seg(`PWM${i}`,0.3,'B.Cu',[[sx,43],[sx,34],[tx,29],[tx,25.62]]);}
tracks+=seg('PWM10',0.3,'B.Cu',[[61.94,43],[61.94,38],[94,38],[94,27],[85.32,25.62]]);
tracks+=seg('+12V_RAW',2,'F.Cu',[[85,42],[82,39],[80.1,33]]);
tracks+=seg('+12V_PROTECTED',2,'F.Cu',[[75,33],[72,36],[65,36],[10,36]]);
tracks+=seg('+12V_PROTECTED',2,'F.Cu',[[10,36],[10,25.62]]);
tracks+=seg('+12V_PROTECTED',2,'F.Cu',[[65,36],[65,25.62]]);
tracks+=seg('+12V_PROTECTED',0.8,'F.Cu',[[66.25,43],[66.25,36]]);
tracks+=seg('+12V_PROTECTED',0.6,'F.Cu',[[2.5,31],[2.5,36],[10,36]]);
tracks+=seg('+12V_PROTECTED',0.6,'F.Cu',[[65,36],[70,29],[87.5,29],[87.5,31]]);

const netDefs=[...nets].map(([name,id])=>`  (net ${id} ${q(name)})`).join('\n');
const board=`(kicad_pcb (version 20231120) (generator pcbnew)
  (general (thickness 1.6))
  (paper \"A4\")
  (layers (0 \"F.Cu\" signal) (31 \"B.Cu\" signal) (36 \"B.SilkS\" user \"b.silkscreen\") (37 \"F.SilkS\" user \"f.silkscreen\") (44 \"Edge.Cuts\" user))
  (setup (pad_to_mask_clearance 0))
${netDefs}
  (gr_rect (start 0 0) (end 100 50) (stroke (width 0.3) (type default)) (fill none) (layer \"Edge.Cuts\"))
  (gr_text ${q('EmerFlux 11ch Driver Rev.A')} (at 50 15) (layer \"F.SilkS\") (effects (font (size 1.6 1.6) (thickness 0.3))))
  (gr_text ${q('TBD62783APG x2 / 12V / PCA9685 PWM0-10')} (at 50 48) (layer \"F.SilkS\") (effects (font (size 1 1) (thickness 0.18))))
  (footprint ${q('MountingHole_3.2mm')} (layer \"F.Cu\") (at 3.5 25) (property \"Reference\" \"H1\" (at 0 0) (layer \"F.Fab\") hide) ${pad('',0,0,'','circle',3.2,3.2)})
  (footprint ${q('MountingHole_3.2mm')} (layer \"F.Cu\") (at 96.5 25) (property \"Reference\" \"H2\" (at 0 0) (layer \"F.Fab\") hide) ${pad('',0,0,'','circle',3.2,3.2)})
  (footprint ${q('MountingHole_3.2mm')} (layer \"F.Cu\") (at 3.5 46) (property \"Reference\" \"H3\" (at 0 0) (layer \"F.Fab\") hide) ${pad('',0,0,'','circle',3.2,3.2)})
  (footprint ${q('MountingHole_3.2mm')} (layer \"F.Cu\") (at 96.5 46) (property \"Reference\" \"H4\" (at 0 0) (layer \"F.Fab\") hide) ${pad('',0,0,'','circle',3.2,3.2)})
${footprints.map(x=>'  '+x.replaceAll('\n','\n  ')).join('\n')}
${tracks}
  (zone (net 1) (net_name \"GND\") (layer \"F.Cu\") (hatch edge 0.5) (connect_pads (clearance 0.3)) (min_thickness 0.25) (fill yes (thermal_gap 0.3) (thermal_bridge_width 0.4)) (polygon (pts (xy 1 1) (xy 99 1) (xy 99 49) (xy 1 49))))
  (zone (net 1) (net_name \"GND\") (layer \"B.Cu\") (hatch edge 0.5) (connect_pads (clearance 0.3)) (min_thickness 0.25) (fill yes (thermal_gap 0.3) (thermal_bridge_width 0.4)) (polygon (pts (xy 1 1) (xy 99 1) (xy 99 49) (xy 1 49))))
)
`;
if (board.includes('undefined')) throw new Error('undefined value in PCB');
for (let i=0;i<11;i++) {
  for (const n of [`PWM${i}`,`PUMP${i}_PLUS`]) {
    const padCount=(board.match(new RegExp(`\\(net ${net(n)} \\\"${n}\\\"\\)`, 'g'))||[]).length;
    const segCount=(board.match(new RegExp(`\\(net ${net(n)}\\)`, 'g'))||[]).length;
    if (padCount < 3 || segCount < 2) throw new Error(`${n} is not fully represented: pads/netdefs=${padCount}, segments=${segCount}`);
  }
}
writeFileSync(new URL('EmerFlux-11ch-driver.kicad_pcb',outDir),board);

const netlist=[...nets.keys()].filter(Boolean).map(n=>`${n}: `).join('\n');
writeFileSync(new URL('EmerFlux-11ch-driver.net-summary.txt',outDir),`EmerFlux 11-channel PCA9685-to-pump driver\nGenerated board: 100 x 50 mm, 2 layer\n\n${netlist}\n`);
const pumpSvg=Array.from({length:11},(_,i)=>`<g transform="translate(${8+8.2*i} 6)"><rect x="-3" y="-3" width="7" height="6" rx=".5"/><circle cx="0" cy="0" r="1"/><circle cx="2.5" cy="0" r="1"/><text x="0.5" y="-4">P${i+1}</text></g>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="50mm" viewBox="0 0 100 50"><style>rect,path,circle{fill:none;stroke:#111;stroke-width:.5}text{font-family:Arial,sans-serif;font-size:2px;fill:#111}.cu{stroke:#c33;stroke-width:1}.sig{stroke:#2676c9;stroke-width:.45}</style><rect x=".5" y=".5" width="99" height="49" rx="1"/>${pumpSvg}<text x="50" y="15" text-anchor="middle" style="font-size:3px;font-weight:bold">EmerFlux 11ch Driver Rev.A</text><rect x="9" y="17" width="24" height="12"/><text x="21" y="24" text-anchor="middle">U1 TBD62783</text><rect x="64" y="17" width="24" height="12"/><text x="76" y="24" text-anchor="middle">U2 TBD62783</text><rect x="33" y="40" width="31" height="6"/><text x="48.5" y="39">PCA PWM header</text><circle cx="68" cy="43" r="4.2"/><text x="68" y="37">470u</text><rect x="71.5" y="31.5" width="12" height="3"/><text x="77.5" y="30">PTC</text><rect x="81.2" y="35.35" width="12.66" height="13.3"/><text x="87.5" y="34">12V</text><circle cx="3.5" cy="25" r="1.6"/><circle cx="96.5" cy="25" r="1.6"/><circle cx="3.5" cy="46" r="1.6"/><circle cx="96.5" cy="46" r="1.6"/><path class="cu" d="M85 42L82 39 80.1 33M75 33L72 36H10V25.62M65 36V25.62M66.25 43V36"/><text x="50" y="49" text-anchor="middle">100 × 50 mm / 2 layers / JST XH pumps</text></svg>`;
writeFileSync(new URL('EmerFlux-11ch-driver-1to1.svg',outDir),svg);
console.log(`generated ${board.length} bytes`);
