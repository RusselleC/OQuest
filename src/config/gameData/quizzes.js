import { shuffleArray } from "../../utils/helpers.js";

// ═══════════════════════════════════════
//  QUIZ HELPER FUNCTIONS
// ═══════════════════════════════════════
export const createMultiChoice = (q, correct, wrong, xp, explain) => {
  const opts = [correct, ...wrong];
  const shuffled = shuffleArray(opts);
  return { q, opts: shuffled, ans: shuffled.indexOf(correct), xp, explain, type: "multiple" };
};

export const createFillBlank = (text, answer, xp, explain) => {
  return { q: text, ans: answer.toLowerCase(), xp, explain, type: "fillblank", userAns: "" };
};

export const createRiddle = (text, answer, xp, explain) => {
  return { q: text, ans: answer.toLowerCase(), xp, explain, type: "riddle", userAns: "" };
};

// ═══════════════════════════════════════
//  OS GLOSSARY
// ═══════════════════════════════════════
export const OS_GLOSSARY = [
  {
    term: "Process",
    definition: "An instance of a program in execution. Each process has its own memory space, registers, and state.",
    icon: "📦",
    related: ["Process Table", "Process ID (PID)"]
  },
  {
    term: "Zombie Process",
    definition: "A terminated process whose parent hasn't called wait(). Lingers in the process table, holding resources.",
    icon: "👻",
    related: ["Process", "Parent Process"]
  },
  {
    term: "Kernel",
    definition: "The core of the OS that manages resources. Controls CPU scheduling, memory allocation, and I/O.",
    icon: "🔑",
    related: ["Kernel Panic", "System Call"]
  },
  {
    term: "Kernel Panic",
    definition: "An unrecoverable error that forces the OS to halt all processes to prevent data corruption.",
    icon: "💀",
    related: ["Crash", "System Failure"]
  },
  {
    term: "Memory Leak",
    definition: "Heap memory allocated but never freed. Over time exhausts available memory causing OOM (Out of Memory) errors.",
    icon: "🌊",
    related: ["Heap", "Garbage Collection"]
  },
  {
    term: "Deadlock",
    definition: "Two or more processes waiting indefinitely for resources each other is holding. Requires: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.",
    icon: "🔗",
    related: ["Mutex", "Resource Allocation"]
  },
  {
    term: "Mutex (Mutual Exclusion)",
    definition: "A lock mechanism ensuring only one process can access a shared resource at a time.",
    icon: "🔐",
    related: ["Synchronization", "Critical Section"]
  },
  {
    term: "Race Condition",
    definition: "Unpredictable behavior when multiple processes access shared data without proper synchronization.",
    icon: "🏁",
    related: ["Synchronization", "Mutex"]
  },
  {
    term: "CPU Scheduler",
    definition: "Kernel component deciding which process runs next. Algorithms: Round-Robin, SJF, Priority Scheduling.",
    icon: "⚙️",
    related: ["Task Scheduling", "Context Switch"]
  },
  {
    term: "Virtual Memory",
    definition: "Abstraction giving each process its own address space larger than physical RAM. Uses disk as backup.",
    icon: "🗂️",
    related: ["Page Fault", "Memory Management Unit (MMU)"]
  },
  {
    term: "Page Fault",
    definition: "Exception when a process accesses a page not currently in RAM. OS loads it from disk.",
    icon: "⚡",
    related: ["Virtual Memory", "Paging"]
  },
  {
    term: "Context Switch",
    definition: "Process of pausing one process and resuming another. Saves/restores registers and memory context.",
    icon: "🔄",
    related: ["CPU Scheduler", "Process Management"]
  },
  {
    term: "Interrupt",
    definition: "Signal that halts CPU execution to handle asynchronous events (I/O, timer, hardware failure).",
    icon: "🔔",
    related: ["Interrupt Handler", "System Call"]
  },
  {
    term: "System Call",
    definition: "Interface between user programs and kernel. Requests OS services (file I/O, memory allocation, process creation).",
    icon: "📞",
    related: ["Kernel", "Privilege Mode"]
  },
  {
    term: "File System",
    definition: "Hierarchical structure managing data storage. Organizes files in directories/folders for persistent storage.",
    icon: "📁",
    related: ["I/O", "Disk Management"]
  },
  {
    term: "I/O (Input/Output)",
    definition: "Communication between CPU and external devices (disk, network, keyboard). Managed by I/O subsystem.",
    icon: "🔗",
    related: ["Device Driver", "Buffer"]
  },
  {
    term: "Thread",
    definition: "Lightweight subprocess sharing memory space with other threads in same process.",
    icon: "🧵",
    related: ["Process", "Concurrency"]
  },
  {
    term: "Buffer",
    definition: "Temporary storage area holding data in transit between processes or devices.",
    icon: "📦",
    related: ["I/O", "Queue"]
  },
  {
    term: "Process Table",
    definition: "Kernel data structure tracking all processes in system with their metadata (PID, state, registers).",
    icon: "📋",
    related: ["Process", "Kernel"]
  },
  {
    term: "Paging",
    definition: "Memory management dividing processes into fixed-size pages. Enables virtual memory implementation.",
    icon: "📄",
    related: ["Virtual Memory", "Page Fault"]
  },
  {
    term: "Task Scheduling",
    definition: "Process Schedulers decide the order in which processes execute by the CPU. Types: (1) Long-Term Scheduler loads jobs into memory and controls degree of multiprogramming. (2) Short-Term Scheduler selects next process from ready queue using algorithms like FCFS, RR, SJF, Priority. (3) Medium-Term Scheduler performs swapping.",
    icon: "⏱️",
    related: ["CPU Scheduler", "Context Switch", "Queue"]
  },
  {
    term: "Memory Management",
    definition: "The process of controlling and organizing computer memory by allocating blocks to executing programs. Supports multiprogramming, protects processes from unauthorized access, enables virtual memory. Techniques: contiguous allocation (single/partitioned), non-contiguous allocation (paging/segmentation), swapping.",
    icon: "🧠",
    related: ["Virtual Memory", "Page Fault", "Paging"]
  }
];

