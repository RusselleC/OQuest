{/* Lesson Portal Modal */}
{showSimulator&&currentLessonPortal&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",overflow:"auto"}}>
    <div className="panel" style={{padding:20,borderRadius:14,width:"100%",maxWidth:"1000px",maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 12px 50px rgba(100,100,100,0.4)",border:`2px solid ${currentLessonPortal==="task-scheduling"?"#d850ff":"#5cbfff"}`}}>
      
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div className="cinzel-deco" style={{fontSize:18,color:currentLessonPortal==="task-scheduling"?"#d850ff":"#5cbfff",letterSpacing:1}}>
          {currentLessonPortal==="task-scheduling"?"⏰ TASK SCHEDULING SIMULATOR":"💾 MEMORY MANAGEMENT SIMULATOR"}
        </div>
        <button className="btn" style={{padding:"6px 12px",fontSize:11}} onClick={()=>{setShowSimulator(false);setCurrentLessonPortal(null);}}>✕ Close</button>
      </div>

      {/* CPU SCHEDULING LESSON */}
      {currentLessonPortal==="task-scheduling"&&(
      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:16}}>
        {/* Left Panel - Controls */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Algorithm Selector */}
          <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12}}>
            <div className="cinzel" style={{fontSize:11,color:"#d850ff",marginBottom:8,fontWeight:"bold"}}>ALGORITHM</div>
            {["FCFS","SJF","SRTF","RR","Priority"].map(algo=>(
              <button key={algo} className="btn" style={{width:"100%",textAlign:"left",margin:"4px 0",padding:"8px",
                background:cpuAlgorithm===algo?"#d850ff22":"transparent",
                color:cpuAlgorithm===algo?"#d850ff":"#999",
                borderColor:cpuAlgorithm===algo?"#d850ff":"#555"}}
                onClick={()=>setCpuAlgorithm(algo)}>{algo}</button>
            ))}
            {cpuAlgorithm==="RR"&&(
              <div style={{marginTop:8}}>
                <label style={{fontSize:9,color:"#aaa"}}>Quantum: </label>
                <input type="number" min="1" max="5" value={cpuTimeQuantum} onChange={e=>setCpuTimeQuantum(Number(e.target.value))}
                  style={{width:"100%",padding:"6px",borderRadius:4,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555"}}/>
              </div>
            )}
          </div>

          {/* Add Process */}
          <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:12}}>
            <div className="cinzel" style={{fontSize:11,color:"#d850ff",marginBottom:8,fontWeight:"bold"}}>ADD PROCESS</div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:4}}>Arrival: <input type="number" value={cpuNewArrival} onChange={e=>setCpuNewArrival(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",marginBottom:4}}/></div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:4}}>Burst: <input type="number" value={cpuNewBurst} onChange={e=>setCpuNewBurst(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",marginBottom:4}}/></div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:8}}>Priority: <input type="number" value={cpuNewPriority} onChange={e=>setCpuNewPriority(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#d850ff",border:"1px solid #555",marginBottom:4}}/></div>
            <button className="btn btn-blue" style={{width:"100%",padding:"8px",fontSize:10}} onClick={()=>{
              const newId = Math.max(...cpuProcesses.map(p=>p.id),0)+1;
              setCpuProcesses([...cpuProcesses,{id:newId,arrivalTime:cpuNewArrival,burstTime:cpuNewBurst,priority:cpuNewPriority}]);
              setCpuNewArrival(0);setCpuNewBurst(3);setCpuNewPriority(1);
              if(cpuNpcStep<=1) setCpuNpcStep(Math.min(cpuNpcStep+1,2));
            }}>+ Add Process</button>
          </div>

          {/* Process List */}
          <div style={{background:"rgba(216,80,255,0.1)",border:"1px solid #d850ff44",borderRadius:8,padding:8,maxHeight:"150px",overflowY:"auto"}}>
            <div className="cinzel" style={{fontSize:9,color:"#d850ff",marginBottom:6,fontWeight:"bold"}}>PROCESSES</div>
            {cpuProcesses.map((p,i)=>(
              <div key={i} style={{fontSize:8,color:"#aaa",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px",background:"rgba(0,0,0,0.3)",borderRadius:3}}>
                <span>Proc {p.id}: arr={p.arrivalTime} burst={p.burstTime}</span>
                <button className="btn" style={{padding:"2px 6px",fontSize:8,color:"#f88"}} onClick={()=>setCpuProcesses(cpuProcesses.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <button className="btn btn-purple" style={{width:"100%",padding:"10px",fontSize:11}} onClick={()=>{
            let result;
            if(cpuAlgorithm==="FCFS") result = computeFCFS(cpuProcesses);
            else if(cpuAlgorithm==="SJF") result = computeSJF_NP(cpuProcesses);
            else if(cpuAlgorithm==="SRTF") result = computeSRTF(cpuProcesses);
            else if(cpuAlgorithm==="RR") result = computeRR(cpuProcesses,cpuTimeQuantum);
            else result = computePriority(cpuProcesses);
            setCpuResults(result);
            if(cpuNpcStep<=2) setCpuNpcStep(3);
          }}>✓ SUBMIT</button>

          <button className="btn" style={{width:"100%",padding:"10px",fontSize:11,color:"#b0b0b0"}} onClick={()=>{
            setCpuProcesses([{id:0,arrivalTime:0,burstTime:5,priority:1},{id:1,arrivalTime:0,burstTime:3,priority:2},{id:2,arrivalTime:0,burstTime:8,priority:3},{id:3,arrivalTime:0,burstTime:2,priority:1}]);
            setCpuResults(null);
            setCpuCompareResults(null);
          }}>🔄 RESET</button>
        </div>

        {/* Right Panel - Results */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {cpuResults&&(
            <>
              {/* Results Table */}
              <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:8,padding:12,overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:9,color:"#aaa",borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:"1px solid #555"}}>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>PID</th>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>Arrival</th>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>Burst</th>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>Complete</th>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>TAT</th>
                    <th style={{textAlign:"left",padding:"6px",color:"#5cbfff"}}>Wait</th>
                  </tr></thead>
                  <tbody>
                    {cpuResults.results.map(r=>(
                      <tr key={r.id} style={{borderBottom:"1px solid #333"}}>
                        <td style={{padding:"6px",color:"#d850ff"}}>{r.id}</td>
                        <td style={{padding:"6px"}}>{r.arrival}</td>
                        <td style={{padding:"6px"}}>{r.burst}</td>
                        <td style={{padding:"6px"}}>{r.completion.toFixed(1)}</td>
                        <td style={{padding:"6px",color:"#88ff88"}}>{r.turnaround.toFixed(1)}</td>
                        <td style={{padding:"6px",color:"#ffff88"}}>{r.wait.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"#5cbfff"}}>
                  <div>Avg TAT: <strong>{cpuResults.avgTurnaround.toFixed(2)}</strong></div>
                  <div>Avg Wait: <strong>{cpuResults.avgWait.toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Gantt Chart */}
              <div style={{background:"rgba(92,191,255,0.1)",border:"1px solid #5cbfff44",borderRadius:8,padding:12}}>
                <div className="cinzel" style={{fontSize:11,color:"#5cbfff",marginBottom:8,fontWeight:"bold"}}>GANTT CHART</div>
                <div style={{display:"flex",height:30,gap:2,overflowX:"auto",paddingBottom:8}}>
                  {cpuResults.gantt.map((seg,i)=>{
                    const maxEnd = Math.max(...cpuResults.gantt.map(g=>g.end));
                    const width = (seg.end - seg.start) / maxEnd * 100;
                    return <div key={i} style={{flex:`0 0 ${width}%`,background:seg.color,border:"1px solid #999",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#000",fontWeight:"bold",minWidth:30}}>{`P${seg.id}`}</div>;
                  })}
                </div>
                <div style={{display:"flex",fontSize:7,color:"#888",gap:2,overflowX:"auto"}}>
                  {[...Array(Math.ceil(Math.max(...cpuResults.gantt.map(g=>g.end))+1))].map((_,i)=><div key={i} style={{flex:`0 0 ${100/(Math.ceil(Math.max(...cpuResults.gantt.map(g=>g.end))+1))}%`,textAlign:"center"}}>{i}</div>)}
                </div>
              </div>

              <button className="btn btn-blue" style={{width:"100%",padding:"10px",fontSize:11}} onClick={()=>{
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
              }}>📊 COMPARE ALGORITHMS</button>
            </>
          )}
          {!cpuResults&&<div style={{color:"#666",textAlign:"center",padding:"40px 20px"}}>Select algorithm and click SUBMIT to run simulation</div>}
        </div>
      </div>
      )}

      {/* MEMORY MANAGEMENT LESSON */}
      {currentLessonPortal==="memory-management"&&(
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
        {/* Left Panel */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Settings */}
          <div style={{background:"rgba(88,255,137,0.1)",border:"1px solid #58ff8944",borderRadius:8,padding:12}}>
            <div className="cinzel" style={{fontSize:11,color:"#58ff89",marginBottom:8,fontWeight:"bold"}}>SETTINGS</div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:4}}>Total RAM (MB): <input type="number" value={memTotalRam} onChange={e=>setMemTotalRam(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",marginBottom:4}}/></div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:8}}>Page Size (MB): <input type="number" value={memPageSize} onChange={e=>setMemPageSize(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",marginBottom:4}}/></div>
            <div style={{fontSize:9,color:"#aaa",marginBottom:4}}>Strategy:</div>
            {["first-fit","best-fit","worst-fit"].map(s=>(
              <button key={s} className="btn" style={{width:"100%",textAlign:"left",margin:"2px 0",padding:"6px",fontSize:9,
                background:memStrategy===s?"#58ff8922":"transparent",
                color:memStrategy===s?"#58ff89":"#999",
                borderColor:memStrategy===s?"#58ff89":"#555"}}
                onClick={()=>setMemStrategy(s)}>{s}</button>
            ))}
          </div>

          {/* Add Job */}
          <div style={{background:"rgba(88,255,137,0.1)",border:"1px solid #58ff8944",borderRadius:8,padding:12}}>
            <div className="cinzel" style={{fontSize:11,color:"#58ff89",marginBottom:8,fontWeight:"bold"}}>ADD JOB</div>
            <input type="text" placeholder="Job name" value={memNewName} onChange={e=>setMemNewName(e.target.value)}
              style={{width:"100%",padding:"6px",borderRadius:4,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",marginBottom:8}}/>
            <div style={{fontSize:9,color:"#aaa",marginBottom:8}}>Size (MB): <input type="number" min="16" value={memNewSize} onChange={e=>setMemNewSize(Number(e.target.value))}
              style={{width:"100%",padding:"4px",borderRadius:2,background:"#1a1a1a",color:"#58ff89",border:"1px solid #555",marginBottom:4}}/></div>
            <button className="btn btn-blue" style={{width:"100%",padding:"8px",fontSize:10}} onClick={()=>{
              if(memNewName.trim()) {
                const newId = Math.max(...memJobs.map(j=>j.id),0)+1;
                setMemJobs([...memJobs,{id:newId,name:memNewName,size:memNewSize,color:colors[newId%colors.length]}]);
                setMemNewName("");setMemNewSize(128);
                if(memNpcStep===0) setMemNpcStep(1);
              }
            }}>+ ADD</button>
          </div>

          {/* Jobs List */}
          <div style={{background:"rgba(88,255,137,0.1)",border:"1px solid #58ff8944",borderRadius:8,padding:8,maxHeight:"120px",overflowY:"auto"}}>
            <div className="cinzel" style={{fontSize:9,color:"#58ff89",marginBottom:6,fontWeight:"bold"}}>JOBS ({memJobs.length})</div>
            {memJobs.map(j=>(
              <div key={j.id} style={{fontSize:8,color:"#aaa",marginBottom:3,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px",background:"rgba(0,0,0,0.3)",borderRadius:3}}>
                <span>{j.name} {j.size}MB</span>
                <button className="btn" style={{padding:"2px 6px",fontSize:8,color:"#f88"}} onClick={()=>{
                  setMemJobs(memJobs.filter(x=>x.id!==j.id));
                  if(memNpcStep===3) setMemNpcStep(4);
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Memory Map */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {(() => {
            constalloc = computeMemoryAllocation(memJobs, memTotalRam, memPageSize, memStrategy);
            setMemAllocations(alloc.allocations);
            return (
              <>
                <div style={{background:"rgba(88,255,137,0.1)",border:"1px solid #58ff8944",borderRadius:8,padding:12}}>
                  <div className="cinzel" style={{fontSize:11,color:"#58ff89",marginBottom:12,fontWeight:"bold"}}>MEMORY MAP</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:"300px",overflowY:"auto"}}>
                    {alloc.frames.map((f,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:9}}>
                        <div style={{width:50,fontSize:8,color:"#888"}}>Frame {i}</div>
                        <div style={{flex:1,height:24,background:f.job?f.job.color:"#333",border:`1px solid ${f.job?"#999":"#555"}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:"bold",fontSize:8}}>
                          {f.job?f.job.name:"FREE"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:10,color:"#58ff89"}}>
                  <div style={{background:"rgba(88,255,137,0.05)",padding:8,borderRadius:4}}>Used: <strong>{(memTotalRam-alloc.externalFragmentation).toFixed(0)}MB</strong></div>
                  <div style={{background:"rgba(88,255,137,0.05)",padding:8,borderRadius:4}}>Free: <strong>{alloc.externalFragmentation.toFixed(0)}MB</strong></div>
                  <div style={{background:"rgba(88,255,137,0.05)",padding:8,borderRadius:4}}>Internal Waste: <strong>{alloc.internalWaste.toFixed(0)}MB</strong></div>
                  <div style={{background:"rgba(88,255,137,0.05)",padding:8,borderRadius:4}}>Utilization: <strong>{alloc.utilization.toFixed(1)}%</strong></div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      )}

      {/* Close Button */}
      <div style={{marginTop:20,display:"flex",gap:12}}>
        <button className="btn btn-green" style={{flex:1,padding:"12px",fontSize:12,fontWeight:"bold"}} onClick={()=>{
          if(currentLessonPortal==="task-scheduling") setTaskSchedulingCompleted(true);
          else setMemoryManagementCompleted(true);
          S.current.xp += 50;
          syncStats();
          setShowSimulator(false);
          setCurrentLessonPortal(null);
          notify("✨ Lesson Complete! +50 XP","#4bfa7f",3000);
        }}>✓ COMPLETE LESSON</button>
        <button className="btn" style={{flex:1,padding:"12px",fontSize:12}} onClick={()=>{setShowSimulator(false);setCurrentLessonPortal(null);}}>CLOSE</button>
      </div>
    </div>
  </div>
)}
