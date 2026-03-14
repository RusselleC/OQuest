// ═══════════════════════════════════════
//  GAME CONSTANTS
// ═══════════════════════════════════════

export const TILE = 80;
export const MAP_W = 50;
export const MAP_H = 35;
export const VIEW_W = 25;
export const VIEW_H = 16;
export const MOVE_DELAY = 5;

export const T = {
  GRASS: 0,
  DARK_GRASS: 1,
  PATH: 2,
  WATER: 3,
  TREE: 4,
  ROCK: 5,
  HOUSE: 6,
  CASTLE: 7,
  SAND: 8,
  FLOWER: 9,
  CHEST: 10
};

export const SOLID_TILES = new Set([T.TREE, T.WATER]);

export const WORLD_MAP = (() => {
  const map = Array.from({length:35},(_,row) =>
    Array.from({length:50},(_,col) => {
      if(row<2||row>32||col<2||col>47) return T.TREE;
      if(row===17||col===24) return T.PATH;
      if(row===8||col===12) return T.PATH;
      if(row===26||col===38) return T.PATH;
      const r = Math.random();
      if(r>0.82) return T.TREE;
      if(r>0.72) return Math.random()>0.6?T.ROCK:T.WATER;
      if(r>0.58) return T.DARK_GRASS;
      if(r>0.44) return T.GRASS;
      if(r>0.36) return T.FLOWER;
      return T.GRASS;
    })
  );
  map[17][24] = T.CASTLE;
  // Add some houses
  [[6,8],[40,9],[12,27],[38,25],[20,5],[30,28]].forEach(([x,y])=>{ if(map[y]&&map[y][x]!==undefined) map[y][x]=T.HOUSE; });
  // Add chests
  [[15,12],[35,6],[8,22],[42,20],[25,30]].forEach(([x,y])=>{ if(map[y]&&map[y][x]!==undefined) map[y][x]=T.CHEST; });
  // Sandy beach area near water
  [[22,3],[23,3],[24,3],[25,3],[22,4],[26,4]].forEach(([x,y])=>{ if(map[y]&&map[y][x]!==undefined) map[y][x]=T.SAND; });
  return map;
})();

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
