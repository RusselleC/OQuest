import { useState, useEffect, useRef, useCallback } from "react";
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
import SimulatorOverlay from "./SimulatorOverlay.jsx";

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
      setTimeout(()=>notify(`ðŸ“œ New Quest: "${qDef.title}"!`,"#c84bfa"),400);
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
    setBattleLog([`âš”ï¸  A wild ${enemy.name} appeared!`,`ðŸ’¬  "${enemy.desc}"`]);
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
    setBattleLog([`ðŸ’€  THE KERNEL PANIC awakens!`,`âš ï¸  A fatal error corrupts all memory!`]);
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
      logMsg=`ðŸ—¡ï¸  Basic attack â€” ${dmg} damage!`;
    } else if(type==="ability"&&ability){
      if(s.mp<ability.mpCost){ notify("Not enough MP!","#ff4444"); return; }
      s.mp=Math.max(0,s.mp-ability.mpCost);
      syncStats();
      dmg=rand(ability.dmg[0],ability.dmg[1])+(s.level-1)*2;
      logMsg=`âœ¨  ${ability.name} â€” ${dmg} damage!`;
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
            addLog(`ðŸ”¥  ${ph.msg}`);
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
      addLog(`ðŸ§ª  Used ${item.name} â€” +${heal} HP!`);
      addFloat(`+${heal}HP`,"#40e040");
    } else if(item.id==="ether"){
      const restore=Math.min(20,s.maxMp-s.mp);
      s.mp+=restore;
      addLog(`ðŸ’Ž  MP Crystal â€” +${restore} MP!`);
      addFloat(`+${restore}MP`,"#4080ff");
    } else if(item.id==="memcrystal"){
      s.maxMp+=10; s.mp=Math.min(s.maxMp,s.mp+10);
      addLog(`ðŸ’   Memory Crystal equipped â€” MaxMP +10!`);
      addFloat(`+10 MaxMP`,"#4080ff");
    } else if(item.id==="pagebook"){
      s.def+=5;
      addLog(`ðŸ“–  Page Table Tome â€” DEF +5!`);
      addFloat(`+5 DEF`,"#80ffaa");
    }
    setInventory(inv=>inv.map(i=>i.id===item.id?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0));
    syncStats();
    setBattlePhase("player");
  };

  const doFlee=()=>{
    if(Math.random()<0.55){
      addLog("ðŸ’¨  You escaped!"); setBattlePhase("wait");
      setTimeout(()=>{ keys.current={}; setScreen("game"); },900);
    } else {
      addLog("âŒ  Couldn't flee!"); setBattlePhase("wait");
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
    let msg=`ðŸ’€  ${battle.name}`;
    if(battle.id==="boss"){
      const ab=BOSS.abilities[Math.floor(Math.random()*BOSS.abilities.length)];
      msg+=` uses ${ab} â€” ${dmg} damage!`;
    } else {
      msg+=` attacks â€” ${dmg} damage!`;
    }
    playSound("hit", 0.12, 180, 80);
    addLog(msg);
    addFloat(`-${dmg}`,"#ff4444");
    setBattleAnim("player-hit");
    triggerShake(7,350);
    setTimeout(()=>setBattleAnim(null),420);
    if(s.hp<=0){
      addLog("ðŸ’€  You were defeated...");
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
      lvlMsg=` â­ LEVEL UP! Lv.${s.level}!`;
      notify(`LEVEL UP! Now Lv.${s.level}`,"#f5c518");
    } else {
      s.hp=Math.min(s.maxHp,s.hp+18); s.mp=Math.min(s.maxMp,s.mp+12);
    }
    syncStats();
    addLog(`ðŸŽ‰  Victory! +${xpGain} XP, +${goldGain} ðŸª™${lvlMsg}`);
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
      addLog("ðŸ’«  THE KERNEL PANIC has been vanquished!");
      setTimeout(async()=>{ 
        console.log("ðŸ† Boss defeated! Saving Hall of Fame record...");
        console.log("Player info - Name:", playerName, "Class:", classChoice, "Score:", S.current.score);
          const completionTime = gameStartTime.current ? Date.now() - gameStartTime.current : 0;
        const runKey = gameStartTime.current ? Math.floor(gameStartTime.current/1000) : Math.floor(Date.now()/1000);
        const owner = (user && user.uid) ? user.uid : (playerName?playerName.replace(/\s+/g,'_'):'guest');
        const recordId = `${owner}_${runKey}`;
        await saveLB({ time: completionTime, id: recordId }); 
        console.log("âœ… Record saved attempt completed!");
        keys.current={}; 
        setBossDefeated(true);
        setScreen("game");
        addLog("ðŸŒ€ Portal shimmers appear... Complete the lessons to master the OS realm!");
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
      notify(`âœ… Quest Complete: "${q.title}"! +${q.reward.xp} XP`,"#4bfa7f",4000);
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
          setTimeout(()=>notify("âš ï¸ THE KERNEL PANIC has been summoned! Find the Castle!","#ff2244",5000),1500);
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
          setChatMessages([{role:"ai",text:"Greetings, brave adventurer! I am Oracle, the AI guide. You've proven yourself worthy. Shall we explore the mysteries of the OS realm together? ðŸ”®"}]);
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
            addLog(`ðŸ“š  Knowledge Strike â€” ${bonusDmg} bonus damage!`);
            if(nh<=0) setTimeout(()=>handleVictory(battle),600);
            else setTimeout(enemyTurn,800);
            return nh;
          });
          setBattlePhase("wait");
        } else {
          const pen=rand(8,16); s.hp=Math.max(1,s.hp-pen); syncStats();
          addLog(`ðŸ“š  Wrong â€” ${pen} confusion damage!`);
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  CSS
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  LOADING SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(authLoading) return (
    <div style={{minHeight:"100vh",background:"#0a0806",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <style>{G}</style>
      <div className="cinzel" style={{fontSize:20,color:"#f5c518",marginBottom:20}}>â³ Loading...</div>
      <div style={{width:40,height:40,border:"2px solid #f5c518",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  LOGIN SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(!user) return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 60%,#6c5540 0%,#4e382e 50%,#32281d 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden",position:"relative"}}>
      <style>{G}</style>
      {/* Background orbs */}
      {[["#f5c518","15%","20%"],["#c84bfa","85%","30%"],["#4bcffa","10%","75%"]].map(([c,l,t],i)=>(
        <div key={i} style={{position:"fixed",left:l,top:t,width:60,height:60,borderRadius:"50%",background:`radial-gradient(${c}33,transparent 70%)`,pointerEvents:"none"}}/>
      ))}
      
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",maxWidth:400,width:"100%"}}>
        <div style={{fontSize:60,marginBottom:12,filter:"drop-shadow(0 0 20px #f5c51888)"}}>ðŸ”</div>
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="rin"
                />
              </div>
              <button onClick={handleLogin} style={{width:"100%",padding:"12px 16px",background:"linear-gradient(135deg,#f5c518,#d4a410)",border:"none",borderRadius:6,color:"#0a0806",fontFamily:"Cinzel",fontSize:12,fontWeight:"bold",letterSpacing:2,cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
                ðŸ”“ LOGIN
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="rin"
                />
              </div>
              <button onClick={handleSignUp} style={{width:"100%",padding:"12px 16px",background:"linear-gradient(135deg,#4bfa7f,#2fd060)",border:"none",borderRadius:6,color:"#0a0806",fontFamily:"Cinzel",fontSize:12,fontWeight:"bold",letterSpacing:2,cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
                âœ¨ CREATE ACCOUNT
              </button>
              <button onClick={() => setIsSignUp(false)} style={{width:"100%",padding:"10px 16px",background:"transparent",border:"1px solid rgba(75,250,127,0.5)",borderRadius:6,color:"#4bfa7f",fontFamily:"Cinzel",fontSize:11,letterSpacing:1,cursor:"pointer",transition:"all 0.2s"}}>
                Back to Login
              </button>
            </>
          )}
        </div>
        <div className="crimson" style={{fontSize:12,color:"#e8d5a0",marginTop:20,textAlign:"center",lineHeight:1.6}}>
          ðŸ”’ Secure login powered by Firebase<br/>
          âš”ï¸ Your progress saves to the cloud
        </div>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  TITLE SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

      <div style={{fontSize:72,marginBottom:6,animation:"float 3.5s ease-in-out infinite",filter:"drop-shadow(0 0 24px #f5c51888)",position:"relative",zIndex:1}}>âš”ï¸</div>
      <div className="cinzel-deco" style={{fontSize:"clamp(22px,5.5vw,46px)",fontWeight:700,color:"#f5c518",letterSpacing:6,marginBottom:3,animation:"glow 3s ease-in-out infinite",textAlign:"center",position:"relative",zIndex:1}}>OQUEST</div>
      <div className="cinzel" style={{fontSize:"clamp(8px,1.8vw,13px)",color:"#e8d5a0",letterSpacing:10,marginBottom:6,textAlign:"center",position:"relative",zIndex:1}}>THE KERNEL CHRONICLES</div>
      <div style={{width:220,height:1,background:"linear-gradient(90deg,transparent,#f5c518,transparent)",marginBottom:22,position:"relative",zIndex:1}}/>
      <div className="crimson" style={{fontSize:17,color:"#c8a870",textAlign:"center",maxWidth:500,lineHeight:2,marginBottom:8,fontStyle:"italic",position:"relative",zIndex:1}}>
        "The OS realm fractures. Processes jam the Process Table. Deadlock Demons seize the mutex forests. A Kernel Panic stirs in the southern castle. You â€” a system warrior â€” must restore order."
      </div>
      <div style={{width:220,height:1,background:"linear-gradient(90deg,transparent,#f5c518,transparent)",marginBottom:24,position:"relative",zIndex:1}}/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginBottom:12,position:"relative",zIndex:1}}>
        <button className="btn btn-gold" onClick={()=>setScreen("charselect")}>âš” Begin Journey</button>
        <button className="btn btn-purple" onClick={()=>setScreen("guide")}>ðŸ“– Guide</button>
        <button className="btn btn-blue" onClick={()=>setScreen("leaderboard")}>â­ Hall of Fame</button>
        <button className="btn btn-red" onClick={handleLogout} style={{fontSize:10}}>ðŸšª Logout</button>
      </div>
      <div className="crimson" style={{fontSize:13,color:"#e8d5a0",letterSpacing:2,position:"relative",zIndex:1}}>WASD Â· E Interact Â· I Inventory Â· Q Quests</div>
      {user && <div className="cinzel" style={{fontSize:10,color:"#8a6830",position:"absolute",top:12,right:12,zIndex:5}}>ðŸ‘¤ {user.email}</div>}
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  GUIDE SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="guide") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#6c5540,#32281d 70%)",padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",scrollBehavior:"smooth"}}>
      <style>{G}
        {`::-webkit-scrollbar { width: 12px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); border-radius: 10px; } ::-webkit-scrollbar-thumb { background: #f5c518; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #ffd700; } .guide-content-scroll::-webkit-scrollbar { width: 12px; } .guide-content-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 10px; } .guide-content-scroll::-webkit-scrollbar-thumb { background: #f5c518; border-radius: 10px; } .guide-content-scroll::-webkit-scrollbar-thumb:hover { background: #ffd700; }`}
      </style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:950,marginBottom:8}}>
        <div className="cinzel-deco" style={{fontSize:20,fontWeight:700,color:"#f5c518",marginTop:12,marginBottom:4,letterSpacing:3}}>ðŸ“– ADVENTURER'S GUIDE</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020",fontSize:9,padding:"4px 10px",marginTop:12}} onClick={()=>setScreen("title")}>â† Back</button>
          <button className="btn btn-red" onClick={handleLogout} style={{fontSize:9,padding:"4px 10px",marginTop:12}}>ðŸšª Logout</button>
        </div>
      </div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:22,fontStyle:"italic"}}>Master the OS realm â€” knowledge is your greatest weapon</div>
      <div className="guide-content-scroll" style={{maxWidth:950,width:"100%",maxHeight:650,overflowY:"auto",paddingRight:8,marginBottom:24}}>
      <div className="guide-glossary" style={{maxWidth:950,width:"100%",marginBottom:20}}>
        <div className="cinzel" style={{fontSize:17,color:"#4bfa7f",marginBottom:12,letterSpacing:2}}>ðŸ“š OS GLOSSARY & DEFINITIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12,marginBottom:24}}>
          {OS_GLOSSARY.map((item,i)=>(
            <div key={i} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(75,250,127,0.35)",borderRadius:6,padding:12}}>
              <div style={{fontSize:24,marginBottom:4}}>{item.icon}</div>
              <div className="cinzel" style={{fontSize:15,color:"#4bfa7f",marginBottom:6,fontWeight:600,letterSpacing:1}}>{item.term}</div>
              <div className="crimson" style={{fontSize:15,color:"#a8a8a8",lineHeight:1.5,marginBottom:8}}>{item.definition}</div>
              {item.related && item.related.length > 0 && (
                <div style={{fontSize:13,color:"#6a8a6a",borderTop:"1px solid rgba(75,250,127,0.15)",paddingTop:6}}>ðŸ”— <span style={{color:"#8a9a8a"}}>Related: {item.related.join(", ")}</span></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="guide-sections" style={{maxWidth:950,width:"100%",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12,marginBottom:24}}>
        {[
          {title:"ðŸ•¹ Movement & Controls",col:"#f5c518",items:["WASD / Arrow Keys â€” move your hero","Walk into enemies to start battle","E key â€” interact with adjacent NPCs","I key â€” inventory panel","Q key â€” quest log"]},
          {title:"âš” Combat System",col:"#ff8888",items:["Attack â€” basic physical strike","Abilities â€” class OS skills (cost MP)","Quiz Strike â€” answer for bonus damage","Items â€” potions/crystals during battle","Flee â€” 55% chance to escape"]},
          {title:"ðŸ“œ OS Quests",col:"#c84bfa",items:["Talk to NPCs to unlock quests","6 unique quests across OS topics","Guard Malloc: defeat Processes","Elder Process: pass Scheduling quizzes","Heap Merchant: hunt Memory Leaks","Librarian Mutex: break Deadlock Demons","Page Daemon: answer VM questions","KERNEL: defeat the Kernel Panic boss"]},
          {title:"ðŸ’¡ OS Concepts in Game",col:"#4bfa7f",items:["Each enemy IS a real OS concept","Process = running program instance","Memory Leak = unfreed malloc","Deadlock Demon = circular mutex wait","Ghost Thread = unjoined detached thread","Page Fault = unmapped virtual address","Race Condition = unsynchronized state","Kernel Panic = fatal unrecoverable error"]},
          {title:"ðŸ§  Knowledge Quizzes",col:"#4bcffa",items:["15 OS questions in the quiz pool","Topics: scheduling, memory, IPC, sync","Correct = XP + quest progress","Wrong = confusion damage (battle)","Available via Quiz Strike in battle","Also accessible from world menu"]},
          {title:"â­ Progression",col:"#f0c030",items:["XP from battles, quizzes, quests","Level up raises all stats + heals fully","Gold from battles and treasure chests","Defeat boss after completing quests","Hall of Fame records top scores"]},
        ].map(sec=>(
          <div key={sec.title} className="panel" style={{padding:16,borderRadius:8,borderColor:`${sec.col}22`}}>
            <div className="cinzel" style={{fontSize:11,color:sec.col,marginBottom:10,letterSpacing:1}}>{sec.title}</div>
            {sec.items.map((it,i)=>(
              <div key={i} className="crimson" style={{fontSize:14,color:"#c8a870",lineHeight:1.75,marginBottom:1}}>â€¢ {it}</div>
            ))}
          </div>
        ))}
      </div>
      </div>
      <div style={{display:"flex",gap:12}}>
        <button className="btn btn-gold" onClick={()=>setScreen("charselect")}>âš” Start Playing</button>
        <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020"}} onClick={()=>setScreen("title")}>â† Back</button>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CHAR SELECT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="charselect") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#6c5540,#32281d 70%)",padding:"22px 18px",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto"}}>
      <style>{G}</style>
      <div className="cinzel-deco" style={{fontSize:22,fontWeight:700,color:"#f5c518",marginTop:12,marginBottom:3,letterSpacing:3}}>Choose Your Class</div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:22,fontStyle:"italic"}}>Each class wields different OS powers â€” choose your mastery</div>
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
              <div key={i} className="crimson" style={{fontSize:13,color:"#7a6040",marginTop:2}}>â€¢ {ab.name} <span style={{color:"#4a3020"}}>({ab.mpCost>0?`${ab.mpCost}mp`:"free"})</span></div>
            ))}
          </div>
        ))}
      </div>
      <div style={{maxWidth:380,width:"100%",marginBottom:18}}>
        <div className="cinzel" style={{fontSize:9,color:"#8a6830",letterSpacing:2,marginBottom:6}}>HERO NAME</div>
        <input className="rin" placeholder="Enter your name..." value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startGame()}/>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn btn-gold" onClick={startGame} disabled={!classChoice||!nameInput.trim()} style={{opacity:!classChoice||!nameInput.trim()?0.35:1}}>Enter the Realm âš”</button>
        {hasSave&&classChoice&&<button className="btn btn-green" onClick={loadGameProgress} style={{fontSize:11}}>ðŸ“‚ Load Game</button>}
        <button className="btn btn-purple" onClick={()=>setScreen("guide")}>ðŸ“– Guide</button>
        <button className="btn" style={{color:"#8a6830",borderColor:"#5a4020"}} onClick={()=>setScreen("title")}>â† Back</button>
        <button className="btn btn-red" onClick={handleLogout} style={{fontSize:10}}>ðŸšª Logout</button>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  LEADERBOARD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="leaderboard") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 30%,#1a1208,#0a0806 70%)",padding:28,display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto"}}>
      <style>{G+`@keyframes livePulse{0%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:700,marginBottom:8}}>
        <div className="cinzel-deco" style={{fontSize:20,fontWeight:700,color:"#f5c518",marginTop:16,letterSpacing:3,animation:"glow 3s ease-in-out infinite"}}>â­ Hall of Fame</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:16}}>
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"rgba(75,250,127,0.1)",border:"1px solid rgba(75,250,127,0.3)",borderRadius:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#4bfa7f",animation:"livePulse 2s ease-in-out infinite"}}/>
            <span className="cinzel" style={{fontSize:9,color:"#4bfa7f",letterSpacing:1}}>LIVE</span>
          </div>
          <button className="btn btn-green" onClick={refreshLeaderboard} style={{fontSize:8,padding:"4px 8px"}}>ðŸ”„</button>
          <button className="btn btn-red" onClick={handleLogout} style={{fontSize:9,padding:"4px 10px"}}>ðŸšª Logout</button>
        </div>
      </div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",marginBottom:12,fontStyle:"italic"}}>Fastest realm progressors are crowned champions</div>
      {lastUpdateTime&&(
        <div className="cinzel" style={{fontSize:9,color:"#8a6830",marginBottom:8}}>
          ðŸ• Last updated: {lastUpdateTime.toLocaleTimeString()}
        </div>
      )}
      <div className="panel" style={{padding:"12px 16px",marginBottom:20,borderRadius:6,textAlign:"center",borderColor:"rgba(75,250,127,0.2)"}}>
        <div className="cinzel" style={{fontSize:10,color:"#4bfa7f",letterSpacing:2}}>â±ï¸ RANKED BY COMPLETION TIME</div>
      </div>
      <style>{`.leaderboard-scroll { scrollbar-width: thin; } .leaderboard-scroll::-webkit-scrollbar{width:10px;} .leaderboard-scroll::-webkit-scrollbar-thumb{background:rgba(245,197,24,0.12);border-radius:6px;} .leaderboard-scroll::-webkit-scrollbar-track{background:transparent;}`}</style>
      <div className="leaderboard-scroll" style={{maxWidth:680,width:"100%",marginBottom:24,maxHeight:'56vh',overflowY:'auto',paddingRight:8}}>
        {leaderboard.length===0?(
          <div className="panel crimson" style={{padding:40,textAlign:"center",color:"#5a4020",fontSize:20,borderRadius:8,fontStyle:"italic"}}>No heroes yet. Be the first legend!</div>
        ):leaderboard.map((e,i)=>{
          const medals=["ðŸ¥‡","ðŸ¥ˆ","ðŸ¥‰"];
          const cd=CLASSES[e.cls]||CLASSES.Scheduler;
          return(
            <div key={i} className="panel" style={{display:"flex",alignItems:"center",gap:14,padding:"12px 18px",marginBottom:5,borderRadius:6,animation:`fadeUp 0.28s ease`,animationDelay:`${i*0.04}s`,
              borderColor:i===0?"rgba(245,197,24,0.3)":i===1?"rgba(180,180,190,0.2)":i===2?"rgba(180,120,60,0.2)":"rgba(200,165,80,0.12)"}}>
              <span style={{fontSize:20,minWidth:28}}>{medals[i]||`#${i+1}`}</span>
              <span style={{fontSize:18}}>{cd.icon}</span>
              <div style={{flex:1}}>
                <div className="cinzel" style={{fontSize:12,color:"#e8d5a0"}}>{e.name}</div>
                <div className="crimson" style={{fontSize:13,color:"#7a6040",fontStyle:"italic"}}>{e.cls} Â· Lv.{e.level} Â· {e.date}</div>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:"#4bfa7f"}}>â±ï¸</span>
                  <span className="cinzel" style={{fontSize:14,color:"#4bfa7f",fontWeight:600}}>{e.timeFormatted||formatTime(e.time||0)}</span>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <div><span className="cinzel" style={{fontSize:11,color:"#f5c518"}}>{e.score.toLocaleString()}</span><span className="crimson" style={{fontSize:10,color:"#5a4020"}}> pts</span></div>
                  <div><span className="cinzel" style={{fontSize:11,color:"#c84bfa"}}>{e.xp}</span><span className="crimson" style={{fontSize:10,color:"#5a4020"}}> XP</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:12}}>
        <button className="btn btn-gold" onClick={()=>setScreen("title")}>â† Return</button>
        <button className="btn btn-green" onClick={()=>setScreen("charselect")}>Play Now</button>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  GAME OVER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="gameover") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#200808,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{G}</style>
      <div style={{fontSize:72,marginBottom:12,animation:"float 2s ease-in-out infinite"}}>ðŸ’€</div>
      <div className="cinzel-deco" style={{fontSize:24,fontWeight:700,color:"#ff4444",marginBottom:8,letterSpacing:3,animation:"glow 2s ease-in-out infinite"}}>PROCESS TERMINATED</div>
      <div className="crimson" style={{fontSize:18,color:"#8a6830",marginBottom:30,fontStyle:"italic"}}>Your process was reclaimed by the kernel</div>
      <div className="panel" style={{padding:"22px 40px",textAlign:"center",marginBottom:28,borderRadius:10}}>
        <div className="cinzel" style={{fontSize:8,color:"#8a6830",letterSpacing:3,marginBottom:10}}>FINAL STATISTICS</div>
        <div className="cinzel" style={{fontSize:32,color:"#f5c518",marginBottom:4}}>{statsUI.score.toLocaleString()}</div>
        <div className="crimson" style={{fontSize:14,color:"#7a6040",marginBottom:12}}>SCORE</div>
        <div className="panel" style={{padding:"8px 12px",background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.2)",borderRadius:5,marginBottom:12}}>
          <div className="cinzel" style={{fontSize:9,color:"#ff8888"}}>â±ï¸ Time Until Defeat</div>
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
        <button className="btn btn-gold" onClick={()=>{setScreen("charselect");setNameInput("");setClassChoice(null);}}>âŸ³ New Game</button>
        <button className="btn btn-green" onClick={async()=>{await saveLB();setScreen("leaderboard");}}>ðŸ’¾ Record & Hall of Fame</button>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  VICTORY SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="victory") return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#0a2008,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden"}}>
      <style>{G}</style>
      {Array.from({length:50}).map((_,i)=>(
        <div key={i} style={{position:"fixed",left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,fontSize:rand(14,28),
          animation:`floatUp ${1.5+Math.random()*2}s ease infinite`,animationDelay:`${Math.random()*3}s`,pointerEvents:"none",opacity:0.8}}>
          {["â­","âœ¨","ðŸ†","ðŸ’«","ðŸŽ‰","ðŸ’Ž"][i%6]}
        </div>
      ))}
      <div style={{fontSize:76,marginBottom:12,animation:"victoryPulse 1.5s ease-in-out infinite"}}>ðŸ†</div>
      <div className="cinzel-deco" style={{fontSize:22,fontWeight:700,color:"#f5c518",marginBottom:8,letterSpacing:3,animation:"glow 2s ease-in-out infinite",textAlign:"center"}}>KERNEL PANIC DEFEATED!</div>
      <div className="crimson" style={{fontSize:19,color:"#c8a870",marginBottom:10,fontStyle:"italic",textAlign:"center"}}>Order has been restored to the OS realm.</div>
      <div className="crimson" style={{fontSize:16,color:"#8a6830",maxWidth:460,textAlign:"center",lineHeight:1.9,marginBottom:28,fontStyle:"italic"}}>
        "The processes are free. The memory breathes again. The scheduler resumes its eternal round-robin. You â€” Kernel Master â€” have proven your OS mastery."
      </div>
      <div className="panel" style={{padding:"20px 40px",textAlign:"center",marginBottom:28,borderRadius:10}}>
        <div className="cinzel" style={{fontSize:8,color:"#8a6830",letterSpacing:3,marginBottom:10}}>FINAL SCORE</div>
        <div className="cinzel" style={{fontSize:32,color:"#f5c518",marginBottom:8}}>{statsUI.score.toLocaleString()}</div>
        <div className="panel" style={{padding:"10px 16px",background:"rgba(75,250,127,0.08)",border:"1px solid rgba(75,250,127,0.2)",borderRadius:6,marginBottom:12}}>
          <div className="cinzel" style={{fontSize:10,color:"#4bfa7f"}}>â±ï¸ Completion Time</div>
          <div className="cinzel" style={{fontSize:18,color:"#4bfa7f",fontWeight:600}}>{(lastSavedRecord && lastSavedRecord.timeFormatted) || formatTime(gameStartTime.current ? Date.now() - gameStartTime.current : 0)}</div>
        </div>
        <div style={{display:"flex",gap:28,justifyContent:"center",marginTop:14}}>
          <div><div className="cinzel" style={{fontSize:18,color:clsColor}}>LV.{statsUI.level}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Level</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#4bfa7f"}}>{statsUI.xp}</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>XP</div></div>
          <div><div className="cinzel" style={{fontSize:18,color:"#c84bfa"}}>{completedQuests.length}/6</div><div className="crimson" style={{fontSize:13,color:"#5a4020"}}>Quests</div></div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn btn-gold" onClick={async()=>{console.log("ðŸ“Š Checking leaderboard...",{playerName,classChoice}); await refreshLeaderboard(); setScreen("leaderboard");}}>â­ Hall of Fame</button>
        <button className="btn btn-green" onClick={()=>{setScreen("charselect");setNameInput("");setClassChoice(null);}}>âŸ³ Play Again</button>
      </div>
    </div>
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  DIALOGUE SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
                {doneQ?"âœ… Quest Done":activeQ?"ðŸ”„ Quest Active":"ðŸ“œ Quest Available"}
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
                  <div className="cinzel" style={{fontSize:8,color:"#f5c518",letterSpacing:2,marginBottom:6}}>ðŸ“š OS CONCEPT</div>
                  <div className="crimson" style={{fontSize:14,color:"#a09060",lineHeight:1.7,fontStyle:"italic"}}>{qDef.lore}</div>
                  <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
                    <span className="tag" style={{background:"rgba(200,75,250,0.1)",color:"#c84bfa",border:"1px solid #c84bfa33"}}>{qDef.category}</span>
                    <span className="crimson" style={{fontSize:13,color:"#7a6040"}}>+{qDef.reward.xp} XP Â· +{qDef.reward.gold} ðŸª™</span>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div className="crimson" style={{fontSize:13,color:"#4a3828"}}>{dlgIdx+1}/{activeNPC.dialogue.length}</div>
                <div style={{display:"flex",gap:8}}>
                  {dlgIdx<activeNPC.dialogue.length-1?(
                    <button className="btn btn-gold" style={{padding:"7px 18px",fontSize:10}} onClick={advanceDlg}>Continue â–¶</button>
                  ):(
                    <button className="btn btn-gold" style={{padding:"7px 18px",fontSize:10}} onClick={closeDialogue}>Close âœ•</button>
                  )}
                </div>
              </div>
            </div>

            {/* Quest progress if active */}
            {activeQ&&!doneQ&&(
              <div className="panel" style={{padding:"12px 16px",borderRadius:8,marginTop:10,borderColor:"rgba(200,75,250,0.2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div className="cinzel" style={{fontSize:10,color:"#c84bfa"}}>ðŸ“œ {activeQ.title}</div>
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
          <button className="btn" style={{color:"#7a6040",borderColor:"#3a2010",padding:"5px 14px",fontSize:9}} onClick={closeDialogue}>â† Return to World</button>
          <button className="btn btn-purple" style={{padding:"5px 12px",fontSize:9}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");closeDialogue();setTimeout(()=>setScreen("quiz"),50);}}>ðŸ“š Quiz (+XP)</button>
          {bossSummoned&&!completedQuests.includes("q_kernel")&&(
            <button className="btn btn-red" style={{padding:"5px 12px",fontSize:9,animation:"pulseFast 1s infinite"}} onClick={()=>{closeDialogue();setTimeout(triggerBossFight,200);}}>ðŸ’€ Face the Boss!</button>
          )}
          <div style={{flex:1}}/>
          <div className="cinzel" style={{fontSize:8,color:"#5a4020"}}>Lv.{statsUI.level} Â· {statsUI.xp} XP Â· â­{statsUI.score.toLocaleString()}</div>
        </div>
      </div>
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  QUIZ SCREEN (Multiple types support)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="quiz"&&quiz) return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#100818,#0a0806 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{G}</style>
      {/* Floating runes */}
      {Array.from({length:6}).map((_,i)=>(
        <div key={i} style={{position:"fixed",left:`${10+i*16}%`,top:`${15+i%3*30}%`,fontSize:20,opacity:0.08,
          animation:`orbFloat ${3+i*0.5}s ease-in-out infinite`,animationDelay:`${i*0.6}s`,pointerEvents:"none",color:"#c84bfa"}}>
          {["âš™","ðŸ“€","ðŸ§®","ðŸ’»","ðŸ”§","âš¡"][i]}
        </div>
      ))}
      <div style={{maxWidth:660,width:"100%"}}>
        <div className="cinzel" style={{fontSize:10,color:"#c84bfa",letterSpacing:4,textAlign:"center",marginBottom:6}}>
          ðŸ“š OS KNOWLEDGE QUIZ {quiz.type==="multiple"?"(Multiple Choice)":quiz.type==="riddle"?"(Riddle)":"(Fill-in-the-Blank)"}
        </div>
        <div className="cinzel-deco" style={{fontSize:18,fontWeight:700,color:"#f5c518",textAlign:"center",marginBottom:3}}>Prove Your Mastery</div>
        <div className="crimson" style={{fontSize:15,color:"#8a6830",textAlign:"center",marginBottom:24,fontStyle:"italic"}}>
          +{quiz.xp} XP for correct{quizCtx==="battle"?" Â· correct answer deals bonus damage":""}
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
                {quizPick===quiz.ans||quizPick==="correct"?"âœ… Correct! â€” ":"âŒ Wrong â€” "}{quiz.explain}
              </div>
              {(quizPick!==quiz.ans&&quizPick!=="correct"&&(quiz.type==="fillblank"||quiz.type==="riddle"))&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,68,68,0.3)",fontSize:14,color:"#ffaa88",lineHeight:1.6}}>
                  <span style={{color:"#ffaa88",fontSize:13}}>ðŸ“ Correct Answer: </span>
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  BATTLE SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if(screen==="battle"&&battle){
    const isBoss=battle.id==="boss";
    const enemyRole=isBoss?"boss":battle.id==="process"?"enemy_process":(battle.id==="deadlock"||battle.id==="deadlock2")?"enemy_demon":"enemy_ghost";
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
          <div className="cinzel" style={{fontSize:10,color:isBoss?"#ff2244":"#ff6060",letterSpacing:3,animation:isBoss?"glow 1.5s ease-in-out infinite":"none"}}>{isBoss?"ðŸ’€ BOSS BATTLE":"âš” BATTLE"}</div>
          {isBoss&&<div className="cinzel" style={{fontSize:8,color:"#ff8888"}}>PHASE {bossPhase+1}/4</div>}
          <div style={{flex:1}}/>
          <div className="cinzel" style={{fontSize:8,color:clsColor}}>{cls.icon} Lv.{statsUI.level}</div>
          <div className="cinzel" style={{fontSize:8,color:"#f5c518"}}>â­{statsUI.score.toLocaleString()}</div>
          <div className="cinzel" style={{fontSize:8,color:"#f5c518"}}>ðŸª™{statsUI.gold}</div>
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
              <div className="cinzel" style={{fontSize:8,color:"#ff4444",letterSpacing:1,animation:"pulseFast 1s infinite"}}>âš  ENRAGED â€” ATK +{bossPhase*8}</div>
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
                  color:l.startsWith("âš”")||l.startsWith("âœ¨")||l.startsWith("ðŸ—¡")?clsColor:
                    l.startsWith("ðŸ’€")&&!l.includes("THE")?"#ff8888":
                    l.startsWith("ðŸŽ‰")?"#4bfa7f":
                    l.startsWith("ðŸ“š")?"#c84bfa":
                    l.startsWith("ðŸ”¥")||l.startsWith("âš ")||l.includes("KERNEL PANIC")?"#ff4444":"#c0a060"}}>{l}</div>
              ))}
              {battlePhase==="wait"&&<div className="crimson" style={{fontSize:14,color:"#5a4020",fontStyle:"italic",animation:"pulse 0.8s infinite"}}>...</div>}
            </div>

            {/* Action buttons */}
            <div style={{padding:"10px 14px",overflowY:"auto"}}>
              {battlePhase==="player"?(
                <>
                  <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:7}}>ACTIONS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                    <button className="abt" onClick={()=>doAttack("basic")} style={{borderColor:"rgba(200,165,80,0.25)"}}>âš” Attack</button>
                    <button className="abt" onClick={doQuizInBattle} style={{borderColor:"rgba(200,75,250,0.3)",color:"#c84bfa"}}>ðŸ“š Quiz Strike</button>
                    {!isBoss&&<button className="abt" onClick={doFlee} style={{color:"#7a6040",borderColor:"rgba(120,90,30,0.2)"}}>ðŸ’¨ Flee</button>}
                  </div>
                  <div className="cinzel" style={{fontSize:8,color:"#6a5030",letterSpacing:3,marginBottom:5}}>ABILITIES Â· MP {statsUI.mp}/{statsUI.maxMp}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                    {cls.abilities.map(ab=>(
                      <button key={ab.name} className="abt" onClick={()=>doAttack("ability",ab)} disabled={statsUI.mp<ab.mpCost}>
                        <div style={{color:clsColor,fontSize:9,marginBottom:1,fontWeight:600}}>{ab.name}</div>
                        <div style={{fontSize:8,color:"#5a4020"}}>{ab.mpCost}mp Â· {ab.dmg[0]}â€“{ab.dmg[1]}</div>
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
                            <span className="crimson" style={{fontSize:12,color:"#c8a870"}}>{item.name} Ã—{item.qty}</span>
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  MAIN WORLD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const viewW = Math.min(VIEW_W, Math.floor(window.innerWidth/TILE)+1);
  const viewH = Math.min(VIEW_H, Math.floor((window.innerHeight-90)/TILE)+1);

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
        <div className="cinzel" style={{fontSize:10,color:"#f5c518",letterSpacing:3,fontWeight:700}}>â—† OQUEST â—†</div>
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
        <div className="cinzel" style={{fontSize:9,color:"#f5c518",fontWeight:600}}>â­ {statsUI.score.toLocaleString()}</div>
        <div className="cinzel" style={{fontSize:9,color:"#f5c518",fontWeight:600}}>ðŸª™ {statsUI.gold}</div>
        <div className="cinzel" style={{fontSize:9,color:"#c84bfa",fontWeight:600}}>ðŸ“œ {completedQuests.length}/{QUEST_DEFS.length}</div>
        <div style={{width:2,height:16,background:"linear-gradient(180deg,rgba(200,165,80,0.2),rgba(200,165,80,0.05))",borderRadius:1}}/>
        <div style={{display:"flex",gap:5}}>
          <button className="btn" style={{color:"#8a6830",borderColor:"#2a1804",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}} onClick={()=>setShowInv(v=>!v)}>ðŸŽ’ Inventory</button>
          <button className="btn btn-purple" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(200,75,250,0.3)"}} onClick={()=>setShowQuests(v=>!v)}>ðŸ“œ Quests</button>
          <button className="btn btn-blue" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(0,100,200,0.3)"}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");setScreen("quiz");}}>ðŸ“š Quiz</button>
          {showChathead===false&&questsCompletedCount>=3&&<button className="btn" style={{color:"#c84bfa",borderColor:"rgba(200,75,250,0.4)",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(200,75,250,0.2)"}} onClick={()=>{setShowChathead(true);setChatheadMinimized(false);}}>ðŸ”® Chat</button>}
          <button className="btn" style={{color:"#4bfa7f",borderColor:"rgba(75,250,127,0.4)",padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(75,250,127,0.2)"}} onClick={saveGameProgress}>ðŸ’¾ Save</button>
          <button className="btn btn-gold" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(245,197,24,0.3)"}} onClick={async()=>{await saveLB();setScreen("leaderboard");}}>â­ Fame</button>
          <button className="btn btn-red" style={{padding:"10px 16px",fontSize:10,fontWeight:600,transition:"all 0.2s",
            boxShadow:"0 2px 4px rgba(255,50,50,0.3)"}} onClick={async()=>{await saveLB();setScreen("gameover");}}>âœ• Exit</button>
        </div>
      </div>

      {/* World viewport */}
      <div style={{flex:1,position:"relative",overflow:"hidden",width:"100%",maxWidth:1216,pointerEvents:showSimulator?"none":"auto"}}>
        {/* Ground layer */}
        <div style={{position:"absolute",left:0,top:0,width:VIEW_W*TILE,height:VIEW_H*TILE}}>
          {Array.from({length:VIEW_H},(_,row)=>Array.from({length:VIEW_W},(_,col)=>{
            const mx=Math.round(col+camX),my=Math.round(row+camY);
            if(mx>=MAP_W||my>=MAP_H) return null;
            const t=worldMap[my][mx];
            const gt=[T.GRASS,T.DARK_GRASS,T.PATH,T.WATER,T.SAND,T.FLOWER].includes(t)?t:T.GRASS;
            return <TileCell key={`g-${row}-${col}`} type={gt} x={col} y={row} tick={animFrame}/>;
          }))}
        </div>
        {/* Object layer */}
        <div style={{position:"absolute",left:0,top:0,width:VIEW_W*TILE,height:VIEW_H*TILE}}>
          {Array.from({length:VIEW_H},(_,row)=>Array.from({length:VIEW_W},(_,col)=>{
            const mx=Math.round(col+camX),my=Math.round(row+camY);
            if(mx>=MAP_W||my>=MAP_H) return null;
            const t=worldMap[my][mx];
            if(![T.TREE,T.ROCK,T.HOUSE,T.CASTLE,T.CHEST].includes(t)) return null;
            return <WorldObject key={`o-${row}-${col}`} type={t} x={col} y={row} tick={animFrame}/>;
          }))}
        </div>

        {/* NPCs */}
        {NPCS.map(npc=>{
          const sx=Math.round(npc.x-camX),sy=Math.round(npc.y-camY);
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
                  filter:"drop-shadow(0 0 6px #f5c518)"}}>â—</div>
              )}
              {hasDoneQ&&(
                <div style={{position:"absolute",top:-36,left:"50%",transform:"translateX(-50%)",
                  fontSize:14,pointerEvents:"none"}}>âœ…</div>
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
          const sx=Math.round(e.x-camX),sy=Math.round(e.y-camY);
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const role=e.id==="process"?"enemy_process":(e.id==="deadlock"||e.id==="deadlock2")?"enemy_demon":"enemy_ghost";
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
          const sx=Math.round(24-camX),sy=Math.round(17-camY);
          if(sx<0||sx>VIEW_W||sy<0||sy>VIEW_H) return null;
          return (
            <div key="boss-marker" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:15,cursor:"pointer",
              animation:"pulseFast 0.7s infinite"}} onClick={triggerBossFight}>
              <div style={{position:"absolute",inset:4,background:"rgba(255,0,50,0.12)",border:"2px solid #ff2244",borderRadius:6,
                display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(255,0,50,0.4)"}}>
                <span style={{fontSize:26,filter:"drop-shadow(0 0 8px #ff2244)"}}>ðŸ’€</span>
              </div>
              <div style={{position:"absolute",top:-24,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",
                background:"rgba(0,0,0,0.9)",padding:"2px 7px",borderRadius:3,border:"1px solid rgba(255,0,50,0.4)"}}>
                <div className="cinzel" style={{fontSize:7,color:"#ff2244",animation:"glow 1.5s infinite"}}>BOSS â€” CLICK TO FIGHT</div>
              </div>
            </div>
          );
        })()}



        {/* Player */}
        <div style={{position:"absolute",left:Math.round(playerPos.x-camX)*TILE,top:Math.round(playerPos.y-camY)*TILE,width:TILE,height:TILE,
          zIndex:Math.round(playerPos.y-camY)+3}}>
          <CharSprite role="player" moving={playerMoving} color={clsColor} size={TILE} tick={animFrame} facing={playerDir===2?2:0}/>
          <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",pointerEvents:"none"}}>
            <div className="cinzel" style={{fontSize:7,color:clsColor,background:"rgba(0,0,0,0.85)",padding:"1px 6px",borderRadius:10,
              boxShadow:`0 0 8px ${clsColor}44`}}>{playerName.slice(0,12)}</div>
          </div>
        </div>



        {/* Memory Management Portal */}
        {memoryManagementPortal&&!memoryManagementCompleted&&(()=>{
          const sx=Math.round(memoryManagementPortal.x-camX),sy=Math.round(memoryManagementPortal.y-camY);
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const near=Math.abs(playerPos.x-memoryManagementPortal.x)<=1&&Math.abs(playerPos.y-memoryManagementPortal.y)<=1;
          return (
            <div key="portal-memory" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer",
              animation:"portalPulse 2s infinite",pointerEvents:"auto"}} onClick={(e)=>{
                  if(portalLock.current) return;
                  e.stopPropagation();
                  e.preventDefault();
                  portalLock.current=true;
                  try {
                    keys.current={};
                    console.log("âž¡ Memory portal clicked, near=",near);
                    setCurrentLessonPortal("memory-management");
                    setShowSimulator(true);
                    if(tutorialMode) setTutorialStep(0);
                  } finally {
                    setTimeout(()=>{portalLock.current=false;},200);
                  }
                }}>
              <div style={{position:"absolute",inset:8,background:"radial-gradient(circle,rgba(92,191,255,0.4),rgba(50,100,150,0.2))",
                border:"2px solid #5cbfff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 20px rgba(92,191,255,0.6), inset 0 0 12px rgba(92,191,255,0.3)",pointerEvents:"none"}}>
                <span style={{fontSize:20,animation:"float 1.5s ease-in-out infinite",filter:"drop-shadow(0 0 6px #5cbfff)"}}>ðŸ’¾</span>
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

        {/* Task Scheduling Portal */}
        {taskSchedulingPortal&&!taskSchedulingCompleted&&(()=>{
          const sx=Math.round(taskSchedulingPortal.x-camX),sy=Math.round(taskSchedulingPortal.y-camY);
          if(sx<-1||sx>VIEW_W||sy<-1||sy>VIEW_H) return null;
          const near=Math.abs(playerPos.x-taskSchedulingPortal.x)<=1&&Math.abs(playerPos.y-taskSchedulingPortal.y)<=1;
          return (
            <div key="portal-task" style={{position:"absolute",left:sx*TILE,top:sy*TILE,width:TILE,height:TILE,zIndex:sy+2,cursor:"pointer",
              animation:"portalPulse 2s infinite",pointerEvents:"auto"}} onClick={(e)=>{
                  if(portalLock.current) return;
                  e.stopPropagation();
                  e.preventDefault();
                  portalLock.current=true;
                  try {
                    keys.current={};
                    console.log("âž¡ Task Scheduling portal clicked, near=",near);
                    setCurrentLessonPortal("task-scheduling");
                    setShowSimulator(true);
                    if(tutorialMode) setTutorialStep(0);
                  } finally {
                    setTimeout(()=>{portalLock.current=false;},200);
                  }
                }}>
              <div style={{position:"absolute",inset:8,background:"radial-gradient(circle,rgba(216,80,255,0.4),rgba(100,50,150,0.2))",
                border:"2px solid #d850ff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 20px rgba(216,80,255,0.6), inset 0 0 12px rgba(216,80,255,0.3)",pointerEvents:"none"}}>
                <span style={{fontSize:20,animation:"float 1.5s ease-in-out infinite",filter:"drop-shadow(0 0 6px #d850ff)"}}>â°</span>
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

        {/* Floating text */}
        {floats.map(f=>(
          <div key={f.id} style={{position:"absolute",top:"30%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",zIndex:999,
            animation:"floatUp 1.2s ease forwards"}}>
            <div className="cinzel" style={{fontSize:17,color:f.color,fontWeight:700,textShadow:`0 0 10px ${f.color}`,whiteSpace:"nowrap"}}>{f.text}</div>
          </div>
        ))}

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
            <div style={{position:"absolute",left:Math.round(camX)*(118/MAP_W),top:Math.round(camY)*(76/MAP_H),width:VIEW_W*(118/MAP_W),height:VIEW_H*(76/MAP_H),
              border:`1px solid ${clsColor}55`,pointerEvents:"none"}}/>
          </div>
        </div>

        {/* Controls hint */}
        <div style={{position:"absolute",bottom:8,left:8,background:"rgba(0,0,0,0.75)",border:"1px solid rgba(200,165,80,0.1)",
          padding:"5px 10px",borderRadius:5}}>
          <div className="cinzel" style={{fontSize:6,color:"#4a3020",lineHeight:1.9}}>
            WASD/â†‘â†“â†â†’ Move Â· E Interact<br/>
            I Inventory Â· Q Quests Â· Walk into enemies
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
            >{key==="ArrowUp"?"â–²":key==="ArrowDown"?"â–¼":key==="ArrowLeft"?"â—€":key==="ArrowRight"?"â–¶":""}</button>
          )))}
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button className="btn btn-gold" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={handleInteract}>âš¡ Interact</button>
          <button className="btn" style={{color:"#8a6830",borderColor:"rgba(120,90,30,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setShowInv(v=>!v)}>ðŸŽ’ Inventory</button>
          <button className="btn btn-purple" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setShowQuests(v=>!v)}>ðŸ“œ Quests</button>
          <button className="btn btn-blue" style={{padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>{setQuiz(QUIZZES[Math.floor(Math.random()*QUIZZES.length)]);setQuizPick(null);setQuizCtx("explore");setScreen("quiz");}}>ðŸ“š Quiz</button>
          <button className="btn" style={{color:"#4bfa7f",borderColor:"rgba(75,250,127,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={saveGameProgress}>ðŸ’¾ Save</button>
          {hasSave&&<button className="btn" style={{color:"#f5c518",borderColor:"rgba(245,197,24,0.4)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={loadGameProgress}>ðŸ”„ Load</button>}
          <button className="btn" style={{color:audioEnabled?"#87ceeb":"#555",borderColor:audioEnabled?"rgba(135,206,235,0.4)":"rgba(100,100,100,0.25)",padding:"10px 18px",fontSize:11,fontWeight:700}} onClick={()=>setAudioEnabled(!audioEnabled)}>{audioEnabled?"ðŸ”Š":"ðŸ”‡"} {audioEnabled?"On":"Off"}</button>
          {bossSummoned&&!completedQuests.includes("q_kernel")&&(
            <button className="btn btn-red" style={{padding:"10px 18px",fontSize:11,fontWeight:700,animation:"pulseFast 0.8s infinite"}} onClick={triggerBossFight}>ðŸ’€ Boss</button>
          )}
        </div>
      </div>

      {/* Inventory overlay */}
      {showInv&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowInv(false)}>
          <div className="panel" style={{padding:24,borderRadius:10,minWidth:300,maxWidth:440,animation:"fadeUp 0.22s ease",
            boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
            <div className="cinzel" style={{fontSize:12,color:"#f5c518",marginBottom:14,letterSpacing:2}}>ðŸŽ’ Inventory</div>
            {inventory.length===0?(
              <div className="crimson" style={{fontSize:16,color:"#4a3020",fontStyle:"italic",padding:"20px 0"}}>Your bag is empty.</div>
            ):inventory.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(200,165,80,0.08)"}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div className="cinzel" style={{fontSize:10,color:"#e8d5a0"}}>{item.name} <span style={{color:"#7a6040"}}>Ã—{item.qty}</span></div>
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
            <div className="cinzel" style={{fontSize:12,color:"#c84bfa",marginBottom:14,letterSpacing:2}}>ðŸ“œ Quest Log</div>
            {QUEST_DEFS.map(qd=>{
              const active=quests.find(q=>q.id===qd.id);
              const done=completedQuests.includes(qd.id);
              return (
                <div key={qd.id} style={{padding:"12px 0",borderBottom:"1px solid rgba(200,165,80,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:15}}>{done?"âœ…":active?"ðŸ”„":"ðŸ”’"}</span>
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
                    <span className="cinzel" style={{fontSize:8,color:"#5a4020"}}>+{qd.reward.xp}XP +{qd.reward.gold}ðŸª™</span>
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
              {chatheadMinimized?"ðŸ”®":"Oracle AI ðŸ”®"}
            </div>
            <button className="btn" style={{padding:"2px 6px",fontSize:8,marginLeft:"auto"}} onClick={()=>setShowChathead(false)}>âœ•</button>
          </div>
          
          {!chatheadMinimized&&(
            <>
              {/* Messages */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {chatMessages.length === 0 && !crosswordCompleted && (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",textAlign:"center"}}>
                    <div className="crimson" style={{fontSize:12,color:"#7a8a7a",fontStyle:"italic"}}>
                      ðŸ’­ Complete the crossword puzzle first to unlock the Oracle's wisdom...
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
                  <div className="cinzel" style={{fontSize:10,color:"#8a6830"}}>ðŸ”’ Solve Crossword to Chat</div>
                </div>
              )}

              {/* Side Quest Button */}
              {!crosswordCompleted&&(
                <button onClick={()=>setShowCrossword(true)}
                  style={{margin:"8px 10px 0",padding:"8px 12px",background:"linear-gradient(135deg,rgba(200,75,250,0.2),rgba(100,50,150,0.2))",
                    border:"1px solid #c84bfa",color:"#c84bfa",borderRadius:6,fontSize:10,cursor:"pointer",fontWeight:"bold"}}>
                  ðŸ“– Crossword Puzzle
                </button>
              )}
              {crosswordCompleted&&(
                <div style={{margin:"8px 10px 0",padding:"8px 12px",background:"rgba(75,250,127,0.1)",
                  border:"1px solid #4bfa7f",borderRadius:6,textAlign:"center"}}>
                  <div className="cinzel" style={{fontSize:10,color:"#4bfa7f"}}>âœ… Crossword Unlocked!</div>
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
          <div className="panel" style={{padding:28,borderRadius:12,maxWidth:900,animation:"fadeUp 0.3s ease",
            boxShadow:"0 8px 40px rgba(0,0,0,0.9)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div className="cinzel" style={{fontSize:16,color:"#c84bfa",marginBottom:4,letterSpacing:2}}>ðŸŽ¯ CROSSWORD PUZZLE</div>
            <div className="crimson" style={{fontSize:12,color:"#7a6040",marginBottom:16}}>Fill in the hidden OS-themed words!</div>
            
            {/* Clues and Grid Layout */}
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:24}}>
              {/* Crossword Grid - 10x10 proper grid with black cells */}
              <div style={{background:"rgba(10,8,6,0.5)",border:"2px solid #c84bfa66",borderRadius:8,padding:8}}>
                {(() => {
                  // Exact layout per drawing
                  // Row/Col grid uses 9 columns (0..8) and 9 rows (0..8)
                  // 1 ACROSS: PROCESS at row 0, cols 0-6
                  // 2 DOWN: SCHEDULER at col 5, rows 0-8
                  // 3 ACROSS: DISK at row 4, cols 5-8
                  // 4 DOWN: RAM at col 7, rows 6-8
                  // 5 ACROSS: MUTEX at row 7, cols 2-6 (so 'E' at col5 intersects SCHEDULER)
                  const GRID = [
                    [1,1,1,1,1,1,1,0,0], // row 0: PROCESS (cols 0-6)
                    [0,0,0,0,0,1,0,0,0], // row 1: SCHEDULER (col5)
                    [0,0,0,0,0,1,0,0,0], // row 2: SCHEDULER
                    [0,0,0,0,0,1,0,0,0], // row 3: SCHEDULER
                    [0,0,0,0,0,1,1,1,1], // row 4: SCHEDULER (col5) + DISK (cols5-8)
                    [0,0,0,0,0,1,0,0,0], // row 5: SCHEDULER
                    [0,0,0,0,0,1,0,0,0], // row 6: SCHEDULER (RAM removed)
                    [0,0,1,1,1,1,1,0,0], // row 7: MUTEX (cols2-6) + SCHEDULER (RAM removed)
                    [0,0,0,0,0,1,0,0,0], // row 8: SCHEDULER (RAM removed)
                  ];

                  const WORDS = [
                    {id:"w1", row:0, col:0, across:true, len:7, cellNum:1}, // PROCESS
                    {id:"w2", row:0, col:5, across:false, len:9, cellNum:2}, // SCHEDULER (down)
                    {id:"w3", row:4, col:5, across:true, len:4, cellNum:3}, // DISK
                    {id:"w5", row:7, col:2, across:true, len:5, cellNum:4}, // MUTEX (start number changed to 4)
                  ];
                  
                  // Build cell number map
                  const cellNums = {};
                  WORDS.forEach(w => {
                    if(!cellNums[`${w.row},${w.col}`]) {
                      cellNums[`${w.row},${w.col}`] = w.cellNum;
                    }
                  });
                  
                  // Get state key for a cell
                  const getCellKey = (r,c) => {
                    for(let w of WORDS) {
                      if(w.row<=r && r<w.row+(!w.across?w.len:1) && 
                         w.col<=c && c<w.col+(w.across?w.len:1)) {
                        const offset = w.across ? (c-w.col) : (r-w.row);
                        return `${w.id}_${offset}`;
                      }
                    }
                    return null;
                  };
                  
                  return (
                    <>
                      {Array.from({length:9},(_,row)=>(
                        <div key={`row-${row}`} style={{display:"grid",gridTemplateColumns:"repeat(9,40px)",gap:2}}>
                          {Array.from({length:9},(_,col)=>{
                            const isPlayable = GRID[row] && GRID[row][col] === 1;
                            let number = cellNums[`${row},${col}`] || null;
                            
                            // Get state value - check all across/down words that include this cell
                            let value = "";
                            for(let w of WORDS) {
                              if(w.row<=row && row<w.row+(!w.across?w.len:1) && 
                                 w.col<=col && col<w.col+(w.across?w.len:1)) {
                                const offset = w.across ? (col-w.col) : (row-w.row);
                                const key = `${w.id}_${offset}`;
                                if(crosswordAnswers[key]){ value = crosswordAnswers[key]; break; }
                              }
                            }
                            
                            return (
                              <div key={`${row}-${col}`} style={{
                                width:40,height:40,
                                border:"1px solid #c84bfa44",
                                background:isPlayable?"rgba(200,75,250,0.08)":"#1a1a1a",
                                display:"flex",alignItems:"center",justifyContent:"center",
                                position:"relative",cursor:isPlayable?"text":"default"
                              }}>
                                {number&&<span style={{position:"absolute",top:1,left:1,fontSize:10,color:"#c84bfa",fontWeight:"bold",lineHeight:1}}>{number}</span>}
                                {isPlayable&&(
                                  <input maxLength="1" value={value} 
                                    onChange={(e)=>{
                                      const newVal = e.target.value.toUpperCase();
                                      const updates = {};
                                      for(let w of WORDS) {
                                        if(w.row<=row && row<w.row+(!w.across?w.len:1) && 
                                           w.col<=col && col<w.col+(w.across?w.len:1)) {
                                          const offset = w.across ? (col-w.col) : (row-w.row);
                                          const key = `${w.id}_${offset}`;
                                          updates[key] = newVal;
                                        }
                                      }
                                      setCrosswordAnswers(prev=>({ ...prev, ...updates }));
                                    }} 
                                    style={{width:"100%",height:"100%",textAlign:"center",fontSize:14,fontWeight:"bold",
                                      background:"transparent",border:"none",color:"#f0d0ff",outline:"none"}}/>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>

              {/* Clues */}
              <div style={{fontSize:10,overflowY:"auto",maxHeight:400}}>
                <div style={{marginBottom:12}}>
                  <div className="cinzel" style={{fontSize:12,color:"#c84bfa",marginBottom:6,fontWeight:"bold"}}>â¬Œ ACROSS</div>
                  <div style={{color:"#d4b870",lineHeight:1.6}}>
                    <div><strong>1.</strong> Running program instance</div>
                    <div><strong>3.</strong> Storage drive component</div>
                    <div><strong>4.</strong> Synchronization lock primitive</div>
                  </div>
                </div>

                <div>
                  <div className="cinzel" style={{fontSize:12,color:"#5cbfff",marginBottom:6,fontWeight:"bold"}}>â¬‡ DOWN</div>
                  <div style={{color:"#7eb3d4",lineHeight:1.6}}>
                    <div><strong>2.</strong> CPU task allocator</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn" style={{flex:1,color:"#7a6040",borderColor:"#3a2010",padding:"10px",fontSize:11}}
                onClick={()=>{setShowCrossword(false);}}>âœ• Cancel</button>
              <button className="btn btn-purple" style={{flex:1,padding:"10px",fontSize:11}}
                onClick={()=>{
                  const a = crosswordAnswers;
                  // Exact words from drawing: PROCESS, SCHEDULER, DISK, MUTEX
                  const process = (a.w1_0||"")+(a.w1_1||"")+(a.w1_2||"")+(a.w1_3||"")+(a.w1_4||"")+(a.w1_5||"")+(a.w1_6||"");
                  const scheduler = (a.w2_0||"")+(a.w2_1||"")+(a.w2_2||"")+(a.w2_3||"")+(a.w2_4||"")+(a.w2_5||"")+(a.w2_6||"")+(a.w2_7||"")+(a.w2_8||"");
                  const disk = (a.w3_0||"")+(a.w3_1||"")+(a.w3_2||"")+(a.w3_3||"");
                  const mutex = (a.w5_0||"")+(a.w5_1||"")+(a.w5_2||"")+(a.w5_3||"")+(a.w5_4||"");

                  const isCorrect = 
                    process==="PROCESS" && scheduler==="SCHEDULER" && 
                    disk==="DISK" && mutex==="MUTEX";

                  if(isCorrect){
                    setCrosswordCompleted(true);
                    setShowCrossword(false);
                    notify("ðŸŽ‰ Perfect! You've solved the crossword!","#4bfa7f",3000);
                  } else {
                    notify("âŒ Some answers are incorrect. Try again!","#ff6666",2000);
                  }
                }}>âœ“ Submit Answers</button>
            </div>
          </div>
        </div>
      )}



