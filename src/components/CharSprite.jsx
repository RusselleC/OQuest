// ═══════════════════════════════════════
//  CHARSPRITE — Enhanced 3D-Style Sprites
//  All roles: player, wizard, guard, elder, merchant,
//             enemy_zombie, enemy_demon, enemy_ghost,
//             enemy_leak, enemy_fault, enemy_race, boss
// ═══════════════════════════════════════

// ── Shared depth helper ──────────────────────────────────────────
const d3 = (intensity = 1, color = "0,0,0") =>
  `inset -${3 * intensity}px ${3 * intensity}px ${8 * intensity}px rgba(${color},0.45),
   inset  ${2 * intensity}px -${1 * intensity}px ${5 * intensity}px rgba(255,255,255,0.18)`;

const glow = (color, r = 10) => `0 0 ${r}px ${color}`;

// ── PLAYER ───────────────────────────────────────────────────────
function PlayerSprite({ color = "#f5c518", tick, moving, facing }) {
  const leg   = moving ? "legSwing 0.32s ease-in-out infinite alternate" : "none";
  const bob   = moving ? "bodyBob 0.32s ease-in-out infinite alternate"  : "none";
  const breath = Math.sin(tick * 0.05) * 1.2;
  const headBob = Math.sin(tick * 0.04) * 1.0;
  const blink = tick % 110 < 4 ? "scaleY(0.08)" : "scaleY(1)";

  return (
    <>
      {/* Drop shadow */}
      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",
        width:36,height:9,background:"rgba(0,0,0,0.28)",borderRadius:"50%",filter:"blur(3px)"}}/>

      {/* Cape */}
      <div style={{position:"absolute",bottom:10,left:8,width:48,height:26,
        background:"linear-gradient(145deg,#c01828 0%,#880010 55%,#580010 100%)",
        borderRadius:"2px 2px 14px 14px",
        boxShadow:"inset -5px 0 12px rgba(0,0,0,0.4), inset 3px 0 5px rgba(255,80,80,0.1)"}}/>

      {/* Legs */}
      {[{l:14,delay:"0s"},{l:28,delay:"0.16s"}].map(({l,delay},i)=>(
        <div key={i} style={{position:"absolute",bottom:6,left:l,width:13,height:18,
          background:"linear-gradient(90deg,#22225a,#14144a)",borderRadius:"0 0 4px 4px",
          animation:leg,animationDelay:delay,boxShadow:d3(0.9)}}/>
      ))}

      {/* Boots */}
      {[{l:11,br:"0 4px 4px 4px",bs:"inset -2px 0 5px rgba(0,0,0,0.5)"},{l:26,br:"4px 0 4px 4px",bs:"inset 2px 0 5px rgba(0,0,0,0.5)"}].map(({l,br,bs},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:16,height:8,
          background:"linear-gradient(90deg,#7a3818,#5a2808)",borderRadius:br,boxShadow:bs}}/>
      ))}

      {/* Body / Armor */}
      <div style={{position:"absolute",bottom:8+breath,left:12,width:40,height:24,
        background:`linear-gradient(145deg,${color} 0%,${color}cc 55%,${color}88 100%)`,
        borderRadius:"8px 8px 4px 4px",animation:bob,
        boxShadow:`${d3(1.1)}, 0 4px 14px rgba(0,0,0,0.5), 0 0 10px ${color}33`}}/>

      {/* Armor highlight shine */}
      <div style={{position:"absolute",bottom:17+breath,left:18,width:16,height:7,
        background:"rgba(255,255,255,0.22)",borderRadius:"50%",filter:"blur(1.5px)"}}/>
      <div style={{position:"absolute",bottom:13+breath,left:13,width:40,height:3,
        background:`linear-gradient(90deg,transparent,${color}55,transparent)`}}/>

      {/* Left arm */}
      <div style={{position:"absolute",bottom:21+breath,left:2,width:12,height:20,
        background:`linear-gradient(90deg,${color},${color}aa)`,borderRadius:"4px 0 4px 4px",
        animation:leg,animationDelay:"0.16s",boxShadow:d3(0.7)}}/>

      {/* Sword (right side) */}
      <div style={{position:"absolute",bottom:20+breath,right:0,width:6,height:26,
        background:"linear-gradient(90deg,#d8d8f0 0%,#a0a0c0 45%,#c8c8e8 100%)",
        borderRadius:"3px 3px 1px 1px",transform:"rotate(14deg)",
        boxShadow:"inset -2px 0 4px rgba(0,0,0,0.3), 0 0 8px rgba(180,180,255,0.5)"}}/>
      {/* Crossguard */}
      <div style={{position:"absolute",bottom:33+breath,right:-5,width:16,height:5,
        background:"linear-gradient(90deg,#c8a010,#f0d040,#c0980c)",borderRadius:3,
        boxShadow:`0 0 6px rgba(240,200,40,0.6)`}}/>

      {/* Shield (left) */}
      <div style={{position:"absolute",bottom:20+breath,left:-5,width:16,height:22,
        background:`linear-gradient(145deg,${color} 0%,${color}77 100%)`,
        borderRadius:"4px 4px 10px 10px",border:"2px solid rgba(0,0,0,0.35)",
        boxShadow:"inset -3px 3px 8px rgba(0,0,0,0.4), inset 2px -1px 5px rgba(255,255,255,0.18)"}}/>
      {/* Shield emblem */}
      <div style={{position:"absolute",bottom:26+breath,left:-2,width:8,height:8,
        background:`radial-gradient(circle at 40%,rgba(255,255,255,0.6),${color}44)`,
        borderRadius:"50%"}}/>

      {/* Head */}
      <div style={{position:"absolute",bottom:36+headBob,left:14,width:36,height:26,
        background:"linear-gradient(145deg,#ffd8a8 0%,#f0c888 55%,#e0b870 100%)",
        borderRadius:"48% 48% 42% 42%",border:"1px solid #d09860",
        boxShadow:"inset -5px 5px 12px rgba(0,0,0,0.18), inset 3px -2px 6px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)"}}/>

      {/* Helmet */}
      <div style={{position:"absolute",bottom:52+headBob,left:11,width:42,height:16,
        background:`linear-gradient(145deg,${color} 0%,${color}cc 65%,${color}88 100%)`,
        borderRadius:"50% 50% 20% 20%",
        boxShadow:`${d3(1)}, 0 0 14px ${color}33`}}/>
      {/* Helmet visor slit */}
      <div style={{position:"absolute",bottom:47+headBob,left:16,width:32,height:9,
        background:"linear-gradient(180deg,rgba(0,0,0,0.75),rgba(0,0,0,0.5))",
        borderRadius:"3px 3px 0 0",
        boxShadow:"inset 0 0 8px rgba(80,180,255,0.18)"}}/>
      {/* Glowing eyes */}
      <div style={{position:"absolute",bottom:50+headBob,left:19,width:11,height:4,
        background:"rgba(255,230,80,0.95)",transform:blink,
        boxShadow:"0 0 7px rgba(255,220,80,0.9), 0 0 14px rgba(255,200,60,0.4)"}}/>
      <div style={{position:"absolute",bottom:50+headBob,right:19,width:11,height:4,
        background:"rgba(255,230,80,0.95)",transform:blink,
        boxShadow:"0 0 7px rgba(255,220,80,0.9), 0 0 14px rgba(255,200,60,0.4)"}}/>
    </>
  );
}