// ═══════════════════════════════════════
//  QUIZ POOL — OS FOCUSED (35 QUESTIONS)
// ═══════════════════════════════════════
export const QUIZZES = [
  // MULTIPLE CHOICE (Shuffled answers)
  createMultiChoice(
    "Which scheduling algorithm minimizes average waiting time?",
    "SJF (Shortest Job First)",
    ["Round Robin", "FCFS", "Priority Scheduling"],
    40,
    "SJF minimizes average waiting time by always running the shortest remaining burst first."
  ),
  createMultiChoice(
    "A zombie process is one that:",
    "Exited but parent hasn't called wait()",
    ["Uses 100% CPU", "Is stuck in infinite loop", "Was killed with SIGKILL"],
    35,
    "Zombies have finished execution but their exit status was never collected. They waste a PCB slot."
  ),
  createMultiChoice(
    "Virtual memory allows a system to:",
    "Use disk as additional RAM",
    ["Speed up the CPU", "Encrypt all data", "Share GPU resources"],
    35,
    "Virtual memory uses disk swap space to extend available RAM, giving each process isolated address space."
  ),
  createMultiChoice(
    "Deadlock requires ALL four conditions (Coffman):",
    "Mutual Exclusion + Hold&Wait + No Preemption + Circular Wait",
    ["Only circular wait", "Just mutual exclusion", "Only two processes"],
    50,
    "All four must hold simultaneously. Remove ANY condition to prevent deadlock entirely."
  ),
  createMultiChoice(
    "TLB (Translation Lookaside Buffer) is:",
    "A cache for virtual-to-physical address translations",
    ["A type of CPU register", "A disk cache", "A network buffer"],
    30,
    "The TLB caches recent page table lookups so the MMU doesn't walk the full page table on every access."
  ),
  createMultiChoice(
    "A mutex differs from a semaphore in that:",
    "Only the locking thread can unlock a mutex",
    ["Mutex allows multiple holders", "Semaphores are faster", "They are identical"],
    45,
    "Mutex has ownership: only the thread that acquired it can release it. Semaphores lack this concept."
  ),
  createMultiChoice(
    "LRU page replacement evicts:",
    "The least recently used page",
    ["The most recently used page", "The largest page", "A random page"],
    40,
    "LRU evicts the page not accessed for the longest time, approximating the Bélády optimal algorithm."
  ),
  createMultiChoice(
    "A race condition occurs when:",
    "Output depends on unpredictable thread scheduling",
    ["CPUs run at different speeds", "RAM is full", "The disk is slow"],
    40,
    "Race conditions arise when correctness depends on non-deterministic timing of concurrent operations."
  ),
  createMultiChoice(
    "The Banker's Algorithm is used for:",
    "Deadlock avoidance by checking safe states",
    ["Dynamic memory allocation", "CPU scheduling", "File system indexing"],
    55,
    "Banker's Algorithm checks if granting a resource leaves the system in a safe state."
  ),
  createMultiChoice(
    "A context switch saves:",
    "The full PCB (registers, PC, stack pointer, state)",
    ["Only the program counter", "Only RAM contents", "Nothing — it's instantaneous"],
    45,
    "The entire PCB is saved so execution can resume exactly where it left off."
  ),
  createMultiChoice(
    "Thrashing in an OS means:",
    "More time spent paging than doing useful work",
    ["The CPU is overheating", "Disk has failed", "Network is congested"],
    50,
    "Thrashing: working set exceeds physical RAM, causing constant page faults."
  ),
  createMultiChoice(
    "FIFO page replacement can suffer from:",
    "Belady's anomaly — more frames actually causes more faults",
    ["Being too slow", "Requiring sorted access", "Always has highest miss rate"],
    45,
    "Belady's anomaly: FIFO can produce MORE page faults with MORE physical memory frames!"
  ),
  createMultiChoice(
    "Which IPC mechanism is fastest for same-machine communication?",
    "Shared memory",
    ["Sockets", "Pipes", "Message queues"],
    50,
    "Shared memory is fastest — zero copying. Both processes access the same RAM directly."
  ),
  createMultiChoice(
    "A binary semaphore (initialized to 1) acts as:",
    "A mutex (binary lock)",
    ["A counting semaphore", "A condition variable", "A spinlock"],
    45,
    "Binary semaphore (0 or 1) can enforce mutual exclusion, though it lacks owner semantics."
  ),
  createMultiChoice(
    "Demand paging means:",
    "Pages are loaded into RAM only when accessed",
    ["All pages loaded at program start", "Pages loaded randomly", "Pages preloaded by prediction"],
    40,
    "Demand paging is lazy loading — bring pages into RAM only when needed."
  ),
  createMultiChoice(
    "In round-robin scheduling, what does 'time quantum' represent?",
    "The maximum CPU time a process gets before being preempted",
    ["The total time to execute the program", "The wait time in the queue", "The disk I/O time"],
    38,
    "Time quantum is the time slice each process gets. Too small = high context switch overhead; too large = poor responsiveness."
  ),
  createMultiChoice(
    "Starvation in scheduling occurs when:",
    "A process never gets CPU time due to prioritization",
    ["The CPU runs at full capacity", "All processes finish", "Memory is exhausted"],
    42,
    "Starvation: low-priority processes indefinitely delayed by higher-priority ones entering the ready queue."
  ),
  createMultiChoice(
    "What is a hard link?",
    "A directory entry pointing to the same inode as another file",
    ["A symbolic link type", "A network connection", "A memory address"],
    35,
    "Hard link: same inode, same data. Delete original file: hard link still works. Symbolic link would break."
  ),
  
  // FILL-IN-THE-BLANK
  createFillBlank(
    "The process of converting virtual addresses to physical addresses is called ___.",
    "address translation",
    36,
    "Address translation (or memory mapping) is performed by the Memory Management Unit (MMU)."
  ),
  createFillBlank(
    "The ___ is the kernel data structure that contains all information about a process.",
    "process control block",
    40,
    "The PCB (Process Control Block) stores registers, state, page tables, open files, and more."
  ),
  createFillBlank(
    "A ___ is a synchronization primitive that protects a critical section by allowing only one thread at a time.",
    "mutex",
    38,
    "Mutex = Mutual Exclusion. Only one thread holds the lock at any moment."
  ),
  createFillBlank(
    "The maximum number of processes the system can support is limited by the size of the ___ table.",
    "process",
    35,
    "Each process needs a PCB slot. The process table size limits concurrent process count."
  ),
  createFillBlank(
    "Segmentation divides memory into variable-sized ___ based on logical program structure.",
    "segments",
    38,
    "Segments can represent code, data, stack, heap, etc. Each segment has its own permissions."
  ),
  
  // RIDDLES / IDENTIFICATION
  createRiddle(
    "I am a data structure where the last item added is the first to leave. What am I?",
    "stack",
    40,
    "LIFO (Last In First Out) structure used for function calls, undo operations, and expression parsing."
  ),
  createRiddle(
    "I guard your files from unauthorized access and am often combined with a file name. What am I?",
    "permissions",
    35,
    "File permissions (rwx) control who can read, write, or execute a file."
  ),
  createRiddle(
    "I am split into pages and can swap to disk when RAM is full. What am I?",
    "memory",
    38,
    "Memory (specifically virtual memory) is divided into fixed-size pages for paging."
  ),
  createRiddle(
    "I synchronize multiple processes and can be binary or counting. What am I?",
    "semaphore",
    42,
    "Semaphores manage access to shared resources. Binary: 0/1, Counting: any value."
  ),
  createRiddle(
    "Processes waiting for me are blocked. I represent a resource. What am I?",
    "lock",
    40,
    "Locks (mutexes) block processes trying to access protected resources."
  ),
  createRiddle(
    "I am a special process spawned when a parent exits without reaping. What am I?",
    "zombie",
    38,
    "Zombie process: exited child waiting for parent's wait() call."
  ),
  createRiddle(
    "I prevent multiple processes from writing the same variable simultaneously. What am I?",
    "synchronization",
    45,
    "Synchronization mechanisms (locks, semaphores, monitors) prevent race conditions."
  ),
  createRiddle(
    "I map virtual pages to physical frames. I can cause a fault. What am I?",
    "page table",
    42,
    "Page table translates virtual addresses. A fault occurs when a page isn't in RAM."
  ),
  
  // ADDITIONAL QUESTIONS TO REACH 35
  createMultiChoice(
    "What does the inode store for a file?",
    "Metadata (size, permissions, timestamps, pointers to data blocks)",
    ["The file's content", "The file's name", "User passwords"],
    40,
    "Inode: kernel data structure storing file metadata. The filename is stored in the directory entry, not the inode."
  ),
  createRiddle(
    "I am an interface that all block devices must implement. Users interact with me through files. What am I?",
    "device driver",
    42,
    "Device drivers provide the abstraction layer between hardware and software."
  ),
  createFillBlank(
    "The ___ is a fast, small memory that stores recently accessed data to reduce main memory access time.",
    "cache",
    38,
    "Caches (L1, L2, L3) bridge the speed gap between CPU and main memory."
  ),
  createFillBlank(
    "A ___ is a state in which all processes in a system are waiting for resources held by other processes.",
    "deadlock",
    42,
    "Deadlock can be prevented, detected, recovered, or avoided using algorithms like Banker's."
  ),
];

// ═══════════════════════════════════════
//  CROSSWORD PUZZLE
// ═══════════════════════════════════════
export const CROSSWORD_CLUES = [
  { 
    across: [
      {clue: "Process state after completion (6)", answer: "ZOMBIE"}, 
      {clue: "Shared resource lock (5)", answer: "MUTEX"}, 
      {clue: "Memory protection with permissions (4)", answer: "BITS"}
    ], 
    down: [
      {clue: "CPU decision maker (9)", answer: "SCHEDULER"}, 
      {clue: "Virtual mem page (4)", answer: "SWAP"}
    ] 
  },
];
