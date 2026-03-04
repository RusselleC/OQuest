// ═══════════════════════════════════════
//  QUEST DEFINITIONS
// ═══════════════════════════════════════

export const QUEST_DEFS = [
  {
    id:"q_malloc", title:"Malloc's Bounty", giver:"guard1", category:"Processes",
    desc:"Guard Malloc needs proof you can handle zombie processes. Defeat 3 enemies lurking in the northern fields.",
    goal:"kill", target:3,
    reward:{xp:120, gold:40, item:{id:"elixir",name:"Elixir of Focus",icon:"✨",desc:"Restores 60 HP",qty:1}},
    lore:"Zombie processes are children that have exited but whose parent hasn't called wait(). They linger in the process table forever, leaking precious PCB slots."
  },
  {
    id:"q_elder", title:"The Scheduler's Test", giver:"elder", category:"Scheduling",
    desc:"Elder Process demands you prove your scheduling knowledge. Answer 3 quiz questions correctly.",
    goal:"quiz", target:3,
    reward:{xp:180, gold:60},
    lore:"The CPU scheduler decides which process runs next. Algorithms like Round-Robin, SJF, and Priority Scheduling each trade fairness for throughput."
  },
  {
    id:"q_heap", title:"Memory Leak Hunt", giver:"merchant", category:"Memory",
    desc:"Heap the Merchant's stock is mysteriously shrinking. Defeat 5 Memory Leak enemies to stop the drain.",
    goal:"kill_type", killType:"leak", target:5,
    reward:{xp:200, gold:80, item:{id:"memcrystal",name:"Memory Crystal",icon:"💠",desc:"Permanently +10 Max MP",qty:1}},
    lore:"Memory leaks occur when heap memory is allocated with malloc() but never freed. Over time this exhausts available memory, causing OOM kills."
  },
  {
    id:"q_deadlock", title:"Breaking the Deadlock", giver:"librarian", category:"Synchronization",
    desc:"Librarian Mutex needs the Deadlock Demons cleared from the Resource Hall. Defeat 4 of them.",
    goal:"kill_type", killType:"deadlock", target:4,
    reward:{xp:240, gold:100},
    lore:"Deadlock requires: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait. Remove ANY condition to prevent it — the Banker's Algorithm checks safe states."
  },
  {
    id:"q_pager", title:"Page Fault Pilgrim", giver:"pager", category:"Virtual Memory",
    desc:"The Page Daemon is overwhelmed. Answer 5 quiz questions about virtual memory correctly.",
    goal:"quiz", target:5,
    reward:{xp:280, gold:120, item:{id:"pagebook",name:"Page Table Tome",icon:"📖",desc:"Permanently +5 DEF",qty:1}},
    lore:"Virtual memory gives each process its own address space. The MMU + TLB translate virtual addresses. Page faults occur when a page isn't in RAM — the OS must load it from disk."
  },
  {
    id:"q_kernel", title:"The Kernel Panic", giver:"kernel", category:"Boss",
    desc:"KERNEL speaks of a great evil corrupting all memory. Travel south and defeat the Kernel Panic!",
    goal:"boss", target:1,
    reward:{xp:500, gold:200, item:{id:"masterkey",name:"Master Key",icon:"🔑",desc:"Unlocks ring-0 powers",qty:1}},
    lore:"A kernel panic is an unrecoverable error. The OS halts all processes to prevent data corruption. Common causes: null pointer dereferences, stack smashes, corrupt page tables."
  },
];