// ── WIZARD (KERNEL NPC / PAGE DAEMON) ────────────────────────────
function WizardSprite({ tick }) {
  const orbPulse = 0.88 + Math.sin(tick * 0.07) * 0.12;
  const robeFloat = Math.sin(tick * 0.04) * 1.5;
  const staffGlowR = 10 + Math.sin(tick * 0.09) * 6;
  const headBob = Math.sin(tick * 0.045) * 1.2;
  const blink = tick % 120 < 4 ? "scaleY(0.08)" : "scaleY(1)";

  return (
    <>
      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",
        width:28,height:8,background:"rgba(100,0,180,0.2)",borderRadius:"50%",filter:"blur(3px)"}}/>

      {/* Legs under robe */}
      {[{l:19},{l:33}].map(({l},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:12,height:17,
          background:"linear-gradient(90deg,#5218a0,#3a0880)",borderRadius:"0 0 4px 4px",
          boxShadow:"inset -2px 0 5px rgba(0,0,0,0.4)"}}/>
      ))}

      {/* Robe body */}
      <div style={{position:"absolute",bottom:4+robeFloat,left:8,width:48,height:36,
        background:"linear-gradient(145deg,#7020e8 0%,#5010c0 55%,#360898 100%)",
        borderRadius:"2px 2px 16px 16px",
        boxShadow:"inset -7px 0 16px rgba(0,0,0,0.5), inset 4px 0 8px rgba(160,80,255,0.2)"}}/>
      {/* Robe hem gradient */}
      <div style={{position:"absolute",bottom:4+robeFloat,left:8,width:48,height:12,
        background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.25))",borderRadius:"0 0 16px 16px"}}/>

      {/* Rune gems on robe */}
      {[[14,14],[42,18],[22,28],[40,9]].map(([lx,ly],i)=>(
        <div key={i} style={{position:"absolute",bottom:ly,left:lx,width:8,height:8,
          background:"radial-gradient(circle at 35%,#f8e040,#d0a010)",borderRadius:"50%",
          boxShadow:`0 0 ${5+Math.sin(tick*0.1+i*1.2)*3}px #f8e040, inset -1px 1px 3px rgba(0,0,0,0.3)`}}/>
      ))}

      {/* Upper body / torso */}
      <div style={{position:"absolute",bottom:32+robeFloat,left:13,width:38,height:20,
        background:"linear-gradient(145deg,#8030f0 0%,#6020cc 100%)",borderRadius:"8px 8px 0 0",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.3), inset 3px -2px 6px rgba(200,130,255,0.18)"}}/>

      {/* Staff pole */}
      <div style={{position:"absolute",bottom:4,right:3,width:5,height:52,
        background:"linear-gradient(90deg,#c08030,#8a5018,#d09040)",borderRadius:4,
        boxShadow:"inset -2px 0 5px rgba(0,0,0,0.45), 2px 4px 8px rgba(0,0,0,0.4)"}}/>
      {/* Orb */}
      <div style={{position:"absolute",bottom:52,right:-2,width:16,height:16,
        background:"radial-gradient(circle at 38% 35%,#e8b8ff,#b070ff,#7030c8)",
        borderRadius:"50%",transform:`scale(${orbPulse})`,
        boxShadow:`0 0 ${staffGlowR}px #c090ff, 0 0 ${staffGlowR*2}px #8040e0`,
        border:"1px solid rgba(200,140,255,0.55)"}}/>
      {/* Magic sparks */}
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",
          bottom:56+Math.sin(tick*0.14+i*2.1)*7,right:2+Math.cos(tick*0.11+i*2)*6,
          width:5,height:5,background:["#d0a0ff","#ffffff","#f0c0ff"][i],
          borderRadius:"50%",opacity:0.7+Math.sin(tick*0.1+i)*0.2,
          boxShadow:`0 0 5px ${["#c090ff","#ffffff","#e080ff"][i]}`}}/>
      ))}

      {/* Head */}
      <div style={{position:"absolute",bottom:44+headBob,left:15,width:34,height:28,
        background:"linear-gradient(145deg,#ffd898,#ecc078,#d8a850)",
        borderRadius:"50% 50% 42% 42%",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.18), inset 3px -2px 6px rgba(255,255,255,0.25)"}}/>
      {/* Beard */}
      <div style={{position:"absolute",bottom:40+headBob,left:13,width:38,height:13,
        background:"linear-gradient(180deg,#f8f8f8,#e8e8e8,rgba(232,232,232,0))",
        borderRadius:"0 0 14px 14px"}}/>
      {/* Hat brim */}
      <div style={{position:"absolute",bottom:58+headBob,left:9,width:46,height:9,
        background:"linear-gradient(145deg,#4a10a8,#3a0898)",borderRadius:5,
        boxShadow:"inset -3px 2px 7px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.4)"}}/>
      {/* Hat cone */}
      <div style={{position:"absolute",bottom:63+headBob,left:22,width:0,height:0,
        borderLeft:"12px solid transparent",borderRight:"12px solid transparent",
        borderBottom:"24px solid #4a10a8",filter:"drop-shadow(-1px -2px 3px rgba(0,0,0,0.3))"}}/>
      {/* Hat star */}
      <div style={{position:"absolute",bottom:72+headBob,left:28,width:8,height:8,
        background:"radial-gradient(circle at 40%,#f8e040,#c8a010)",borderRadius:"50%",
        boxShadow:`0 0 ${4+Math.sin(tick*0.08)*2}px #f8e040`}}/>
      {/* Eyes */}
      <div style={{position:"absolute",bottom:52+headBob,left:20,width:8,height:8,
        background:"#281860",borderRadius:"50%",transform:blink}}/>
      <div style={{position:"absolute",bottom:52+headBob,right:20,width:8,height:8,
        background:"#281860",borderRadius:"50%",transform:blink}}/>
      <div style={{position:"absolute",bottom:53+headBob,left:21,width:6,height:6,
        background:"#c080ff",borderRadius:"50%",opacity:0.85,
        boxShadow:"0 0 7px #c090ff"}}/>
      <div style={{position:"absolute",bottom:53+headBob,right:21,width:6,height:6,
        background:"#c080ff",borderRadius:"50%",opacity:0.85,
        boxShadow:"0 0 7px #c090ff"}}/>
    </>
  );
}

