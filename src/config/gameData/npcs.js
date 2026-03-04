// ═══════════════════════════════════════
//  NPC DATA
// ═══════════════════════════════════════

export const NPCS = [
  {
    id:"kernel", x:24, y:17, name:"KERNEL", role:"wizard",
    dialogue:[
      "Traveler... the OS realm fractures. Zombie processes haunt our process table.",
      "I am KERNEL — ancient guardian since the first boot sector was written.",
      "Memory leaks drain our heap. Deadlock Demons seize our mutexes. Race Conditions corrupt our shared state.",
      "Grow strong. Master scheduling, memory, and synchronization. Then face the Panic.",
      "Speak freely — I will answer any question about the OS arts."
    ]
  },
  {
    id:"guard1", x:8, y:6, name:"Guard Malloc", role:"guard",
    dialogue:[
      "Halt! The northern fields swarm with zombie processes.",
      "They died long ago — but their parents never called wait(). Tragic.",
      "Each zombie wastes a PCB slot in our process table. Clear them out!",
      "Bring me proof of 3 defeats and I'll reward you handsomely."
    ]
  },
  {
    id:"elder", x:40, y:8, name:"Elder Process", role:"elder",
    dialogue:[
      "Ahh... PID 1. Init. Systemd. I have been running since the very first boot.",
      "The young processes today thrash the page cache with reckless abandon!",
      "A good scheduler minimizes turnaround time while maximizing CPU utilization.",
      "Tell me — do you understand Round Robin? Shortest Job First? Priority queues?",
      "Prove your scheduling knowledge and I shall reward you well, young process."
    ]
  },
  {
    id:"merchant", x:12, y:27, name:"Heap the Merchant", role:"merchant",
    dialogue:[
      "Welcome! Fresh allocations, hot off the heap!",
      "I deal in potions, crystals, and the occasional dangling pointer.",
      "But lately my inventory shrinks inexplicably... Memory Leak enemies drain my stock!",
      "Defeat five of those leaky demons and I'll pay you generously."
    ]
  },
  {
    id:"librarian", x:38, y:25, name:"Librarian Mutex", role:"elder",
    dialogue:[
      "Shh! This is the Resource Hall — two locks required to enter.",
      "The Deadlock Demons hold both mutexes and refuse to release either.",
      "They satisfy all four Coffman conditions: mutual exclusion, hold-and-wait...",
      "No preemption, and circular wait. All four! Textbook deadlock.",
      "Break their grip. The Banker's Algorithm will guide you — check safe states!"
    ]
  },
  {
    id:"pager", x:24, y:30, name:"Page Daemon", role:"wizard",
    dialogue:[
      "I am the Page Daemon — keeper of the virtual address space.",
      "Page faults flood in faster than I can handle! The TLB is overwhelmed!",
      "Each fault means a virtual address has no physical frame — I must fetch from disk.",
      "Thrashing occurs when we spend more time paging than computing. A nightmare!",
      "If you understand virtual memory deeply, prove it with 5 correct answers."
    ]
  },
];
