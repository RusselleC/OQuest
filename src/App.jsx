import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, push, set, query, orderByChild, limitToFirst, onValue, get } from "firebase/database";

// Import config
import "./config/firebase.js";
import { TILE, MAP_W, MAP_H, VIEW_W, VIEW_H, MOVE_DELAY, T, SOLID_TILES, WORLD_MAP, GEMINI_API_KEY } from "./config/constants.js";
import { QUEST_DEFS } from "./config/gameData/quests.js";
import { NPCS } from "./config/gameData/npcs.js";
import { ENEMY_TYPES, BOSS, CLASSES } from "./config/gameData/enemies.js";

// Import components
import { TileCell } from "./components/TileCell.jsx";
import { WorldObject } from "./components/WorldObject.jsx";
import { CharSprite } from "./components/CharSprite.jsx";

// Import utilities
import { readLocalLB, writeLocalLB, readStorage, writeStorage } from "./utils/storage.js";
import { rand, clamp, levelFromXP, xpToNext, shuffleArray } from "./utils/helpers.js";
import { jsPDF } from "jspdf";

// Import quiz data
import { OS_GLOSSARY, QUIZZES, CROSSWORD_CLUES, createMultiChoice, createFillBlank, createRiddle } from "./config/gameData/quizzes.js";

// ═══════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════
// ═══════════════════════════════════════
//  GEMINI AI INTEGRATION
// ═══════════════════════════════════════

// OS Topic Keywords for validation
const OS_KEYWORDS = [
  'operating system', 'os', 'kernel', 'process', 'thread', 'cpu', 'memory', 'disk', 'file system',
  'scheduler', 'algorithm', 'deadlock', 'semaphore', 'mutex', 'paging', 'segmentation', 'virtual memory',
  'interrupt', 'system call', 'boot', 'linux', 'windows', 'unix', 'macos', 'android', 'ios',
  'filesystem', 'directory', 'permission', 'user', 'kernel mode', 'user mode', 'context switch',
  'multitasking', 'multiprocessing', 'concurrency', 'parallelism', 'synchronization', 'race condition',
  'cache', 'buffer', 'swap', 'partition', 'mount', 'device driver', 'ioctl', 'fork', 'exec',
  'pipe', 'signal', 'shared memory', 'message queue', 'socket', 'network', 'protocol', 'tcp',
  'udp', 'ip', 'dns', 'http', 'firewall', 'security', 'encryption', 'authentication', 'authorization'
];

// Check if question is OS-related
const isOSRelated = (question) => {
  const lowerQuestion = question.toLowerCase();
  return OS_KEYWORDS.some(keyword => lowerQuestion.includes(keyword));
};