// ── GUARD (GUARD MALLOC) ─────────────────────────────────────────
function GuardSprite({ tick }) {
  const guardBob = Math.sin(tick * 0.03) * 1.0;
  const blink = tick % 130 < 4 ? "scaleY(0.08)" : "scaleY(1)";

  return (
    <>
      <div style={{position:"absolute",bottom:-3,left:"50%",transform:"translateX(-50%)",
        width:30,height:8,background:"rgba(0,0,0,0.22)",borderRadius:"50%",filter:"blur(2px)"}}/>
      {/* Legs */}
      {[{l:17},{l:33}].map(({l},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:14,height:19,
          background:"linear-gradient(90deg,#454565,#353555)",
          boxShadow:"inset -2px 0 5px rgba(0,0,0,0.5)"}}/>
      ))}
      {/* Boots */}
      {[{l:14,br:"0 4px 5px 5px"},{l:30,br:"4px 0 5px 5px"}].map(({l,br},i)=>(
        <div key={i} style={{position:"absolute",bottom:0,left:l,width:17,height:6,
          background:"linear-gradient(90deg,#5a3820,#3a2010)",borderRadius:br}}/>
      ))}
      {/* Armor plate body */}
      <div style={{position:"absolute",bottom:16,left:10,width:44,height:28,
        background:"linear-gradient(145deg,#7888b0 0%,#5868900 50%,#485878 100%)",
        borderRadius:"6px 6px 3px 3px",
        boxShadow:"inset -6px 6px 14px rgba(0,0,0,0.4), inset 4px -2px 8px rgba(190,210,255,0.22), 3px 6px 14px rgba(0,0,0,0.4)"}}/>
      {/* Plate highlights */}
      <div style={{position:"absolute",bottom:30,left:16,width:16,height:9,
        background:"rgba(255,255,255,0.2)",borderRadius:"50%",filter:"blur(2px)"}}/>
      <div style={{position:"absolute",bottom:18,left:10,width:44,height:2,
        background:"rgba(160,180,220,0.4)"}}/>
      {/* Shoulder pads */}
      {[{l:4,bs:"inset -3px 2px 6px rgba(0,0,0,0.4)"},{r:4,bs:"inset 3px 2px 6px rgba(0,0,0,0.4)"}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:34,...(s.l?{left:s.l}:{right:s.r}),width:16,height:14,
          background:"linear-gradient(145deg,#8898b8,#6878a0)",borderRadius:"50% 50% 30% 30%",
          boxShadow:s.bs}}/>
      ))}
      {/* Spear */}
      <div style={{position:"absolute",bottom:2,right:4,width:5,height:58,
        background:"linear-gradient(90deg,#a86030,#7a4818,#b87030)",borderRadius:3,
        boxShadow:"inset -1.5px 0 4px rgba(0,0,0,0.45)"}}/>
      <div style={{position:"absolute",bottom:57,right:2,width:9,height:18,
        background:"linear-gradient(180deg,#e0e8f0,#a8b8c8,#d0d8e8)",
        borderRadius:"48% 48% 22% 22%",
        boxShadow:"inset -2px 0 5px rgba(0,0,0,0.3), 0 0 10px rgba(180,200,255,0.5)"}}/>
      {/* Head */}
      <div style={{position:"absolute",bottom:50+guardBob,left:16,width:32,height:24,
        background:"linear-gradient(145deg,#ffd898,#ecc070)",
        borderRadius:"50% 50% 42% 42%",
        boxShadow:"inset -3px 3px 8px rgba(0,0,0,0.18), inset 2px -1px 5px rgba(255,255,255,0.25)"}}/>
      {/* Helmet */}
      <div style={{position:"absolute",bottom:62+guardBob,left:13,width:38,height:15,
        background:"linear-gradient(145deg,#7888ba,#5868900)",borderRadius:"50% 50% 12% 12%",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.35), inset 3px -2px 6px rgba(190,210,255,0.2)"}}/>
      {/* Visor */}
      <div style={{position:"absolute",bottom:57+guardBob,left:15,width:34,height:10,
        background:"linear-gradient(180deg,#8aa0c8,#708aaa)",borderRadius:3,
        boxShadow:"inset 0 0 8px rgba(0,0,0,0.35)"}}/>
      {/* Eye slits */}
      <div style={{position:"absolute",bottom:60+guardBob,left:18,width:11,height:3,
        background:"rgba(8,8,28,0.88)",transform:blink}}/>
      <div style={{position:"absolute",bottom:60+guardBob,right:18,width:11,height:3,
        background:"rgba(8,8,28,0.88)",transform:blink}}/>
    </>
  );
}

