// ═══════════════════════════════════════
//  WORLD OBJECT — Enhanced 3D Objects
//  Trees, Rocks, Houses, Castle, Chest
// ═══════════════════════════════════════

const T = { TREE:4, ROCK:5, HOUSE:6, CASTLE:7, CHEST:10 };
const TILE = 64;

export function WorldObject({ type, x, y, tick }) {

  if (type === T.TREE) {
    const windSway = Math.sin((x*2 + y*5 + tick*0.033) % (Math.PI*2));
    const swayDeg = windSway * 3;
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,pointerEvents:"none"}}>
        {/* Ground shadow */}
        <div style={{position:"absolute",bottom:-3,left:"50%",transform:"translateX(-50%)",
          width:42,height:11,background:"rgba(0,0,0,0.22)",borderRadius:"50%",filter:"blur(3px)"}}/>
        {/* Trunk */}
        <div style={{position:"absolute",left:"50%",bottom:0,transform:"translateX(-50%)",width:14,height:26,
          background:"linear-gradient(90deg,#8a5a28 0%,#6a4018 42%,#a06830 72%,#7a5020 100%)",
          borderRadius:"4px 4px 3px 3px",
          boxShadow:"inset -3px 0 7px rgba(0,0,0,0.45), inset 2px 0 4px rgba(255,255,255,0.15), 2px 4px 10px rgba(0,0,0,0.4)"}}/>
        {/* Trunk texture lines */}
        <div style={{position:"absolute",left:"50%",bottom:6,transform:"translateX(-50%)",width:2,height:16,
          background:"rgba(0,0,0,0.2)",borderRadius:2}}/>
        {/* Bottom foliage */}
        <div style={{position:"absolute",left:"50%",bottom:19,
          transform:`translateX(-50%) rotate(${swayDeg}deg)`,transformOrigin:"bottom center",
          width:52,height:44,
          background:"radial-gradient(ellipse at 42% 30%,#7ace46 0%,#52a028 52%,#3a7818 82%,#2a5810 100%)",
          borderRadius:"50% 50% 44% 44%",
          boxShadow:"inset -5px 5px 14px rgba(0,0,0,0.35), inset 4px -2px 8px rgba(255,255,255,0.2), 0 6px 18px rgba(0,0,0,0.5)"}}/>
        {/* Mid foliage */}
        <div style={{position:"absolute",left:"50%",bottom:33,
          transform:`translateX(-50%) rotate(${swayDeg*0.7}deg)`,transformOrigin:"bottom center",
          width:38,height:32,
          background:"radial-gradient(ellipse at 42% 30%,#8add52 0%,#60b030 52%,#449820 100%)",
          borderRadius:"50% 50% 44% 44%",
          boxShadow:"inset -4px 4px 10px rgba(0,0,0,0.3), inset 3px -2px 7px rgba(255,255,255,0.22)"}}/>
        {/* Top foliage */}
        <div style={{position:"absolute",left:"50%",bottom:47,
          transform:`translateX(-50%) rotate(${swayDeg*0.9}deg)`,transformOrigin:"bottom center",
          width:26,height:22,
          background:"radial-gradient(ellipse at 42% 30%,#9aee62 0%,#70c038 100%)",
          borderRadius:"50%",
          boxShadow:"inset -3px 3px 8px rgba(0,0,0,0.24), inset 2px -1px 5px rgba(255,255,255,0.26)"}}/>
      </div>
    );
  }

  if (type === T.ROCK) {
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,pointerEvents:"none",
        display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:7}}>
        <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",
          width:40,height:9,background:"rgba(0,0,0,0.28)",borderRadius:"50%",filter:"blur(2px)"}}/>
        {/* Main rock */}
        <div style={{position:"relative",width:44,height:34,
          background:"radial-gradient(ellipse at 32% 26%,#d0d8e0 0%,#9090a0 42%,#606072 82%,#404052 100%)",
          borderRadius:"46% 54% 55% 45%/58% 44% 58% 44%",
          boxShadow:"inset -6px 6px 15px rgba(0,0,0,0.48), inset 4px -2px 8px rgba(255,255,255,0.32), 3px 6px 16px rgba(0,0,0,0.5)"}}>
          {/* Specular highlight */}
          <div style={{position:"absolute",top:"12%",left:"14%",width:"30%",height:"22%",
            background:"rgba(255,255,255,0.42)",borderRadius:"50%",transform:"rotate(-30deg)",filter:"blur(1.5px)"}}/>
          {/* Crack */}
          <div style={{position:"absolute",top:"30%",left:"52%",width:2,height:"35%",
            background:"rgba(0,0,0,0.25)",borderRadius:1,transform:"rotate(15deg)"}}/>
        </div>
        {/* Small side pebble */}
        <div style={{position:"absolute",bottom:3,right:12,width:17,height:13,
          background:"radial-gradient(ellipse at 35% 28%,#c0c8d0,#787888)",
          borderRadius:"50%",
          boxShadow:"inset -2px 2px 6px rgba(0,0,0,0.42), 1px 3px 7px rgba(0,0,0,0.4)"}}/>
      </div>
    );
  }

  if (type === T.HOUSE) {
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,pointerEvents:"none"}}>
        <div style={{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",
          width:52,height:11,background:"rgba(0,0,0,0.2)",borderRadius:"50%",filter:"blur(3px)"}}/>
        {/* House body */}
        <div style={{position:"absolute",bottom:0,left:4,right:4,height:40,
          background:"linear-gradient(145deg,#f0e0a8 0%,#e8d090 32%,#d4bc78 100%)",
          border:"2px solid #b89840",borderRadius:"3px 3px 0 0",
          boxShadow:"inset -5px 0 12px rgba(0,0,0,0.15), inset 4px 0 8px rgba(255,255,255,0.22), 3px 6px 16px rgba(0,0,0,0.4)"}}>
          {/* Door */}
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
            width:15,height:24,background:"linear-gradient(180deg,#9a5828,#6a3810)",
            border:"1.5px solid #4a2808",borderRadius:"5px 5px 0 0",
            boxShadow:"inset -2px 0 5px rgba(0,0,0,0.5), inset 1.5px 0 3px rgba(255,255,255,0.12)"}}/>
          {/* Door knob */}
          <div style={{position:"absolute",bottom:10,left:"50%",marginLeft:4,
            width:4,height:4,background:"#d0a030",borderRadius:"50%",
            boxShadow:"0 0 3px rgba(200,160,40,0.6)"}}/>
          {/* Windows */}
          {[{l:6},{r:6}].map((s,i)=>(
            <div key={i} style={{position:"absolute",bottom:17,...(s.l?{left:s.l}:{right:s.r}),width:12,height:12,
              background:"linear-gradient(135deg,#bbd8ff,#88aacc)",border:"2px solid #7890a8",
              boxShadow:"inset 0 0 7px rgba(0,50,150,0.32)"}}>
              {/* Window cross */}
              <div style={{position:"absolute",top:0,bottom:0,left:"50%",width:1,background:"#7890a8",marginLeft:-0.5}}/>
              <div style={{position:"absolute",left:0,right:0,top:"50%",height:1,background:"#7890a8",marginTop:-0.5}}/>
            </div>
          ))}
        </div>
        {/* Roof */}
        <div style={{position:"absolute",top:5,left:-3,right:-3,height:0,
          borderLeft:"35px solid transparent",borderRight:"35px solid transparent",
          borderBottom:"30px solid #e04030",
          filter:"drop-shadow(0 -2px 5px rgba(0,0,0,0.32))"}}/>
        {/* Roof highlight */}
        <div style={{position:"absolute",top:5,left:7,right:7,height:0,
          borderLeft:"26px solid transparent",borderRight:"26px solid transparent",
          borderBottom:"11px solid rgba(255,255,255,0.16)"}}/>
        {/* Chimney */}
        <div style={{position:"absolute",top:4,right:14,width:9,height:14,
          background:"linear-gradient(90deg,#a09080,#807060)",
          boxShadow:"inset -2px 0 4px rgba(0,0,0,0.3)"}}/>
        {/* Smoke puff */}
        <div style={{position:"absolute",top:-4+Math.sin(tick*0.05)*2,right:12,width:12,height:9,
          background:"rgba(200,190,180,0.35)",borderRadius:"50%",filter:"blur(2px)"}}/>
      </div>
    );
  }

  if (type === T.CASTLE) {
    const flagWave = Math.sin(tick * 0.08) * 4;
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,pointerEvents:"none"}}>
        <div style={{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",
          width:54,height:13,background:"rgba(0,0,0,0.28)",borderRadius:"50%",filter:"blur(4px)"}}/>
        {/* Main wall */}
        <div style={{position:"absolute",bottom:0,left:6,right:6,height:48,
          background:"linear-gradient(145deg,#c0c4d4 0%,#9098b0 52%,#687088 100%)",
          border:"2px solid #507080",
          boxShadow:"inset -6px 0 14px rgba(0,0,0,0.3), inset 4px 0 8px rgba(255,255,255,0.18), 4px 8px 20px rgba(0,0,0,0.5)"}}>
          {/* Arch window */}
          <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
            width:16,height:24,background:"linear-gradient(180deg,#1a1a2c,#0a0a18)",
            borderRadius:"50% 50% 0 0",boxShadow:"inset 0 0 10px rgba(100,100,255,0.22)"}}/>
          {/* Wall bricks hint */}
          {[14,26,38].map(h=>(
            <div key={h} style={{position:"absolute",bottom:h,left:0,right:0,height:1,
              background:"rgba(0,0,0,0.12)"}}/>
          ))}
        </div>
        {/* Battlements (merlons) */}
        {[0,1,2,3].map(i=>(
          <div key={i} style={{position:"absolute",bottom:46,left:6+i*13,width:11,height:13,
            background:"linear-gradient(180deg,#b0b4c4,#8088a0)",border:"1.5px solid #5a6070",
            boxShadow:"inset -2px 0 4px rgba(0,0,0,0.28), inset 1px 0 3px rgba(255,255,255,0.16)"}}/>
        ))}
        {/* Side towers */}
        {[{side:"left",l:0},{side:"right",r:0}].map((s,i)=>(
          <div key={i} style={{position:"absolute",bottom:0,...(s.l!==undefined?{left:s.l}:{right:s.r}),width:19,height:44,
            background:"linear-gradient(145deg,#aab0c4 0%,#8090a8 52%,#607090 100%)",
            border:"2px solid #506070",
            boxShadow:`${i===0?"-2px":"2px"} 6px 14px rgba(0,0,0,0.45), inset ${i===0?"-3px":"3px"} 0 8px rgba(0,0,0,0.32)`}}>
            {/* Tower battlements */}
            {[0,1].map(j=>(
              <div key={j} style={{position:"absolute",top:-11,left:1+j*10,width:8,height:11,
                background:"linear-gradient(180deg,#b0b8cc,#909aac)",border:"1px solid #506070"}}/>
            ))}
            {/* Arrow slit */}
            <div style={{position:"absolute",top:"30%",left:"50%",transform:"translateX(-50%)",
              width:3,height:10,background:"rgba(0,0,0,0.5)",borderRadius:2}}/>
          </div>
        ))}
        {/* Flagpole */}
        <div style={{position:"absolute",bottom:42,left:"50%",transform:"translateX(-50%)",
          width:3,height:20,background:"#8a5020"}}/>
        {/* Flag */}
        <div style={{position:"absolute",bottom:55,left:"50%",
          width:18,height:11,
          background:"linear-gradient(90deg,#e04030,#c02010)",
          borderRadius:"0 4px 4px 0",
          transform:`skewY(${flagWave}deg)`,transformOrigin:"left",
          boxShadow:"0 0 8px rgba(220,60,40,0.5)"}}/>
      </div>
    );
  }

  if (type === T.CHEST) {
    const glowPulse = 9 + Math.sin(tick * 0.1) * 5;
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,pointerEvents:"none",
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",bottom:11,left:"50%",transform:"translateX(-50%)",
          width:34,height:9,background:"rgba(0,0,0,0.28)",borderRadius:"50%",filter:"blur(2px)"}}/>
        {/* Chest body */}
        <div style={{position:"relative",width:38,height:30,
          background:"linear-gradient(145deg,#d4a050 0%,#b08030 52%,#906820 100%)",
          border:"3px solid #7a5010",borderRadius:6,
          boxShadow:`inset -4px 4px 10px rgba(0,0,0,0.38), inset 3px -2px 6px rgba(255,200,100,0.22),
            0 0 ${glowPulse}px rgba(240,192,48,0.55), 2px 5px 14px rgba(0,0,0,0.5)`}}>
          {/* Lid */}
          <div style={{position:"absolute",top:0,left:-1,right:-1,height:14,
            background:"linear-gradient(145deg,#e4b060 0%,#c09040 100%)",
            borderRadius:"5px 5px 0 0",borderBottom:"2.5px solid #7a5010",
            boxShadow:"inset 0 3px 7px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.22)"}}/>
          {/* Lid shine */}
          <div style={{position:"absolute",top:3,left:6,width:12,height:5,
            background:"rgba(255,255,255,0.2)",borderRadius:"50%",filter:"blur(1px)"}}/>
          {/* Metal bands */}
          {[12,20].map(t=>(
            <div key={t} style={{position:"absolute",top:t,left:0,right:0,height:2.5,
              background:"linear-gradient(90deg,#7a5010,#c09030,#7a5010)"}}/>
          ))}
          {/* Lock */}
          <div style={{position:"absolute",top:"48%",left:"50%",transform:"translate(-50%,-50%)",
            width:10,height:9,background:"linear-gradient(145deg,#f8d040,#c8a820)",
            borderRadius:3,border:"1.5px solid #a08010",
            boxShadow:`inset -1px 1px 3px rgba(0,0,0,0.32), 0 0 ${7+Math.sin(tick*0.12)*3}px rgba(248,208,64,0.7)`}}/>
          {/* Keyhole */}
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            width:4,height:5,background:"rgba(100,60,0,0.6)",borderRadius:"50% 50% 2px 2px"}}/>
        </div>
        {/* Glow ring on floor */}
        <div style={{position:"absolute",bottom:9,left:"50%",transform:"translateX(-50%)",
          width:42,height:6,
          background:`radial-gradient(ellipse,rgba(240,190,40,${0.18+Math.sin(tick*0.1)*0.08}),transparent 70%)`,
          borderRadius:"50%"}}/>
      </div>
    );
  }

  return null;
}