const queryOracle = async (question) => {
  try {
    console.log("🔮 Asking Gemini:", question);

    // Validate OS-related question
    if (!isOSRelated(question)) {
      return "🔮 Oracle: I can only answer questions about Operating Systems and computer science concepts. Please ask about OS topics like processes, memory management, scheduling algorithms, file systems, or system architecture.";
    }

    // Enhanced prompt for OS-specific educational responses
    const osPrompt = `You are an expert Operating System Oracle in a fantasy RPG called OQUEST. Answer ONLY about operating system concepts, computer science fundamentals, and related technical topics.

Key guidelines:
- Focus on OS concepts: processes, threads, memory management, scheduling, file systems, etc.
- Use mystical OS metaphors when appropriate (processes as "wandering spirits", memory as "crystal chambers", etc.)
- Keep answers educational and technically accurate
- Answer in 3-5 sentences maximum
- If the question is not OS-related, politely redirect to OS topics

Question: ${question}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: osPrompt }] }]
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let answer = data.candidates[0].content.parts[0].text.trim();

      // Limit to max 5 sentences just in case
      const sentences = answer.match(/[^.!?]+[.!?]+/g) || [answer];
      if (sentences.length > 5) {
        answer = sentences.slice(0, 5).join('').trim();
      }

      console.log("✨ Gemini answered:", answer);
      return answer;
    }

    console.error("Gemini Error:", data);
    return `🔮 Oracle: ${data.error?.message || "Unable to reach the portal"}`;

  } catch (error) {
    console.error("Oracle error:", error);
    return `🔮 The portal destabilizes: ${error.message}`;
  }
};

// ═══════════════════════════════════════
//  CPU SCHEDULING ALGORITHMS
// ═══════════════════════════════════════
const colors = ["#ff8888", "#88ff88", "#8888ff", "#ffff88", "#ff88ff", "#88ffff"];

const computeFCFS = (processes) => {
  const sorted = [...processes].sort((a,b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  const gantt = [];
  const results = sorted.map(p => {
    const startTime = Math.max(currentTime, p.arrivalTime);
    const endTime = startTime + p.burstTime;
    gantt.push({id: p.id, start: startTime, end: endTime, color: colors[p.id % colors.length]});
    const turnaround = endTime - p.arrivalTime;
    const wait = turnaround - p.burstTime;
    currentTime = endTime;
    return {id: p.id, arrival: p.arrivalTime, burst: p.burstTime, completion: endTime, turnaround, wait};
  });
  const avgWait = results.reduce((sum, r) => sum + r.wait, 0) / results.length;
  const avgTurnaround = results.reduce((sum, r) => sum + r.turnaround, 0) / results.length;
  return {gantt, results, avgWait, avgTurnaround};
};

const computeSJF_NP = (processes) => {
  const procs = JSON.parse(JSON.stringify(processes));
  let currentTime = 0;
  const gantt = [];
  const results = [];
  const completed = new Set();
  while(completed.size < procs.length) {
    const available = procs.filter((p, i) => !completed.has(i) && p.arrivalTime <= currentTime);
    if(available.length === 0) {
      const next = procs.find((p, i) => !completed.has(i));
      currentTime = next.arrivalTime;
      continue;
    }
    const idx = procs.findIndex(p => available.includes(p) && !completed.has(procs.indexOf(p)));
    const p = procs[idx];
    const startTime = currentTime;
    const endTime = startTime + p.burstTime;
    gantt.push({id: p.id, start: startTime, end: endTime, color: colors[p.id % colors.length]});
    const turnaround = endTime - p.arrivalTime;
    const wait = turnaround - p.burstTime;
    results[idx] = {id: p.id, arrival: p.arrivalTime, burst: p.burstTime, completion: endTime, turnaround, wait};
    completed.add(idx);
    currentTime = endTime;
  }
  const avgWait = results.reduce((sum, r) => sum + r.wait, 0) / results.length;
  const avgTurnaround = results.reduce((sum, r) => sum + r.turnaround, 0) / results.length;
  return {gantt, results, avgWait, avgTurnaround};
};

const computeSRTF = (processes) => {
  const procs = JSON.parse(JSON.stringify(processes)).map(p => ({...p, remaining: p.burstTime}));
  let currentTime = 0;
  const gantt = [];
  const completed = [];
  const totalBurst = procs.reduce((sum, p) => sum + p.burstTime, 0);
  const results = Array(procs.length).fill(null);
  let lastId = -1;
  while(completed.length < procs.length) {
    const available = procs.filter((p, i) => p.remaining > 0 && p.arrivalTime <= currentTime);
    if(available.length === 0) {
      const next = procs.find(p => p.remaining > 0);
      currentTime = next.arrivalTime;
      continue;
    }
    const idx = procs.findIndex(p => available.includes(p) && p.remaining > 0 && (lastId === -1 || procs[lastId].remaining < 1 || p.remaining < procs[lastId].remaining || procs[lastId].remaining === 0));
    if(lastId !== idx) lastId = idx;
    const p = procs[idx];
    p.remaining--;
    currentTime++;
    if(gantt.length === 0 || gantt[gantt.length-1].id !== p.id || gantt[gantt.length-1].end !== currentTime - 1) {
      if(gantt.length > 0 && gantt[gantt.length-1].id === p.id && gantt[gantt.length-1].end === currentTime - 1) {
        gantt[gantt.length-1].end = currentTime;
      } else {
        gantt.push({id: p.id, start: currentTime - 1, end: currentTime, color: colors[p.id % colors.length]});
      }
    } else {
      gantt[gantt.length-1].end = currentTime;
    }
    if(p.remaining === 0) {
      const turnaround = currentTime - p.arrivalTime;
      const burst = processes.find(x => x.id === p.id).burstTime;
      const wait = turnaround - burst;
      results[idx] = {id: p.id, arrival: p.arrivalTime, burst, completion: currentTime, turnaround, wait};
      completed.push(idx);
    }
  }
  const validResults = results.filter(r => r !== null);
  const avgWait = validResults.reduce((sum, r) => sum + r.wait, 0) / validResults.length;
  const avgTurnaround = validResults.reduce((sum, r) => sum + r.turnaround, 0) / validResults.length;
  return {gantt, results: validResults, avgWait, avgTurnaround};
};

const computeRR = (processes, quantum) => {
  const queue = [...processes].sort((a,b) => a.arrivalTime - b.arrivalTime).map(p => ({...p, remaining: p.burstTime}));
  let currentTime = 0;
  const gantt = [];
  const results = Array(processes.length).fill(null);
  const completed = new Set();
  let qIdx = 0;
  while(completed.size < queue.length) {
    const p = queue[qIdx];
    if(p.arrivalTime > currentTime) {
      currentTime = p.arrivalTime;
    }
    if(p.remaining <= 0) {
      qIdx = (qIdx + 1) % queue.length;
      if(qIdx === 0) {
        const allDone = queue.every(x => x.remaining <= 0);
        if(allDone) break;
      }
      continue;
    }
    const timeSlice = Math.min(quantum, p.remaining);
    const startTime = currentTime;
    const endTime = startTime + timeSlice;
    gantt.push({id: p.id, start: startTime, end: endTime, color: colors[p.id % colors.length]});
    p.remaining -= timeSlice;
    currentTime = endTime;
    if(p.remaining <= 0) {
      const turnaround = currentTime - p.arrivalTime;
      const burst = processes.find(x => x.id === p.id).burstTime;
      const wait = turnaround - burst;
      const idx = processes.findIndex(x => x.id === p.id);
      results[idx] = {id: p.id, arrival: p.arrivalTime, burst, completion: currentTime, turnaround, wait};
      completed.add(qIdx);
    }
    qIdx = (qIdx + 1) % queue.length;
  }
  const validResults = results.filter(r => r !== null);
  const avgWait = validResults.reduce((sum, r) => sum + r.wait, 0) / validResults.length;
  const avgTurnaround = validResults.reduce((sum, r) => sum + r.turnaround, 0) / validResults.length;
  return {gantt, results: validResults, avgWait, avgTurnaround};
};

const computePriority = (processes) => {
  const sorted = [...processes].filter(p => p.arrivalTime <= 0).sort((a,b) => a.priority - b.priority);
  const remaining = [...processes].filter(p => !sorted.includes(p));
  let all = [...sorted, ...remaining];
  let currentTime = 0;
  const gantt = [];
  const results = [];
  const completed = new Set();
  while(completed.size < all.length) {
    const available = all.filter((p, i) => !completed.has(i) && p.arrivalTime <= currentTime).sort((a,b) => a.priority - b.priority);
    if(available.length === 0) {
      const next = all.find(p => !completed.has(all.indexOf(p)));
      currentTime = next.arrivalTime;
      continue;
    }
    const idx = all.findIndex(p => available.includes(p) && !completed.has(all.indexOf(p)));
    const p = all[idx];
    const startTime = currentTime;
    const endTime = startTime + p.burstTime;
    gantt.push({id: p.id, start: startTime, end: endTime, color: colors[p.id % colors.length]});
    const turnaround = endTime - p.arrivalTime;
    const wait = turnaround - p.burstTime;
    results.push({id: p.id, arrival: p.arrivalTime, burst: p.burstTime, completion: endTime, turnaround, wait});
    completed.add(idx);
    currentTime = endTime;
  }
  const avgWait = results.reduce((sum, r) => sum + r.wait, 0) / results.length;
  const avgTurnaround = results.reduce((sum, r) => sum + r.turnaround, 0) / results.length;
  return {gantt, results, avgWait, avgTurnaround};
};

// ═══════════════════════════════════════
//  MEMORY ALLOCATION ALGORITHMS
// ═══════════════════════════════════════
const computeMemoryAllocation = (jobs, totalRam, pageSize, strategy) => {
  const numPages = Math.ceil(totalRam / pageSize);
  const frames = Array.from({length: numPages}, (_, i) => ({
    frameId: i,
    startMB: i * pageSize,
    endMB: (i + 1) * pageSize,
    job: null,
    wasted: 0
  }));
  const allocations = [];
  const sorted = strategy === "worst-fit" ? [...jobs].sort((a,b) => b.size - a.size) : [...jobs].sort((a,b) => a.size - b.size);
  for(const job of sorted) {
    const pagesNeeded = Math.ceil(job.size / pageSize);
    const internalWaste = (pagesNeeded * pageSize) - job.size;
    let allocated = false;
    if(strategy === "first-fit") {
      let freeCount = 0;
      let startIdx = -1;
      for(let i = 0; i < frames.length; i++) {
        if(frames[i].job === null) {
          if(startIdx === -1) startIdx = i;
          freeCount++;
          if(freeCount === pagesNeeded) {
            for(let j = startIdx; j < startIdx + pagesNeeded; j++) {
              frames[j].job = job;
            }
            allocations.push({jobId: job.id, jobName: job.name, frameIds: Array.from({length: pagesNeeded}, (_, k) => startIdx + k), internalWaste});
            allocated = true;
            break;
          }
        } else {
          freeCount = 0;
          startIdx = -1;
        }
      }
    } else if(strategy === "best-fit") {
      let bestStart = -1;
      let bestLen = Infinity;
      let freeCount = 0;
      let startIdx = -1;
      for(let i = 0; i < frames.length; i++) {
        if(frames[i].job === null) {
          if(startIdx === -1) startIdx = i;
          freeCount++;
        } else {
          if(freeCount >= pagesNeeded && freeCount < bestLen) {
            bestLen = freeCount;
            bestStart = startIdx;
          }
          freeCount = 0;
          startIdx = -1;
        }
      }
      if(freeCount >= pagesNeeded && freeCount < bestLen) {
        bestLen = freeCount;
        bestStart = startIdx;
      }
      if(bestStart !== -1 && bestLen >= pagesNeeded) {
        for(let j = bestStart; j < bestStart + pagesNeeded; j++) {
          frames[j].job = job;
        }
        allocations.push({jobId: job.id, jobName: job.name, frameIds: Array.from({length: pagesNeeded}, (_, k) => bestStart + k), internalWaste});
        allocated = true;
      }
    } else if(strategy === "worst-fit") {
      let worstStart = -1;
      let worstLen = 0;
      let freeCount = 0;
      let startIdx = -1;
      for(let i = 0; i < frames.length; i++) {
        if(frames[i].job === null) {
          if(startIdx === -1) startIdx = i;
          freeCount++;
        } else {
          if(freeCount >= pagesNeeded && freeCount > worstLen) {
            worstLen = freeCount;
            worstStart = startIdx;
          }
          freeCount = 0;
          startIdx = -1;
        }
      }
      if(freeCount >= pagesNeeded && freeCount > worstLen) {
        worstLen = freeCount;
        worstStart = startIdx;
      }
      if(worstStart !== -1 && worstLen >= pagesNeeded) {
        for(let j = worstStart; j < worstStart + pagesNeeded; j++) {
          frames[j].job = job;
        }
        allocations.push({jobId: job.id, jobName: job.name, frameIds: Array.from({length: pagesNeeded}, (_, k) => worstStart + k), internalWaste});
        allocated = true;
      }
    }
  }
  const usedMB = allocations.reduce((sum, a) => sum + jobs.find(j => j.id === a.jobId).size, 0);
  const utilization = (usedMB / totalRam) * 100;
  const externalFragmentation = frames.filter(f => f.job === null).length * pageSize;
  return {frames, allocations, externalFragmentation, utilization, internalWaste: allocations.reduce((sum, a) => sum + a.internalWaste, 0)};
};

// ═══════════════════════════════════════
//  MAIN GAME
// ═══════════════════════════════════════
export default function OSQuestGame() {
  // ─── Authentication ───
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpName, setSignUpName] = useState("");

  const [screen, setScreen] = useState("login");
  const [nameInput, setNameInput] = useState("");
  const [classChoice, setClassChoice] = useState(null);
  const [playerName, setPlayerName] = useState("");

  const [playerPos, setPlayerPos] = useState({x:24,y:16});
  const [startPos, setStartPos] = useState({x:24,y:16});
  const [camX, setCamX] = useState(24 - Math.floor(VIEW_W/2));
  const [camY, setCamY] = useState(16 - Math.floor(VIEW_H/2));
  const [playerDir, setPlayerDir] = useState(1);
  const [playerMoving, setPlayerMoving] = useState(false);
  const [mapEnemies, setMapEnemies] = useState([]);
  const [worldMap, setWorldMap] = useState(() => WORLD_MAP.map(r=>[...r]));
  const [bossSummoned, setBossSummoned] = useState(false);

  const S = useRef({hp:90,maxHp:90,mp:60,maxMp:60,xp:0,gold:50,score:0,level:1,atk:18,def:10});
  const [statsUI, setStatsUI] = useState({...S.current});
  const syncStats = () => setStatsUI({...S.current});

  const [battle, setBattle] = useState(null);
  const [battlePhase, setBattlePhase] = useState("player");
  const [battleLog, setBattleLog] = useState([]);
  const [battleAnim, setBattleAnim] = useState(null);
  const [enemyHP, setEnemyHP] = useState(0);
  const [enemyMaxHP, setEnemyMaxHP] = useState(0);
  const [bossPhase, setBossPhase] = useState(0);

  const [quiz, setQuiz] = useState(null);
  const [quizPick, setQuizPick] = useState(null);
  const [quizCtx, setQuizCtx] = useState("explore");
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);

  const [quests, setQuests] = useState([]);
  const [killCount, setKillCount] = useState(0);
  const [killTypeCounts, setKillTypeCounts] = useState({});
  const [completedQuests, setCompletedQuests] = useState([]);
  const [questsCompletedCount, setQuestsCompletedCount] = useState(0);

  // Chathead & Gemini AI
  const [showChathead, setShowChathead] = useState(false);
  const [chatheadMinimized, setChatheadMinimized] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showCrossword, setShowCrossword] = useState(false);
  const [crosswordPage, setCrosswordPage] = useState(0); // 0=intro, 1=grid
  const [crosswordCompleted, setCrosswordCompleted] = useState(false);
  const [crosswordAnswers, setCrosswordAnswers] = useState({});
  const [showSimulator, setShowSimulator] = useState(false);
  const [showCrosswordGrid, setShowCrosswordGrid] = useState(false);
  
  // CPU Scheduling Visualizer state
  const [cpuProcesses, setCpuProcesses] = useState([
    {id:0, arrivalTime:0, burstTime:5, priority:1},
    {id:1, arrivalTime:0, burstTime:3, priority:2},
    {id:2, arrivalTime:0, burstTime:8, priority:3},
    {id:3, arrivalTime:0, burstTime:2, priority:1}
  ]);
  const [cpuNewArrival, setCpuNewArrival] = useState(0);
  const [cpuNewBurst, setCpuNewBurst] = useState(3);
  const [cpuNewPriority, setCpuNewPriority] = useState(1);
  const [cpuAlgorithm, setCpuAlgorithm] = useState("FCFS");
  const [cpuTimeQuantum, setCpuTimeQuantum] = useState(2);
  const [cpuResults, setCpuResults] = useState(null);
  const [cpuNpcStep, setCpuNpcStep] = useState(0);
  const [cpuNpcMinimized, setCpuNpcMinimized] = useState(false);
  const [cpuCompareResults, setCpuCompareResults] = useState(null);
  
  // Memory Management state
  const [memJobs, setMemJobs] = useState([
    {id:1, name:"Browser", size:200, color:"#ff8888"},
    {id:2, name:"Game", size:512, color:"#88ff88"}
  ]);
  const [memNewName, setMemNewName] = useState("");
  const [memNewSize, setMemNewSize] = useState(128);
  const [memTotalRam, setMemTotalRam] = useState(1024);
  const [memStrategy, setMemStrategy] = useState("first-fit");
  const [memNpcStep, setMemNpcStep] = useState(0);
  const [memNpcMinimized, setMemNpcMinimized] = useState(false);
  const [memPageSize, setMemPageSize] = useState(64);

  // Memoize memory allocation to prevent infinite render loops
  const memAllocResult = useMemo(() => 
    computeMemoryAllocation(memJobs, memTotalRam, memPageSize, memStrategy),
    [memJobs, memTotalRam, memPageSize, memStrategy]
  );

  // Tutorial & Simulator state
  const [tutorialMode, setTutorialMode] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [simulatorState, setSimulatorState] = useState({
    algorithm: "FIFO",
    processes: [
      { name: "P1", arrivalTime: 0, burstTime: 5, priority: 1, remainingTime: 5, status: "waiting", waitTime: 0, turnaroundTime: 0, completionTime: 0 },
      { name: "P2", arrivalTime: 1, burstTime: 3, priority: 2, remainingTime: 3, status: "waiting", waitTime: 0, turnaroundTime: 0, completionTime: 0 },
      { name: "P3", arrivalTime: 2, burstTime: 8, priority: 3, remainingTime: 8, status: "waiting", waitTime: 0, turnaroundTime: 0, completionTime: 0 },
    ],
    ganttChart: [],
    totalTime: 0,
  });
  const [simulationLog, setSimulationLog] = useState([]);
  const [algorithmRunning, setAlgorithmRunning] = useState(false);
  const [algorithmTick, setAlgorithmTick] = useState(0);
  const [algorithmSpeed, setAlgorithmSpeed] = useState(500);
  const [memoryState, setMemoryState] = useState({
    pages: Array.from({ length: 16 }, (_, i) => ({ id: i, allocated: false, process: "" })),
    allocatedMemory: 0,
    fragmentationWaste: 0,
    totalMemory: 8,
  });

  const [taskSchedulingPortal, setTaskSchedulingPortal] = useState(null);
  const [memoryManagementPortal, setMemoryManagementPortal] = useState(null);
  const [bossDfeated, setBossDefeated] = useState(false);
  const [taskSchedulingCompleted, setTaskSchedulingCompleted] = useState(false);
  const [memoryManagementCompleted, setMemoryManagementCompleted] = useState(false);
  const [currentLessonPortal, setCurrentLessonPortal] = useState(null);

  const [activeNPC, setActiveNPC] = useState(null);
  const [dlgIdx, setDlgIdx] = useState(0);
  const dialogueLock = useRef(false);

  const [notif, setNotif] = useState(null);
  const [showInv, setShowInv] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showLore, setShowLore] = useState(null);
  const [inventory, setInventory] = useState([
    {id:"potion",name:"Health Potion",icon:"🧪",desc:"Restores 30 HP",qty:3},
    {id:"ether",name:"MP Crystal",icon:"💎",desc:"Restores 20 MP",qty:2},
  ]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [lbListener, setLbListener] = useState(null);
  const [floats, setFloats] = useState([]);
  const [animFrame, setAnimFrame] = useState(0); // Updates 15 FPS instead of 60 FPS

  const keys = useRef({});
  const moveTimer = useRef(0);
  const posRef = useRef({x:24, y:16});
  const rafId = useRef(null);
  const interactCooldown = useRef(0);
  const logRef = useRef(null);
  const tick = useRef(0);
  const gameStartTime = useRef(null);
  const audioCtx = useRef(null);
  const bgmOscillators = useRef({osc1:null, osc2:null, gain:null});

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.6);

  // ═════════════════════════════════════════════════
  // FIREBASE AUTHENTICATION
  // ═════════════════════════════════════════════════
  useEffect(() => {
    try {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        if(currentUser) {
          setScreen("title");
        }
      });
      return () => unsubscribe();
    } catch(e) {
      console.warn("Auth state check failed:", e.message);
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if(!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError("Email and password required");
      return;
    }
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setAuthError(null);
      setLoginEmail("");
      setLoginPassword("");
    } catch(err) {
      setAuthError(err.message || "Login failed");
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    if(!signUpName.trim() || !loginEmail.trim() || !loginPassword.trim()) {
      setAuthError("All fields required");
      return;
    }
    if(loginPassword.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }
    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      setAuthError(null);
      setIsSignUp(false);
      setSignUpName("");
      setLoginEmail("");
      setLoginPassword("");
    } catch(err) {
      setAuthError(err.message || "Sign up failed");
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
      setScreen("login");
      setAuthError(null);
    } catch(err) {
      setAuthError("Logout failed");
    }
  };

  const refreshLeaderboard = async () => {
    try{
      console.log("🔄 Manual leaderboard refresh...");
      const db=getDatabase();
      const lbRef=ref(db,"hallOfFame");
      const snap=await get(lbRef);
      const data=snap.val();
      if(data){
        let records=Object.values(data).map(r=>({...r,id:r.id||""}));
        records.sort((a,b)=>a.time-b.time);
        // show all records (no limit)
        setLeaderboard(records);
        setLastUpdateTime(new Date());
        console.log("✅ Firebase leaderboard loaded:", records.length, "records (showing all)");
        notify("📊 Hall of Fame loaded","#4bfa7f",2000);
      } else {
        throw new Error("No Firebase data");
      }
    }catch(e){
      console.error("❌ Firebase refresh failed, trying local storage:", e.message);
      // Fallback to local storage
      try{
        const local = await readLocalLB();
        if(local && local.length>0){
          setLeaderboard(local);
          setLastUpdateTime(new Date());
          console.log("✅ Local storage leaderboard loaded:", local.length, "records");
          notify("📊 Local records loaded","#c8a870",2000);
        }
      }catch(localErr){
        console.error("❌ Both Firebase and local storage failed:", localErr);
        notify("❌ Failed to load records","#ff4444",2000);
      }
    }
    
  };

  // Export leaderboard as PDF
  const exportLeaderboardPDF = () => {
    const exportData = leaderboard.filter(e => e.completed && e.score > 0);
    if(exportData.length === 0){ notify("No completed runs to export","#ff4444",2000); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("OQuest Leaderboard", 10, 10);
    let y = 20;
    exportData.forEach((e,i)=>{
      doc.setFontSize(12);
      doc.text(`${i+1}. ${e.name} (${e.cls}) Lv.${e.level} Score:${e.score} XP:${e.xp} Time:${e.timeFormatted||formatTime(e.time||0)} Date:${e.date}`,10,y);
      y += 8;
      if(y > 280){ doc.addPage(); y = 20; }
    });
    doc.save(`oquest_leaderboard_${new Date().toISOString().slice(0,10)}.pdf`);
    notify(`📄 PDF exported ${exportData.length} records`,`#4bfa7f`,2000);
  };

  // ═════════════════════════════════════════════════
  // AUDIO SYSTEM
  // ═════════════════════════════════════════════════
  const initAudio = () => {
    if(!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx.current;
  };

  const playSound = (type="blip", duration=0.1, freq1=400, freq2=200) => {
    if(!audioEnabled) return;
    try {
      const ctx = initAudio();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      if(type === "move") {
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
        osc.type = "sine";
      } else if(type === "hit") {
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
        osc.type = "square";
      } else if(type === "levelup") {
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.exponentialRampToValueAtTime(freq2 * 1.5, now + duration * 0.5);
        osc.frequency.exponentialRampToValueAtTime(freq1, now + duration);
        osc.type = "sine";
      } else if(type === "quest") {
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.exponentialRampToValueAtTime(freq2, now + duration * 0.5);
        osc.frequency.exponentialRampToValueAtTime(freq1, now + duration);
        osc.type = "triangle";
      } else {
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
        osc.type = "sine";
      }
      
      osc.start(now);
      osc.stop(now + duration);
    } catch(e) {}
  };

  const playBGM = () => {
    if(!audioEnabled) return;
    try {
      const ctx = initAudio();
      const { osc1, osc2, gain } = bgmOscillators.current;
      
      if(osc1) osc1.stop();
      if(osc2) osc2.stop();
      
      const now = ctx.currentTime;
      const newOsc1 = ctx.createOscillator();
      const newOsc2 = ctx.createOscillator();
      const newGain = ctx.createGain();
      
      newOsc1.connect(newGain);
      newOsc2.connect(newGain);
      newGain.connect(ctx.destination);
      
      newGain.gain.setValueAtTime(volume * 0.15, now);
      
      newOsc1.type = "sine";
      newOsc2.type = "sine";
      
      newOsc1.frequency.setValueAtTime(110, now);
      newOsc2.frequency.setValueAtTime(164.8, now);
      
      newOsc1.frequency.setTargetAtTime(110, now, 4);
      newOsc2.frequency.setTargetAtTime(164.8, now, 4);
      
      newOsc1.start(now);
      newOsc2.start(now);
      
      bgmOscillators.current = { osc1: newOsc1, osc2: newOsc2, gain: newGain };
    } catch(e) {}
  };

  const stopBGM = () => {
    try {
      const { osc1, osc2 } = bgmOscillators.current;
      if(osc1) osc1.stop();
      if(osc2) osc2.stop();
      bgmOscillators.current = { osc1: null, osc2: null, gain: null };
    } catch(e) {}
  };

  const notify = (msg,color="#f5c518",dur=2800) => {
    setNotif({msg,color});
    setTimeout(()=>setNotif(null),dur);
  };

  const addFloat = (text,color="#f5c518") => {
    const id = Date.now()+Math.random();
    setFloats(f=>[...f,{id,text,color}]);
    setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==id)),1400);
  };

  const addLog = (msg) => {
    setBattleLog(l => [...l.slice(-8), msg]);
    setTimeout(()=>logRef.current?.scrollTo({top:9999,behavior:"smooth"}),50);
  };

  const [screenShake, setScreenShake] = useState(0);
  const triggerShake = (intensity=8,duration=200) => {
    setScreenShake(intensity);
    setTimeout(()=>setScreenShake(0),duration);
  };

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if(hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if(minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Leaderboard (Real-time updates)
  useEffect(()=>{
    (async()=>{
      try{
        const db=getDatabase();
        const lbRef=ref(db,"hallOfFame");
        const unsubscribe=onValue(lbRef,snapshot=>{
          const data=snapshot.val();
          console.log("📊 Firebase hallOfFame data:", data);
          if(data){
            let records=Object.values(data).map(r=>({...r,id:r.id||""}));
            records.sort((a,b)=>a.time-b.time);
            // Show all records from Firebase (remove previous 20-item cap)
            console.log("✅ Loaded", records.length, "records from Firebase");
            setLeaderboard(records);
            setLastUpdateTime(new Date());
          } else {
            console.log("📭 Firebase is empty, checking local storage...");
            // Check local storage if Firebase is empty
            (async()=>{
              try{
                const local = await readLocalLB();
                if(local && local.length>0){
                  console.log("✅ Loaded", local.length, "records from local storage");
                  setLeaderboard(local);
                } else {
                  console.log("📭 No records anywhere yet");
                  setLeaderboard([]);
                }
              }catch(e){
                console.log("No local records", e.message);
                setLeaderboard([]);
              }
              setLastUpdateTime(new Date());
            })();
          }
        });
        setLbListener(()=>unsubscribe);
        return ()=>unsubscribe();
      }catch(e){
        console.error("❌ Firebase listener setup failed:",e);
      }
    })();
  },[]);

  // Save leaderboard. opts: { time: ms, id: string }
  const saveLB=async(opts={})=>{
    const s=S.current;
    // Use provided time or compute from gameStartTime
    const completionTime = typeof opts.time === 'number' ? opts.time : (gameStartTime.current?Date.now()-gameStartTime.current:0);
    const finalName = playerName || "Anonymous Hero";
    // Deterministic id: use player uid/name + start timestamp (seconds)
    const runKey = gameStartTime.current ? Math.floor(gameStartTime.current/1000) : Math.floor(Date.now()/1000);
    const owner = (user && user.uid) ? user.uid : (playerName?playerName.replace(/\s+/g,'_'):'guest');
    const recordId = opts.id || `${owner}_${runKey}`;

    const record={
      name:finalName,
      cls:classChoice,
      score:s.score,
      xp:s.xp,
      level:s.level,
      date:new Date().toLocaleDateString(),
      time:completionTime,
      timeFormatted:formatTime(completionTime),
      timestamp:Date.now(),
      uid:user?.uid||"guest",
      id:recordId,
      completed: opts.completed || false
    };

    console.log("💾 Saving leaderboard record (id=", recordId, "):", record);

    try{
      const db=getDatabase();
      // Use set with deterministic id so repeated saves overwrite same record instead of creating duplicates
      await set(ref(db, `hallOfFame/${recordId}`), record);
      console.log("✅ Firebase set SUCCESS for id:", recordId);
      // remember last saved record for accurate display
      try{ setLastSavedRecord(record); }catch(e){}
    }catch(fbError){
      console.error("❌ Firebase write error:", fbError?.code || fbError, fbError?.message || fbError);
    }

    // Always backup to local storage (dedupe by id)
    try{
      const lb = await readLocalLB();
      const filtered = (lb||[]).filter(r=>r.id !== record.id);
      filtered.push(record);
      filtered.sort((a,b)=>a.time-b.time);
      // Save full deduped list locally and show everyone
      await writeLocalLB(filtered);
      console.log("✅ Local storage save SUCCESS with", filtered.length, "records (deduped)");
      setLeaderboard(filtered);
      try{ setLastSavedRecord(record); }catch(e){}
      notify("✅ Record Saved!","#4bfa7f",2000);
    }catch(storageErr){
      console.error("❌ Local storage failed:",storageErr);
    }
  };

  const saveGameProgress = async()=>{
    try{
      const s=S.current;
      const save={
        playerName,classChoice,playerPos,playerDir,playerMoving,
        stats:{hp:s.hp,maxHp:s.maxHp,mp:s.mp,maxMp:s.maxMp,xp:s.xp,gold:s.gold,score:s.score,level:s.level,atk:s.atk,def:s.def},
        worldMap,mapEnemies,quests,completedQuests,killCount,inventory,camX,camY,
        bossSummoned,killTypeCounts,quizCorrectCount,questsCompletedCount,gameStartTime:gameStartTime.current
      };
      const saveKey = `osrpg_save_${classChoice}`;
      await writeStorage(saveKey, save);
      notify("✅ Game saved!","#4bfa7f",2000);
      setHasSave(true);
    }catch(e){ notify("❌ Save failed","#ff4444"); }
  };

  const loadGameProgress = async()=>{
    try{
      const saveKey = `osrpg_save_${classChoice}`;
      const save = await readStorage(saveKey);
      if(!save) { notify("❌ No save found","#ff4444"); return; }
      setPlayerName(save.playerName);
      setClassChoice(save.classChoice);
      setPlayerPos(save.playerPos);
      setPlayerDir(save.playerDir);
      setPlayerMoving(save.playerMoving);
      S.current=save.stats;
      syncStats();
      setWorldMap(save.worldMap);
      setMapEnemies(save.mapEnemies);
      setQuests(save.quests);
      setCompletedQuests(save.completedQuests);
      setKillCount(save.killCount);
      setInventory(save.inventory);
      setCamX(save.camX);
      setCamY(save.camY);
      setBossSummoned(save.bossSummoned);
      setKillTypeCounts(save.killTypeCounts);
      setQuizCorrectCount(save.quizCorrectCount);
      setQuestsCompletedCount(save.questsCompletedCount||0);
      gameStartTime.current=save.gameStartTime;
      setScreen("game");
      notify("✅ Game loaded!","#4bfa7f",2000);
    }catch(e){ notify("❌ Load failed","#ff4444"); }
  };

  useEffect(()=>{
    (async()=>{ 
      try{ 
        if(classChoice) {
          const saveKey = `osrpg_save_${classChoice}`;
          const saved = await readStorage(saveKey);
          setHasSave(!!saved);
        }
      }catch{} 
    })();
  },[classChoice]); 

  // Tutorial progression effect
  useEffect(()=>{
    if(!tutorialMode || !currentLessonPortal) return;
    
    // Step 1→2: When user clicks RUN and Gantt chart appears, advance show step 2 "watch the execution"
    if(tutorialStep === 1 && simulatorState.ganttChart.length > 0) {
      setTimeout(()=>setTutorialStep(2), 300);
    }
    // Step 2→3: Show the Gantt chart explanation
    if(tutorialStep === 2 && simulatorState.ganttChart.length > 0) {
      setTimeout(()=>setTutorialStep(3), 1500); // Brief pause to read step 2
    }
    // Step 3→4: When metrics are shown, explain them
    if(tutorialStep === 3 && simulatorState.processes.some(p => p.turnaroundTime > 0)) {
      setTimeout(()=>setTutorialStep(4), 1500);
    }
    // Step 4→5: When user tries another algorithm in step 4, offer comparison view
    // (This happens when they click a different algorithm button)
    
  }, [tutorialStep, simulatorState.ganttChart.length, tutorialMode, currentLessonPortal]);

  // Effect to drive the step-by-step animation when running tutorial simulation
  useEffect(()=>{
    if(!algorithmRunning || simulationLog.length === 0) return;
    const interval = setInterval(()=>{
      setAlgorithmTick(t => {
        if(t >= simulationLog.length - 1){
          clearInterval(interval);
          setAlgorithmRunning(false);
          return t;
        }
        return t + 1;
      });
    }, algorithmSpeed);
    return () => clearInterval(interval);
  }, [algorithmRunning, simulationLog, algorithmSpeed]);

  // Sync state from current log entry for visualization
  useEffect(()=>{
    if(simulationLog.length === 0) return;
    const entry = simulationLog[algorithmTick];
    if(entry){
      setSimulatorState(s => ({
        ...s,
        ganttChart: entry.ganttChart,
        processes: entry.processes,
        totalTime: entry.totalTime
      }));
    }
  }, [algorithmTick, simulationLog]);

  // track previous algorithm selection to detect changes during tutorial step 4
  const prevAlgoRef = useRef(simulatorState.algorithm);
  useEffect(()=>{
    if(tutorialMode && currentLessonPortal === "task-scheduling" && tutorialStep === 4) {
      if(simulatorState.algorithm !== prevAlgoRef.current) {
        setTutorialStep(5);
      }
    }
    prevAlgoRef.current = simulatorState.algorithm;
  }, [simulatorState.algorithm, tutorialStep, tutorialMode, currentLessonPortal]);

  // Advance memory tutorial steps automatically based on actions
  useEffect(()=>{
    if(!tutorialMode || currentLessonPortal!=="memory-management") return;
    if(tutorialStep===0 && memoryState.allocatedMemory>0) {
      setTutorialStep(1);
    }
    if(tutorialStep===1 && memoryState.fragmentationWaste>0) {
      setTutorialStep(2);
    }
    if(tutorialStep===2 && memoryState.allocatedMemory===0 && memoryState.fragmentationWaste===0) {
      setTutorialStep(3);
    }
  }, [memoryState, tutorialStep, tutorialMode, currentLessonPortal]);

  // Precompute comparison metrics for all algorithms when at final tutorial step
  const comparisonRows = (tutorialMode && currentLessonPortal === "task-scheduling" && tutorialStep === 5)
    ? ["FIFO","SJF-NP","SJF-P","PS-NP","PS-P"].map(a=>{
        const m = computeMetricsForAlgorithm(a, simulatorState.processes);
        return {algo:a, ...m};
      })
    : [];


  const spawnEnemies = useCallback((lvl=1)=>{
    const positions=[
      {x:8,y:4},{x:40,y:5},{x:6,y:12},{x:42,y:14},{x:10,y:20},{x:38,y:22},
      {x:5,y:28},{x:45,y:26},{x:14,y:8},{x:34,y:10},{x:16,y:24},{x:32,y:28},
      {x:22,y:5},{x:26,y:30},{x:4,y:16},{x:46,y:18},{x:20,y:13},{x:30,y:15}
    ];
    const list = positions.map((pos,i)=>{
      const t = ENEMY_TYPES[Math.floor(Math.random()*ENEMY_TYPES.length)];
      const sc = 1+(lvl-1)*0.2;
      return {...t, mapId:i, ...pos, hp:Math.floor(t.hp*sc), maxHp:Math.floor(t.hp*sc), xp:Math.floor(t.xp*sc), gold:Math.floor(t.gold*sc), alive:true};
    });
    setMapEnemies(list);
  },[]);

  const startGame = ()=>{
    if(!nameInput.trim()||!classChoice) return;
    const cls=CLASSES[classChoice];
    setPlayerName(nameInput.trim());
    S.current={...cls.stats,maxHp:cls.stats.hp,maxMp:cls.stats.mp,xp:0,gold:50,score:0,level:1};
    syncStats();
    setPlayerPos({x:24,y:16});
    posRef.current = {x:24, y:16}; // sync ref so game loop starts at correct position
    setStartPos({x:24,y:16});
    setWorldMap(WORLD_MAP.map(r=>[...r]));
    setKillCount(0);
    setKillTypeCounts({});
    setCompletedQuests([]);
    setQuests([]);
    setBossSummoned(false);
    gameStartTime.current = Date.now();
    setScreen("game");
    setTimeout(()=>spawnEnemies(1),120);
  };

  // Sync posRef with playerPos state so game loop can read latest position
  useEffect(()=>{
    posRef.current = playerPos;
  },[playerPos.x, playerPos.y]);

  // Game loop
  useEffect(()=>{
    if(screen!=="game") return;
    const loop=()=>{
      tick.current++;
      // update animFrame every tick (60FPS) for maximum smoothness
      setAnimFrame(tick.current);
      if(interactCooldown.current>0) interactCooldown.current--;
      moveTimer.current--;

      // Camera smoothing: runs EVERY frame for silky smooth panning
      const targetX = clamp(posRef.current.x - Math.floor(VIEW_W/2), 0, MAP_W-VIEW_W);
      const targetY = clamp(posRef.current.y - Math.floor(VIEW_H/2), 0, MAP_H-VIEW_H);
      setCamX(cx => {
        const diff = targetX - cx;
        return Math.abs(diff) < 0.005 ? targetX : cx + diff * 0.40;
      });
      setCamY(cy => {
        const diff = targetY - cy;
        return Math.abs(diff) < 0.005 ? targetY : cy + diff * 0.40;
      });

      if(moveTimer.current<=0){
        let dx=0,dy=0;
        if(keys.current["ArrowUp"]||keys.current["w"]||keys.current["W"]) dy=-1;
        else if(keys.current["ArrowDown"]||keys.current["s"]||keys.current["S"]) dy=1;
        else if(keys.current["ArrowLeft"]||keys.current["a"]||keys.current["A"]) dx=-1;
        else if(keys.current["ArrowRight"]||keys.current["d"]||keys.current["D"]) dx=1;
        if(dx!==0||dy!==0){
          setPlayerMoving(true);
          setPlayerDir(dx<0?2:dx>0?0:dy<0?3:1);
          setPlayerPos(p=>{
            const nx=p.x+dx, ny=p.y+dy;
            if(nx<0||nx>=MAP_W||ny<0||ny>=MAP_H) return p;
            if(SOLID_TILES.has(WORLD_MAP[ny][nx])) return p;
            if(interactCooldown.current<=0){
              const npc=NPCS.find(n=>n.x===nx&&n.y===ny);
              if(npc){ setTimeout(()=>openNPC(npc),0); return p; }
              const en=mapEnemies.find(e=>e.alive&&e.x===nx&&e.y===ny);
              if(en){ setTimeout(()=>triggerBattle(en),0); return p; }
            }
            playSound("move", 0.08, 300, 200);
            // Step-on portal detection
            if(taskSchedulingPortal && nx===taskSchedulingPortal.x && ny===taskSchedulingPortal.y && !taskSchedulingCompleted){
              setTimeout(()=>{
                setCurrentLessonPortal("task-scheduling");
                setShowSimulator(true);
                notify("⏰ Entered Task Scheduling Portal!","#d850ff",1500);
              },0);
            } else if(memoryManagementPortal && nx===memoryManagementPortal.x && ny===memoryManagementPortal.y && !memoryManagementCompleted){
              setTimeout(()=>{
                setCurrentLessonPortal("memory-management");
                setShowSimulator(true);
                notify("💾 Entered Memory Management Portal!","#5cbfff",1500);
              },0);
            }
            return {x:nx,y:ny};
          });
          moveTimer.current=MOVE_DELAY;
        } else {
          setPlayerMoving(false);
        }
      }
      rafId.current=requestAnimationFrame(loop);
    };
    rafId.current=requestAnimationFrame(loop);
    return()=>{ if(rafId.current) cancelAnimationFrame(rafId.current); };
  },[screen,mapEnemies]);

  useEffect(()=>{
    if(screen!=="game") return;
    const kd=e=>{
      if(e.repeat) return;
      keys.current[e.key]=true;
    };
    const ku=e=>{ keys.current[e.key]=false; };
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);
    return()=>{ window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku); };
  },[screen,mapEnemies]);

  useEffect(()=>{ if(screen!=="game") keys.current={}; },[screen]);

  // ─── Boss Defeated: Spawn Final Lesson Portals ───
  useEffect(()=>{
    if(bossDfeated && !taskSchedulingPortal && !memoryManagementPortal) {
      // Spawn two portals at different locations
      setTaskSchedulingPortal({x: 18, y: 12});
      setMemoryManagementPortal({x: 30, y: 12});
      console.log("🌀 Two final lesson portals spawned!");
    }
  },[bossDfeated, taskSchedulingPortal, memoryManagementPortal]);

  // ─── Check if both lessons completed ───
  useEffect(()=>{
    if(bossDfeated && taskSchedulingCompleted && memoryManagementCompleted) {
      setTimeout(()=>{
        keys.current={};
        setScreen("victory");
      }, 1000);
    }
  },[bossDfeated, taskSchedulingCompleted, memoryManagementCompleted]);

  // ─── Background Music Management ───
  useEffect(()=>{
    if(screen==="game" && audioEnabled) {
      playBGM();
    } else {
      stopBGM();
    }
  },[screen, audioEnabled]);

  const tryPortalInteract=(portal,name)=>{
    if(!portal) return false;
    const near=Math.abs(playerPos.x-portal.x)<=1&&Math.abs(playerPos.y-portal.y)<=1;
    if(near){
      if(name==="task-scheduling"&&!taskSchedulingCompleted){
        setCurrentLessonPortal("task-scheduling");
        setShowSimulator(true);
        return true;
      } else if(name==="memory-management"&&!memoryManagementCompleted){
        setCurrentLessonPortal("memory-management");
        setShowSimulator(true);
        return true;
      }
    } else {
      notify("🚶 Walk closer!","#d4b870",1500);
    }
    return false;
  };

  const handleInteract=()=>{
    if(interactCooldown.current>0) return;
    const p=playerPos;
    const adj=[{x:p.x,y:p.y-1},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y}];
    for(const pos of adj){
      // Check portals first
      if(tryPortalInteract(taskSchedulingPortal,"task-scheduling")) return;
      if(tryPortalInteract(memoryManagementPortal,"memory-management")) return;
      // Then NPCs, enemies, chests
      const npc=NPCS.find(n=>n.x===pos.x&&n.y===pos.y);
      if(npc){ openNPC(npc); return; }
      const en=mapEnemies.find(e=>e.alive&&e.x===pos.x&&e.y===pos.y);
      if(en){ triggerBattle(en); return; }
      if(pos.x>=0&&pos.x<MAP_W&&pos.y>=0&&pos.y<MAP_H&&worldMap[pos.y][pos.x]===T.CHEST){
        openChest(pos.x,pos.y); return;
      }
    }
  };

  const openChest=(x,y)=>{
    const gold=rand(15,35);
    S.current.gold+=gold;
    S.current.score+=gold*5;
    syncStats();
    notify(`Found ${gold} gold! 🪙`,"#f5c518");
    addFloat(`+${gold}🪙`,"#f5c518");
    setWorldMap(m=>{ const nm=m.map(r=>[...r]); nm[y][x]=T.GRASS; return nm; });
  };

  const openNPC=(npc)=>{
    if(dialogueLock.current) return;
    dialogueLock.current=true;
    interactCooldown.current=30;
    keys.current={};
    setPlayerMoving(false);
    setActiveNPC(npc);
    setDlgIdx(0);
    setScreen("dialogue");
    const qDef=QUEST_DEFS.find(q=>q.giver===npc.id);
    if(qDef&&!quests.find(q=>q.id===qDef.id)&&!completedQuests.includes(qDef.id)){
      setTimeout(()=>notify(`📜 New Quest: "${qDef.title}"!`,"#c84bfa"),400);
      setQuests(q=>[...q,{...qDef,progress:0}]);
    }
  };

  const closeDialogue=()=>{
    dialogueLock.current=false;
    interactCooldown.current=40;
    keys.current={};
    setScreen("game");
  };

  const advanceDlg=()=>{
    if(dlgIdx<activeNPC.dialogue.length-1){
      setDlgIdx(i=>i+1);
    } else {
      closeDialogue();
    }
  };

  const triggerBattle=(enemy)=>{
    playSound("battle", 0.2, 220, 110);
    keys.current={};
    setPlayerMoving(false);
    setBattle({...enemy});
    setEnemyHP(enemy.hp);
    setEnemyMaxHP(enemy.maxHp);
    setBattleLog([`⚔️  A wild ${enemy.name} appeared!`,`💬  "${enemy.desc}"`]);
    setBattlePhase("player");
    setBattleAnim(null);
    setBossPhase(0);
    setScreen("battle");
  };

  const triggerBossFight=()=>{
    playSound("battle", 0.25, 110, 55);
    keys.current={};
    setPlayerMoving(false);
    const bossData={...BOSS,mapId:-1,alive:true};
    setBattle(bossData);
    setEnemyHP(BOSS.hp);
    setEnemyMaxHP(BOSS.maxHp);
    setBattleLog([`💀  THE KERNEL PANIC awakens!`,`⚠️  A fatal error corrupts all memory!`]);
    setBattlePhase("player");
    setBattleAnim(null);
    setBossPhase(0);
    setScreen("battle");
  };

  const doAttack=(type,ability=null)=>{
    if(battlePhase!=="player") return;
    const s=S.current;
    let dmg=0, logMsg="";
    if(type==="basic"){
      dmg=rand(s.atk-4,s.atk+8)+(s.level-1)*2;
      logMsg=`🗡️  Basic attack — ${dmg} damage!`;
    } else if(type==="ability"&&ability){
      if(s.mp<ability.mpCost){ notify("Not enough MP!","#ff4444"); return; }
      s.mp=Math.max(0,s.mp-ability.mpCost);
      syncStats();
      dmg=rand(ability.dmg[0],ability.dmg[1])+(s.level-1)*2;
      logMsg=`✨  ${ability.name} — ${dmg} damage!`;
    }
    playSound("hit", 0.15, 300, 150);
    setBattleAnim("enemy-hit");
    triggerShake(6,300);
    setTimeout(()=>setBattleAnim(null),420);
    addLog(logMsg);
    addFloat(`-${dmg}`,"#ff8888");
    setEnemyHP(h=>{
      const nh=Math.max(0,h-dmg);
      if(battle?.id==="boss"){
        const pct=nh/BOSS.maxHp;
        BOSS.phases.forEach((ph,i)=>{
          if(pct<=ph.threshold&&i>=bossPhase){
            setBossPhase(i+1);
            addLog(`🔥  ${ph.msg}`);
            notify(ph.msg,"#ff2244",3000);
          }
        });
      }
      if(nh<=0){ setTimeout(()=>handleVictory(battle),700); }
      else { setTimeout(()=>enemyTurn(),1100); }
      return nh;
    });
    setBattlePhase("wait");
  };

  const doQuizInBattle=()=>{
    const q=QUIZZES[Math.floor(Math.random()*QUIZZES.length)];
    setQuiz(q); setQuizPick(null); setQuizCtx("battle");
    setScreen("quiz");
  };

  const doItem=(item)=>{
    const s=S.current;
    if(item.id==="potion"||item.id==="elixir"){
      const amt=item.id==="elixir"?60:30;
      const heal=Math.min(amt,s.maxHp-s.hp);
      s.hp+=heal;
      addLog(`🧪  Used ${item.name} — +${heal} HP!`);
      addFloat(`+${heal}HP`,"#40e040");
    } else if(item.id==="ether"){
      const restore=Math.min(20,s.maxMp-s.mp);
      s.mp+=restore;
      addLog(`💎  MP Crystal — +${restore} MP!`);
      addFloat(`+${restore}MP`,"#4080ff");
    } else if(item.id==="memcrystal"){
      s.maxMp+=10; s.mp=Math.min(s.maxMp,s.mp+10);
      addLog(`💠  Memory Crystal equipped — MaxMP +10!`);
      addFloat(`+10 MaxMP`,"#4080ff");
    } else if(item.id==="pagebook"){
      s.def+=5;
      addLog(`📖  Page Table Tome — DEF +5!`);
      addFloat(`+5 DEF`,"#80ffaa");
    }
    setInventory(inv=>inv.map(i=>i.id===item.id?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0));
    syncStats();
    setBattlePhase("player");
  };

  const doFlee=()=>{
    if(Math.random()<0.55){
      addLog("💨  You escaped!"); setBattlePhase("wait");
      setTimeout(()=>{ keys.current={}; setScreen("game"); },900);
    } else {
      addLog("❌  Couldn't flee!"); setBattlePhase("wait");
      setTimeout(enemyTurn,700);
    }
  };

  const enemyTurn=()=>{
    if(!battle) return;
    const s=S.current;
    const bAtk = battle.id==="boss" ? battle.atk+(bossPhase*8) : battle.atk;
    const dmg=Math.max(1,rand(bAtk-4,bAtk+6)-Math.floor(s.def/3));
    s.hp=Math.max(0,s.hp-dmg);
    syncStats();
    let msg=`💀  ${battle.name}`;
    if(battle.id==="boss"){
      const ab=BOSS.abilities[Math.floor(Math.random()*BOSS.abilities.length)];
      msg+=` uses ${ab} — ${dmg} damage!`;
    } else {
      msg+=` attacks — ${dmg} damage!`;
    }
    playSound("hit", 0.12, 180, 80);
    addLog(msg);
    addFloat(`-${dmg}`,"#ff4444");
    setBattleAnim("player-hit");
    triggerShake(7,350);
    setTimeout(()=>setBattleAnim(null),420);
    if(s.hp<=0){
      addLog("💀  You were defeated...");
      setTimeout(async()=>{ 
        const completionTime = gameStartTime.current ? Date.now() - gameStartTime.current : 0;
        const runKey = gameStartTime.current ? Math.floor(gameStartTime.current/1000) : Math.floor(Date.now()/1000);
        const owner = (user && user.uid) ? user.uid : (playerName?playerName.replace(/\s+/g,'_'):'guest');
        const recordId = `${owner}_${runKey}`;
        await saveLB({ time: completionTime, id: recordId });
        keys.current={}; setScreen("gameover"); 
      },2000);
      return;
    }
    setBattlePhase("player");
  };

  const handleVictory=(defeatedBattle)=>{
    playSound("quest", 0.3, 523, 659);
    const s=S.current;
    const xpGain=defeatedBattle.xp||50;
    const goldGain=defeatedBattle.gold||20;
    s.xp+=xpGain; s.gold+=goldGain; s.score+=xpGain*20;
    const newLvl=levelFromXP(s.xp);
    let lvlMsg="";
    if(newLvl>s.level){
      playSound("levelup", 0.35, 440, 880);
      s.level=newLvl; s.maxHp+=12; s.hp=s.maxHp; s.maxMp+=8; s.mp=s.maxMp; s.atk+=2; s.def+=1;
      lvlMsg=` ⭐ LEVEL UP! Lv.${s.level}!`;
      notify(`LEVEL UP! Now Lv.${s.level}`,"#f5c518");
    } else {
      s.hp=Math.min(s.maxHp,s.hp+18); s.mp=Math.min(s.maxMp,s.mp+12);
    }
    syncStats();
    addLog(`🎉  Victory! +${xpGain} XP, +${goldGain} 🪙${lvlMsg}`);
    addFloat(`+${xpGain} XP`,"#f5c518");

    const newKills=killCount+1;
    setKillCount(newKills);
    setKillTypeCounts(prev=>{
      const next={...prev, [defeatedBattle.id]:(prev[defeatedBattle.id]||0)+1};
      // Check kill_type quests
      setQuests(qs=>qs.map(q=>{
        if(q.goal==="kill_type"&&q.killType===defeatedBattle.id&&!completedQuests.includes(q.id)){
          const prog=(next[defeatedBattle.id]||0);
          if(prog>=q.target){ setTimeout(()=>completeQuest(q),100); return {...q,progress:prog,done:true}; }
          return {...q,progress:Math.min(prog,q.target)};
        }
        return q;
      }));
      return next;
    });

    // Kill quests
    setQuests(qs=>qs.map(q=>{
      if(q.goal==="kill"&&!completedQuests.includes(q.id)){
        const prog=q.progress+1;
        if(prog>=q.target){ setTimeout(()=>completeQuest(q),100); return {...q,progress:prog,done:true}; }
        return {...q,progress:prog};
      }
      if(q.goal==="boss"&&defeatedBattle.id==="boss"&&!completedQuests.includes(q.id)){
        setTimeout(()=>completeQuest(q),100); return {...q,progress:1,done:true};
      }
      return q;
    }));

    if(defeatedBattle.id==="boss"){
      addLog("💫  THE KERNEL PANIC has been vanquished!");
      setTimeout(async()=>{ 
        console.log("🏆 Boss defeated! Saving Hall of Fame record...");
        console.log("Player info - Name:", playerName, "Class:", classChoice, "Score:", S.current.score);
          const completionTime = gameStartTime.current ? Date.now() - gameStartTime.current : 0;
        const runKey = gameStartTime.current ? Math.floor(gameStartTime.current/1000) : Math.floor(Date.now()/1000);
        const owner = (user && user.uid) ? user.uid : (playerName?playerName.replace(/\s+/g,'_'):'guest');
        const recordId = `${owner}_${runKey}`;
        await saveLB({ time: completionTime, id: recordId, completed: true }); 
        console.log("✅ Record saved attempt completed!");
        keys.current={}; 
        setBossDefeated(true);
        setScreen("game");
        addLog("🌀 Portal shimmers appear... Complete the lessons to master the OS realm!");
      },2500);
      return;
    }
    setMapEnemies(es=>es.map(e=>e.mapId===defeatedBattle.mapId?{...e,alive:false}:e));
    setTimeout(()=>{ keys.current={}; setScreen("game"); },2000);
  };

  const completeQuest=(q)=>{
    playSound("quest", 0.25, 659, 523);
    setCompletedQuests(c=>{
      if(c.includes(q.id)) return c;
      const s=S.current;
      s.xp+=q.reward.xp; s.gold+=q.reward.gold; s.score+=q.reward.xp*15;
      syncStats();
      notify(`✅ Quest Complete: "${q.title}"! +${q.reward.xp} XP`,"#4bfa7f",4000);
      if(q.reward.item){
        setInventory(inv=>{
          const ex=inv.find(i=>i.id===q.reward.item.id);
          if(ex) return inv.map(i=>i.id===q.reward.item.id?{...i,qty:i.qty+q.reward.item.qty}:i);
          return [...inv,{...q.reward.item}];
        });
      }
      if((q.id==="q_elder"||q.id==="q_pager")&&!bossSummoned){
        const done=[...c,q.id];
        if(done.includes("q_elder")&&done.includes("q_pager")){
          setBossSummoned(true);
          setTimeout(()=>notify("⚠️ THE KERNEL PANIC has been summoned! Find the Castle!","#ff2244",5000),1500);
        }
      }
      const newC = [...c,q.id];
      const newCount = newC.length;
      setQuestsCompletedCount(newCount);
      
      // Show chathead after 3 quests
      if(newCount === 3) {
        setTimeout(()=>{
          setShowChathead(true);
          setChatheadMinimized(false);
          setChatMessages([{role:"ai",text:"Greetings, brave adventurer! I am Oracle, the AI guide. You've proven yourself worthy. Shall we explore the mysteries of the OS realm together? 🔮"}]);
        }, 2000);
      }

      return newC;
    });
  };

  const answerQuiz=(answer)=>{
    if(quizPick!==null) return;
    let correct = false;
    if(quiz.type==="multiple"){
      correct = answer === quiz.ans;
      setQuizPick(answer);
    } else {
      correct = answer.toLowerCase().trim() === quiz.ans;
      setQuizPick(correct ? "correct" : "wrong");
    }
    
    const s=S.current;
    if(correct){
      s.xp+=quiz.xp; s.score+=quiz.xp*10; syncStats();
      addFloat(`+${quiz.xp} XP`,"#4bfa7f");
      const newCorrect=quizCorrectCount+1;
      setQuizCorrectCount(newCorrect);
      setQuests(qs=>qs.map(q=>{
        if(q.goal==="quiz"&&!completedQuests.includes(q.id)){
          const prog=q.progress+1;
          if(prog>=q.target){ setTimeout(()=>completeQuest(q),3200); return {...q,progress:prog,done:true}; }
          return {...q,progress:prog};
        }
        return q;
      }));
    }
    setTimeout(()=>{
      setQuiz(null); setQuizPick(null);
      if(quizCtx==="battle"){
        if(correct){
          const bonusDmg=rand(22,38);
          setEnemyHP(h=>{
            const nh=Math.max(0,h-bonusDmg);
            addLog(`📚  Knowledge Strike — ${bonusDmg} bonus damage!`);
            if(nh<=0) setTimeout(()=>handleVictory(battle),600);
            else setTimeout(enemyTurn,800);
            return nh;
          });
          setBattlePhase("wait");
        } else {
          const pen=rand(8,16); s.hp=Math.max(1,s.hp-pen); syncStats();
          addLog(`📚  Wrong — ${pen} confusion damage!`);
          setBattlePhase("player");
        }
        setScreen("battle");
      } else {
        setScreen("game");
      }
    },3000);
  };

  const handleChatSubmit = async () => {
    if(!chatInput.trim() || !crosswordCompleted) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(m => [...m, {role:"user", text: userMsg}]);
    const response = await queryOracle(userMsg);
    setChatMessages(m => [...m, {role:"ai", text: response}]);
  };

  // Helper: compute final metrics for an algorithm without mutating React state
  const computeMetricsForAlgorithm = (algorithm, initialProcesses) => {
    const procs = initialProcesses.map(p => ({...p, burstTime: p.burstTime, remainingTime: p.burstTime}));
    const result = [];
    let time = 0;

    if(algorithm === "FIFO") {
      const queue = [...procs].sort((a,b)=>a.arrivalTime - b.arrivalTime);
      queue.forEach(p=>{
        p.waitTime = time - p.arrivalTime;
        p.completionTime = time + p.burstTime;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.status = "completed";
        result.push({process:p.name,startTime:time,endTime:time+p.burstTime,burst:p.burstTime});
        time += p.burstTime;
      });
    } else if(algorithm === "SJF-NP") {
      const queue = [...procs].sort((a,b)=>a.burstTime - b.burstTime);
      queue.forEach(p=>{
        p.waitTime = time - p.arrivalTime;
        p.completionTime = time + p.burstTime;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.status = "completed";
        result.push({process:p.name,startTime:time,endTime:time+p.burstTime,burst:p.burstTime});
        time += p.burstTime;
      });
    } else if(algorithm === "SJF-P") {
      const queue = procs.map(p=>({...p}));
      while(queue.some(p=>p.remainingTime>0)){
        queue.sort((a,b)=>a.remainingTime - b.remainingTime);
        const p = queue[0];
        p.remainingTime -= 1;
        result.push({process:p.name,startTime:time,endTime:time+1,burst:1});
        time += 1;
        if(p.remainingTime === 0) {
          p.waitTime = time - p.burstTime - p.arrivalTime;
          p.completionTime = time;
          p.turnaroundTime = time - p.arrivalTime;
          p.status = "completed";
        }
      }
    } else if(algorithm === "PS-NP") {
      const queue = [...procs].sort((a,b)=>a.priority - b.priority);
      queue.forEach(p=>{
        p.waitTime = time - p.arrivalTime;
        p.completionTime = time + p.burstTime;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.status = "completed";
        result.push({process:p.name,startTime:time,endTime:time+p.burstTime,burst:p.burstTime});
        time += p.burstTime;
      });
    } else if(algorithm === "PS-P") {
      const queue = procs.map(p=>({...p}));
      while(queue.some(p=>p.remainingTime>0)){
        queue.sort((a,b)=>a.priority - b.priority);
        const p = queue[0];
        p.remainingTime -= 1;
        result.push({process:p.name,startTime:time,endTime:time+1,burst:1});
        time += 1;
        if(p.remainingTime === 0) {
          p.waitTime = time - p.burstTime - p.arrivalTime;
          p.completionTime = time;
          p.turnaroundTime = time - p.arrivalTime;
          p.status = "completed";
        }
      }
    }

    const totalTime = result.reduce((a,r)=>Math.max(a,r.endTime),0);
    const avgWait = procs.reduce((a,p)=>a+p.waitTime,0)/procs.length || 0;
    const avgTurn = procs.reduce((a,p)=>a+p.turnaroundTime,0)/procs.length || 0;
    const cpuUtil = procs.reduce((a,p)=>a+p.burstTime,0)/totalTime*100 || 0;
    return {avgWait, avgTurn, totalTime, cpuUtil};
  };

  // Scheduler simulation function (step-by-step log for tutorial)
  const simulateScheduling = useCallback((algorithm, initialProcesses = simulatorState.processes) => {
    // Deep copy processes to avoid mutating state
    const procs = initialProcesses.map(p => ({
      ...p,
      burstTime: p.burstTime,
      remainingTime: p.burstTime,
      status: "waiting",
      waitTime: 0,
      turnaroundTime: 0,
      completionTime: 0
    }));

    const log = [];
    let totalTime = 0;
    let gantt = [];
    let processes = procs.map(p => ({...p}));

    const pushState = () => {
      const cpuUtil = processes.reduce((a,p)=>a+p.burstTime,0) / (totalTime || 1) * 100;
      log.push({
        ganttChart: [...gantt],
        processes: processes.map(p => ({...p})),
        totalTime,
        cpuUtil
      });
    };

    // initial snapshot
    pushState();

    const runProcess = (proc, duration) => {
      // mark running
      processes = processes.map(p => p.name === proc.name ? {...p, status: "running"} : p);
      pushState();

      const start = totalTime;
      totalTime += duration;
      gantt.push({process: proc.name, startTime: start, endTime: totalTime, burst: duration});

      processes = processes.map(p => {
        if(p.name === proc.name) {
          const wait = start - p.arrivalTime;
          const turnaround = totalTime - p.arrivalTime;
          return {
            ...p,
            status: "completed",
            waitTime: wait,
            completionTime: totalTime,
            turnaroundTime: turnaround,
            remainingTime: 0
          };
        }
        return p;
      });
      pushState();
    };

    if(algorithm === "FIFO") {
      const queue = [...processes].sort((a,b)=>a.arrivalTime - b.arrivalTime);
      while(queue.length > 0) {
        const proc = queue.shift();
        runProcess(proc, proc.burstTime);
      }
    } else if(algorithm === "SJF-NP") {
      const queue = [...processes].sort((a,b)=>a.burstTime - b.burstTime);
      while(queue.length > 0) {
        const proc = queue.shift();
        runProcess(proc, proc.burstTime);
      }
    } else if(algorithm === "SJF-P") {
      const queue = processes.map(p=>({...p}));
      while(queue.some(p=>p.remainingTime>0)) {
        queue.sort((a,b)=>a.remainingTime - b.remainingTime);
        const proc = queue[0];
        // execute one unit
        processes = processes.map(p=>p.name===proc.name?{...p,status:"running"}:p);
        pushState();
        proc.remainingTime -= 1;
        const start=totalTime;
        totalTime += 1;
        gantt.push({process:proc.name,startTime:start,endTime:totalTime,burst:1});
        if(proc.remainingTime===0) {
          processes = processes.map(p=>{
            if(p.name===proc.name) {
              const wait = totalTime - p.burstTime - p.arrivalTime;
              const turnaround = totalTime - p.arrivalTime;
              return {...p,status:"completed",waitTime:wait,completionTime:totalTime,turnaroundTime:turnaround,remainingTime:0};
            }
            return p;
          });
        }
        pushState();
      }
    } else if(algorithm === "PS-NP") {
      const queue = [...processes].sort((a,b)=>a.priority - b.priority);
      while(queue.length>0) {
        const proc = queue.shift();
        runProcess(proc, proc.burstTime);
      }
    } else if(algorithm === "PS-P") {
      const queue = processes.map(p=>({...p}));
      while(queue.some(p=>p.remainingTime>0)) {
        queue.sort((a,b)=>a.priority - b.priority);
        const proc = queue[0];
        processes = processes.map(p=>p.name===proc.name?{...p,status:"running"}:p);
        pushState();
        proc.remainingTime -= 1;
        const start=totalTime;
        totalTime += 1;
        gantt.push({process:proc.name,startTime:start,endTime:totalTime,burst:1});
        if(proc.remainingTime===0) {
          processes = processes.map(p=>{
            if(p.name===proc.name) {
              const wait = totalTime - p.burstTime - p.arrivalTime;
              const turnaround = totalTime - p.arrivalTime;
              return {...p,status:"completed",waitTime:wait,completionTime:totalTime,turnaroundTime:turnaround,remainingTime:0};
            }
            return p;
          });
        }
        pushState();
      }
    }

    // update final state
    setSimulatorState(s=>({
      ...s,
      processes: processes.map(p=>({...p})),
      ganttChart: gantt,
      totalTime
    }));
    setSimulationLog(log);
    return log;
  });

  // Memory allocation simulation
  const allocateMemory = (processName = "Data") => {
    setMemoryState(m => {
      const updated = {...m};
      const unallocated = updated.pages.find(p => !p.allocated);
      if(unallocated) {
        unallocated.allocated = true;
        unallocated.process = processName;
        const newAllocated = updated.pages.filter(p => p.allocated).length * 2;
        updated.allocatedMemory = newAllocated;
        const waste = updated.pages.reduce((sum, p) => {
          if(!p.allocated && updated.pages.some(x => x.allocated && updated.pages.indexOf(x) > updated.pages.indexOf(p))) return sum + 2;
          return sum;
        }, 0);
        updated.fragmentationWaste = waste;
      }
      return updated;
    });
  };

  const deallocateMemory = () => {
    setMemoryState(m => {
      const updated = {...m};
      const allocated = [...updated.pages].reverse().find(p => p.allocated);
      if(allocated) {
        allocated.allocated = false;
        allocated.process = "";
        const newAllocated = updated.pages.filter(p => p.allocated).length * 2;
        updated.allocatedMemory = newAllocated;
        const waste = updated.pages.reduce((sum, p) => {
          if(!p.allocated && updated.pages.some(x => x.allocated && updated.pages.indexOf(x) > updated.pages.indexOf(p))) return sum + 2;
          return sum;
        }, 0);
        updated.fragmentationWaste = waste;
      }
      return updated;
    });
  };

  const cls = classChoice ? CLASSES[classChoice] : CLASSES.Scheduler;
  const clsColor = cls.color;

  // ─────────────────────────────────
  //  CSS
  // ─────────────────────────────────
  const G=`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#0a0806;overflow:hidden;}
    @keyframes legSwing{0%{transform:rotate(-18deg)}25%{transform:rotate(8deg)}50%{transform:rotate(-18deg)}75%{transform:rotate(12deg)}100%{transform:rotate(-18deg)}}
    @keyframes bodyBob{0%{transform:translateY(0)}25%{transform:translateY(-5px)}50%{transform:translateY(-2px)}75%{transform:translateY(-6px)}100%{transform:translateY(0)}}
    @keyframes armSwing{0%{transform:rotate(-22deg)}25%{transform:rotate(15deg)}50%{transform:rotate(-22deg)}75%{transform:rotate(18deg)}100%{transform:rotate(-22deg)}}
    @keyframes knockback{0%{transform:translateX(0) scale(1)}50%{transform:translateX(-14px) scale(0.95)}100%{transform:translateX(0) scale(1)}}
    @keyframes hitFlash{0%{filter:brightness(2) saturate(1.5)}50%{filter:brightness(2.2) saturate(2)}100%{filter:brightness(1) saturate(1)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    @keyframes floatSlow{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
    @keyframes pulseFast{0%,100%{opacity:1}50%{opacity:0.3}}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}60%{transform:translateX(7px)}}
    @keyframes glow{0%,100%{text-shadow:0 0 10px currentColor}50%{text-shadow:0 0 28px currentColor,0 0 55px currentColor}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-52px)}}
    @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes victoryPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    @keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.02)}}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes orbFloat{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-8px) rotate(120deg)}66%{transform:translateY(-4px) rotate(240deg)}}
    @keyframes waterRipple{0%{transform:scaleX(1);opacity:0.3}50%{transform:scaleX(1.3);opacity:0.15}100%{transform:scaleX(1);opacity:0.3}}
    @keyframes portalPulse{0%{transform:scale(1)}25%{transform:scale(1.05)}50%{transform:scale(1)}75%{transform:scale(1.03)}100%{transform:scale(1)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0f0a06}::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#9a6030,#6a4020);border-radius:4px;border:1px solid #3a2010;}
    ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#b07040,#8a5030)}
    .cinzel{font-family:'Cinzel',serif;}
    .cinzel-deco{font-family:'Cinzel Decorative',serif;}
    .crimson{font-family:'Crimson Text',serif;}
    .btn{font-family:'Cinzel',serif;background:transparent;border:2px solid;padding:10px 24px;cursor:pointer;transition:all .2s ease;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;font-weight:600;}
    .btn:active{transform:scale(0.95);}
    .btn-gold{color:#f5c518;border-color:#f5c518;} .btn-gold:hover{background:linear-gradient(135deg,#f5c51833,#f5c51855);box-shadow:0 0 18px #f5c51855,inset 0 1px 2px rgba(255,255,255,0.08);transform:translateY(-1px);}
    .btn-red{color:#ff5555;border-color:#ff5555;} .btn-red:hover{background:#ff555533;box-shadow:0 0 18px #ff555555,inset 0 1px 2px rgba(255,255,255,0.08);transform:translateY(-1px);}
    .btn-green{color:#4bfa7f;border-color:#4bfa7f;} .btn-green:hover{background:#4bfa7f33;box-shadow:0 0 18px #4bfa7f55,inset 0 1px 2px rgba(255,255,255,0.08);transform:translateY(-1px);}
    .btn-blue{color:#5cbfff;border-color:#5cbfff;} .btn-blue:hover{background:#5cbfff33;box-shadow:0 0 18px #5cbfff55,inset 0 1px 2px rgba(255,255,255,0.08);transform:translateY(-1px);}
    .btn-purple{color:#d850ff;border-color:#d850ff;} .btn-purple:hover{background:#d850ff33;box-shadow:0 0 18px #d850ff55,inset 0 1px 2px rgba(255,255,255,0.08);transform:translateY(-1px);}
    .panel{background:rgba(20,14,8,0.80);border:1.5px solid rgba(200,165,80,0.40);backdrop-filter:blur(12px);border-radius:6px;}
    .panel-dark{background:rgba(12,8,4,0.85);border:1px solid rgba(200,165,80,0.25);backdrop-filter:blur(8px);}
    .abt{font-family:'Cinzel',serif;font-size:10px;background:linear-gradient(135deg,rgba(25,20,10,0.9),rgba(15,12,6,0.8));border:1px solid rgba(200,165,80,0.25);color:#e8d5a0;padding:9px 12px;cursor:pointer;transition:all .15s;text-align:left;border-radius:5px;font-weight:600;}
    .abt:hover:not(:disabled){border-color:${clsColor};color:${clsColor};background:linear-gradient(135deg,rgba(25,20,10,0.95),rgba(15,12,6,0.9));box-shadow:0 0 10px ${clsColor}44;}
    .abt:disabled{opacity:0.3;cursor:not-allowed;}
    .quiz-opt{font-family:'Crimson Text',serif;font-size:17px;background:linear-gradient(135deg,rgba(15,12,6,0.9),rgba(10,8,4,0.8));border:1.5px solid rgba(120,90,30,0.3);color:#d4b870;padding:13px 17px;cursor:pointer;transition:all .15s;border-radius:6px;text-align:left;width:100%;font-weight:500;}
    .quiz-opt:hover:not(:disabled){border-color:#f5c518;background:rgba(45,35,15,0.95);box-shadow:0 0 12px #f5c51844;}
    input.rin{font-family:'Crimson Text',serif;font-size:17px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(245,197,24,0.5);color:#e8d5a0;padding:11px 14px;outline:none;border-radius:5px;width:100%;transition:all .2s;}
input.rin::placeholder{color:rgba(232,213,160,0.6);} 
    input.rin:focus{border-color:#f5c518;box-shadow:0 0 12px #f5c51844,inset 0 1px 3px rgba(0,0,0,0.1);color:#fff;}
    .cls-card{background:linear-gradient(135deg,rgba(20,16,10,0.85),rgba(12,10,6,0.75));border:2px solid rgba(180,120,60,0.3);padding:16px;cursor:pointer;transition:all .24s;border-radius:8px;}
    .cls-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.6),0 0 16px rgba(200,165,80,0.15);}
    .cls-card.sel{border-color:#f5c518;box-shadow:0 0 28px rgba(200,165,80,0.3),inset 0 1px 2px rgba(255,255,255,0.1);}
    .hud-bar{height:8px;background:rgba(0,0,0,0.7);border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);}
    .tag{font-family:'Cinzel',serif;font-size:8px;padding:3px 8px;border-radius:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.4);}
  `;

  // ═══════════════════════════════════════
  //  LOADING SCREEN
  // ═══════════════════════════════════════
  if(authLoading) return (
    <div style={{minHeight:"100vh",background:"#0a0806",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <style>{G}</style>
      <div className="cinzel" style={{fontSize:20,color:"#f5c518",marginBottom:20}}>⏳ Loading...</div>
      <div style={{width:40,height:40,border:"2px solid #f5c518",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  // ═══════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════
  if(!user) return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 60%,#6c5540 0%,#4e382e 50%,#32281d 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      {/* Background orbs */}
      {[["#f5c518","15%","20%"],["#c84bfa","85%","30%"],["#4bcffa","10%","75%"]].map(([c,l,t],i)=>(
        <div key={i} style={{position:"fixed",left:l,top:t,width:60,height:60,borderRadius:"50%",background:`radial-gradient(${c}33,transparent 70%)`,pointerEvents:"none"}}/>
      ))}
      
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",maxWidth:400,width:"100%"}}>
        <div style={{fontSize:60,marginBottom:12,filter:"drop-shadow(0 0 20px #f5c51888)"}}>🔐</div>
        <div className="cinzel-deco" style={{fontSize:32,fontWeight:700,color:"#f5c518",letterSpacing:4,marginBottom:8}}>OQUEST</div>
        <div className="cinzel" style={{fontSize:12,color:"#e8d5a0",letterSpacing:6,marginBottom:24}}>LOGIN / SIGN UP</div>
        
        <div style={{background:"rgba(0,0,0,0.6)",border:"2px solid rgba(245,197,24,0.45)",borderRadius:12,padding:24,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
          {authError && (
            <div style={{background:"rgba(255,68,68,0.2)",border:"1px solid #ff4444",borderRadius:8,padding:12,marginBottom:16,color:"#ff8888",fontSize:13,textAlign:"center"}}>
              {authError}
            </div>
          )}

          {!isSignUp ? (
            <>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,color:"#f5c518",marginBottom:4,fontFamily:"Cinzel",letterSpacing:1}}>EMAIL</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="your@email.com"
                  className="rin"
                />
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:11,color:"#f5c518",marginBottom:4,fontFamily:"Cinzel",letterSpacing:1}}>PASSWORD</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="rin"
                />
              </div>
              <button onClick={handleLogin} style={{width:"100%",padding:"12px 16px",background:"linear-gradient(135deg,#f5c518,#d4a410)",border:"none",borderRadius:6,color:"#0a0806",fontFamily:"Cinzel",fontSize:12,fontWeight:"bold",letterSpacing:2,cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
                🔓 LOGIN
              </button>
              <button onClick={() => setIsSignUp(true)} style={{width:"100%",padding:"10px 16px",background:"transparent",border:"1px solid rgba(245,197,24,0.5)",borderRadius:6,color:"#f5c518",fontFamily:"Cinzel",fontSize:11,letterSpacing:1,cursor:"pointer",transition:"all 0.2s"}}>
                Create New Account
              </button>
            </>
          ) : (
            <>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,color:"#f5c518",marginBottom:4,fontFamily:"Cinzel",letterSpacing:1}}>CHARACTER NAME</label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Your hero name"
                  className="rin"
                />
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,color:"#f5c518",marginBottom:4,fontFamily:"Cinzel",letterSpacing:1}}>EMAIL</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="rin"
                />
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:11,color:"#f5c518",marginBottom:4,fontFamily:"Cinzel",letterSpacing:1}}>PASSWORD (min 6 chars)</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rin"
                />
              </div>
              <button onClick={handleSignUp} style={{width:"100%",padding:"12px 16px",background:"linear-gradient(135deg,#4bfa7f,#2fd060)",border:"none",borderRadius:6,color:"#0a0806",fontFamily:"Cinzel",fontSize:12,fontWeight:"bold",letterSpacing:2,cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
                ✨ CREATE ACCOUNT
              </button>
              <button onClick={() => setIsSignUp(false)} style={{width:"100%",padding:"10px 16px",background:"transparent",border:"1px solid rgba(75,250,127,0.5)",borderRadius:6,color:"#4bfa7f",fontFamily:"Cinzel",fontSize:11,letterSpacing:1,cursor:"pointer",transition:"all 0.2s"}}>
                Back to Login
              </button>
            </>
          )}
        </div>
        <div className="crimson" style={{fontSize:12,color:"#e8d5a0",marginTop:20,textAlign:"center",lineHeight:1.6}}>
          🔒 Secure login powered by Firebase<br/>
          ⚔️ Your progress saves to the cloud
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  TITLE SCREEN
  // ═══════════════════════════════════════
  if(screen==="title") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 60%,#6c5540 0%,#4e382e 50%,#32281d 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      {/* Stars */}
      {Array.from({length:120}).map((_,i)=>(
        <div key={i} style={{position:"fixed",left:`${(i*37+i*i*3)%100}%`,top:`${(i*53+i*7)%100}%`,
          width:i%11===0?3:i%4===0?2:1,height:i%11===0?3:i%4===0?2:1,
          background:i%7===0?"#ffeb99":i%5===0?"#ffe066":i%3===0?"#ffd24d":"#ffc040",
          borderRadius:"50%",animation:`pulse ${1.8+i%5*0.4}s ease-in-out infinite`,
          animationDelay:`${i*0.07}s`,opacity:0.6+i%3*0.1}}/>
      ))}
      {/* Scanline */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",opacity:0.03}}>
        <div style={{position:"absolute",left:0,right:0,height:2,background:"white",animation:"scanline 10s linear infinite"}}/>
      </div>
      {/* Floating orbs */}
      {[["#f5c518","15%","20%"],["#c84bfa","85%","30%"],["#4bcffa","10%","75%"],["#4bfa7f","88%","70%"]].map(([c,l,t],i)=>(
        <div key={i} style={{position:"fixed",left:l,top:t,width:80,height:80,borderRadius:"50%",background:`radial-gradient(${c}33,transparent 70%)`,animation:`orbFloat ${4+i*0.7}s ease-in-out infinite`,animationDelay:`${i*0.8}s`,pointerEvents:"none"}}/>
      ))}

      <div style={{fontSize:72,marginBottom:6,animation:"float 3.5s ease-in-out infinite",filter:"drop-shadow(0 0 24px #f5c51888)",position:"relative",zIndex:1}}>⚔️</div>
      <div className="cinzel-deco" style={{fontSize:"clamp(22px,5.5vw,46px)",fontWeight:700,color:"#f5c518",letterSpacing:6,marginBottom:3,animation:"glow 3s ease-in-out infinite",textAlign:"center",position:"relative",zIndex:1}}>OQUEST</div>
      <div className="cinzel" style={{fontSize:"clamp(8px,1.8vw,13px)",color:"#e8d5a0",letterSpacing:10,marginBottom:6,textAlign:"center",position:"relative",zIndex:1}}>THE KERNEL CHRONICLES</div>
      <div style={{width:220,height:1,background:"linear-gradient(90deg,transparent,#f5c518,transparent)",marginBottom:22,position:"relative",zIndex:1}}/>
      <div className="crimson" style={{fontSize:17,color:"#c8a870",textAlign:"center",maxWidth:500,lineHeight:2,marginBottom:8,fontStyle:"italic",position:"relative",zIndex:1}}>
        "The OS realm fractures. Zombie processes haunt the Process Table. Deadlock Demons seize the mutex forests. A Kernel Panic stirs in the southern castle. You — a system warrior — must restore order."
      </div>
      <div style={{width:220,height:1,background:"linear-gradient(90deg,transparent,#f5c518,transparent)",marginBottom:24,position:"relative",zIndex:1}}/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginBottom:12,position:"relative",zIndex:1}}>
        <button className="btn btn-gold" onClick={()=>setScreen("charselect")}>⚔ Begin Journey</button>
        <button className="btn btn-purple" onClick={()=>setScreen("guide")}>📖 Guide</button>
        <button className="btn btn-blue" onClick={()=>setScreen("leaderboard")}>⭐ Hall of Fame</button>
        <button className="btn btn-red" onClick={handleLogout} style={{fontSize:10}}>🚪 Logout</button>
      </div>
      <div className="crimson" style={{fontSize:13,color:"#e8d5a0",letterSpacing:2,position:"relative",zIndex:1}}>WASD · E Interact · I Inventory · Q Quests</div>
      {user && <div className="cinzel" style={{fontSize:10,color:"#8a6830",position:"absolute",top:12,right:12,zIndex:5}}>👤 {user.email}</div>}
    </div>
  );

  // ═══════════════════════════════════════
  //  GUIDE SCREEN
  // ═══════════════════════════════════════
  if(screen==="guide") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#6c5540,#32281d 70%)",padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",scrollBehavior:"smooth"}}>
      <style>{G}
        {`::-webkit-scrollbar { width: 12px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); border-radius: 10px; } ::-webkit-scrollbar-thumb { background: #f5c518; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #ffd700; } .guide-content-scroll::-webkit-scrollbar { width: 12px; } .guide-content-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 10px; } .guide-content-scroll::-webkit-scrollbar-thumb { background: #f5c518; border-radius: 10px; } .guide-content-scroll::-webkit-scrollbar-thumb:hover { background: #ffd700; }`}
      </style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:950,marginBottom:8}}>
        <div className="cinzel-deco" style={{fontSize:20,fontWeight:700,color:"#f5c518",marginTop:12,marginBottom:4,letterSpacing:3}}>📖 ADVENTURER'S GUIDE</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020",fontSize:9,padding:"4px 10px",marginTop:12}} onClick={()=>setScreen("title")}>← Back</button>
          <button className="btn btn-red" onClick={handleLogout} style={{fontSize:9,padding:"4px 10px",marginTop:12}}>🚪 Logout</button>
        </div>
      </div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:22,fontStyle:"italic"}}>Master the OS realm — knowledge is your greatest weapon</div>
      <div className="guide-content-scroll" style={{maxWidth:950,width:"100%",maxHeight:650,overflowY:"auto",paddingRight:8,marginBottom:24}}>
      <div className="guide-glossary" style={{maxWidth:950,width:"100%",marginBottom:20}}>
        <div className="cinzel" style={{fontSize:17,color:"#4bfa7f",marginBottom:12,letterSpacing:2}}>📚 OS GLOSSARY & DEFINITIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12,marginBottom:24}}>
          {OS_GLOSSARY.map((item,i)=>(
            <div key={i} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(75,250,127,0.35)",borderRadius:6,padding:12}}>
              <div style={{fontSize:24,marginBottom:4}}>{item.icon}</div>
              <div className="cinzel" style={{fontSize:15,color:"#4bfa7f",marginBottom:6,fontWeight:600,letterSpacing:1}}>{item.term}</div>
              <div className="crimson" style={{fontSize:15,color:"#a8a8a8",lineHeight:1.5,marginBottom:8}}>{item.definition}</div>
              {item.related && item.related.length > 0 && (
                <div style={{fontSize:13,color:"#6a8a6a",borderTop:"1px solid rgba(75,250,127,0.15)",paddingTop:6}}>🔗 <span style={{color:"#8a9a8a"}}>Related: {item.related.join(", ")}</span></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="guide-sections" style={{maxWidth:950,width:"100%",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12,marginBottom:24}}>
        {[
          {title:"🕹 Movement & Controls",col:"#f5c518",items:["WASD / Arrow Keys — move your hero","Walk into enemies to start battle","E key — interact with adjacent NPCs","I key — inventory panel","Q key — quest log"]},
          {title:"⚔ Combat System",col:"#ff8888",items:["Attack — basic physical strike","Abilities — class OS skills (cost MP)","Quiz Strike — answer for bonus damage","Items — potions/crystals during battle","Flee — 55% chance to escape"]},
          {title:"📜 OS Quests",col:"#c84bfa",items:["Talk to NPCs to unlock quests","6 unique quests across OS topics","Guard Malloc: defeat Zombie Processes","Elder Process: pass Scheduling quizzes","Heap Merchant: hunt Memory Leaks","Librarian Mutex: break Deadlock Demons","Page Daemon: answer VM questions","KERNEL: defeat the Kernel Panic boss"]},
          {title:"💡 OS Concepts in Game",col:"#4bfa7f",items:["Each enemy IS a real OS concept","Zombie = Z-state orphan process","Memory Leak = unfreed malloc","Deadlock Demon = circular mutex wait","Ghost Thread = unjoined detached thread","Page Fault = unmapped virtual address","Race Condition = unsynchronized state","Kernel Panic = fatal unrecoverable error"]},
          {title:"🧠 Knowledge Quizzes",col:"#4bcffa",items:["15 OS questions in the quiz pool","Topics: scheduling, memory, IPC, sync","Correct = XP + quest progress","Wrong = confusion damage (battle)","Available via Quiz Strike in battle","Also accessible from world menu"]},
          {title:"⭐ Progression",col:"#f0c030",items:["XP from battles, quizzes, quests","Level up raises all stats + heals fully","Gold from battles and treasure chests","Defeat boss after completing quests","Hall of Fame records top scores"]},
        ].map(sec=>(
          <div key={sec.title} className="panel" style={{padding:16,borderRadius:8,borderColor:`${sec.col}22`}}>
            <div className="cinzel" style={{fontSize:11,color:sec.col,marginBottom:10,letterSpacing:1}}>{sec.title}</div>
            {sec.items.map((it,i)=>(
              <div key={i} className="crimson" style={{fontSize:14,color:"#c8a870",lineHeight:1.75,marginBottom:1}}>• {it}</div>
            ))}
          </div>
        ))}
      </div>
      </div>
      <div style={{display:"flex",gap:12}}>
        <button className="btn btn-gold" onClick={()=>setScreen("charselect")}>⚔ Start Playing</button>
        <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020"}} onClick={()=>setScreen("title")}>← Back</button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  CHAR SELECT
  // ═══════════════════════════════════════
  if(screen==="charselect") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#6c5540,#32281d 70%)",padding:"22px 18px",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto"}}>
      <style>{G}</style>
      <div className="cinzel-deco" style={{fontSize:22,fontWeight:700,color:"#f5c518",marginTop:12,marginBottom:3,letterSpacing:3}}>Choose Your Class</div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:22,fontStyle:"italic"}}>Each class wields different OS powers — choose your mastery</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,maxWidth:940,width:"100%",marginBottom:22}}>
        {Object.entries(CLASSES).map(([id,c])=>(
          <div key={id} className={`cls-card${classChoice===id?" sel":""}`} onClick={()=>setClassChoice(id)}
            style={{borderColor:classChoice===id?c.color:"rgba(120,90,30,0.25)",boxShadow:classChoice===id?`0 0 20px ${c.color}44`:"none"}}>
            <div style={{fontSize:36,marginBottom:8}}>{c.icon}</div>
            <div className="cinzel" style={{fontSize:13,color:c.color,marginBottom:5,fontWeight:600,letterSpacing:1}}>{id}</div>
            <div className="crimson" style={{fontSize:14,color:"#a09060",lineHeight:1.65,marginBottom:10,fontStyle:"italic",minHeight:40}}>
              {id==="Scheduler"?"Master of Round-Robin, SJF & priority scheduling":id==="MemoryMage"?"Commands virtual memory, paging & heap allocation":id==="KernelKnight"?"Ring-0 warrior of syscalls & hardware interrupts":"Breaks deadlocks with Banker's Algorithm"}
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
              {Object.entries({HP:c.stats.hp,MP:c.stats.mp,ATK:c.stats.atk,DEF:c.stats.def,SPD:c.stats.spd}).map(([k,v])=>(
                <div key={k} style={{background:`${c.color}11`,border:`1px solid ${c.color}33`,padding:"2px 7px",borderRadius:10}}>
                  <span className="cinzel" style={{fontSize:8,color:"#6a5030"}}>{k} </span>
                  <span className="cinzel" style={{fontSize:10,color:c.color}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="cinzel" style={{fontSize:8,color:"#5a4020",letterSpacing:1,marginBottom:4}}>ABILITIES</div>
            {c.abilities.map((ab,i)=>(
              <div key={i} className="crimson" style={{fontSize:13,color:"#7a6040",marginTop:2}}>• {ab.name} <span style={{color:"#4a3020"}}>({ab.mpCost>0?`${ab.mpCost}mp`:"free"})</span></div>
            ))}
          </div>
        ))}
      </div>
      <div style={{maxWidth:380,width:"100%",marginBottom:18}}>
        <div className="cinzel" style={{fontSize:9,color:"#8a6830",letterSpacing:2,marginBottom:6}}>HERO NAME</div>
        <input className="rin" placeholder="Enter your name..." value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startGame()}/>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn btn-gold" onClick={startGame} disabled={!classChoice||!nameInput.trim()} style={{opacity:!classChoice||!nameInput.trim()?0.35:1}}>Enter the Realm ⚔</button>
        {hasSave&&classChoice&&<button className="btn btn-green" onClick={loadGameProgress} style={{fontSize:11}}>📂 Load Game</button>}
        <button className="btn btn-purple" onClick={()=>setScreen("guide")}>📖 Guide</button>
        <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020"}} onClick={()=>setScreen("title")}>← Back</button>
        <button className="btn btn-red" onClick={handleLogout} style={{fontSize:10}}>🚪 Logout</button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  LEADERBOARD
  // ═══════════════════════════════════════
  if(screen==="leaderboard") return (
  <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#1a1208,#0a0806 70%)",padding:28,display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto"}}>
    <style>{G+`@keyframes livePulse{0%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}`}</style>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:700,marginBottom:8}}>
      <div className="cinzel-deco" style={{fontSize:20,fontWeight:700,color:"#f5c518",marginTop:16,letterSpacing:3,animation:"glow 3s ease-in-out infinite"}}>⭐ Hall of Fame</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:16}}>
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"rgba(75,250,127,0.1)",border:"1px solid rgba(75,250,127,0.3)",borderRadius:4}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#4bfa7f",animation:"livePulse 2s ease-in-out infinite"}}/>
          <span className="cinzel" style={{fontSize:9,color:"#4bfa7f",letterSpacing:1}}>LIVE</span>
        </div>
        <button className="btn btn-green" onClick={refreshLeaderboard} style={{fontSize:8,padding:"4px 8px"}}>🔄</button>
        <button className="btn btn-blue" style={{fontSize:8,padding:"4px 8px"}} onClick={()=>{
          // Filter to only completed runs with score > 0
          const exportData = leaderboard.filter(e => e.completed && e.score > 0);
          if(exportData.length === 0){ notify("No completed runs to export","#ff4444",2000); return; }
          // Build CSV
          const headers = ["Rank","Name","Class","Level","Score","XP","Time","Date","UID"];
          const rows = exportData.map((e,i) => [
            i+1,
            `"${e.name}"`,
            `"${e.cls||""}"`,
            e.level||1,
            e.score||0,
            e.xp||0,
            `"${e.timeFormatted||formatTime(e.time||0)}"`,
            `"${e.date||""}"`,
            `"${e.uid||"guest"}"`
          ]);
          const csv = [headers.join(","), ...rows.map(r=>r.join(","))].join("\n");
          const blob = new Blob([csv], {type:"text/csv"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `oquest_leaderboard_${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          notify("📥 Exported "+exportData.length+" records","#4bfa7f",2000);
        }}>📥 Export CSV</button>
        <button className="btn btn-blue" style={{fontSize:8,padding:"4px 8px"}} onClick={exportLeaderboardPDF}>📄 Export PDF</button>
        <button className="btn btn-red" onClick={handleLogout} style={{fontSize:9,padding:"4px 10px"}}>🚪 Logout</button>
      </div>
    </div>
    <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:12,fontStyle:"italic"}}>Fastest realm progressors are crowned champions</div>
    {lastUpdateTime&&(
      <div className="cinzel" style={{fontSize:9,color:"#8a6830",marginBottom:8}}>
        🕐 Last updated: {lastUpdateTime.toLocaleTimeString()}
      </div>
    )}
    <div className="panel" style={{padding:"12px 16px",marginBottom:20,borderRadius:6,textAlign:"center",borderColor:"rgba(75,250,127,0.2)"}}>
      <div className="cinzel" style={{fontSize:10,color:"#4bfa7f",letterSpacing:2}}>⏱️ RANKED BY COMPLETION TIME · FINISHED RUNS ONLY</div>
    </div>
    <style>{`.leaderboard-scroll { scrollbar-width: thin; } .leaderboard-scroll::-webkit-scrollbar{width:10px;} .leaderboard-scroll::-webkit-scrollbar-thumb{background:rgba(245,197,24,0.12);border-radius:6px;} .leaderboard-scroll::-webkit-scrollbar-track{background:transparent;}`}</style>
    <div className="leaderboard-scroll" style={{maxWidth:680,width:"100%",marginBottom:24,maxHeight:'56vh',overflowY:'auto',paddingRight:8}}>
      {(() => {
        // Only show players who completed the game (boss defeated + both lessons done) with score > 0
        const finishedRecords = leaderboard.filter(e => e.completed === true && (e.score||0) > 0);
        if(finishedRecords.length === 0) return (
          <div className="panel crimson" style={{padding:40,textAlign:"center",color:"#5a4020",fontSize:20,borderRadius:8,fontStyle:"italic"}}>No completed runs yet. Be the first to finish!</div>
        );
        return finishedRecords.map((e,i)=>{
          const medals=["🥇","🥈","🥉"];
          const cd=CLASSES[e.cls]||CLASSES.Scheduler;
          return(
            <div key={i} className="panel" style={{display:"flex",alignItems:"center",gap:14,padding:"12px 18px",marginBottom:5,borderRadius:6,animation:`fadeUp 0.28s ease`,animationDelay:`${i*0.04}s`,
              borderColor:i===0?"rgba(245,197,24,0.3)":i===1?"rgba(180,180,190,0.2)":i===2?"rgba(180,120,60,0.2)":"rgba(200,165,80,0.12)"}}>
              <span style={{fontSize:20,minWidth:28}}>{medals[i]||`#${i+1}`}</span>
              <span style={{fontSize:18}}>{cd.icon}</span>
              <div style={{flex:1}}>
                <div className="cinzel" style={{fontSize:12,color:"#e8d5a0"}}>{e.name}</div>
                <div className="crimson" style={{fontSize:13,color:"#7a6040",fontStyle:"italic"}}>{e.cls} · Lv.{e.level} · {e.date}</div>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:"#4bfa7f"}}>⏱️</span>
                  <span className="cinzel" style={{fontSize:14,color:"#4bfa7f",fontWeight:600}}>{e.timeFormatted||formatTime(e.time||0)}</span>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <div><span className="cinzel" style={{fontSize:11,color:"#f5c518"}}>{e.score.toLocaleString()}</span><span className="crimson" style={{fontSize:10,color:"#5a4020"}}> pts</span></div>
                  <div><span className="cinzel" style={{fontSize:11,color:"#c84bfa"}}>{e.xp}</span><span className="crimson" style={{fontSize:10,color:"#5a4020"}}> XP</span></div>
                </div>
              </div>
            </div>
          );
        });
      })()}
    </div>
    <div style={{display:"flex",gap:12}}>
      <button className="btn btn-gold" onClick={()=>setScreen("title")}>← Return</button>
      <button className="btn btn-green" onClick={()=>setScreen("charselect")}>Play Now</button>
    </div>
  </div>
);

  // ═══════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════
  if(screen==="gameover") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#200808,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{G}</style>
      <div style={{fontSize:72,marginBottom:12,animation:"float 2s ease-in-out infinite"}}>💀</div>
      <div className="cinzel-deco" style={{fontSize:24,fontWeight:700,color:"#ff4444",marginBottom:8,letterSpacing:3,animation:"glow 2s ease-in-out infinite"}}>PROCESS TERMINATED</div>
      <div className="crimson" style={{fontSize:18,color:"#8a6830",marginBottom:30,fontStyle:"italic"}}>Your process was reclaimed by the kernel</div>
      <div className="panel" style={{padding:"22px 40px",textAlign:"center",marginBottom:28,borderRadius:10}}>
        <div className="cinzel" style={{fontSize:8,color:"#8a6830",letterSpacing:3,marginBottom:10}}>FINAL STATISTICS</div>
        <div className="cinzel" style={{fontSize:32,color:"#f5c518",marginBottom:4}}>{statsUI.score.toLocaleString()}</div>
        <div className="crimson" style={{fontSize:14,color:"#7a6040",marginBottom:12}}>SCORE</div>
        <div className="panel" style={{padding:"8px 12px",background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.2)",borderRadius:5,marginBottom:12}}>
          <div className="cinzel" style={{fontSize:9,color:"#ff8888"}}>⏱️ Time Until Defeat</div>
          <div className="cinzel" style={{fontSize:14,color:"#ff8888"}}>{(lastSavedRecord && lastSavedRecord.timeFormatted) || formatTime(gameStartTime.current ? Date.now() - gameStartTime.current : 0)}</div>
        </div>
        <div style={{display:"flex",gap:28,justifyContent:"center"}}>
          <div><div className="cinzel" style={{fontSize:18,color:clsColor}}>LV.{statsUI.level}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Level</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#4bfa7f"}}>{statsUI.xp}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>XP</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#f5c518"}}>{statsUI.gold}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Gold</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#c84bfa"}}>{completedQuests.length}/6</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Quests</div></div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn btn-gold" onClick={()=>{setScreen("charselect");setNameInput("");setClassChoice(null);}}>⟳ New Game</button>
        <button className="btn btn-green" onClick={async()=>{await saveLB();setScreen("leaderboard");}}>💾 Record & Hall of Fame</button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  VICTORY SCREEN
  // ═══════════════════════════════════════
  if(screen==="victory") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#0a2008,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden"}}>
      <style>{G}</style>
      {Array.from({length:50}).map((_,i)=>(
        <div key={i} style={{position:"fixed",left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,fontSize:rand(14,28),
          animation:`floatUp ${1.5+Math.random()*2}s ease infinite`,animationDelay:`${Math.random()*3}s`,pointerEvents:"none",opacity:0.8}}>
          {["⭐","✨","🏆","💫","🎉","💎"][i%6]}
        </div>
      ))}
      <div style={{fontSize:76,marginBottom:12,animation:"victoryPulse 1.5s ease-in-out infinite"}}>🏆</div>
      <div className="cinzel-deco" style={{fontSize:22,fontWeight:700,color:"#f5c518",marginBottom:8,letterSpacing:3,animation:"glow 2s ease-in-out infinite",textAlign:"center"}}>KERNEL PANIC DEFEATED!</div>
      <div className="crimson" style={{fontSize:19,color:"#c8a870",marginBottom:10,fontStyle:"italic",textAlign:"center"}}>Order has been restored to the OS realm.</div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",maxWidth:460,textAlign:"center",lineHeight:1.9,marginBottom:28,fontStyle:"italic"}}>
        "The processes are free. The memory breathes again. The scheduler resumes its eternal round-robin. You — Kernel Master — have proven your OS mastery."
      </div>
      <div className="panel" style={{padding:"20px 40px",textAlign:"center",marginBottom:28,borderRadius:10}}>
        <div className="cinzel" style={{fontSize:8,color:"#8a6830",letterSpacing:3,marginBottom:10}}>FINAL SCORE</div>
        <div className="cinzel" style={{fontSize:32,color:"#f5c518",marginBottom:8}}>{statsUI.score.toLocaleString()}</div>
        <div className="panel" style={{padding:"10px 16px",background:"rgba(75,250,127,0.08)",border:"1px solid rgba(75,250,127,0.2)",borderRadius:6,marginBottom:12}}>
          <div className="cinzel" style={{fontSize:10,color:"#4bfa7f"}}>⏱️ Completion Time</div>
          <div className="cinzel" style={{fontSize:18,color:"#4bfa7f",fontWeight:600}}>{(lastSavedRecord && lastSavedRecord.timeFormatted) || formatTime(gameStartTime.current ? Date.now() - gameStartTime.current : 0)}</div>
        </div>
        <div style={{display:"flex",gap:28,justifyContent:"center",marginTop:14}}>
          <div><div className="cinzel" style={{fontSize:18,color:clsColor}}>LV.{statsUI.level}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Level</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#4bfa7f"}}>{statsUI.xp}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>XP</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#c84bfa"}}>{completedQuests.length}/6</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Quests</div></div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn btn-gold" onClick={async()=>{console.log("📊 Checking leaderboard...",{playerName,classChoice}); await refreshLeaderboard(); setScreen("leaderboard");}}>⭐ Hall of Fame</button>
        <button className="btn btn-green" onClick={()=>{setScreen("charselect");setNameInput("");setClassChoice(null);}}>⟳ Play Again</button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  DIALOGUE SCREEN
  // ═══════════════════════════════════════
  if(screen==="dialogue"&&activeNPC) {
    const qDef=QUEST_DEFS.find(q=>q.giver===activeNPC.id);
    const activeQ=quests.find(q=>q.id===qDef?.id);
    const doneQ=completedQuests.includes(qDef?.id);
    return (
      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 50%,#1a1208,#0a0806 70%)",display:"flex",flexDirection:"column"}}>
        <style>{G}</style>
        {/* Scene background */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,gap:36,flexWrap:"wrap",overflowY:"auto",position:"relative"}}>
          {/* Atmospheric particles */}
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{position:"absolute",left:`${15+i*10}%`,top:`${20+i%3*20}%`,width:3,height:3,borderRadius:"50%",
              background:activeNPC.role==="wizard"?"#b070ff":activeNPC.role==="elder"?"#f0c060":"#f5c518",
              animation:`floatUp ${2+i*0.5}s ease-in-out infinite`,animationDelay:`${i*0.4}s`,opacity:0.4,pointerEvents:"none"}}/>
          ))}

          {/* NPC display */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{width:110,height:110,display:"flex",alignItems:"center",justifyContent:"center",
              background:"rgba(200,165,80,0.04)",border:"1px solid rgba(200,165,80,0.15)",borderRadius:"50%",padding:10,
              animation:"floatSlow 3s ease-in-out infinite",boxShadow:"0 0 30px rgba(200,165,80,0.1)"}}>
              <CharSprite role={activeNPC.role} size={86} tick={animFrame}/>
            </div>
            <div className="cinzel" style={{fontSize:13,color:"#f5c518",letterSpacing:2}}>{activeNPC.name}</div>
            <div className="crimson" style={{fontSize:14,color:"#7a6040",fontStyle:"italic",textTransform:"capitalize"}}>{activeNPC.role}</div>

            {/* Quest status badge */}
            {qDef&&(
              <div className="tag" style={{background:doneQ?"rgba(75,250,127,0.12)":activeQ?"rgba(200,75,250,0.12)":"rgba(200,165,80,0.1)",
                color:doneQ?"#4bfa7f":activeQ?"#c84bfa":"#8a6830",border:`1px solid ${doneQ?"#4bfa7f44":activeQ?"#c84bfa44":"rgba(200,165,80,0.2)"}`}}>
                {doneQ?"✅ Quest Done":activeQ?"🔄 Quest Active":"📜 Quest Available"}
              </div>
            )}
          </div>

          {/* Dialogue box */}
          <div style={{maxWidth:520,flex:1,minWidth:280}}>
            <div className="panel" style={{padding:26,borderRadius:10,animation:"fadeUp 0.3s ease",boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
              {/* Progress dots */}
              <div style={{display:"flex",gap:5,marginBottom:14}}>
                {activeNPC.dialogue.map((_,i)=>(
                  <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=dlgIdx?"#f5c518":"rgba(200,165,80,0.15)",
                    transition:"background 0.3s",boxShadow:i===dlgIdx?"0 0 6px #f5c51888":"none"}}/>
                ))}
              </div>
              <div className="crimson" style={{fontSize:19,color:"#e8d5a0",lineHeight:1.9,marginBottom:20,minHeight:60}}>
                "{activeNPC.dialogue[dlgIdx]}"
              </div>

              {/* OS Lore box for quests */}
              {qDef&&dlgIdx===activeNPC.dialogue.length-1&&!doneQ&&(
                <div style={{background:"rgba(200,165,80,0.06)",border:"1px solid rgba(200,165,80,0.15)",borderRadius:6,padding:"12px 14px",marginBottom:16}}>
                  <div className="cinzel" style={{fontSize:8,color:"#f5c518",letterSpacing:2,marginBottom:6}}>📚 OS CONCEPT</div>
                  <div className="crimson" style={{fontSize:14,color:"#a09060",lineHeight:1.7,fontStyle:"italic"}}>{qDef.lore}</div>
                  <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
                    <span className="tag" style={{background:"rgba(200,75,250,0.1)",color:"#c84bfa",border:"1px solid #c84bfa33"}}>{qDef.category}</span>
                    <span className="crimson" style={{fontSize:13,color:"#7a6040"}}>+{qDef.reward.xp} XP · +{qDef.reward.gold} 🪙</span>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div className="crimson" style={{fontSize:13,color:"#4a3828"}}>{dlgIdx+1}/{activeNPC.dialogue.length}</div>
                <div style={{display:"flex",gap:8}}>
                  {dlgIdx<activeNPC.dialogue.length-1?(
                    <button className="btn btn-gold" style={{padding:"7px 18px",fontSize:10}} onClick={advanceDlg}>Continue ▶</button>
                  ):(
                    <button className="btn btn-gold" style={{padding:"7px 18px",fontSize:10}} onClick={closeDialogue}>Close ✕</button>
                  )}
                </div>
              </div>
            </div>

            {/* Quest progress if active */}
            {activeQ&&!doneQ&&(
              <div className="panel" style={{padding:"12px 16px",borderRadius:8,marginTop:10,borderColor:"rgba(200,75,250,0.2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div className="cinzel" style={{fontSize:10,color:"#c84bfa"}}>📜 {activeQ.title}</div>
                  <div className="cinzel" style={{fontSize:9,color:"#7a6040"}}>{activeQ.progress}/{activeQ.target}</div>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,0.4)",borderRadius:3,overflow:"hidden",border:"1px solid rgba(200,75,250,0.15)"}}>
                  <div style={{height:"100%",width:`${Math.min(100,(activeQ.progress/activeQ.target)*100)}%`,
                    background:"linear-gradient(90deg,#c84bfa,#f5c518)",transition:"width 0.5s ease",
                    boxShadow:"0 0 6px #c84bfa66"}}/>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{background:"rgba(0,0,0,0.75)",borderTop:"1px solid rgba(200,165,80,0.12)",padding:"8px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn" style={{color:"#7a6040",borderColor:"#3a2010",padding:"5px 14px",fontSize:9}} onClick={closeDialogue}>← Return to World</button>
          <button className="btn btn-purple" style={{padding:"5px 12px",fontSize:9}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");closeDialogue();setTimeout(()=>setScreen("quiz"),50);}}>📚 Quiz (+XP)</button>
          {bossSummoned&&!completedQuests.includes("q_kernel")&&(
            <button className="btn btn-red" style={{padding:"5px 12px",fontSize:9,animation:"pulseFast 1s infinite"}} onClick={()=>{closeDialogue();setTimeout(triggerBossFight,200);}}>💀 Face the Boss!</button>
          )}
          <div style={{flex:1}}/>
          <div className="cinzel" style={{fontSize:8,color:"#5a4020"}}>Lv.{statsUI.level} · {statsUI.xp} XP · ⭐{statsUI.score.toLocaleString()}</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  QUIZ SCREEN (Multiple types support)
  // ═══════════════════════════════════════
  if(screen==="quiz"&&quiz) return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#100818,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{G}</style>
      {/* Floating runes */}
      {Array.from({length:6}).map((_,i)=>(
        <div key={i} style={{position:"fixed",left:`${10+i*16}%`,top:`${15+i%3*30}%`,fontSize:20,opacity:0.08,
          animation:`orbFloat ${3+i*0.5}s ease-in-out infinite`,animationDelay:`${i*0.6}s`,pointerEvents:"none",color:"#c84bfa"}}>
          {["⚙","📀","🧮","💻","🔧","⚡"][i]}
        </div>
      ))}
      <div style={{maxWidth:660,width:"100%"}}>
        <div className="cinzel" style={{fontSize:10,color:"#c84bfa",letterSpacing:4,textAlign:"center",marginBottom:6}}>
          📚 OS KNOWLEDGE QUIZ {quiz.type==="multiple"?"(Multiple Choice)":quiz.type==="riddle"?"(Riddle)":"(Fill-in-the-Blank)"}
        </div>
        <div className="cinzel-deco" style={{fontSize:18,fontWeight:700,color:"#f5c518",textAlign:"center",marginBottom:3}}>Prove Your Mastery</div>
        <div className="crimson" style={{fontSize:15,color:"#8a6830",textAlign:"center",marginBottom:24,fontStyle:"italic"}}>
          +{quiz.xp} XP for correct{quizCtx==="battle"?" · correct answer deals bonus damage":""}
        </div>
        <div className="panel" style={{padding:26,borderRadius:10,marginBottom:14,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
          <div className="crimson" style={{fontSize:20,color:"#e8d5a0",lineHeight:1.8,marginBottom:22}}>{quiz.q}</div>
          
          {/* MULTIPLE CHOICE */}
          {quiz.type==="multiple"&&(
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {quiz.opts.map((opt,i)=>{
                let bc="rgba(120,90,30,0.3)",bg="rgba(10,8,6,0.88)",cc="#d4b870";
                if(quizPick!==null){
                  if(i===quiz.ans){bc="#4bfa7f";bg="rgba(8,35,18,0.95)";cc="#4bfa7f";}
                  else if(i===quizPick&&i!==quiz.ans){bc="#ff4444";bg="rgba(35,8,8,0.95)";cc="#ff6060";}
                  else{bc="rgba(60,45,20,0.3)";cc="rgba(180,150,80,0.3)";}
                }
                return(
                  <button key={i} className="quiz-opt" disabled={quizPick!==null} onClick={()=>answerQuiz(i)}
                    style={{borderColor:bc,background:bg,color:cc,transition:"all 0.22s",
                      boxShadow:quizPick!==null&&i===quiz.ans?`0 0 12px ${bc}66`:"none"}}>
                    <span style={{opacity:0.5,marginRight:10,fontFamily:"'Cinzel',serif",fontSize:11}}>{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          )}
          
          {/* FILL-IN-THE-BLANK & RIDDLE */}
          {(quiz.type==="fillblank"||quiz.type==="riddle")&&(
            <div>
              <input 
                type="text"
                placeholder={quiz.type==="fillblank"?"Type your answer...":"Guess the answer..."}
                value={quiz.userAns||""}
                onChange={(e)=>setQuiz({...quiz, userAns: e.target.value})}
                onKeyPress={(e)=>e.key==="Enter"&&quizPick===null&&answerQuiz(quiz.userAns)}
                disabled={quizPick!==null}
                style={{width:"100%",padding:"12px 14px",fontSize:16,background:"rgba(10,8,6,0.88)",
                  border:"1px solid rgba(120,90,30,0.3)",borderRadius:6,color:"#d4b870",
                  fontFamily:"'Crimson Text',serif",marginBottom:12}}
              />
              <button 
                onClick={()=>answerQuiz(quiz.userAns)}
                disabled={quizPick!==null}
                style={{width:"100%",padding:"10px 14px",background:"#c84bfa",color:"white",border:"none",
                  borderRadius:6,fontSize:15,fontWeight:"bold",cursor:quizPick===null?"pointer":"not-allowed",
                  opacity:quizPick===null?1:0.5,transition:"all 0.2s"}}
              >
                Submit Answer
              </button>
            </div>
          )}
          
          {quizPick!==null&&(
            <div style={{marginTop:18,padding:"14px 16px",
              background:quizPick===quiz.ans||quizPick==="correct"?"rgba(8,35,18,0.8)":"rgba(35,8,8,0.8)",
              border:`1px solid ${quizPick===quiz.ans||quizPick==="correct"?"#4bfa7f":"#ff4444"}`,borderRadius:7,animation:"fadeUp 0.3s ease",
              boxShadow:quizPick===quiz.ans||quizPick==="correct"?"0 0 16px rgba(75,250,127,0.15)":"0 0 16px rgba(255,68,68,0.15)"}}>
              <div className="crimson" style={{fontSize:17,color:quizPick===quiz.ans||quizPick==="correct"?"#4bfa7f":"#ff8888",lineHeight:1.75}}>
                {quizPick===quiz.ans||quizPick==="correct"?"✅ Correct! — ":"❌ Wrong — "}{quiz.explain}
              </div>
              {(quizPick!==quiz.ans&&quizPick!=="correct"&&(quiz.type==="fillblank"||quiz.type==="riddle"))&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,68,68,0.3)",fontSize:14,color:"#ffaa88",lineHeight:1.6}}>
                  <span style={{color:"#ffaa88",fontSize:13}}>📝 Correct Answer: </span>
                  <span style={{fontWeight:"bold",textDecoration:"underline",color:"#ffcc99",fontSize:15,fontFamily:"'Courier New',monospace",letterSpacing:0.5}}>
                    {quiz.ans}
                  </span>
                </div>
              )}
              {(quizPick===quiz.ans||quizPick==="correct")&&(
                <div className="cinzel" style={{fontSize:9,color:"#f5c518",marginTop:8,letterSpacing:1}}>+{quiz.xp} XP EARNED</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  BATTLE SCREEN
  // ═══════════════════════════════════════
  if(screen==="battle"&&battle){
    const isBoss=battle.id==="boss";
    const enemyRole=isBoss?"boss":battle.id==="zombie"?"enemy_zombie":battle.id==="deadlock"||battle.id==="race"?"enemy_demon":"enemy_ghost";
    const pct=Math.max(0,enemyHP/enemyMaxHP);

    return (
      <div style={{minHeight:"100vh",maxHeight:"100vh",
        background:isBoss?"radial-gradient(ellipse at 50% 30%,#280808,#0a0806 55%,#050302 100%)":"radial-gradient(ellipse at 50% 30%,#1a0808,#0a0806 55%,#050302 100%)",
        display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <style>{G}</style>

        {/* Boss particles */}
        {isBoss&&Array.from({length:14}).map((_,i)=>(
          <div key={i} style={{position:"fixed",left:`${(i*17+20)%90+5}%`,top:`${(i*23+10)%80+5}%`,
            width:i%3===0?7:4,height:i%3===0?7:4,background:"#ff2244",borderRadius:"50%",
            opacity:0.1+i%3*0.06,animation:`pulse ${1+i%3*0.3}s ease-in-out infinite`,
            animationDelay:`${i*0.15}s`,pointerEvents:"none"}}/>
        ))}

        {/* Header HUD */}
        <div style={{background:"rgba(0,0,0,0.85)",borderBottom:`1px solid ${isBoss?"rgba(255,0,50,0.25)":"rgba(200,165,80,0.12)"}`,padding:"6px 16px",display:"flex",gap:16,alignItems:"center",flexShrink:0}}>
          <div className="cinzel" style={{fontSize:10,color:isBoss?"#ff2244":"#ff6060",letterSpacing:3,animation:isBoss?"glow 1.5s ease-in-out infinite":"none"}}>{isBoss?"💀 BOSS BATTLE":"⚔ BATTLE"}</div>
          {isBoss&&<div className="cinzel" style={{fontSize:8,color:"#ff8888"}}>PHASE {bossPhase+1}/4</div>}
          <div style={{flex:1}}/>
          <div className="cinzel" style={{fontSize:8,color:clsColor}}>{cls.icon} Lv.{statsUI.level}</div>
          <div className="cinzel" style={{fontSize:8,color:"#f5c518"}}>⭐{statsUI.score.toLocaleString()}</div>
          <div className="cinzel" style={{fontSize:8,color:"#f5c518"}}>🪙{statsUI.gold}</div>
        </div>

        <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr auto",overflow:"hidden",minHeight:0}}>
          {/* Enemy side */}
          <div style={{background:isBoss?"linear-gradient(180deg,rgba(100,0,18,0.55),rgba(60,0,8,0.2))":"linear-gradient(180deg,rgba(70,8,8,0.4),transparent)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:18,gap:12,
            borderRight:`1px solid ${isBoss?"rgba(255,0,50,0.18)":"rgba(200,165,80,0.08)"}`}}>
            {/* HP bar */}
            <div style={{width:"100%",maxWidth:280}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div className="cinzel" style={{fontSize:11,color:battle.color,animation:isBoss?"glow 2s ease-in-out infinite":"none"}}>{battle.name}</div>
                <div className="cinzel" style={{fontSize:8,color:"#6a5030"}}>{Math.max(0,enemyHP)}/{enemyMaxHP}</div>
              </div>
              <div className="hud-bar" style={{height:isBoss?14:10,borderColor:isBoss?"rgba(255,0,50,0.35)":"rgba(200,80,80,0.22)"}}>
                <div style={{height:"100%",width:`${pct*100}%`,background:`linear-gradient(90deg,${battle.color},${battle.color}99)`,
                  transition:"width 0.5s ease",boxShadow:isBoss?`0 0 12px ${battle.color}`:`0 0 6px ${battle.color}66`}}/>
              </div>
              {isBoss&&(
                <div style={{display:"flex",gap:3,marginTop:5}}>
                  {BOSS.phases.map((_,i)=>(
                    <div key={i} style={{flex:1,height:3,borderRadius:2,background:bossPhase>i?"#ff2244":"rgba(255,0,50,0.18)",boxShadow:bossPhase>i?"0 0 4px #ff2244":"none"}}/>
                  ))}
                </div>
              )}
            </div>

            {/* Enemy sprite */}
            <div style={{animation:battleAnim==="enemy-hit"?"shake 0.35s ease":"none",
              filter:battleAnim==="enemy-hit"?"drop-shadow(0 0 18px #ff4444)":isBoss?"drop-shadow(0 0 22px #ff2244)":"none"}}>
              <CharSprite role={enemyRole} flash={battleAnim==="enemy-hit"} size={isBoss?108:88} tick={animFrame}/>
            </div>

            <div className="crimson" style={{fontSize:14,color:"#6a5030",fontStyle:"italic",textAlign:"center",maxWidth:220,lineHeight:1.6}}>{battle.desc}</div>
            {isBoss&&bossPhase>0&&(
              <div className="cinzel" style={{fontSize:8,color:"#ff4444",letterSpacing:1,animation:"pulseFast 1s infinite"}}>⚠ ENRAGED — ATK +{bossPhase*8}</div>
            )}
          </div>

          {/* Player side */}
          <div style={{background:"linear-gradient(180deg,rgba(8,16,36,0.4),transparent)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:18,gap:12}}>
            {/* Stats bars */}
            <div style={{width:"100%",maxWidth:280}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div className="cinzel" style={{fontSize:11,color:clsColor}}>{playerName}</div>
                <div className="cinzel" style={{fontSize:8,color:"#6a5030"}}>Lv.{statsUI.level}</div>
              </div>
              {[["HP",statsUI.hp,statsUI.maxHp,"#ff8888","rgba(200,80,80,0.22)",statsUI.hp>statsUI.maxHp*0.5?"#40c040":statsUI.hp>statsUI.maxHp*0.25?"#d0a020":"#c02020"],
                ["MP",statsUI.mp,statsUI.maxMp,"#88aaff","rgba(80,80,200,0.22)","#3060d0"]].map(([lbl,v,mx,lc,bc,bg])=>(
                <div key={lbl} style={{marginBottom:5}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span className="cinzel" style={{fontSize:8,color:lc}}>{lbl}</span>
                    <span className="cinzel" style={{fontSize:8,color:"#6a5030"}}>{v}/{mx}</span>
                  </div>
                  <div className="hud-bar" style={{height:9,borderColor:bc}}>
                    <div style={{height:"100%",width:`${(v/mx)*100}%`,background:bg,transition:"width 0.5s ease",boxShadow:`0 0 6px ${bg}66`}}/>
                  </div>
                </div>
              ))}
              <div style={{marginTop:4}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span className="cinzel" style={{fontSize:8,color:"#f5c518"}}>XP</span>
                  <span className="cinzel" style={{fontSize:8,color:"#6a5030"}}>{statsUI.xp}</span>
                </div>
                <div className="hud-bar" style={{height:5}}>
                  <div style={{height:"100%",width:`${Math.min(100,((statsUI.xp-xpToNext(statsUI.level-1))/(xpToNext(statsUI.level)-xpToNext(statsUI.level-1)))*100)}%`,
                    background:"linear-gradient(90deg,#8a5020,#f5c518)",boxShadow:"0 0 6px #f5c51844"}}/>
                </div>
              </div>
            </div>

            {/* Player sprite */}
            <div style={{animation:battleAnim==="player-hit"?"shake 0.35s ease":"none",
              filter:battleAnim==="player-hit"?"drop-shadow(0 0 18px #ff4444)":"none"}}>
              <CharSprite role="player" color={clsColor} flash={battleAnim==="player-hit"} size={88} tick={animFrame} facing={2}/>
            </div>
            <div className="cinzel" style={{fontSize:10,color:clsColor,letterSpacing:2}}>{cls.icon} {classChoice}</div>
          </div>

          {/* Bottom panel */}
          <div style={{gridColumn:"1/-1",background:"rgba(0,0,0,0.88)",borderTop:`1px solid ${isBoss?"rgba(255,0,50,0.18)":"rgba(200,165,80,0.12)"}`,
            display:"grid",gridTemplateColumns:"1fr 1fr",overflow:"hidden",maxHeight:"42vh",flexShrink:0}}>
            {/* Battle log */}
            <div style={{padding:"10px 14px",borderRight:"1px solid rgba(200,165,80,0.08)",overflowY:"auto"}} ref={logRef}>
              <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:7}}>BATTLE LOG</div>
              {battleLog.map((l,i)=>(
                <div key={i} className="crimson" style={{fontSize:14,lineHeight:1.55,marginBottom:2,animation:"fadeUp 0.18s ease",
                  color:l.startsWith("⚔")||l.startsWith("✨")||l.startsWith("🗡")?clsColor:
                    l.startsWith("💀")&&!l.includes("THE")?"#ff8888":
                    l.startsWith("🎉")?"#4bfa7f":
                    l.startsWith("📚")?"#c84bfa":
                    l.startsWith("🔥")||l.startsWith("⚠")||l.includes("KERNEL PANIC")?"#ff4444":"#c0a060"}}>{l}</div>
              ))}
              {battlePhase==="wait"&&<div className="crimson" style={{fontSize:14,color:"#5a4020",fontStyle:"italic",animation:"pulse 0.8s infinite"}}>...</div>}
            </div>

            {/* Action buttons */}
            <div style={{padding:"10px 14px",overflowY:"auto"}}>
              {battlePhase==="player"?(
                <>
                  <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:7}}>ACTIONS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                    <button className="abt" onClick={()=>doAttack("basic")} style={{borderColor:"rgba(200,165,80,0.25)"}}>⚔ Attack</button>
                    <button className="abt" onClick={doQuizInBattle} style={{borderColor:"rgba(200,75,250,0.3)",color:"#c84bfa"}}>📚 Quiz Strike</button>
                    {!isBoss&&<button className="abt" onClick={doFlee} style={{color:"#7a6040",borderColor:"rgba(120,90,30,0.2)"}}>💨 Flee</button>}
                  </div>
                  <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:5}}>ABILITIES · MP {statsUI.mp}/{statsUI.maxMp}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                    {cls.abilities.map(ab=>(
                      <button key={ab.name} className="abt" onClick={()=>doAttack("ability",ab)} disabled={statsUI.mp<ab.mpCost}>
                        <div style={{color:clsColor,fontSize:9,marginBottom:1,fontWeight:600}}>{ab.name}</div>
                        <div style={{fontSize:8,color:"#5a4020"}}>{ab.mpCost}mp · {ab.dmg[0]}–{ab.dmg[1]}</div>
                      </button>
                    ))}
                  </div>
                  {inventory.length>0&&(
                    <>
                      <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:5}}>ITEMS</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {inventory.map(item=>(
                          <button key={item.id} className="abt" onClick={()=>doItem(item)} style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{fontSize:13}}>{item.icon}</span>
                            <span className="crimson" style={{fontSize:12,color:"#c8a870"}}>{item.name} ×{item.qty}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ):(
                <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div className="crimson" style={{fontSize:17,color:"#ff8888",fontStyle:"italic",animation:"pulse 0.8s infinite"}}>
                    {isBoss?"THE KERNEL PANIC acts...":"Enemy is acting..."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating damage numbers */}
        <div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",zIndex:999}}>
          {floats.map(f=>(
            <div key={f.id} className="cinzel" style={{fontSize:20,color:f.color,fontWeight:700,
              animation:"floatUp 1.2s ease forwards",textShadow:`0 0 10px ${f.color}`,display:"block"}}>{f.text}</div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  MAIN WORLD
  // ═══════════════════════════════════════
  const viewW = Math.min(VIEW_W, Math.floor(window.innerWidth/TILE)+1);
  const viewH = Math.min(VIEW_H, Math.floor((window.innerHeight-90)/TILE)+1);

  // Snap camera to integer for tile/sprite grid alignment
  // Sub-pixel fraction goes to CSS transform on the viewport wrapper
  const snapCamX = Math.floor(camX);
  const snapCamY = Math.floor(camY);
  const vpOffsetX = -(camX - snapCamX) * TILE;
  const vpOffsetY = -(camY - snapCamY) * TILE;

  return (
    <div style={{height:"100vh",background:"#0a0806",display:"flex",flexDirection:"column",overflow:"hidden",userSelect:"none",alignItems:"center"}}>
      <style>{G}</style>

      {/* Notification */}
      {notif&&(
        <div style={{position:"fixed",top:52,left:"50%",transform:"translateX(-50%)",
          background:"rgba(8,6,4,0.97)",border:`1px solid ${notif.color}44`,padding:"7px 20px",zIndex:1000,
          animation:"fadeUp 0.22s ease",borderRadius:20,pointerEvents:"none",whiteSpace:"nowrap",maxWidth:"90vw",
          boxShadow:`0 0 20px ${notif.color}22`}}>
          <div className="cinzel" style={{fontSize:11,color:notif.color}}>{notif.msg}</div>
        </div>
      )}

      {/* Top HUD */}
      <div style={{background:"linear-gradient(180deg,rgba(0,0,0,0.95),rgba(0,0,0,0.88))",
        borderBottom:"2px solid rgba(200,165,80,0.18)",padding:"12px 18px",
        display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",zIndex:100,flexShrink:0,
        boxShadow:"0 2px 8px rgba(0,0,0,0.6)"}}>
        <div className="cinzel" style={{fontSize:10,color:"#f5c518",letterSpacing:3,fontWeight:700}}>◆ OQUEST ◆</div>
        <div style={{width:2,height:16,background:"linear-gradient(180deg,rgba(200,165,80,0.4),rgba(200,165,80,0.1))",borderRadius:1}}/>
        {[["HP",statsUI.hp,statsUI.maxHp,"#ff8888",statsUI.hp>statsUI.maxHp*0.5?"#40c040":statsUI.hp>statsUI.maxHp*0.25?"#c0a020":"#c02020"],
          ["MP",statsUI.mp,statsUI.maxMp,"#88aaff","#3060d0"]].map(([lbl,v,mx,lc,bg])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}>
            <span className="cinzel" style={{fontSize:9,color:lc,fontWeight:600}}>{lbl}</span>
            <div className="hud-bar" style={{width:80,height:8,background:"rgba(255,255,255,0.4)",borderRadius:4,border:"1px solid rgba(200,165,80,0.2)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(v/mx)*100}%`,background:bg,transition:"width 0.3s ease",boxShadow:`0 0 6px ${bg}88,inset 0 1px 2px rgba(255,255,255,0.1)`,borderRadius:4}}/>
            </div>
            <span className="cinzel" style={{fontSize:8,color:"#8a7050",minWidth:32}}>{v}/{mx}</span>
          </div>
        ))}
        <div style={{width:2,height:16,background:"linear-gradient(180deg,rgba(200,165,80,0.3),rgba(200,165,80,0.05))",borderRadius:1}}/>
        <div className="cinzel" style={{fontSize:9,color:clsColor,fontWeight:600}}>{cls.icon} Lv.{statsUI.level}</div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div className="hud-bar" style={{width:50,height:6,background:"rgba(255,255,255,0.4)",borderRadius:3,border:"1px solid rgba(245,197,24,0.2)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,((statsUI.xp-xpToNext(statsUI.level-1))/(xpToNext(statsUI.level)-xpToNext(statsUI.level-1)))*100)}%`,
              background:"linear-gradient(90deg,#d4a030,#f5c518)",boxShadow:"0 0 5px #f5c51866,inset 0 1px 2px rgba(255,255,255,0.1)",borderRadius:3}}/>
          </div>
        </div>
        <div style={{flex:1}}/>
        <div className="cinzel" style={{fontSize:9,color:"#f5c518",fontWeight:600}}>⭐ {statsUI.score.toLocaleString()}</div>
        <div className="cinzel" style={{fontSize:9,color:"#f5c518",fontWeight:600}}>🪙 {statsUI.gold}</div>
        <div className="cinzel" style={{fontSize:9,color:"#c84bfa",fontWeight:600}}>📜 {completedQuests.length}/{QUEST_DEFS.length}</div>
        <div style={{width:2,height:16,background:"linear-gradient(180deg,rgba(200,165,80,0.2),rgba(200,165,80,0.05))",borderRadius:1}}/>
        <div style={{display:"flex",gap:5}}>
          <button className="btn" style={{color:"#8a6830",borderColor:"#2a1804",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}} onClick={()=>setShowInv(v=>!v)}>🎒 Inventory</button>
          <button className="btn btn-purple" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(200,75,250,0.3)"}} onClick={()=>setShowQuests(v=>!v)}>📜 Quests</button>
          <button className="btn btn-blue" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(0,100,200,0.3)"}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");setScreen("quiz");}}>📚 Quiz</button>
          {showChathead===false&&questsCompletedCount>=3&&<button className="btn" style={{color:"#c84bfa",borderColor:"rgba(200,75,250,0.4)",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(200,75,250,0.2)"}} onClick={()=>{setShowChathead(true);setChatheadMinimized(false);}}>🔮 Chat</button>}
          <button className="btn" style={{color:"#4bfa7f",borderColor:"rgba(75,250,127,0.4)",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(75,250,127,0.2)"}} onClick={saveGameProgress}>💾 Save</button>
          <button className="btn btn-gold" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(245,197,24,0.3)"}} onClick={async()=>{await saveLB();setScreen("leaderboard");}}>⭐ Fame</button>
          <button className="btn btn-red" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(255,50,50,0.3)"}} onClick={async()=>{await saveLB();setScreen("gameover");}}>✕ Exit</button>
        </div>
      </div>

      {/* World viewport */}
      <div style={{flex:1,position:"relative",overflow:"hidden",width:"100%",maxWidth:1216}}>
        {/* Inner layer: sub-pixel camera offset applied here for smooth panning */}
        <div style={{position:"absolute",inset:0,transform:`translate(${vpOffsetX}px,${vpOffsetY}px)`,willChange:"transform"}}>
        {/* Ground layer */}
        <div style={{position:"absolute",left:0,top:0,width:VIEW_W*TILE,height:VIEW_H*TILE}}>
          {Array.from({length:VIEW_H},(_,row)=>Array.from({length:VIEW_W},(_,col)=>{
            const mx=Math.floor(col+snapCamX),my=Math.floor(row+snapCamY);
            if(mx>=MAP_W||my>=MAP_H) return null;
            const t=worldMap[my][mx];
            const gt=[T.GRASS,T.DARK_GRASS,T.PATH,T.WATER,T.SAND,T.FLOWER].includes(t)?t:T.GRASS;
            return <TileCell key={`g-${row}-${col}`} type={gt} x={col} y={row} tick={animFrame}/>;
          }))}
        </div>
        {/* Object layer */}
        <div style={{position:"absolute",left:0,top:0,width:VIEW_W*TILE,height:VIEW_H*TILE}}>
          {Array.from({length:VIEW_H},(_,row)=>Array.from({length:VIEW_W},(_,col)=>{
            const mx=Math.floor(col+snapCamX),my=Math.floor(row+snapCamY);
            if(mx>=MAP_W||my>=MAP_H) return null;
            const t=worldMap[my][mx];
            if(![T.TREE,T.ROCK,T.HOUSE,T.CASTLE,T.CHEST].includes(t)) return null;
            return <WorldObject key={`o-${row}-${col}`} type={t} x={col} y={row} tick={animFrame}/>;
          }))}
        </div>

        {/* NPCs */}
        {NPCS.map(npc=>{
          const sx=npc.x-snapCamX,sy=npc.y-snapCamY;
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const near=Math.abs(playerPos.x-npc.x)<=1.5&&Math.abs(playerPos.y-npc.y)<=1.5;
          const qDef=QUEST_DEFS.find(q=>q.giver===npc.id);
          const hasActiveQ=qDef&&!quests.find(q=>q.id===qDef.id)&&!completedQuests.includes(qDef.id);
          const hasDoneQ=completedQuests.includes(qDef?.id);
          return (
            <div key={npc.id} style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer"}}
              onClick={()=>!dialogueLock.current&&openNPC(npc)}>
              <CharSprite role={npc.role} size={TILE} tick={animFrame}/>
              {/* Name tag */}
              <div style={{position:"absolute",top:-20,left:"50%",transform:"translateX(-50%)",
                background:"rgba(0,0,0,0.88)",border:"1px solid rgba(200,165,80,0.2)",padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap",pointerEvents:"none"}}>
                <div className="cinzel" style={{fontSize:7,color:"#f5c518"}}>{npc.name}</div>
              </div>
              {/* Quest indicator */}
              {hasActiveQ&&(
                <div style={{position:"absolute",top:-36,left:"50%",transform:"translateX(-50%)",
                  fontSize:16,animation:"float 1.5s ease-in-out infinite",pointerEvents:"none",
                  filter:"drop-shadow(0 0 6px #f5c518)"}}>❗</div>
              )}
              {hasDoneQ&&(
                <div style={{position:"absolute",top:-36,left:"50%",transform:"translateX(-50%)",
                  fontSize:14,pointerEvents:"none"}}>✅</div>
              )}
              {/* Interact hint */}
              {near&&(
                <div style={{position:"absolute",top:-50,left:"50%",transform:"translateX(-50%)",
                  background:"rgba(245,197,24,0.1)",border:"1px solid rgba(245,197,24,0.5)",padding:"2px 7px",borderRadius:3,
                  whiteSpace:"nowrap",animation:"pulse 0.8s infinite",pointerEvents:"none"}}>
                  <div className="cinzel" style={{fontSize:7,color:"#f5c518"}}>[E] Talk</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Map enemies */}
        {mapEnemies.filter(e=>e.alive).map(e=>{
          const sx=e.x-snapCamX,sy=e.y-snapCamY;
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const role=e.id==="zombie"?"enemy_zombie":e.id==="deadlock"||e.id==="race"?"enemy_demon":"enemy_ghost";
          return (
            <div key={e.mapId} style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer"}}
              onClick={()=>triggerBattle(e)}>
              <CharSprite role={role} size={TILE} tick={animFrame}/>
              {/* HP bar */}
              <div style={{position:"absolute",top:-8,left:4,right:4,height:4,background:"rgba(0,0,0,0.75)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(e.hp/e.maxHp)*100}%`,background:e.color,transition:"width 0.3s",boxShadow:`0 0 4px ${e.color}88`}}/>
              </div>
              <div style={{position:"absolute",top:-20,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",pointerEvents:"none"}}>
                <div className="cinzel" style={{fontSize:6,color:e.color,background:"rgba(0,0,0,0.8)",padding:"1px 4px",borderRadius:2}}>{e.name}</div>
              </div>
            </div>
          );
        })}

        {/* Boss marker */}
        {bossSummoned&&!completedQuests.includes("q_kernel")&&(()=>{
          const sx=24-snapCamX,sy=17-snapCamY;
          if(sx<0||sx>VIEW_W||sy<0||sy>VIEW_H) return null;
          return (
            <div key="boss-marker" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:15,cursor:"pointer",
              animation:"pulseFast 0.7s infinite"}} onClick={triggerBossFight}>
              <div style={{position:"absolute",inset:4,background:"rgba(255,0,50,0.12)",border:"2px solid #ff2244",borderRadius:6,
                display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(255,0,50,0.4)"}}>
                <span style={{fontSize:26,filter:"drop-shadow(0 0 8px #ff2244)"}}>💀</span>
              </div>
              <div style={{position:"absolute",top:-24,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",
                background:"rgba(0,0,0,0.9)",padding:"2px 7px",borderRadius:3,border:"1px solid rgba(255,0,50,0.4)"}}>
                <div className="cinzel" style={{fontSize:7,color:"#ff2244",animation:"glow 1.5s infinite"}}>BOSS — CLICK TO FIGHT</div>
              </div>
            </div>
          );
        })()}

        {/* Player */}
        <div style={{position:"absolute",left:(playerPos.x-snapCamX)*TILE,top:(playerPos.y-snapCamY)*TILE,width:TILE,height:TILE,
          zIndex:(playerPos.y-snapCamY)+3,transition:"none"}}>
          <CharSprite role="player" moving={playerMoving} color={clsColor} size={TILE} tick={animFrame} facing={playerDir===2?2:0}/>
          <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",pointerEvents:"none"}}>
            <div className="cinzel" style={{fontSize:7,color:clsColor,background:"rgba(0,0,0,0.85)",padding:"1px 6px",borderRadius:10,
              boxShadow:`0 0 8px ${clsColor}44`}}>{playerName.slice(0,12)}</div>
          </div>
        </div>

        {/* Task Scheduling Portal */}
        {taskSchedulingPortal&&!taskSchedulingCompleted&&(()=>{
          const sx=taskSchedulingPortal.x-snapCamX,sy=taskSchedulingPortal.y-snapCamY;
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const near=Math.abs(playerPos.x-taskSchedulingPortal.x)<=1&&Math.abs(playerPos.y-taskSchedulingPortal.y)<=1;
          return (
            <div key="portal-task" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer",
              animation:"portalPulse 2s infinite"}} onClick={()=>tryPortalInteract(taskSchedulingPortal,"task-scheduling")}>
              <div style={{position:"absolute",inset:8,background:"radial-gradient(circle,rgba(216,80,255,0.4),rgba(100,50,150,0.2))",
                border:"2px solid #d850ff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 20px rgba(216,80,255,0.6), inset 0 0 12px rgba(216,80,255,0.3)"}}>
                <span style={{fontSize:20,animation:"float 1.5s ease-in-out infinite",filter:"drop-shadow(0 0 6px #d850ff)"}}>⏰</span>
              </div>
              {near&&(
                <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",
                  background:"rgba(216,80,255,0.15)",border:"1px solid rgba(216,80,255,0.5)",padding:"2px 8px",borderRadius:4,
                  animation:"pulse 0.8s infinite",pointerEvents:"none"}}>
                  <div className="cinzel" style={{fontSize:7,color:"#d850ff"}}>[E] Enter Portal</div>
                </div>
              )}
              <div style={{position:"absolute",top:-24,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",pointerEvents:"none"}}>
                <div className="cinzel" style={{fontSize:8,color:"#d850ff",background:"rgba(0,0,0,0.8)",padding:"2px 6px",borderRadius:10,
                  textShadow:"0 0 6px #d850ff"}}>Task Scheduling</div>
              </div>
            </div>
          );
        })()}

        {/* Memory Management Portal */}
        {memoryManagementPortal&&!memoryManagementCompleted&&(()=>{
          const sx=memoryManagementPortal.x-snapCamX,sy=memoryManagementPortal.y-snapCamY;
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const near=Math.abs(playerPos.x-memoryManagementPortal.x)<=1&&Math.abs(playerPos.y-memoryManagementPortal.y)<=1;
          return (
            <div key="portal-memory" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer",
              animation:"portalPulse 2s infinite"}} onClick={()=>tryPortalInteract(memoryManagementPortal,"memory-management")}>
              <div style={{position:"absolute",inset:8,background:"radial-gradient(circle,rgba(92,191,255,0.4),rgba(50,100,150,0.2))",
                border:"2px solid #5cbfff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 20px rgba(92,191,255,0.6), inset 0 0 12px rgba(92,191,255,0.3)"}}>
                <span style={{fontSize:20,animation:"float 1.5s ease-in-out infinite",filter:"drop-shadow(0 0 6px #5cbfff)"}}>💾</span>
              </div>
              {near&&(
                <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",
                  background:"rgba(92,191,255,0.15)",border:"1px solid rgba(92,191,255,0.5)",padding:"2px 8px",borderRadius:4,
                  animation:"pulse 0.8s infinite",pointerEvents:"none"}}>
                  <div className="cinzel" style={{fontSize:7,color:"#5cbfff"}}>[E] Enter Portal</div>
                </div>
              )}
              <div style={{position:"absolute",top:-24,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",pointerEvents:"none"}}>
                <div className="cinzel" style={{fontSize:8,color:"#5cbfff",background:"rgba(0,0,0,0.8)",padding:"2px 6px",borderRadius:10,
                  textShadow:"0 0 6px #5cbfff"}}>Memory Management</div>
              </div>
            </div>
          );
        })()}

        {/* Floating text */}
        {floats.map(f=>(
          <div key={f.id} style={{position:"absolute",top:"30%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",zIndex:999,
            animation:"floatUp 1.2s ease forwards"}}>
            <div className="cinzel" style={{fontSize:17,color:f.color,fontWeight:700,textShadow:`0 0 10px ${f.color}`,whiteSpace:"nowrap"}}>{f.text}</div>
          </div>
        ))}
        </div>{/* end inner sub-pixel layer */}

        {/* Minimap */}
        <div style={{position:"absolute",bottom:8,right:8,width:118,height:88,background:"rgba(0,0,0,0.88)",
          border:"1px solid rgba(200,165,80,0.18)",borderRadius:6,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
          <div className="cinzel" style={{fontSize:6,color:"#5a4020",padding:"2px 5px",letterSpacing:1}}>MAP</div>
          <div style={{position:"relative",width:118,height:76}}>
            {worldMap.map((row,ry)=>row.map((t,rx)=>{
              const mw=118/MAP_W,mh=76/MAP_H;
              const bg=t===T.WATER?"#1a4a7a":t===T.TREE?"#1a3d10":t===T.ROCK?"#505050":
                t===T.PATH?"#907035":t===T.HOUSE?"#a82510":t===T.CASTLE?"#4a4860":"#2d5520";
              return <div key={`m-${ry}-${rx}`} style={{position:"absolute",left:rx*mw,top:ry*mh,width:Math.ceil(mw),height:Math.ceil(mh),background:bg}}/>;
            }))}
            {/* Enemy dots */}
            {mapEnemies.filter(e=>e.alive).map(e=>(
              <div key={e.mapId} style={{position:"absolute",left:e.x*(118/MAP_W)-1.5,top:e.y*(76/MAP_H)-1.5,width:4,height:4,
                background:e.color,borderRadius:"50%",opacity:0.8}}/>
            ))}
            {/* Boss dot */}
            {bossSummoned&&!completedQuests.includes("q_kernel")&&(
              <div style={{position:"absolute",left:24*(118/MAP_W)-3,top:17*(76/MAP_H)-3,width:7,height:7,
                background:"#ff2244",borderRadius:"50%",animation:"pulseFast 0.7s infinite",boxShadow:"0 0 5px #ff2244"}}/>
            )}
            {/* NPC dots */}
            {NPCS.map(npc=>(
              <div key={npc.id} style={{position:"absolute",left:npc.x*(118/MAP_W)-1,top:npc.y*(76/MAP_H)-1,width:3,height:3,
                background:"#f5c518",borderRadius:"50%",opacity:0.6}}/>
            ))}
            {/* Player dot */}
            <div style={{position:"absolute",left:playerPos.x*(118/MAP_W)-2.5,top:playerPos.y*(76/MAP_H)-2.5,width:6,height:6,
              background:clsColor,borderRadius:"50%",boxShadow:`0 0 5px ${clsColor}`,zIndex:10}}/>
            {/* View rect */}
            <div style={{position:"absolute",left:camX*(118/MAP_W),top:camY*(76/MAP_H),width:VIEW_W*(118/MAP_W),height:VIEW_H*(76/MAP_H),
              border:`1px solid ${clsColor}55`,pointerEvents:"none"}}/>
          </div>
        </div>

        {/* Controls hint */}
        <div style={{position:"absolute",bottom:8,left:8,background:"rgba(0,0,0,0.75)",border:"1px solid rgba(200,165,80,0.1)",
          padding:"5px 10px",borderRadius:5}}>
          <div className="cinzel" style={{fontSize:6,color:"#4a3020",lineHeight:1.9}}>
            WASD/↑↓←→ Move · E Interact<br/>
            I Inventory · Q Quests · Walk into enemies
          </div>
        </div>
      </div>

      {/* Mobile controls */}
      <div style={{background:"linear-gradient(180deg,rgba(0,0,0,0.88),rgba(0,0,0,0.95))",borderTop:"2px solid rgba(200,165,80,0.16)",
        padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexShrink:0,
        boxShadow:"0 -2px 8px rgba(0,0,0,0.5)"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,44px)",gridTemplateRows:"repeat(3,44px)",gap:3}}>
          {[["","ArrowUp",""],["ArrowLeft","","ArrowRight"],["","ArrowDown",""]].map((row,ri)=>row.map((key,ci)=>(
            <button key={`${ri}-${ci}`}
              style={{background:key?"linear-gradient(135deg,rgba(200,165,80,0.12),rgba(200,165,80,0.06))":"transparent",
                border:key?"1.5px solid rgba(200,165,80,0.3)":"none",
                color:"#f5c518",fontSize:16,cursor:key?"pointer":"default",borderRadius:6,display:"flex",alignItems:"center",
                justifyContent:"center",touchAction:"none",userSelect:"none",transition:"all 0.15s",fontWeight:700,
                boxShadow:key?"0 2px 6px rgba(0,0,0,0.3)":"none"}}
              onPointerDown={e=>{e.preventDefault();if(key){keys.current={};keys.current[key]=true;}}}
              onPointerUp={e=>{e.preventDefault();if(key) keys.current[key]=false;}}
              onPointerLeave={e=>{if(key) keys.current[key]=false;}}
            >{key==="ArrowUp"?"▲":key==="ArrowDown"?"▼":key==="ArrowLeft"?"◀":key==="ArrowRight"?"▶":""}</button>
          )))}
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button className="btn btn-gold" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={handleInteract}>⚡ Interact</button>
          <button className="btn" style={{color:"#8a6830",borderColor:"rgba(120,90,30,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setShowInv(v=>!v)}>🎒 Inventory</button>
          <button className="btn btn-purple" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setShowQuests(v=>!v)}>📜 Quests</button>
          <button className="btn btn-blue" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");setScreen("quiz");}}>📚 Quiz</button>
          <button className="btn" style={{color:"#4bfa7f",borderColor:"rgba(75,250,127,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={saveGameProgress}>💾 Save</button>
          {hasSave&&<button className="btn" style={{color:"#f5c518",borderColor:"rgba(245,197,24,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={loadGameProgress}>🔄 Load</button>}
          <button className="btn" style={{color:audioEnabled?"#87ceeb":"#555",borderColor:audioEnabled?"rgba(135,206,235,0.4)":"rgba(100,100,100,0.25)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setAudioEnabled(!audioEnabled)}>{audioEnabled?"🔊":"🔇"} {audioEnabled?"On":"Off"}</button>
          {bossSummoned&&!completedQuests.includes("q_kernel")&&(
            <button className="btn btn-red" style={{padding:"10px 18px",fontSize:11,fontWeight:700,animation:"pulseFast 0.8s infinite"}} onClick={triggerBossFight}>💀 Boss</button>
          )}
        </div>
      </div>

      {/* Inventory overlay */}
      {showInv&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowInv(false)}>
          <div className="panel" style={{padding:24,borderRadius:10,minWidth:300,maxWidth:440,animation:"fadeUp 0.22s ease",
            boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
            <div className="cinzel" style={{fontSize:12,color:"#f5c518",marginBottom:14,letterSpacing:2}}>🎒 Inventory</div>
            {inventory.length===0?(
              <div className="crimson" style={{fontSize:16,color:"#4a3020",fontStyle:"italic",padding:"20px 0"}}>Your bag is empty.</div>
            ):inventory.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(200,165,80,0.08)"}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div className="cinzel" style={{fontSize:10,color:"#e8d5a0"}}>{item.name} <span style={{color:"#7a6040"}}>×{item.qty}</span></div>
                  <div className="crimson" style={{fontSize:13,color:"#7a6040",fontStyle:"italic"}}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <button className="btn" style={{color:"#7a6040",borderColor:"#3a2010",padding:"5px 14px",fontSize:9}} onClick={()=>setShowInv(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Quest log overlay */}
      {showQuests&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowQuests(false)}>
          <div className="panel" style={{padding:22,borderRadius:10,minWidth:340,maxWidth:540,maxHeight:"85vh",overflowY:"auto",
            animation:"fadeUp 0.22s ease",boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
            <div className="cinzel" style={{fontSize:12,color:"#c84bfa",marginBottom:14,letterSpacing:2}}>📜 Quest Log</div>
            {QUEST_DEFS.map(qd=>{
              const active=quests.find(q=>q.id===qd.id);
              const done=completedQuests.includes(qd.id);
              return (
                <div key={qd.id} style={{padding:"12px 0",borderBottom:"1px solid rgba(200,165,80,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:15}}>{done?"✅":active?"🔄":"🔒"}</span>
                    <div className="cinzel" style={{fontSize:11,color:done?"#4bfa7f":active?"#f5c518":"#4a3820"}}>{qd.title}</div>
                    <span className="tag" style={{marginLeft:"auto",background:`rgba(200,75,250,0.08)`,color:"#9060c0",border:"1px solid rgba(200,75,250,0.2)"}}>{qd.category}</span>
                  </div>
                  <div className="crimson" style={{fontSize:14,color:"#7a6040",fontStyle:"italic",marginBottom:6,lineHeight:1.6}}>{qd.desc}</div>
                  {/* Lore */}
                  <div style={{background:"rgba(200,165,80,0.04)",border:"1px solid rgba(200,165,80,0.1)",borderRadius:5,padding:"8px 10px",marginBottom:6}}>
                    <div className="crimson" style={{fontSize:13,color:"#5a4020",lineHeight:1.65,fontStyle:"italic"}}>{qd.lore}</div>
                  </div>
                  {active&&!done&&(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:5,background:"rgba(0,0,0,0.6)",border:"1px solid rgba(200,75,250,0.18)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(100,(active.progress/active.target)*100)}%`,
                          background:"linear-gradient(90deg,#c84bfa,#f5c518)",boxShadow:"0 0 6px #c84bfa66"}}/>
                      </div>
                      <div className="cinzel" style={{fontSize:8,color:"#c84bfa"}}>{active.progress}/{active.target}</div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                    <span className="cinzel" style={{fontSize:8,color:"#5a4020"}}>+{qd.reward.xp}XP +{qd.reward.gold}🪙</span>
                    {qd.reward.item&&<span className="cinzel" style={{fontSize:8,color:"#7a5030"}}>+{qd.reward.item.icon} {qd.reward.item.name}</span>}
                    {!active&&!done&&<span className="crimson" style={{fontSize:13,color:"#3a2810",marginLeft:"auto",fontStyle:"italic"}}>Talk to {NPCS.find(n=>n.id===qd.giver)?.name}</span>}
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <button className="btn" style={{color:"#7a6040",borderColor:"#3a2010",padding:"5px 14px",fontSize:9}} onClick={()=>setShowQuests(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Chathead Oracle */}
      {showChathead&&(
        <div style={{position:"fixed",bottom:24,right:24,width:chatheadMinimized?60:320,height:chatheadMinimized?60:420,
          background:"rgba(10,8,6,0.97)",border:"2px solid #c84bfa",borderRadius:chatheadMinimized?30:12,
          boxShadow:"0 8px 32px rgba(200,75,250,0.3)",display:"flex",flexDirection:"column",zIndex:450,
          transition:"all 0.3s ease",overflow:"hidden"}}>
          
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,rgba(200,75,250,0.2),rgba(100,50,150,0.2))",
            padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",
            borderBottom:chatheadMinimized?"none":"1px solid rgba(200,75,250,0.2)",cursor:"pointer"}}
            onClick={()=>setChatheadMinimized(!chatheadMinimized)}>
            <div className="cinzel" style={{fontSize:12,color:"#c84bfa",letterSpacing:1}}>
              {chatheadMinimized?"🔮":"Oracle AI 🔮"}
            </div>
            <button className="btn" style={{padding:"2px 6px",fontSize:8,marginLeft:"auto"}} onClick={()=>setShowChathead(false)}>✕</button>
          </div>
          
          {!chatheadMinimized&&(
            <>
              {/* Messages */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {chatMessages.length === 0 && !crosswordCompleted && (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",textAlign:"center"}}>
                    <div className="crimson" style={{fontSize:12,color:"#7a8a7a",fontStyle:"italic"}}>
                      💭 Complete the crossword puzzle first to unlock the Oracle's wisdom...
                    </div>
                  </div>
                )}
                {chatMessages.map((msg,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"70%",padding:"8px 12px",borderRadius:8,
                      background:msg.role==="user"?"rgba(200,75,250,0.15)":"rgba(75,250,127,0.1)",
                      border:"1px solid "+(msg.role==="user"?"#c84bfa66":"#4bfa7f66")}}>
                      <div className="crimson" style={{fontSize:12,color:msg.role==="user"?"#e8d5a0":"#8aff8a",lineHeight:1.4}}>{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input - Disabled until crossword completed */}
              {crosswordCompleted ? (
                <div style={{borderTop:"1px solid rgba(200,75,250,0.2)",padding:"8px 10px",display:"flex",gap:6}}>
                  <input
                    type="text"
                    placeholder="Ask Oracle..."
                    value={chatInput}
                    onChange={(e)=>setChatInput(e.target.value)}
                    onKeyPress={(e)=>e.key==="Enter"&&handleChatSubmit()}
                    style={{flex:1,padding:"6px 10px",fontSize:11,background:"rgba(10,8,6,0.8)",
                      border:"1px solid rgba(200,75,250,0.3)",borderRadius:4,color:"#d4b870",fontFamily:"'Crimson Text',serif"}}
                  />
                  <button onClick={handleChatSubmit} style={{padding:"6px 10px",background:"#c84bfa",color:"white",
                    border:"none",borderRadius:4,fontSize:11,cursor:"pointer"}}>Send</button>
                </div>
              ) : (
                <div style={{borderTop:"1px solid rgba(200,75,250,0.2)",padding:"8px 10px",background:"rgba(200,75,250,0.05)",borderRadius:4,textAlign:"center"}}>
                  <div className="cinzel" style={{fontSize:10,color:"#8a6830"}}>🔒 Solve Crossword to Chat</div>
                </div>
              )}

              {/* Side Quest Button */}
              {!crosswordCompleted&&(
                <button onClick={()=>setShowCrossword(true)}
                  style={{margin:"8px 10px 0",padding:"8px 12px",background:"linear-gradient(135deg,rgba(200,75,250,0.2),rgba(100,50,150,0.2))",
                    border:"1px solid #c84bfa",color:"#c84bfa",borderRadius:6,fontSize:10,cursor:"pointer",fontWeight:"bold"}}>
                  📖 Crossword Puzzle
                </button>
              )}
              {crosswordCompleted&&(
                <div style={{margin:"8px 10px 0",padding:"8px 12px",background:"rgba(75,250,127,0.1)",
                  border:"1px solid #4bfa7f",borderRadius:6,textAlign:"center"}}>
                  <div className="cinzel" style={{fontSize:10,color:"#4bfa7f"}}>✅ Crossword Unlocked!</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Crossword Puzzle */}
      {showCrossword&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
          onClick={()=>setShowCrossword(false)}>
          <div className="panel" style={{padding:28,borderRadius:12,maxWidth:1100,animation:"fadeUp 0.3s ease",
            boxShadow:"0 8px 40px rgba(0,0,0,0.9)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div className="cinzel" style={{fontSize:16,color:"#c84bfa",marginBottom:4,letterSpacing:2}}>🎯 OS CROSSWORD PUZZLE</div>
            <div className="crimson" style={{fontSize:12,color:"#7a6040",marginBottom:20}}>Fill in the grid with OS terms. Intersections are marked in gold!</div>
            
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
              {/* Crossword Grid */}
              <div style={{background:"rgba(10,8,6,0.5)",border:"2px solid #c84bfa66",borderRadius:8,padding:20}}>
                <div style={{display:"inline-block",border:"2px solid #c84bfa",borderRadius:4,padding:8}}>
                  {/* 8x8 grid */}
                  {Array.from({length:8}).map((_, row) => (
                    <div key={`row-${row}`} style={{display:"flex",gap:1}}>
                      {Array.from({length:8}).map((_, col) => {
                        // Define which cells are active (not black)
                        const blackCells = [];
                        const isBlack = blackCells.some(([r,c]) => r===row && c===col);
                        
                        // Define clue numbers using new key format
                        const clueMap = {
                          "cw_3_0": "1", // PROCESS (across)
                          "cw_1_1": "2", // THREAD (down)
                          "cw_1_4": "3", // EXEC (down)
                          "cw_4_6": "4"  // SWAP (down)
                        };
                        const cellKey = `cw_${row}_${col}`;
                        const clueNum = clueMap[cellKey];
                        
                        // Define active cells using new key format
                        const activeMap = {
                          "cw_1_1":"", "cw_1_2":"", "cw_1_3":"", "cw_1_4":"", "cw_1_5":"", "cw_1_6":"", "cw_1_7":"",
                          "cw_2_1":"", "cw_2_2":"", "cw_2_3":"", "cw_2_4":"", "cw_2_5":"", "cw_2_6":"", "cw_2_7":"",
                          "cw_3_0":"", "cw_3_1":"", "cw_3_2":"", "cw_3_3":"", "cw_3_4":"", "cw_3_5":"", "cw_3_6":"", "cw_3_7":"",
                          "cw_4_1":"", "cw_4_2":"", "cw_4_3":"", "cw_4_4":"", "cw_4_5":"", "cw_4_6":"", "cw_4_7":"",
                          "cw_5_1":"", "cw_5_2":"", "cw_5_3":"", "cw_5_4":"", "cw_5_5":"", "cw_5_6":"", "cw_5_7":"",
                          "cw_6_1":"", "cw_6_2":"", "cw_6_3":"", "cw_6_4":"", "cw_6_5":"", "cw_6_6":"", "cw_6_7":""
                        };
                        
                        const isActive = cellKey in activeMap || clueNum;
                        
                        // Define intersections (gold highlight)
                        const intersections = ["cw_3_1","cw_3_4","cw_3_6"]; // Shared letters in PROCESS
                        const isIntersection = intersections.includes(cellKey);
                        
                        if(!isActive) {
                          return <div key={`cell-${row}-${col}`} style={{width:32,height:32,background:"#000",borderRadius:2}}/>;
                        }
                        
                        return (
                          <div key={`cell-${row}-${col}`} style={{position:"relative",width:32,height:32}}>
                            {clueNum && (
                              <div style={{position:"absolute",top:1,left:1,fontSize:9,color:"#d850ff",fontWeight:"bold",lineHeight:1}}>
                                {clueNum}
                              </div>
                            )}
                            <input
                              maxLength="1"
                              value={crosswordAnswers[cellKey] || ""}
                              onChange={(e) => setCrosswordAnswers({...crosswordAnswers, [cellKey]: e.target.value.toUpperCase()})}
                              style={{
                                width:"100%",height:"100%",textAlign:"center",fontSize:11,fontWeight:"bold",
                                background: isIntersection ? "rgba(245,197,24,0.25)" : "rgba(200,75,250,0.1)",
                                border: isIntersection ? "1.5px solid #f5c518" : "1px solid #c84bfa66",
                                borderRadius:2,color:"#d850ff",
                                padding:0,marginBottom:1,marginRight:1
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div style={{marginTop:16,fontSize:10,color:"#7a6040",lineHeight:1.6}}>
                  <strong>Legend:</strong><br/>
                  🟨 Gold cells = letter intersections<br/>
                  Black squares = empty spaces
                </div>
              </div>

              {/* Clues Panel */}
              <div style={{fontSize:11}}>
                <div style={{marginBottom:20}}>
                  <div className="cinzel" style={{fontSize:12,color:"#c84bfa",marginBottom:10,fontWeight:"bold"}}>⬌ ACROSS</div>
                  <div style={{background:"rgba(200,75,250,0.08)",border:"1px solid rgba(200,75,250,0.2)",borderRadius:6,padding:12}}>
                    <div style={{color:"#d4b870",lineHeight:1.6}}>
                      <strong style={{color:"#d850ff"}}>1. PROCESS</strong> (7 letters)<br/>
                      <span style={{fontSize:10,color:"#7a6040"}}>Running program instance or task executing in the system.</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="cinzel" style={{fontSize:12,color:"#5cbfff",marginBottom:10,fontWeight:"bold"}}>⬇ DOWN</div>
                  <div style={{background:"rgba(92,191,255,0.08)",border:"1px solid rgba(92,191,255,0.2)",borderRadius:6,padding:12}}>
                    <div style={{marginBottom:12,color:"#7eb3d4",lineHeight:1.6}}>
                      <strong style={{color:"#5cbfff"}}>2. THREAD</strong> (5 letters)<br/>
                      <span style={{fontSize:10,color:"#567080"}}>Lightweight execution unit within a process.</span>
                    </div>
                    <div style={{marginBottom:12,color:"#7eb3d4",lineHeight:1.6}}>
                      <strong style={{color:"#5cbfff"}}>3. EXEC</strong> (3 letters)<br/>
                      <span style={{fontSize:10,color:"#567080"}}>System call that loads and executes a new program.</span>
                    </div>
                    <div style={{color:"#7eb3d4",lineHeight:1.6}}>
                      <strong style={{color:"#5cbfff"}}>4. SWAP</strong> (3 letters)<br/>
                      <span style={{fontSize:10,color:"#567080"}}>Virtual memory overflow space on disk.</span>
                    </div>
                  </div>
                </div>

                <div style={{marginTop:20,padding:12,background:"rgba(255,200,0,0.08)",border:"1px solid rgba(255,200,0,0.2)",borderRadius:6,fontSize:10}}>
                  <div style={{color:"#d4b870",lineHeight:1.6}}>
                    <strong>✓ All 4 words correct to unlock the Oracle!</strong><br/>
                    PROCESS (across) intersects with THREAD, EXEC, and SWAP (down).
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{display:"flex",gap:10,marginTop:24}}>
              <button className="btn" style={{flex:1,color:"#7a6040",borderColor:"#3a2010",padding:"10px",fontSize:11}}
                onClick={()=>{setShowCrossword(false);}}>✕ Cancel</button>
              <button className="btn btn-purple" style={{flex:1,padding:"10px",fontSize:11}}
                onClick={()=>{
                  // Validate using the new expected structure
                  const ans = crosswordAnswers;
                  
                  // PROCESS across row=3 (cw_3_0 through cw_3_6)
                  const processCorrect = (
                    (ans["cw_3_0"]||"") === "P" &&
                    (ans["cw_3_1"]||"") === "R" &&
                    (ans["cw_3_2"]||"") === "O" &&
                    (ans["cw_3_3"]||"") === "C" &&
                    (ans["cw_3_4"]||"") === "E" &&
                    (ans["cw_3_5"]||"") === "S" &&
                    (ans["cw_3_6"]||"") === "S"
                  );
                  
                  // THREAD down col=1 (cw_1_1, cw_2_1, cw_4_1, cw_5_1, cw_6_1) - row 3 is shared with PROCESS
                  const threadCorrect = (
                    (ans["cw_1_1"]||"") === "T" &&
                    (ans["cw_2_1"]||"") === "H" &&
                    (ans["cw_4_1"]||"") === "E" &&
                    (ans["cw_5_1"]||"") === "A" &&
                    (ans["cw_6_1"]||"") === "D"
                  );
                  
                  // EXEC down col=4 (cw_1_4, cw_2_4, cw_4_4) - row 3 is shared with PROCESS
                  const execCorrect = (
                    (ans["cw_1_4"]||"") === "E" &&
                    (ans["cw_2_4"]||"") === "X" &&
                    (ans["cw_4_4"]||"") === "C"
                  );
                  
                  // SWAP down col=6 (cw_4_6, cw_5_6, cw_6_6) - row 3 is shared with PROCESS
                  const swapCorrect = (
                    (ans["cw_4_6"]||"") === "W" &&
                    (ans["cw_5_6"]||"") === "A" &&
                    (ans["cw_6_6"]||"") === "P"
                  );
                  
                  if(processCorrect && threadCorrect && execCorrect && swapCorrect){
                    setCrosswordCompleted(true);
                    setShowCrossword(false);
                    S.current.xp += 25;
                    S.current.score += 150;
                    syncStats();
                    notify("🎉 Crossword Solved! Oracle's secrets unlocked!","#4bfa7f",3000);
                  } else {
                    const wrong = [];
                    if(!processCorrect) wrong.push("PROCESS");
                    if(!threadCorrect) wrong.push("THREAD");
                    if(!execCorrect) wrong.push("EXEC");
                    if(!swapCorrect) wrong.push("SWAP");
                    notify(`❌ Check: ${wrong.join(", ")}`,"#ff6666",2000);
                  }
                }}>✓ Submit Solution</button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Portals */}
      {showSimulator&&currentLessonPortal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:700,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          
          {/* ═══ TITLE BAR (48px) ═══ */}
          <div style={{height:"48px",background:"rgba(0,0,0,0.7)",borderBottom:`2px solid ${currentLessonPortal==="task-scheduling"?"#d850ff":"#5cbfff"}`,padding:"0 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flex:"0 0 48px"}}>
            <div className="cinzel" style={{fontSize:17,color:currentLessonPortal==="task-scheduling"?"#d850ff":"#5cbfff",fontWeight:"bold",letterSpacing:2}}>
              {currentLessonPortal==="task-scheduling"?"⏰ TASK SCHEDULING":"💾 MEMORY MANAGEMENT"}
            </div>
            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-green" style={{padding:"8px 18px",fontSize:12}} onClick={()=>{
                if(currentLessonPortal==="task-scheduling") setTaskSchedulingCompleted(true);
                else setMemoryManagementCompleted(true);
                S.current.xp += 50;
                syncStats();
                setShowSimulator(false);
                setCurrentLessonPortal(null);
                notify("✨ Lesson Complete! +50 XP","#4bfa7f",3000);
              }}>✓ COMPLETE +50XP</button>
              <button className="btn" style={{padding:"8px 14px",fontSize:12}} onClick={()=>{setShowSimulator(false);setCurrentLessonPortal(null);}}>✕</button>
            </div>
          </div>

          {/* ═══ MAIN CONTENT: NPC PANEL | CONTROLS | RESULTS ═══ */}
          <div style={{flex:1,display:"grid",gridTemplateColumns:"300px 220px 1fr",gap:0,overflow:"hidden"}}>

            {/* ═══ NPC TEACHING PANEL - CPU (300px) ═══ */}
            {currentLessonPortal==="task-scheduling" && (
              <div style={{background:"linear-gradient(180deg,rgba(216,80,255,0.08),rgba(100,50,150,0.05))",borderRight:"2px solid #d850ff44",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* NPC Header */}
                <div style={{padding:"14px 16px",borderBottom:"1px solid #d850ff33",background:"rgba(216,80,255,0.12)",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:32}}>🧙‍♂️</span>
                  <div>
                    <div className="cinzel" style={{fontSize:14,color:"#d850ff",fontWeight:"bold"}}>Sage Scheduler</div>
                    <div style={{fontSize:11,color:"#a060c0"}}>CPU Scheduling Teacher</div>
                  </div>
                </div>

                {/* Step Navigation */}
                <div style={{padding:"10px 14px",borderBottom:"1px solid #d850ff22",display:"flex",alignItems:"center",gap:6}}>
                  <button style={{background:"#d850ff22",border:"1px solid #d850ff",color:"#d850ff",cursor:"pointer",padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:"bold"}} onClick={()=>setCpuNpcStep(Math.max(0,cpuNpcStep-1))}>‹</button>
                  <div style={{display:"flex",gap:3,flex:1,justifyContent:"center"}}>
                    {[0,1,2,3,4,5,6].map(s=>(
                      <div key={s} onClick={()=>setCpuNpcStep(s)} style={{width:18,height:18,borderRadius:"50%",background:s<=cpuNpcStep?"#d850ff":"#333",border:`1px solid ${s<=cpuNpcStep?"#d850ff":"#555"}`,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",color:s<=cpuNpcStep?"#000":"#777",fontWeight:"bold"}}>{s+1}</div>
                    ))}
                  </div>
                  <button style={{background:"#d850ff22",border:"1px solid #d850ff",color:"#d850ff",cursor:"pointer",padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:"bold"}} onClick={()=>setCpuNpcStep(Math.min(6,cpuNpcStep+1))}>›</button>
                </div>

                {/* Teaching Content */}
                <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                  {cpuNpcStep===0 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>👋 Welcome to CPU Scheduling!</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.8,marginBottom:12}}>
                        I'm Sage Scheduler, and I'll teach you how operating systems decide <em>which process runs next</em> on the CPU.
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12,marginBottom:12}}>
                        <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:6}}>🖥️ What is CPU Scheduling?</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:1.75}}>
                          When multiple processes want to run, the OS must decide the order. A <strong style={{color:"#f5c518"}}>scheduler</strong> picks which process gets CPU time next using an algorithm.
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:8,padding:12}}>
                        <div style={{fontSize:12,color:"#888",fontWeight:"bold",marginBottom:6}}>📋 Key Terms:</div>
                        <div style={{fontSize:12,color:"#bbb",lineHeight:2}}>
                          • <strong style={{color:"#ffaa88"}}>Arrival Time (A)</strong> — when process enters queue<br/>
                          • <strong style={{color:"#88ff88"}}>Burst Time (B)</strong> — how long it needs the CPU<br/>
                          • <strong style={{color:"#88aaff"}}>Completion (C)</strong> — when it finishes<br/>
                          • <strong style={{color:"#ffff88"}}>Turnaround (TAT)</strong> — C − A (total time in system)<br/>
                          • <strong style={{color:"#ff88ff"}}>Wait Time (W)</strong> — TAT − B (time spent waiting)
                        </div>
                      </div>
                      <div style={{marginTop:12,fontSize:12,color:"#a060c0",fontStyle:"italic"}}>👆 Click "›" or step 2 to continue learning!</div>
                    </div>
                  )}
                  {cpuNpcStep===1 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>🎯 Choose Your Algorithm</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:12}}>
                        Each algorithm has different strengths. Pick one from the panel on the right!
                      </div>
                      {[
                        {name:"FCFS",color:"#ff8888",title:"First Come First Serve",desc:"Processes run in arrival order. Simple but can cause long waits (convoy effect)."},
                        {name:"SJF",color:"#88ff88",title:"Shortest Job First",desc:"Shortest burst runs next. Minimizes average wait but requires knowing burst times."},
                        {name:"SRTF",color:"#88aaff",title:"Shortest Remaining Time First",desc:"Preemptive SJF. Interrupts current process if a shorter job arrives."},
                        {name:"RR",color:"#ffff88",title:"Round Robin",desc:"Each process gets a fixed time quantum. Fair for all, great for time-sharing systems."},
                        {name:"Priority",color:"#ff88ff",title:"Priority Scheduling",desc:"Lower priority number = runs first. Can cause starvation of low-priority jobs."},
                      ].map(a=>(
                        <div key={a.name} style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${a.color}44`,borderRadius:6,padding:"8px 10px",marginBottom:7}}>
                          <div style={{fontSize:12,color:a.color,fontWeight:"bold",marginBottom:3}}>{a.name} — {a.title}</div>
                          <div style={{fontSize:11,color:"#aaa",lineHeight:1.6}}>{a.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cpuNpcStep===2 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>➕ Add Processes</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:12}}>
                        Use the controls panel to add processes. Each process represents a program that needs CPU time.
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8}}>📝 Input Fields Explained:</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:2}}>
                          <strong style={{color:"#ffaa88"}}>Arr (Arrival Time)</strong><br/>
                          When this process arrives at the ready queue. Set 0 if all arrive at the same time.<br/><br/>
                          <strong style={{color:"#88ff88"}}>Burst (Burst Time)</strong><br/>
                          How many milliseconds this process needs to complete. Higher = longer process.<br/><br/>
                          <strong style={{color:"#ff88ff"}}>Pri (Priority)</strong><br/>
                          Lower number = higher priority. Only matters for Priority scheduling.
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:6,padding:10,fontSize:11,color:"#888"}}>
                        💡 Try adding 3–5 processes with different burst times to see interesting scheduling behavior!
                      </div>
                    </div>
                  )}
                  {cpuNpcStep===3 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>📊 Reading the Gantt Chart</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:12}}>
                        After clicking SUBMIT, the Gantt chart shows the <em>execution timeline</em>.
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8}}>🗓️ How to Read the Gantt Chart:</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:1.9}}>
                          • Each <strong style={{color:"#f5c518"}}>colored block</strong> = one process running<br/>
                          • The <strong style={{color:"#f5c518"}}>number inside</strong> = Process ID<br/>
                          • <strong style={{color:"#f5c518"}}>Width</strong> = how long it ran<br/>
                          • <strong style={{color:"#f5c518"}}>Left edge</strong> = start time<br/>
                          • <strong style={{color:"#f5c518"}}>Right edge</strong> = end time<br/>
                          • <strong style={{color:"#ff8888"}}>Gaps</strong> = CPU idle time
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:8,padding:10}}>
                        <div style={{fontSize:12,color:"#888",fontWeight:"bold",marginBottom:4}}>📖 Example:</div>
                        <div style={{display:"flex",gap:2,height:22,marginBottom:4}}>
                          {[{c:"#ff8888",w:20},{c:"#88ff88",w:12},{c:"#8888ff",w:32}].map((b,i)=>(
                            <div key={i} style={{flex:`0 0 ${b.w}%`,background:b.c,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:"bold"}}>P{i}</div>
                          ))}
                        </div>
                        <div style={{fontSize:11,color:"#888"}}>P0 finishes first, then P1, then P2 runs longest.</div>
                      </div>
                    </div>
                  )}
                  {cpuNpcStep===4 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>📈 Understanding Metrics</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:10}}>
                        The results table shows per-process stats. Here's how to interpret them:
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8}}>🧮 Formulas:</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:2.1,fontFamily:"monospace"}}>
                          <span style={{color:"#88ff88"}}>TAT</span> = Completion − Arrival<br/>
                          <span style={{color:"#ffff88"}}>Wait</span> = TAT − Burst Time<br/>
                          <span style={{color:"#ff88ff"}}>Avg Wait</span> = Sum(W) / n<br/>
                          <span style={{color:"#88aaff"}}>Avg TAT</span> = Sum(TAT) / n
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:8,padding:10,marginBottom:8}}>
                        <div style={{fontSize:12,color:"#888",fontWeight:"bold",marginBottom:4}}>📌 What's Good?</div>
                        <div style={{fontSize:12,color:"#bbb",lineHeight:1.8}}>
                          ✅ <strong style={{color:"#4bfa7f"}}>Lower Avg Wait</strong> = processes wait less<br/>
                          ✅ <strong style={{color:"#4bfa7f"}}>Lower Avg TAT</strong> = faster total throughput<br/>
                          ⚠️ <strong style={{color:"#ffaa44"}}>High wait</strong> = poor user experience<br/>
                          ⚠️ <strong style={{color:"#ffaa44"}}>Starvation</strong> = some never run
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#a060c0",fontStyle:"italic"}}>
                        💡 The AVG WAIT and AVG TAT shown at the top are the key indicators of algorithm performance!
                      </div>
                    </div>
                  )}
                  {cpuNpcStep===5 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>⚔️ Compare All Algorithms</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:10}}>
                        Click the <strong style={{color:"#5cbfff"}}>📊 COMPARE</strong> button to see how all algorithms perform on the same set of processes!
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8}}>🏆 Algorithm Trade-offs:</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:2}}>
                          • <strong style={{color:"#ff8888"}}>FCFS</strong> — Simple, but convoy effect<br/>
                          • <strong style={{color:"#88ff88"}}>SJF</strong> — Best avg wait (non-preemptive)<br/>
                          • <strong style={{color:"#88aaff"}}>SRTF</strong> — Optimal avg wait (preemptive)<br/>
                          • <strong style={{color:"#ffff88"}}>RR</strong> — Fair, good for interactive<br/>
                          • <strong style={{color:"#ff88ff"}}>Priority</strong> — Urgent tasks first
                        </div>
                      </div>
                      <div style={{background:"rgba(245,197,24,0.08)",border:"1px solid #f5c51844",borderRadius:6,padding:10}}>
                        <div style={{fontSize:12,color:"#f5c518",fontWeight:"bold",marginBottom:4}}>💡 When to Use What?</div>
                        <div style={{fontSize:11,color:"#bbb",lineHeight:1.75}}>
                          Batch jobs → SJF/SRTF<br/>
                          Interactive → Round Robin<br/>
                          Real-time → Priority<br/>
                          Simple systems → FCFS
                        </div>
                      </div>
                    </div>
                  )}
                  {cpuNpcStep===6 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#d850ff",marginBottom:10}}>🎓 CPU Scheduling Mastery!</div>
                      <div style={{fontSize:13,color:"#c8b0e0",lineHeight:1.75,marginBottom:12}}>
                        Excellent work! You now understand how operating systems schedule processes.
                      </div>
                      <div style={{background:"rgba(75,250,127,0.08)",border:"1px solid #4bfa7f44",borderRadius:8,padding:12,marginBottom:12}}>
                        <div style={{fontSize:12,color:"#4bfa7f",fontWeight:"bold",marginBottom:8}}>✅ You've Learned:</div>
                        <div style={{fontSize:12,color:"#c8b0e0",lineHeight:2}}>
                          ✓ What CPU scheduling is<br/>
                          ✓ FCFS, SJF, SRTF, RR, Priority<br/>
                          ✓ How to read a Gantt chart<br/>
                          ✓ Turnaround & Wait formulas<br/>
                          ✓ How to compare algorithms
                        </div>
                      </div>
                      <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff",borderRadius:8,padding:12,textAlign:"center"}}>
                        <div style={{fontSize:13,color:"#d850ff",marginBottom:6}}>🌟 Ready to complete?</div>
                        <div style={{fontSize:11,color:"#a060c0"}}>Click <strong style={{color:"#4bfa7f"}}>✓ COMPLETE +50XP</strong> at the top to earn your reward!</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ NPC TEACHING PANEL - MEMORY (300px) ═══ */}
            {currentLessonPortal==="memory-management" && (
              <div style={{background:"linear-gradient(180deg,rgba(92,191,255,0.08),rgba(50,100,150,0.05))",borderRight:"2px solid #5cbfff44",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* NPC Header */}
                <div style={{padding:"14px 16px",borderBottom:"1px solid #5cbfff33",background:"rgba(92,191,255,0.12)",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:32}}>🧝</span>
                  <div>
                    <div className="cinzel" style={{fontSize:14,color:"#5cbfff",fontWeight:"bold"}}>Memory Mystic</div>
                    <div style={{fontSize:11,color:"#6090a0"}}>Memory Management Teacher</div>
                  </div>
                </div>

                {/* Step Navigation */}
                <div style={{padding:"10px 14px",borderBottom:"1px solid #5cbfff22",display:"flex",alignItems:"center",gap:6}}>
                  <button style={{background:"#5cbfff22",border:"1px solid #5cbfff",color:"#5cbfff",cursor:"pointer",padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:"bold"}} onClick={()=>setMemNpcStep(Math.max(0,memNpcStep-1))}>‹</button>
                  <div style={{display:"flex",gap:3,flex:1,justifyContent:"center"}}>
                    {[0,1,2,3,4,5].map(s=>(
                      <div key={s} onClick={()=>setMemNpcStep(s)} style={{width:18,height:18,borderRadius:"50%",background:s<=memNpcStep?"#5cbfff":"#333",border:`1px solid ${s<=memNpcStep?"#5cbfff":"#555"}`,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",color:s<=memNpcStep?"#000":"#777",fontWeight:"bold"}}>{s+1}</div>
                    ))}
                  </div>
                  <button style={{background:"#5cbfff22",border:"1px solid #5cbfff",color:"#5cbfff",cursor:"pointer",padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:"bold"}} onClick={()=>setMemNpcStep(Math.min(5,memNpcStep+1))}>›</button>
                </div>

                {/* Teaching Content */}
                <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                  {memNpcStep===0 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>💾 Welcome to Memory Management!</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.8,marginBottom:12}}>
                        I'm Memory Mystic! I'll teach you how operating systems allocate RAM to running programs.
                      </div>
                      <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:8,padding:12,marginBottom:12}}>
                        <div style={{fontSize:12,color:"#5cbfff",fontWeight:"bold",marginBottom:6}}>🧠 What is Memory Allocation?</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:1.75}}>
                          When you open a program, the OS must find free space in RAM and assign it. This is called <strong style={{color:"#f5c518"}}>memory allocation</strong>.
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:8,padding:12}}>
                        <div style={{fontSize:12,color:"#888",fontWeight:"bold",marginBottom:6}}>📋 Key Terms:</div>
                        <div style={{fontSize:12,color:"#bbb",lineHeight:2}}>
                          • <strong style={{color:"#ffaa88"}}>Frame</strong> — fixed-size block of physical RAM<br/>
                          • <strong style={{color:"#88ff88"}}>Page</strong> — fixed-size block of a process<br/>
                          • <strong style={{color:"#88aaff"}}>Page Size</strong> — frame/page size in MB<br/>
                          • <strong style={{color:"#ffff88"}}>Internal Frag</strong> — wasted space inside a frame<br/>
                          • <strong style={{color:"#ff88ff"}}>External Frag</strong> — free space too small to use
                        </div>
                      </div>
                    </div>
                  )}
                  {memNpcStep===1 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>➕ Adding Jobs to Memory</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.75,marginBottom:12}}>
                        Each <strong style={{color:"#f5c518"}}>job</strong> is a program that needs RAM. Add jobs in the center panel!
                      </div>
                      <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#5cbfff",fontWeight:"bold",marginBottom:8}}>📝 Input Fields:</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:2}}>
                          <strong style={{color:"#ffaa88"}}>Name</strong> — label for the job (e.g. "Browser")<br/>
                          <strong style={{color:"#88ff88"}}>Size (MB)</strong> — how much RAM it needs<br/><br/>
                          The OS will allocate enough <strong style={{color:"#f5c518"}}>frames</strong> to cover the job's size. If the job is 200 MB and each frame is 64 MB, it needs <strong style={{color:"#f5c518"}}>4 frames</strong> (256 MB total — 56 MB wasted internally).
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:6,padding:10,fontSize:11,color:"#888"}}>
                        💡 Try adding jobs of different sizes — small (64 MB), medium (200 MB), large (512 MB) — to see how fragmentation changes!
                      </div>
                    </div>
                  )}
                  {memNpcStep===2 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>🎛️ Allocation Strategies</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.75,marginBottom:10}}>
                        The <strong style={{color:"#f5c518"}}>strategy</strong> determines <em>which</em> free block is chosen for each job.
                      </div>
                      {[
                        {name:"First Fit",key:"first-fit",color:"#ffaa44",desc:"Scans from start, picks the FIRST hole that fits. Fast but can leave many small fragments at the start."},
                        {name:"Best Fit",key:"best-fit",color:"#44ff88",desc:"Searches ALL holes, picks the SMALLEST one that still fits. Minimizes waste per allocation but slower."},
                        {name:"Worst Fit",key:"worst-fit",color:"#ff5577",desc:"Picks the LARGEST available hole. Leaves big remaining chunks — useful when future jobs will be large."},
                      ].map(s=>(
                        <div key={s.key} style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${s.color}44`,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
                          <div style={{fontSize:12,color:s.color,fontWeight:"bold",marginBottom:4}}>{s.name}</div>
                          <div style={{fontSize:11,color:"#aaa",lineHeight:1.65}}>{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {memNpcStep===3 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>🗺️ Reading the Memory Map</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.75,marginBottom:10}}>
                        The <strong style={{color:"#f5c518"}}>Memory Map</strong> on the right shows how RAM frames are used.
                      </div>
                      <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#5cbfff",fontWeight:"bold",marginBottom:8}}>🎨 Color Legend:</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:2}}>
                          <span style={{background:"#ff8888",padding:"1px 8px",borderRadius:3,marginRight:6,color:"#000"}}>COLOR</span> = frame allocated to a job<br/>
                          <span style={{background:"#222",padding:"1px 8px",borderRadius:3,marginRight:6,border:"1px solid #444",color:"#666"}}>dark</span> = frame is free<br/><br/>
                          Each row = one frame. The label shows which job occupies it. <strong style={{color:"#f5c518"}}>Dashes (—)</strong> = empty frame.
                        </div>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid #555",borderRadius:6,padding:10,fontSize:11,color:"#888",lineHeight:1.65}}>
                        The stats at the top show: total RAM used, free RAM, internal waste (rounded-up pages), and utilization %.
                      </div>
                    </div>
                  )}
                  {memNpcStep===4 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>🔍 Understanding Fragmentation</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.75,marginBottom:10}}>
                        Fragmentation is wasted memory. There are two types:
                      </div>
                      <div style={{background:"rgba(255,170,68,0.1)",border:"1px solid #ffaa4444",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#ffaa44",fontWeight:"bold",marginBottom:6}}>📦 Internal Fragmentation</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:1.75}}>
                          Happens when a job doesn't perfectly fill its allocated frames.<br/><br/>
                          Example: Job needs 70 MB, page size is 64 MB → needs 2 pages (128 MB) → <strong style={{color:"#ff8888"}}>58 MB wasted</strong> inside the second frame.
                        </div>
                      </div>
                      <div style={{background:"rgba(255,85,119,0.1)",border:"1px solid #ff557744",borderRadius:8,padding:12,marginBottom:10}}>
                        <div style={{fontSize:12,color:"#ff5577",fontWeight:"bold",marginBottom:6}}>🧩 External Fragmentation</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:1.75}}>
                          Free memory exists but it's scattered in small pieces that can't satisfy a large request.<br/><br/>
                          Example: 200 MB free total, but split into 20 tiny chunks — a 100 MB job can't fit!
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#6090a0",fontStyle:"italic"}}>
                        💡 Try removing a middle job and adding a large one — watch external fragmentation appear!
                      </div>
                    </div>
                  )}
                  {memNpcStep===5 && (
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:"#5cbfff",marginBottom:10}}>🎓 Memory Management Mastery!</div>
                      <div style={{fontSize:13,color:"#a8d0e8",lineHeight:1.75,marginBottom:12}}>
                        Outstanding! You've mastered memory allocation concepts.
                      </div>
                      <div style={{background:"rgba(75,250,127,0.08)",border:"1px solid #4bfa7f44",borderRadius:8,padding:12,marginBottom:12}}>
                        <div style={{fontSize:12,color:"#4bfa7f",fontWeight:"bold",marginBottom:8}}>✅ You've Learned:</div>
                        <div style={{fontSize:12,color:"#a8d0e8",lineHeight:2}}>
                          ✓ What memory allocation is<br/>
                          ✓ Frames, pages, and page size<br/>
                          ✓ First Fit, Best Fit, Worst Fit<br/>
                          ✓ How to read a memory map<br/>
                          ✓ Internal vs External fragmentation
                        </div>
                      </div>
                      <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff",borderRadius:8,padding:12,textAlign:"center"}}>
                        <div style={{fontSize:13,color:"#5cbfff",marginBottom:6}}>🌟 Ready to complete?</div>
                        <div style={{fontSize:11,color:"#6090a0"}}>Click <strong style={{color:"#4bfa7f"}}>✓ COMPLETE +50XP</strong> at the top!</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ CPU: CONTROLS PANEL (220px) ═══ */}
            
            {/* CPU: LEFT CONTROLS (220px) ═══ */}
            {currentLessonPortal==="task-scheduling" && (
              <div style={{background:"rgba(0,0,0,0.3)",borderRight:"1px solid #d850ff44",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{overflowY:"auto",flex:1,paddingRight:"4px"}}>
                  {/* Algorithm */}
                  <div style={{padding:"14px 12px",borderBottom:"1px solid #333"}}>
                    <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8,letterSpacing:1}}>ALGORITHM</div>
                    {["FCFS","SJF","SRTF","RR","Priority"].map(algo=>(
                      <button key={algo} className="btn" style={{width:"100%",textAlign:"center",margin:"4px 0",padding:"9px",
                        background:cpuAlgorithm===algo?"#d850ff33":"transparent",fontSize:11,fontWeight:600,
                        color:cpuAlgorithm===algo?"#d850ff":"#999",borderColor:cpuAlgorithm===algo?"#d850ff":"#555"}}
                        onClick={()=>setCpuAlgorithm(algo)}>{algo}</button>
                    ))}
                    {cpuAlgorithm==="RR"&&(
                      <div style={{marginTop:8}}>
                        <div style={{fontSize:10,color:"#888",marginBottom:4}}>Time Quantum:</div>
                        <input type="number" min="1" max="5" value={cpuTimeQuantum} onChange={e=>setCpuTimeQuantum(Number(e.target.value))}
                          style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",fontSize:12,fontWeight:"bold"}}/>
                      </div>
                    )}
                  </div>

                  {/* Add Process */}
                  <div style={{padding:"12px",borderBottom:"1px solid #333"}}>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Arrival Time:</div>
                    <input type="number" value={cpuNewArrival} onChange={e=>setCpuNewArrival(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",fontSize:12,marginBottom:8}}/>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Burst Time:</div>
                    <input type="number" value={cpuNewBurst} onChange={e=>setCpuNewBurst(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",fontSize:12,marginBottom:8}}/>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Priority:</div>
                    <input type="number" value={cpuNewPriority} onChange={e=>setCpuNewPriority(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",fontSize:12,marginBottom:10}}/>
                    <button className="btn btn-blue" style={{width:"100%",padding:"10px",fontSize:12,fontWeight:"bold"}} onClick={()=>{
                      const newId = Math.max(...cpuProcesses.map(p=>p.id),0)+1;
                      setCpuProcesses([...cpuProcesses,{id:newId,arrivalTime:cpuNewArrival,burstTime:cpuNewBurst,priority:cpuNewPriority}]);
                      setCpuNewArrival(0);setCpuNewBurst(3);setCpuNewPriority(1);
                      if(cpuNpcStep===0) setCpuNpcStep(1);
                    }}>+ ADD PROCESS</button>
                  </div>

                  {/* Processes List */}
                  <div style={{padding:"10px 12px"}}>
                    <div style={{fontSize:12,color:"#d850ff",fontWeight:"bold",marginBottom:8}}>Processes ({cpuProcesses.length})</div>
                    {cpuProcesses.map((p,i)=>(
                      <div key={i} style={{fontSize:11,color:"#bbb",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px",background:"rgba(0,0,0,0.4)",borderRadius:4}}>
                        <span style={{color:colors[p.id%colors.length],fontWeight:"bold"}}>P{p.id}: B{p.burstTime}</span>
                        <button className="btn" style={{padding:"4px 8px",fontSize:9,color:"#f88",borderColor:"#f884"}} onClick={()=>setCpuProcesses(cpuProcesses.filter((_,j)=>j!==i))}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div style={{padding:"10px 12px",borderTop:"1px solid #333",display:"flex",flexDirection:"column",gap:6}}>
                  <button className="btn btn-purple" style={{width:"100%",padding:"10px",fontSize:12,fontWeight:"bold"}} onClick={()=>{
                    let result;
                    if(cpuAlgorithm==="FCFS") result = computeFCFS(cpuProcesses);
                    else if(cpuAlgorithm==="SJF") result = computeSJF_NP(cpuProcesses);
                    else if(cpuAlgorithm==="SRTF") result = computeSRTF(cpuProcesses);
                    else if(cpuAlgorithm==="RR") result = computeRR(cpuProcesses,cpuTimeQuantum);
                    else result = computePriority(cpuProcesses);
                    setCpuResults(result);
                    if(cpuNpcStep<=2) setCpuNpcStep(3);
                  }}>✓ SUBMIT</button>
                  <button className="btn" style={{width:"100%",padding:"10px",fontSize:11,color:"#b0b0b0",fontWeight:"bold"}} onClick={()=>{
                    setCpuProcesses([{id:0,arrivalTime:0,burstTime:5,priority:1},{id:1,arrivalTime:0,burstTime:3,priority:2},{id:2,arrivalTime:0,burstTime:8,priority:3},{id:3,arrivalTime:0,burstTime:2,priority:1}]);
                    setCpuResults(null);
                    setCpuCompareResults(null);
                  }}>🔄 RESET</button>
                </div>
              </div>
            )}

            {/* MEMORY: LEFT CONTROLS (220px) ═══ */}
            {currentLessonPortal==="memory-management" && (
              <div style={{background:"rgba(0,0,0,0.3)",borderRight:"1px solid #58ff8944",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{overflowY:"auto",flex:1,paddingRight:"4px"}}>
                  {/* Settings */}
                  <div style={{padding:"12px",borderBottom:"1px solid #333"}}>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Total RAM (MB):</div>
                    <input type="number" value={memTotalRam} onChange={e=>setMemTotalRam(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",fontSize:12,marginBottom:8}}/>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Page Size (MB):</div>
                    <input type="number" value={memPageSize} onChange={e=>setMemPageSize(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",fontSize:12,marginBottom:8}}/>
                    <div style={{fontSize:11,color:"#58ff89",fontWeight:"bold",marginBottom:6}}>STRATEGY</div>
                    {["first-fit","best-fit","worst-fit"].map(s=>(
                      <button key={s} className="btn" style={{width:"100%",textAlign:"center",margin:"4px 0",padding:"8px",fontSize:10,fontWeight:600,
                        background:memStrategy===s?"#58ff8933":"transparent",
                        color:memStrategy===s?"#58ff89":"#999",borderColor:memStrategy===s?"#58ff89":"#555"}}
                        onClick={()=>{setMemStrategy(s);if(memNpcStep===2) setMemNpcStep(3);}}>{s}</button>
                    ))}
                  </div>

                  {/* Add Job */}
                  <div style={{padding:"12px",borderBottom:"1px solid #333"}}>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Job Name:</div>
                    <input type="text" placeholder="e.g., Browser" value={memNewName} onChange={e=>setMemNewName(e.target.value)} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",fontSize:11,marginBottom:8}}/>
                    <div style={{fontSize:11,color:"#888",marginBottom:5,fontWeight:"bold"}}>Size (MB):</div>
                    <input type="number" min="16" value={memNewSize} onChange={e=>setMemNewSize(Number(e.target.value))} style={{width:"100%",padding:"8px",borderRadius:4,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",fontSize:12,marginBottom:10}}/>
                    <button className="btn btn-blue" style={{width:"100%",padding:"10px",fontSize:12,fontWeight:"bold"}} onClick={()=>{
                      if(memNewName.trim()) {
                        const newId = Math.max(...memJobs.map(j=>j.id),0)+1;
                        setMemJobs([...memJobs,{id:newId,name:memNewName,size:memNewSize,color:colors[newId%colors.length]}]);
                        setMemNewName("");setMemNewSize(128);
                        if(memNpcStep===0) setMemNpcStep(1);
                        else if(memNpcStep===1) setMemNpcStep(2);
                      }
                    }}>+ ADD JOB</button>
                  </div>

                  {/* Jobs List */}
                  <div style={{padding:"10px 12px"}}>
                    <div style={{fontSize:12,color:"#58ff89",fontWeight:"bold",marginBottom:8}}>Jobs ({memJobs.length})</div>
                    {memJobs.map(j=>(
                      <div key={j.id} style={{fontSize:11,color:"#bbb",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px",background:"rgba(0,0,0,0.4)",borderRadius:4}}>
                        <span style={{color:j.color,fontWeight:"bold"}}>{j.name} ({j.size}MB)</span>
                        <button className="btn" style={{padding:"4px 8px",fontSize:9,color:"#f88",borderColor:"#f884"}} onClick={()=>{
                          setMemJobs(memJobs.filter(x=>x.id!==j.id));
                          if(memNpcStep===3) setMemNpcStep(4);
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}



            {/* CPU: RIGHT RESULTS */}
            {currentLessonPortal==="task-scheduling" && (
              <div style={{background:"rgba(0,0,0,0.2)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                {/* Metrics if results exist */}
                {cpuResults && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"12px",borderBottom:"1px solid #333",flex:"0 0 auto"}}>
                    <div style={{background:"rgba(92,191,255,0.05)",padding:10,borderRadius:4,border:"1px solid #5cbfff33"}}>
                      <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>AVG WAIT</div>
                      <div style={{color:"#ffaa88",fontWeight:"bold",fontSize:14}}>{cpuResults.avgWait.toFixed(1)}ms</div>
                    </div>
                    <div style={{background:"rgba(92,191,255,0.05)",padding:10,borderRadius:4,border:"1px solid #5cbfff33"}}>
                      <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>AVG TAT</div>
                      <div style={{color:"#88aaff",fontWeight:"bold",fontSize:14}}>{cpuResults.avgTurnaround.toFixed(1)}ms</div>
                    </div>
                  </div>
                )}

                {/* Results Table or Comparison */}
                <div style={{overflowY:"auto",flex:1,paddingRight:"6px",paddingBottom:"6px"}}>
                  {!cpuResults && !cpuCompareResults && (
                    <div style={{color:"#666",textAlign:"center",padding:"40px 20px",fontSize:9}}>Select algorithm & click SUBMIT</div>
                  )}

                  {cpuResults && !cpuCompareResults && (
                    <div style={{padding:"12px"}}>
                      <table style={{width:"100%",fontSize:11,color:"#aaa",borderCollapse:"collapse"}}>
                        <thead><tr style={{borderBottom:"1px solid #555",stickyTop:0,background:"rgba(92,191,255,0.08)"}}>
                          <th style={{textAlign:"left",padding:"6px",color:"#5cbfff",fontSize:12,fontWeight:"bold"}}>P</th>
                          <th style={{textAlign:"left",padding:"6px",color:"#5cbfff",fontSize:12,fontWeight:"bold"}}>A</th>
                          <th style={{textAlign:"left",padding:"6px",color:"#5cbfff",fontSize:12,fontWeight:"bold"}}>B</th>
                          <th style={{textAlign:"left",padding:"6px",color:"#5cbfff",fontSize:12,fontWeight:"bold"}}>C</th>
                          <th style={{textAlign:"left",padding:"6px",color:"#88ff88",fontSize:12,fontWeight:"bold"}}>TAT</th>
                          <th style={{textAlign:"left",padding:"6px",color:"#ffff88",fontSize:12,fontWeight:"bold"}}>W</th>
                        </tr></thead>
                        <tbody>
                          {cpuResults.results.map(r=>(
                            <tr key={r.id} style={{borderBottom:"1px solid #333"}}>
                              <td style={{padding:"6px",color:"#d850ff",fontSize:11,fontWeight:"bold"}}>{r.id}</td>
                              <td style={{padding:"6px",fontSize:11}}>{r.arrival}</td>
                              <td style={{padding:"6px",fontSize:11}}>{r.burst}</td>
                              <td style={{padding:"6px",fontSize:11}}>{r.completion.toFixed(0)}</td>
                              <td style={{padding:"6px",color:"#88ff88",fontSize:11}}>{r.turnaround.toFixed(1)}</td>
                              <td style={{padding:"6px",color:"#ffff88",fontSize:11}}>{r.wait.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{marginTop:10,background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:4,padding:10}}>
                        <div style={{fontSize:11,color:"#5cbfff",fontWeight:"bold",marginBottom:8}}>Gantt Chart</div>
                        <div style={{display:"flex",height:40,gap:2,overflowX:"auto"}}>
                          {cpuResults.gantt.map((seg,i)=>{
                            const maxEnd = Math.max(...cpuResults.gantt.map(g=>g.end));
                            const width = (seg.end - seg.start) / maxEnd * 100;
                            return <div key={i} style={{flex:`0 0 ${width}%`,background:seg.color,border:"1px solid #999",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:"bold",minWidth:20}}>{seg.id}</div>;
                          })}
                        </div>
                      </div>
                      <button className="btn btn-blue" style={{width:"100%",padding:"10px",fontSize:12,marginTop:12,fontWeight:"bold"}} onClick={()=>{
                        const algos = ["FCFS","SJF","SRTF","RR","Priority"];
                        const results = {};
                        algos.forEach(a=>{
                          if(a==="FCFS") results[a] = computeFCFS(cpuProcesses);
                          else if(a==="SJF") results[a] = computeSJF_NP(cpuProcesses);
                          else if(a==="SRTF") results[a] = computeSRTF(cpuProcesses);
                          else if(a==="RR") results[a] = computeRR(cpuProcesses,2);
                          else results[a] = computePriority(cpuProcesses);
                        });
                        setCpuCompareResults(results);
                        if(cpuNpcStep<=4) setCpuNpcStep(5);
                      }}>📊 COMPARE ALL ALGORITHMS</button>
                    </div>
                  )}

                  {cpuCompareResults && (
                    <div style={{padding:"12px"}}>
                      <button className="btn" style={{width:"100%",padding:"8px",fontSize:11,marginBottom:10,color:"#999",fontWeight:"bold"}} onClick={()=>setCpuCompareResults(null)}>← Back to Results</button>
                      <table style={{width:"100%",fontSize:11,color:"#aaa",borderCollapse:"collapse"}}>
                        <thead><tr style={{background:"rgba(92,191,255,0.08)",borderBottom:"2px solid #555"}}>
                          <th style={{padding:8,textAlign:"left",color:"#d850ff",fontSize:12,fontWeight:"bold"}}>Algorithm</th>
                          <th style={{padding:8,textAlign:"right",color:"#ffaa88",fontSize:12,fontWeight:"bold"}}>Avg Wait</th>
                          <th style={{padding:8,textAlign:"right",color:"#88aaff",fontSize:12,fontWeight:"bold"}}>Avg TAT</th>
                          <th style={{padding:8,textAlign:"right",color:"#f5c518",fontSize:12,fontWeight:"bold"}}>Score</th>
                        </tr></thead>
                        <tbody>
                          {Object.entries(cpuCompareResults).map(([algo,r])=>{
                            const score = (100/(r.avgWait+1))*(100/(r.avgTurnaround+1));
                            return (
                              <tr key={algo} style={{borderBottom:"1px solid #333"}}>
                                <td style={{padding:8,color:"#d850ff",fontWeight:"bold",fontSize:11}}>{algo}</td>
                                <td style={{padding:8,textAlign:"right",fontSize:11}}>{r.avgWait?.toFixed(1) ?? "N/A"}</td>
                                <td style={{padding:8,textAlign:"right",fontSize:11}}>{r.avgTurnaround?.toFixed(1) ?? "N/A"}</td>
                                <td style={{padding:8,textAlign:"right",color:"#f5c518",fontWeight:"bold",fontSize:11}}>{score.toFixed(0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MEMORY: RIGHT RESULTS */}
            {currentLessonPortal==="memory-management" && (
              <div style={{background:"rgba(0,0,0,0.2)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                {(() => {
                  const alloc = memAllocResult;
                  return (
                    <>
                      {/* Metrics Row */}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:"12px",borderBottom:"1px solid #333",flex:"0 0 auto"}}>
                        <div style={{background:"rgba(88,255,137,0.05)",padding:10,borderRadius:4,border:"1px solid #58ff8944",textAlign:"center"}}>
                          <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>USED</div>
                          <div style={{color:"#58ff89",fontWeight:"bold",fontSize:14}}>{(memTotalRam-alloc.externalFragmentation).toFixed(0)}MB</div>
                        </div>
                        <div style={{background:"rgba(88,255,137,0.05)",padding:10,borderRadius:4,border:"1px solid #58ff8944",textAlign:"center"}}>
                          <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>FREE</div>
                          <div style={{color:"#58ff89",fontWeight:"bold",fontSize:14}}>{alloc.externalFragmentation.toFixed(0)}MB</div>
                        </div>
                        <div style={{background:"rgba(88,255,137,0.05)",padding:10,borderRadius:4,border:"1px solid #58ff8944",textAlign:"center"}}>
                          <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>WASTE</div>
                          <div style={{color:"#58ff89",fontWeight:"bold",fontSize:14}}>{alloc.internalWaste.toFixed(0)}MB</div>
                        </div>
                        <div style={{background:"rgba(88,255,137,0.05)",padding:10,borderRadius:4,border:"1px solid #58ff8944",textAlign:"center"}}>
                          <div style={{color:"#888",fontSize:11,marginBottom:6,fontWeight:"bold"}}>UTIL</div>
                          <div style={{color:"#58ff89",fontWeight:"bold",fontSize:14}}>{alloc.utilization.toFixed(0)}%</div>
                        </div>
                      </div>

                      {/* Memory Map + Info */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,overflow:"hidden",flex:1,padding:"12px"}}>
                        {/* Memory Map */}
                        <div style={{overflowY:"auto",paddingRight:6}}>
                          <div style={{fontSize:12,color:"#58ff89",fontWeight:"bold",marginBottom:8}}>MEMORY MAP</div>
                          {alloc.frames.map((f,i)=>(
                            <div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
                              <div style={{color:"#666",minWidth:40,fontSize:11}}>Frame {i}</div>
                              <div style={{flex:1,height:28,background:f.job?f.job.color:"#222",border:`1px solid ${f.job?"#666":"#333"}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:"bold"}}>{f.job?.name || "—"}</div>
                            </div>
                          ))}
                        </div>

                        {/* Strategy Info */}
                        <div style={{background:"rgba(88,255,137,0.05)",border:"1px solid #58ff8944",borderRadius:4,padding:10,paddingRight:6,overflowY:"auto"}}>
                          <div style={{color:"#58ff89",fontWeight:"bold",marginBottom:8,fontSize:12}}>STRATEGY:<br/>{memStrategy.toUpperCase()}</div>
                          <div style={{color:"#7eb3d4",fontSize:11,lineHeight:1.8,marginBottom:10}}>
                            {memStrategy==="first-fit" && "📍 Allocates to first free space that fits job."}
                            {memStrategy==="best-fit" && "🎯 Finds smallest free space that fits job."}
                            {memStrategy==="worst-fit" && "📦 Allocates to largest available free space."}
                          </div>
                          <div style={{marginTop:8,padding:8,background:"rgba(88,255,137,0.1)",borderRadius:3,fontSize:11,color:"#7eb3d4",lineHeight:1.8}}>
                            <div><strong>Jobs:</strong> {memJobs.length}</div>
                            <div><strong>Frames:</strong> {alloc.frames.length}</div>
                            <div><strong>Fragmentation:</strong> {alloc.externalFragmentation.toFixed(0)}MB</div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}