// ── ELDER (ELDER PROCESS / LIBRARIAN MUTEX) ──────────────────────
function ElderSprite({ tick }) {
  const elderSway = Math.sin(tick * 0.025) * 1.8;
  const headBob = Math.sin(tick * 0.04) * 1.0;
  const blink = tick % 140 < 4 ? "scaleY(0.08)" : "scaleY(1)";

  return (
    <>
      <div style={{position:"absolute",bottom:-3,left:"50%",transform:"translateX(-50%)",
        width:26,height:7,background:"rgba(0,0,0,0.18)",borderRadius:"50%",filter:"blur(2px)"}}/>
      {/* Feet/shoes */}
      {[{l:21},{l:34}].map(({l},i)=>(
        <div key={i} style={{position:"absolute",bottom:0,left:l,width:11,height:7,
          background:"linear-gradient(90deg,#6a4020,#4a2810)",borderRadius:"0 0 5px 5px"}}/>
      ))}
      {/* Robe lower */}
      <div style={{position:"absolute",bottom:6,left:11,width:42,height:30,
        background:"linear-gradient(145deg,#c07838 0%,#9a5828 55%,#784018 100%)",
        borderRadius:"0 0 12px 12px",
        boxShadow:"inset -5px 0 12px rgba(0,0,0,0.35), inset 3px 0 6px rgba(255,170,90,0.15)"}}/>
      {/* Robe upper */}
      <div style={{position:"absolute",bottom:28,left:13,width:38,height:22,
        background:"linear-gradient(145deg,#d08848 0%,#ac6838 100%)",borderRadius:"6px 6px 0 0",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.28), inset 3px -2px 6px rgba(255,190,130,0.18)"}}/>
      <div style={{position:"absolute",bottom:34,left:20,width:12,height:7,
        background:"rgba(255,255,255,0.14)",borderRadius:"50%",filter:"blur(1px)"}}/>
      {/* Belt */}
      <div style={{position:"absolute",bottom:26,left:11,width:42,height:4,
        background:"linear-gradient(90deg,#6a3010,#9a5020,#6a3010)"}}/>
      <div style={{position:"absolute",bottom:25,left:29,width:6,height:7,
        background:"linear-gradient(145deg,#d0a040,#a07820)",borderRadius:2,
        boxShadow:"0 0 4px rgba(200,150,40,0.5)"}}/>
      {/* Walking staff */}
      <div style={{position:"absolute",bottom:2,left:3,width:5,height:40+elderSway,
        background:"linear-gradient(90deg,#9a6028,#7a4818,#b07030)",borderRadius:3,
        boxShadow:"inset -1px 0 4px rgba(0,0,0,0.5)"}}/>
      {/* Staff top crystal */}
      <div style={{position:"absolute",bottom:38+elderSway,left:1,width:12,height:7,
        background:"linear-gradient(90deg,#e0b860,#c8a040,#f0c880)",borderRadius:3,
        boxShadow:`0 0 ${5+Math.sin(tick*0.07)*2}px #d0a040`}}/>
      {/* Head */}
      <div style={{position:"absolute",bottom:44+headBob,left:16,width:32,height:26,
        background:"linear-gradient(145deg,#f8e0b0,#ecc888)",
        borderRadius:"50% 50% 42% 42%",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.16), inset 3px -2px 6px rgba(255,255,255,0.25)"}}/>
      {/* Wrinkles */}
      <div style={{position:"absolute",bottom:54+headBob,left:18,width:16,height:2,
        background:"rgba(180,120,60,0.3)",borderRadius:1}}/>
      {/* White beard */}
      <div style={{position:"absolute",bottom:40+headBob,left:13,width:38,height:15,
        background:"linear-gradient(180deg,#f8f8f8,#e8e8e8,rgba(235,235,235,0))",
        borderRadius:"0 0 12px 12px"}}/>
      {/* White hair / brows */}
      <div style={{position:"absolute",bottom:61+headBob,left:13,width:38,height:12,
        background:"linear-gradient(180deg,#f0f0f0,#e8e8e8)",borderRadius:"50% 50% 0 0"}}/>
      {/* Eyebrows */}
      <div style={{position:"absolute",bottom:59+headBob,left:19,width:10,height:3,
        background:"#e8e0d8",borderRadius:2,transform:"rotate(-6deg)"}}/>
      <div style={{position:"absolute",bottom:59+headBob,right:19,width:10,height:3,
        background:"#e8e0d8",borderRadius:2,transform:"rotate(6deg)"}}/>
      {/* Eyes */}
      <div style={{position:"absolute",bottom:54+headBob,left:20,width:9,height:9,
        background:"#402818",borderRadius:"50%",transform:blink}}/>
      <div style={{position:"absolute",bottom:54+headBob,right:20,width:9,height:9,
        background:"#402818",borderRadius:"50%",transform:blink}}/>
      <div style={{position:"absolute",bottom:55+headBob,left:22,width:5,height:5,
        background:"#e8c858",borderRadius:"50%",opacity:0.7,boxShadow:"0 0 4px #e0c040"}}/>
      <div style={{position:"absolute",bottom:55+headBob,right:22,width:5,height:5,
        background:"#e8c858",borderRadius:"50%",opacity:0.7,boxShadow:"0 0 4px #e0c040"}}/>
    </>
  );
}

// ── MERCHANT (HEAP THE MERCHANT) ─────────────────────────────────
function MerchantSprite({ tick }) {
  const bounce = Math.abs(Math.sin(tick * 0.055)) * 2.5;
  const headBob = Math.sin(tick * 0.05) * 1.0;
  const blink = tick % 100 < 4 ? "scaleY(0.08)" : "scaleY(1)";

  return (
    <>
      <div style={{position:"absolute",bottom:-3,left:"50%",transform:"translateX(-50%)",
        width:32,height:8,background:"rgba(0,0,0,0.2)",borderRadius:"50%",filter:"blur(2px)"}}/>
      {/* Stout legs */}
      {[{l:17},{l:33}].map(({l},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:14,height:18,
          background:"linear-gradient(90deg,#386828,#284a18)",
          boxShadow:"inset -2px 0 5px rgba(0,0,0,0.4)"}}/>
      ))}
      {/* Boots */}
      {[{l:14},{l:31}].map(({l},i)=>(
        <div key={i} style={{position:"absolute",bottom:0,left:l,width:17,height:7,
          background:"linear-gradient(90deg,#4a2a10,#321808)",borderRadius:"0 0 5px 5px"}}/>
      ))}
      {/* Robe body (chubby) */}
      <div style={{position:"absolute",bottom:12,left:9,width:46,height:28,
        background:"linear-gradient(145deg,#4a8a38 0%,#2e6018 55%,#1e4808 100%)",
        borderRadius:"0 0 12px 12px",
        boxShadow:"inset -5px 0 12px rgba(0,0,0,0.35), inset 3px 0 6px rgba(90,190,90,0.15)"}}/>
      {/* Torso */}
      <div style={{position:"absolute",bottom:32+bounce,left:11,width:42,height:22,
        background:"linear-gradient(145deg,#5a9848 0%,#388028 100%)",borderRadius:"6px 6px 0 0",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.28), inset 3px -2px 6px rgba(100,190,100,0.18)"}}/>
      <div style={{position:"absolute",bottom:38+bounce,left:18,width:14,height:7,
        background:"rgba(255,255,255,0.15)",borderRadius:"50%",filter:"blur(1px)"}}/>
      {/* Belt + pouch */}
      <div style={{position:"absolute",bottom:29,left:9,width:46,height:4,
        background:"linear-gradient(90deg,#503010,#784820,#503010)"}}/>
      {/* Coin bag */}
      <div style={{position:"absolute",bottom:12+bounce,right:3,width:24,height:22,
        background:"linear-gradient(145deg,#c09848,#906820,#d0a858)",
        borderRadius:"3px 3px 8px 8px",border:"2.5px solid #705010",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.4), inset 3px -2px 6px rgba(255,200,100,0.2), 0 0 10px rgba(240,190,48,0.3)"}}/>
      {/* Coin sparkle */}
      <div style={{position:"absolute",bottom:20+bounce,right:13,width:9,height:9,
        background:"radial-gradient(circle at 35%,#f8e040,#c8a020)",borderRadius:"50%",
        boxShadow:`0 0 ${8+Math.sin(tick*0.1)*4}px #f8e040`}}/>
      {/* Coin bag knot */}
      <div style={{position:"absolute",bottom:31+bounce,right:9,width:10,height:5,
        background:"#906820",borderRadius:"50%"}}/>
      {/* Head (round, jolly) */}
      <div style={{position:"absolute",bottom:46+headBob,left:16,width:32,height:28,
        background:"linear-gradient(145deg,#f0c898,#e0b078)",
        borderRadius:"50% 50% 44% 44%",
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.16), inset 3px -2px 6px rgba(255,255,255,0.25)"}}/>
      {/* Rosy cheeks */}
      <div style={{position:"absolute",bottom:52+headBob,left:18,width:9,height:6,
        background:"rgba(255,160,130,0.35)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:52+headBob,right:18,width:9,height:6,
        background:"rgba(255,160,130,0.35)",borderRadius:"50%"}}/>
      {/* Hat brim */}
      <div style={{position:"absolute",bottom:68+headBob,left:10,width:44,height:9,
        background:"linear-gradient(145deg,#3a6818,#285010)",borderRadius:5,
        boxShadow:"inset -3px 2px 6px rgba(0,0,0,0.4)"}}/>
      {/* Hat body */}
      <div style={{position:"absolute",bottom:73+headBob,left:16,width:32,height:0,
        borderLeft:"16px solid transparent",borderRight:"16px solid transparent",
        borderBottom:"16px solid #2e5810",filter:"drop-shadow(-1px -1px 3px rgba(0,0,0,0.3))"}}/>
      {/* Eyes (happy squint) */}
      <div style={{position:"absolute",bottom:58+headBob,left:20,width:8,height:8,
        background:"#181008",borderRadius:"50%",transform:blink}}/>
      <div style={{position:"absolute",bottom:58+headBob,right:20,width:8,height:8,
        background:"#181008",borderRadius:"50%",transform:blink}}/>
      {/* Smile */}
      <div style={{position:"absolute",bottom:52+headBob,left:21,width:14,height:5,
        background:"transparent",borderBottom:"3px solid rgba(150,80,50,0.7)",
        borderRadius:"0 0 8px 8px"}}/>
    </>
  );
}

// ── ENEMY: ZOMBIE PROCESS ────────────────────────────────────────
function ZombieSprite({ tick, flash }) {
  const sway = Math.sin(tick * 0.04) * 5;
  const eyeGlow = `0 0 ${9+Math.sin(tick*0.12)*5}px #90ff30, 0 0 ${18+Math.sin(tick*0.1)*8}px #50c000`;
  const leg = "legSwing 0.55s ease-in-out infinite alternate";

  return (
    <>
      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",
        width:28,height:8,background:"rgba(0,80,0,0.25)",borderRadius:"50%",filter:"blur(3px)"}}/>
      {/* Decay aura */}
      <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:50,height:50,background:"radial-gradient(ellipse,rgba(80,180,30,0.08),transparent 70%)",
        borderRadius:"50%"}}/>
      {/* Legs (shambling) */}
      {[{l:17,delay:"0s"},{l:33,delay:"0.27s"}].map(({l,delay},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:13,height:22,
          background:"linear-gradient(90deg,#587028,#3a5018)",
          borderRadius:"0 0 4px 4px",animation:leg,animationDelay:delay,
          boxShadow:"inset -2px 0 6px rgba(0,0,0,0.5)"}}/>
      ))}
      {/* Body (tattered shirt) */}
      <div style={{position:"absolute",bottom:18,left:12,width:40,height:28,
        background:"linear-gradient(145deg,#6a7a30 0%,#4a5818 55%,#303808 100%)",
        borderRadius:"5px 5px 0 0",
        boxShadow:"inset -5px 5px 12px rgba(0,0,0,0.5), inset 3px -2px 6px rgba(100,190,50,0.12)"}}/>
      {/* Tatter tears */}
      <div style={{position:"absolute",bottom:18,left:15,width:8,height:14,
        background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.3))",
        borderRadius:"0 0 4px 4px",transform:"rotate(-5deg)"}}/>
      <div style={{position:"absolute",bottom:18,left:36,width:6,height:10,
        background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.3))",
        borderRadius:"0 0 4px 4px",transform:"rotate(8deg)"}}/>
      {/* Outstretched arms */}
      <div style={{position:"absolute",bottom:34,left:3,width:18,height:15,
        background:"linear-gradient(135deg,#6a7a30,#4a5818)",borderRadius:"4px 0 0 4px",
        transform:"rotate(-30deg) translateX(-3px)",
        boxShadow:"inset -2px 0 6px rgba(0,0,0,0.45)"}}/>
      <div style={{position:"absolute",bottom:30,right:3,width:15,height:13,
        background:"linear-gradient(135deg,#6a7a30,#4a5818)",borderRadius:"0 4px 4px 0",
        transform:"rotate(15deg)",
        boxShadow:"inset 2px 0 6px rgba(0,0,0,0.45)"}}/>
      {/* Scratching fingers */}
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",bottom:38-i*3,left:i*4-3,width:5,height:9,
          background:"#5a6820",borderRadius:"3px 3px 2px 2px",transform:`rotate(${-25+i*5}deg)`}}/>
      ))}
      {/* Head (decaying) */}
      <div style={{position:"absolute",bottom:40,left:16,width:32,height:26,
        background:"linear-gradient(145deg,#d0c8a0,#b8b090,#a0a880)",
        borderRadius:"48% 48% 42% 42%",transform:`rotate(${sway*0.4}deg)`,
        boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.22), inset 3px -2px 6px rgba(255,255,255,0.1)"}}/>
      {/* Decay spots */}
      <div style={{position:"absolute",bottom:50,left:22,width:7,height:5,
        background:"rgba(80,120,20,0.4)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:44,right:23,width:5,height:4,
        background:"rgba(80,120,20,0.3)",borderRadius:"50%"}}/>
      {/* Eye sockets */}
      <div style={{position:"absolute",bottom:47,left:20,width:12,height:12,
        background:"rgba(10,20,5,0.9)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:47,right:20,width:12,height:12,
        background:"rgba(10,20,5,0.9)",borderRadius:"50%"}}/>
      {/* Glowing eyes */}
      <div style={{position:"absolute",bottom:49,left:22,width:8,height:8,
        background:"#90ff30",borderRadius:"50%",boxShadow:eyeGlow}}/>
      <div style={{position:"absolute",bottom:49,right:22,width:8,height:8,
        background:"#90ff30",borderRadius:"50%",boxShadow:eyeGlow}}/>
      {/* Gaping mouth */}
      <div style={{position:"absolute",bottom:41,left:20,width:24,height:7,
        background:"rgba(8,18,4,0.92)",borderRadius:"0 0 8px 8px",
        boxShadow:"inset 0 3px 5px rgba(0,0,0,0.6)"}}/>
      {/* Teeth */}
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",bottom:41,left:21+i*8,width:6,height:5,
          background:"rgba(200,190,160,0.85)",borderRadius:"2px 2px 0 0"}}/>
      ))}
      {/* Z-state indicator */}
      <div style={{position:"absolute",bottom:64,right:14,
        fontFamily:"monospace",fontSize:11,color:"#80ff20",fontWeight:"bold",
        opacity:0.6+Math.sin(tick*0.08)*0.3,
        textShadow:"0 0 8px #60e010"}}>Z</div>
    </>
  );
}

