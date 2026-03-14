// ═══════════════════════════════════════
//  TILE CELL — Enhanced 3D Ground Tiles
// ═══════════════════════════════════════

// Tile type constants (must match constants.js)
const T = { GRASS:0, DARK_GRASS:1, PATH:2, WATER:3, TREE:4, ROCK:5, HOUSE:6, CASTLE:7, SAND:8, FLOWER:9, CHEST:10 };

export function TileCell({ type, x, y, tick }) {
  const TILE = 80;
  const time = tick * 0.016;

  // Water animation
  if (type === T.WATER) {
    const wp = (x * 7 + y * 13 + time * 0.32) % (Math.PI * 2);
    const hue = 202 + Math.sin(wp * 0.5) * 10;
    const lit = 46 + Math.sin(wp * 0.4) * 8;
    return (
      <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,
        background:`hsl(${hue},72%,${lit}%)`,
        boxShadow:"inset 0 -5px 12px rgba(0,50,120,0.35), inset 0 2px 6px rgba(100,200,255,0.28)"}}>
        {/* Wave lines */}
        <div style={{position:"absolute",top:`${28+Math.sin(wp)*6}%`,left:"8%",right:"8%",height:2,
          background:"rgba(255,255,255,0.3)",borderRadius:2,
          transform:`scaleX(${0.7+Math.sin(wp*0.8)*0.22})`}}/>
        <div style={{position:"absolute",top:`${52+Math.cos(wp)*6}%`,left:"16%",right:"16%",height:1.5,
          background:"rgba(255,255,255,0.18)",borderRadius:1,
          transform:`scaleX(${0.6+Math.cos(wp*0.7)*0.26})`}}/>
        {/* Shimmer */}
        <div style={{position:"absolute",
          top:`${18+Math.sin(wp*1.2)*9}%`,left:`${28+Math.cos(wp)*16}%`,
          width:7,height:7,background:"rgba(255,255,255,0.5)",borderRadius:"50%",filter:"blur(1px)"}}/>
      </div>
    );
  }

  const bgs = {
    [T.GRASS]:      "linear-gradient(145deg,#5daa3e 0%,#4a9230 42%,#62bc44 100%)",
    [T.DARK_GRASS]: "linear-gradient(145deg,#3d7a28 0%,#2e5e1a 100%)",
    [T.PATH]:       "linear-gradient(145deg,#e8c880 0%,#d4b060 52%,#edd898 100%)",
    [T.SAND]:       "linear-gradient(145deg,#eed880,#d8c060)",
    [T.FLOWER]:     "linear-gradient(145deg,#5daa3e,#62bc44)",
  };

  const tileDepth = "inset 0 -3px 7px rgba(0,0,0,0.18), inset 0 2px 4px rgba(255,255,255,0.16)";
  const flowerBob = Math.sin((x * 5 + y * 11 + time * 0.5) % (Math.PI * 2));

  return (
    <div style={{position:"absolute",left:x*TILE,top:y*TILE,width:TILE,height:TILE,
      background:bgs[type] || bgs[T.GRASS],boxShadow:tileDepth}}>
      {type === T.FLOWER && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:20,opacity:0.92,
          transform:`translateY(${flowerBob*2}px) scale(${1+flowerBob*0.05})`,
          filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.35))"}}>
          {(x+y)%3===0?"🌸":(x+y)%3===1?"🌼":"🌺"}
        </div>
      )}
      {type === T.DARK_GRASS && (x*y)%7===0 && (
        <div style={{position:"absolute",bottom:4,left:`${20+x%40}%`,fontSize:12,opacity:0.55,
          filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.5))"}}>🌿</div>
      )}
      {type === T.PATH && (
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(145deg,rgba(255,255,255,0.13) 0%,transparent 50%,rgba(0,0,0,0.1) 100%)"}}/>
      )}
      {type === T.SAND && (
        <div style={{position:"absolute",inset:0,
          background:"radial-gradient(ellipse at 30% 35%,rgba(255,255,255,0.1),transparent 60%)"}}/>
      )}
    </div>
  );
}