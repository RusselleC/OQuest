// ═══════════════════════════════════════
//  ENEMY & CLASS DATA
// ═══════════════════════════════════════

export const ENEMY_TYPES = [
  { id:"zombie",   name:"Zombie Process",  hp:45,  atk:12, def:4,  xp:40,  gold:15, color:"#6fb842", desc:"Stuck in Z-state. Parent never called wait()." },
  { id:"leak",     name:"Memory Leak",     hp:60,  atk:10, def:6,  xp:55,  gold:20, color:"#4a7aff", desc:"Silently drains heap until OOM strikes." },
  { id:"ghost",    name:"Ghost Thread",    hp:40,  atk:18, def:2,  xp:50,  gold:18, color:"#aa88ff", desc:"A detached thread, unjoined and wandering." },
  { id:"deadlock", name:"Deadlock Demon",  hp:80,  atk:20, def:8,  xp:90,  gold:35, color:"#ff6060", desc:"Holds two mutexes, refuses to release either." },
  { id:"fault",    name:"Page Fault",      hp:55,  atk:15, def:5,  xp:60,  gold:22, color:"#ffe040", desc:"Virtual address with no physical frame mapped." },
  { id:"race",     name:"Race Condition",  hp:70,  atk:22, def:3,  xp:80,  gold:30, color:"#ff9040", desc:"Non-deterministic chaos from unsynchronized shared state." },
];

export const BOSS = {
  id:"boss", name:"THE KERNEL PANIC", hp:220, maxHp:220, atk:28, def:12, xp:500, gold:200,
  color:"#ff2244", desc:"Fatal system error. All processes must stop.",
  phases:[
    { threshold:0.75, msg:"KERNEL PANIC enters phase 2 — Interrupt Storm!", atkBoost:3 },
    { threshold:0.40, msg:"CRITICAL: Memory corruption cascade!", atkBoost:6 },
    { threshold:0.15, msg:"FATAL: Complete system failure imminent!", atkBoost:9 },
  ],
  abilities:["Stack Smash","Buffer Overflow","Null Pointer Dereference","SIGSEGV","System Halt","fork() Bomb"]
};

export const CLASSES = {
  Scheduler: {
    color:"#f5c518", icon:"⚡", stats:{hp:90,mp:60,atk:18,def:10,spd:12},
    abilities:[
      { name:"Round Robin",  mpCost:0,  dmg:[14,22], desc:"Fair time-slice strike" },
      { name:"SJF Burst",    mpCost:18, dmg:[28,40], desc:"Shortest job first — optimized burst" },
      { name:"Preempt",      mpCost:12, dmg:[20,30], desc:"Force-interrupt enemy execution" },
      { name:"Time Slice",   mpCost:25, dmg:[35,50], desc:"Divide CPU time into devastating quanta" },
    ]
  },
  MemoryMage: {
    color:"#c84bfa", icon:"🧠", stats:{hp:75,mp:90,atk:14,def:8,spd:10},
    abilities:[
      { name:"Pointer Strike", mpCost:0,  dmg:[12,20], desc:"Raw memory address attack" },
      { name:"LRU Evict",      mpCost:15, dmg:[25,38], desc:"Evict the enemy from cache" },
      { name:"Segfault",       mpCost:22, dmg:[40,55], desc:"Force an illegal memory access" },
      { name:"Heap Overflow",  mpCost:30, dmg:[50,70], desc:"Corrupt the enemy's address space" },
    ]
  },
  KernelKnight: {
    color:"#4bcffa", icon:"🛡️", stats:{hp:110,mp:45,atk:22,def:18,spd:8},
    abilities:[
      { name:"Syscall Slash",  mpCost:0,  dmg:[18,26], desc:"Ring-0 privilege strike" },
      { name:"IRQ Interrupt",  mpCost:14, dmg:[30,42], desc:"Hardware interrupt barrage" },
      { name:"Fork Bomb",      mpCost:28, dmg:[45,60], desc:"Exponential process spawning" },
      { name:"Kernel Panic",   mpCost:35, dmg:[60,80], desc:"Crash the enemy's entire system" },
    ]
  },
  DeadlockBreaker: {
    color:"#4bfa7f", icon:"🔓", stats:{hp:85,mp:70,atk:16,def:14,spd:11},
    abilities:[
      { name:"Mutex Strike",    mpCost:0,  dmg:[15,23], desc:"Lock and deliver" },
      { name:"Resource Order",  mpCost:16, dmg:[28,38], desc:"Impose safe resource ordering" },
      { name:"Banker's Gambit", mpCost:24, dmg:[38,52], desc:"Dijkstra's deadlock avoidance" },
      { name:"Semaphore Slam",  mpCost:32, dmg:[52,68], desc:"Signal all waiting processes" },
    ]
  }
};