// ── ENEMY: DEADLOCK DEMON / RACE CONDITION ───────────────────────
function DemonSprite({ tick, flash, id }) {
  const pulse = 1 + Math.sin(tick * 0.08) * 0.04;
  const wingAng = Math.sin(tick * 0.06) * 8;
  const isRace = id === "race";
  const baseColor = isRace ? "#ff7020" : "#cc2828";
  const eyeColor = isRace ? "#ffcc00" : "#ff6010";
  const fireGlow = `0 0 ${11+Math.sin(tick*0.1)*6}px ${eyeColor}`;
  const leg = "legSwing 0.38s ease-in-out infinite alternate";

  return (
    <>
      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",
        width:28,height:8,background:"rgba(200,0,0,0.3)",borderRadius:"50%",filter:"blur(3px)"}}/>
      {/* Aura pulse */}
      <div style={{position:"absolute",bottom:0,left:"50%",transform:`translateX(-50%) scale(${pulse})`,
        width:56,height:56,background:`radial-gradient(ellipse,${baseColor}14,transparent 70%)`,
        borderRadius:"50%"}}/>
      {/* Legs */}
      {[{l:17,delay:"0s"},{l:33,delay:"0.19s"}].map(({l,delay},i)=>(
        <div key={i} style={{position:"absolute",bottom:2,left:l,width:13,height:20,
          background:`linear-gradient(90deg,${baseColor}aa,${baseColor}66)`,
          borderRadius:"0 0 4px 4px",animation:leg,animationDelay:delay,
          boxShadow:"inset -2px 0 5px rgba(0,0,0,0.5)"}}/>
      ))}
      {/* Body */}
      <div style={{position:"absolute",bottom:14,left:9,width:46,height:32,
        background:`linear-gradient(145deg,${baseColor} 0%,${baseColor}aa 50%,#680808 100%)`,
        borderRadius:"6px 6px 4px 4px",
        boxShadow:`inset -6px 6px 14px rgba(0,0,0,0.55), inset 4px -2px 8px rgba(255,120,80,0.2), 0 4px 18px rgba(180,0,0,0.3)`}}/>
      {/* Body sheen */}
      <div style={{position:"absolute",bottom:32,left:15,width:14,height:8,
        background:"rgba(255,255,255,0.14)",borderRadius:"50%",filter:"blur(1.5px)"}}/>
      {/* Wings */}
      {[
        {s:{bottom:20,left:-18,width:32,height:38,borderRadius:"0 60% 30% 0",transform:`rotate(${-10+wingAng}deg)`,transformOrigin:"right bottom"}},
        {s:{bottom:20,right:-18,width:32,height:38,borderRadius:"60% 0 0 30%",transform:`rotate(${10-wingAng}deg)`,transformOrigin:"left bottom"}},
      ].map(({s},i)=>(
        <div key={i} style={{position:"absolute",...s,
          background:"linear-gradient(135deg,#801010,#2a0404)",opacity:0.94,
          boxShadow:"inset 0 0 10px rgba(0,0,0,0.55)"}}/>
      ))}
      {/* Wing vein lines */}
      <div style={{position:"absolute",bottom:24,left:-12,width:18,height:2,
        background:"rgba(255,80,80,0.3)",transform:`rotate(${-15+wingAng*0.5}deg)`,transformOrigin:"right"}}/>
      <div style={{position:"absolute",bottom:24,right:-12,width:18,height:2,
        background:"rgba(255,80,80,0.3)",transform:`rotate(${15-wingAng*0.5}deg)`,transformOrigin:"left"}}/>
      {/* Arms */}
      {[{l:5,bs:"inset -3px 0 7px rgba(0,0,0,0.45)"},{r:5,bs:"inset 3px 0 7px rgba(0,0,0,0.45)"}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:34,...(s.l?{left:s.l}:{right:s.r}),width:16,height:18,
          background:`linear-gradient(90deg,${baseColor},${baseColor}77)`,
          borderRadius:"4px",boxShadow:s.bs}}/>
      ))}
      {/* Clawed hands */}
      {[-1,1].map((side,i)=>(
        [0,1,2].map(f=>(
          <div key={`${i}-${f}`} style={{position:"absolute",bottom:32,
            ...(side<0?{left:3+f*4}:{right:3+f*4}),width:5,height:10,
            background:baseColor,borderRadius:"3px 3px 1px 1px",
            transform:`rotate(${side*(f-1)*12}deg)`}}/>
        ))
      ))}
      {/* Head */}
      <div style={{position:"absolute",bottom:38,left:13,width:38,height:32,
        background:`linear-gradient(145deg,${baseColor} 0%,${baseColor}cc 50%,#780808 100%)`,
        borderRadius:"50% 50% 42% 42%",
        boxShadow:`inset -5px 5px 12px rgba(0,0,0,0.5), inset 4px -2px 8px rgba(255,150,150,0.12)`}}/>
      {/* Horns */}
      {[{l:14,r:"rotate(-16deg)"},{r:14,r2:"rotate(16deg)"}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:63,...(s.l?{left:s.l}:{right:s.r||s.r2?s.r||14:14}),
          width:11,height:17,
          background:`linear-gradient(145deg,#991010,#600808)`,
          borderRadius:"48% 48% 0 0",transform:i===0?"rotate(-16deg)":"rotate(16deg)",
          boxShadow:"inset -2px 2px 5px rgba(0,0,0,0.45)"}}/>
      ))}
      {/* Fiery eyes */}
      <div style={{position:"absolute",bottom:53,left:16,width:12,height:10,
        background:`linear-gradient(180deg,#ffcc00,${eyeColor})`,borderRadius:4,boxShadow:fireGlow}}/>
      <div style={{position:"absolute",bottom:53,right:16,width:12,height:10,
        background:`linear-gradient(180deg,#ffcc00,${eyeColor})`,borderRadius:4,boxShadow:fireGlow}}/>
      {/* Mouth */}
      <div style={{position:"absolute",bottom:43,left:17,width:30,height:7,
        background:"#180808",borderRadius:"0 0 4px 4px"}}/>
      {[0,1,2,3].map(i=>(
        <div key={i} style={{position:"absolute",bottom:42,left:18+i*8,width:7,height:6,
          background:"linear-gradient(180deg,#f0c0a0,#d0a080)",borderRadius:"0 0 3px 3px"}}/>
      ))}
      {/* Chain/mutex props for deadlock */}
      {!isRace && (
        <div style={{position:"absolute",bottom:28,left:7,width:18,height:18,
          border:"3px solid rgba(180,160,100,0.6)",borderRadius:"50%",
          boxShadow:"0 0 6px rgba(200,180,100,0.3)"}}/>
      )}
      {/* Speed lines for race */}
      {isRace && [0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",bottom:20+i*12,left:-8,width:14+i*3,height:2,
          background:`rgba(255,160,40,${0.5-i*0.1})`,borderRadius:2}}/>
      ))}
    </>
  );
}

// ── ENEMY: GHOST THREAD / MEMORY LEAK / PAGE FAULT ───────────────
function GhostSprite({ tick, flash, id }) {
  const floatY = Math.sin(tick * 0.06) * 7;
  const alpha = 0.72 + Math.sin(tick * 0.04) * 0.14;
  const glowR = 16 + Math.sin(tick * 0.08) * 7;
  const isLeak = id === "leak";
  const isFault = id === "fault";

  const bodyColor = isLeak
    ? "rgba(50,100,255,0.88)"
    : isFault
    ? "rgba(220,180,20,0.88)"
    : "rgba(160,175,250,0.88)";
  const glowColor = isLeak ? "rgba(80,140,255,0.55)" : isFault ? "rgba(255,200,30,0.55)" : "rgba(140,160,255,0.55)";
  const eyeColor = isLeak ? "#88ccff" : isFault ? "#ffee80" : "#c8d8ff";

  return (
    <div style={{transform:`translateY(${-floatY}px)`,opacity:alpha,width:"100%",height:"100%",position:"absolute",inset:0}}>
      {/* Floor shadow */}
      <div style={{position:"absolute",bottom:-4+floatY,left:"50%",transform:"translateX(-50%)",
        width:`${28+Math.abs(floatY)*1.5}px`,height:`${8-Math.abs(floatY)*0.4}px`,
        background:`rgba(0,0,0,0.2)`,borderRadius:"50%",filter:"blur(3px)"}}/>

      {/* Main ghost body */}
      <div style={{position:"absolute",bottom:6,left:8,width:48,height:54,
        background:`linear-gradient(180deg,${bodyColor},${isLeak?"rgba(30,70,200,0.65)":isFault?"rgba(180,140,10,0.6)":"rgba(120,135,230,0.65)"})`,
        borderRadius:"50% 50% 32% 32%",
        boxShadow:`inset -7px 7px 18px rgba(0,0,0,0.18), inset 5px -3px 10px rgba(255,255,255,0.3), 0 0 ${glowR}px ${glowColor}`}}/>

      {/* Highlight */}
      <div style={{position:"absolute",bottom:38,left:15,width:18,height:14,
        background:"rgba(255,255,255,0.35)",borderRadius:"50%",filter:"blur(2.5px)"}}/>

      {/* Wavy bottom tentacles */}
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{position:"absolute",
          bottom:2+Math.sin(tick*0.1+i*1.3)*5,left:8+i*10,width:12,height:18,
          background:`linear-gradient(180deg,${isLeak?"rgba(40,90,210,0.75)":isFault?"rgba(200,160,20,0.75)":"rgba(130,145,240,0.72)"},transparent)`,
          borderRadius:"0 0 50% 50%"}}/>
      ))}

      {/* Eye sockets */}
      {[{l:13},{r:13}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:36,...(s.l?{left:s.l}:{right:s.r}),width:16,height:18,
          background:"rgba(6,6,30,0.9)",borderRadius:"50%"}}/>
      ))}
      {/* Glowing pupils */}
      {[{l:16},{r:16}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:40,...(s.l?{left:s.l}:{right:s.r}),width:10,height:11,
          background:eyeColor,borderRadius:"50%",
          boxShadow:`0 0 ${8+Math.sin(tick*0.1+i)*4}px ${eyeColor}`}}/>
      ))}
      {/* Mouth */}
      <div style={{position:"absolute",bottom:28,left:18,width:28,height:10,
        background:"rgba(6,6,30,0.9)",borderRadius:"0 0 14px 14px"}}/>

      {/* Type-specific details */}
      {isLeak && (
        <>
          {/* Dripping memory */}
          {[0,1,2].map(i=>(
            <div key={i} style={{position:"absolute",
              bottom:2+Math.sin(tick*0.12+i*2)*4,left:18+i*12,width:6,
              height:8+Math.sin(tick*0.08+i)*4,
              background:"rgba(60,120,255,0.7)",borderRadius:"50% 50% 50% 50%/0% 0% 100% 100%",
              boxShadow:"0 0 4px rgba(80,140,255,0.5)"}}/>
          ))}
          <div style={{position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",
            fontFamily:"monospace",fontSize:9,color:"#66aaff",fontWeight:"bold",
            textShadow:"0 0 6px #4488ff",whiteSpace:"nowrap"}}>malloc()</div>
        </>
      )}
      {isFault && (
        <>
          {/* Page fault ⚡ sparks */}
          {[0,1].map(i=>(
            <div key={i} style={{position:"absolute",
              bottom:48+Math.sin(tick*0.15+i*3)*8,left:i===0?8:40,
              width:6,height:14,
              background:`rgba(255,220,40,${0.7+Math.sin(tick*0.12)*0.2})`,
              borderRadius:"0 0 50% 50%",transform:"rotate(15deg)",
              boxShadow:"0 0 6px rgba(255,200,30,0.7)"}}/>
          ))}
          <div style={{position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",
            fontFamily:"monospace",fontSize:9,color:"#ffee44",fontWeight:"bold",
            textShadow:"0 0 6px #ffcc00",whiteSpace:"nowrap"}}>PF#14</div>
        </>
      )}
    </div>
  );
}

// ── BOSS: THE KERNEL PANIC ────────────────────────────────────────
function BossSprite({ tick, flash }) {
  const bossAura = `0 0 ${38+Math.sin(tick*0.06)*20}px rgba(255,10,60,0.65), 0 0 ${75+Math.sin(tick*0.04)*28}px rgba(200,0,40,0.35)`;
  const bossPulse = 1 + Math.sin(tick * 0.05) * 0.04;
  const eyeGlow = `0 0 ${15+Math.sin(tick*0.1)*8}px #ff1040, 0 0 ${30+Math.cos(tick*0.08)*12}px rgba(255,0,50,0.5)`;

  return (
    <>
      {/* Ground aura shadow */}
      <div style={{position:"absolute",bottom:-8,left:"50%",transform:`translateX(-50%) scale(${bossPulse})`,
        width:58,height:16,background:"rgba(255,0,50,0.3)",borderRadius:"50%",filter:"blur(5px)"}}/>

      {/* Outer aura ring */}
      <div style={{position:"absolute",inset:-10,borderRadius:12,
        boxShadow:bossAura,pointerEvents:"none"}}/>

      {/* Body (large skull-torso) */}
      <div style={{position:"absolute",bottom:4,left:2,width:60,height:46,
        background:"linear-gradient(145deg,#de0826 0%,#aa0012 52%,#780010 100%)",
        borderRadius:10,
        boxShadow:`inset -8px 8px 20px rgba(0,0,0,0.6), inset 6px -3px 10px rgba(255,120,120,0.18), ${bossAura}`}}/>
      {/* Body highlight */}
      <div style={{position:"absolute",bottom:28,left:10,width:22,height:12,
        background:"rgba(255,255,255,0.13)",borderRadius:"50%",filter:"blur(2px)"}}/>

      {/* Skull face */}
      <div style={{position:"absolute",bottom:27,left:6,width:52,height:37,
        background:"linear-gradient(145deg,#eeeeee 0%,#c8c8c8 55%,#a0a0a0 100%)",
        borderRadius:"50% 50% 42% 42%",
        boxShadow:"inset -6px 6px 14px rgba(0,0,0,0.25), inset 4px -3px 8px rgba(255,255,255,0.3)"}}/>
      {/* Skull forehead crack */}
      <div style={{position:"absolute",bottom:53,left:30,width:3,height:10,
        background:"rgba(0,0,0,0.4)",borderRadius:2}}/>
      <div style={{position:"absolute",bottom:52,left:32,width:2,height:7,
        background:"rgba(0,0,0,0.3)",borderRadius:2,transform:"rotate(25deg)"}}/>

      {/* Eye sockets (deep) */}
      {[{l:10},{r:10}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:42,...(s.l?{left:s.l}:{right:s.r}),width:17,height:17,
          background:"linear-gradient(145deg,#060606,#181818)",borderRadius:"50%",
          boxShadow:"inset 0 0 10px rgba(0,0,0,0.85)"}}/>
      ))}
      {/* Glowing red eyes */}
      {[{l:13},{r:13}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:45,...(s.l?{left:s.l}:{right:s.r}),width:11,height:11,
          background:"radial-gradient(circle at 40%,#ff5070,#cc0030)",borderRadius:"50%",
          boxShadow:eyeGlow}}/>
      ))}

      {/* Nose cavity */}
      <div style={{position:"absolute",bottom:40,left:26,width:12,height:8,
        background:"rgba(0,0,0,0.55)",borderRadius:"50%"}}/>

      {/* Mouth (teeth) */}
      <div style={{position:"absolute",bottom:31,left:11,width:42,height:8,
        background:"#060606",borderRadius:"0 0 3px 3px"}}/>
      {[0,1,2,3,4,5].map(i=>(
        <div key={i} style={{position:"absolute",bottom:27,left:12+i*7,width:6,height:9,
          background:"linear-gradient(180deg,#eeeeee,#c0c0c0)",borderRadius:"0 0 3px 3px"}}/>
      ))}

      {/* Crown */}
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{position:"absolute",bottom:60,left:2+i*13,width:10,height:i%2===0?18:13,
          background:"linear-gradient(180deg,#f8d040,#d0a810,#f0c020)",
          borderRadius:"4px 4px 0 0",
          boxShadow:`0 0 ${6+Math.sin(tick*0.08+i)*3}px #f8d040, inset -2px 2px 5px rgba(255,255,255,0.2)`}}/>
      ))}
      {/* Crown band */}
      <div style={{position:"absolute",bottom:58,left:1,right:1,height:10,
        background:"linear-gradient(145deg,#d0a818,#a08010,#c09018)",borderRadius:3,
        boxShadow:"inset -3px 2px 6px rgba(0,0,0,0.4)"}}/>
      {/* Crown gems */}
      {[{l:14,c:"#ff4080"},{l:28,c:"#40ffaa"},{l:42,c:"#4080ff"}].map(({l,c},i)=>(
        <div key={i} style={{position:"absolute",bottom:62,left:l,width:7,height:7,
          background:`radial-gradient(circle at 35%,${c},${c}88)`,borderRadius:"50%",
          boxShadow:`0 0 ${5+Math.sin(tick*0.09+i)*3}px ${c}`}}/>
      ))}

      {/* Bone arms */}
      {[{l:-4,rot:-25,bs:"inset -3px 0 8px rgba(0,0,0,0.4)"},{r:-4,rot:25,bs:"inset 3px 0 8px rgba(0,0,0,0.4)"}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:20,...(s.l!==undefined?{left:s.l}:{right:s.r}),width:14,height:28,
          background:"linear-gradient(145deg,#d8d8d8,#b0b0b0)",
          borderRadius:6,transform:`rotate(${s.rot}deg)`,
          boxShadow:s.bs}}/>
      ))}
      {/* Knuckle joints */}
      {[{l:-2,b:24},{r:-2,b:24}].map((s,i)=>(
        <div key={i} style={{position:"absolute",bottom:s.b,...(s.l!==undefined?{left:s.l}:{right:s.r}),width:9,height:9,
          background:"#c8c8c8",borderRadius:"50%",
          boxShadow:"inset -1px 1px 3px rgba(0,0,0,0.3)"}}/>
      ))}

      {/* BSOD text overlay */}
      <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",
        fontFamily:"monospace",fontSize:8,color:"rgba(255,80,80,0.7)",fontWeight:"bold",
        whiteSpace:"nowrap",letterSpacing:1,textShadow:"0 0 6px rgba(255,0,30,0.5)"}}>KERNEL_PANIC</div>
    </>
  );
}

// ── MAIN CHARSPRITE EXPORT ────────────────────────────────────────
export function CharSprite({ role, moving=false, color="#f5c518", size=64, flash=false, tick=0, facing=0 }) {
  const s = size / 64;
  const filt = flash ? "brightness(2.8) saturate(0.1)" : "none";
  const flipX = facing === 2 ? "scaleX(-1)" : "scaleX(1)";

  // Map roles to components
  const inner = (() => {
    switch (role) {
      case "player":       return <PlayerSprite  color={color} tick={tick} moving={moving} facing={facing}/>;
      case "wizard":       return <WizardSprite  tick={tick}/>;
      case "guard":        return <GuardSprite   tick={tick}/>;
      case "elder":        return <ElderSprite   tick={tick}/>;
      case "merchant":     return <MerchantSprite tick={tick}/>;
      case "enemy_zombie": return <ZombieSprite  tick={tick} flash={flash}/>;
      case "enemy_demon":  return <DemonSprite   tick={tick} flash={flash} id="deadlock"/>;
      case "enemy_race":   return <DemonSprite   tick={tick} flash={flash} id="race"/>;
      case "enemy_ghost":  return <GhostSprite   tick={tick} flash={flash} id="ghost"/>;
      case "enemy_leak":   return <GhostSprite   tick={tick} flash={flash} id="leak"/>;
      case "enemy_fault":  return <GhostSprite   tick={tick} flash={flash} id="fault"/>;
      case "boss":         return <BossSprite    tick={tick} flash={flash}/>;
      default:             return <div style={{width:48,height:48,background:"#555",borderRadius:6,position:"absolute",bottom:8,left:8}}/>;
    }
  })();

  return (
    <div style={{
      position: "relative",
      width: 64,
      height: 64,
      transform: `scale(${s}) ${flipX}`,
      transformOrigin: "bottom center",
      filter: filt,
      overflow: "visible",
    }}>
      {inner}
    </div>
  );
}