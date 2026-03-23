/* ════════════════════════════
   THEME  (dark by default)
   ════════════════════════════ */
let isDark = true;
let progressChartInstance = null;
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.getElementById('themeIcon').className  = isDark ? 'ph-fill ph-sun' : 'ph-fill ph-moon';
  document.getElementById('themeIcon').style.color = isDark ? '#f5a623' : '#1c1c2e';
  document.getElementById('themeLabel').textContent = isDark ? 'Light' : 'Dark';
  localStorage.setItem('vmTheme', isDark ? 'dark' : 'light');
  
  if (progressChartInstance) {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e8e8f0' : '#1c1c2e';
    progressChartInstance.options.scales.x.grid.color = gridColor;
    progressChartInstance.options.scales.x.ticks.color = textColor;
    progressChartInstance.options.scales.y.grid.color = gridColor;
    progressChartInstance.options.scales.y.ticks.color = textColor;
    progressChartInstance.options.plugins.tooltip.backgroundColor = isDark ? '#1a1a2e' : '#fff';
    progressChartInstance.options.plugins.tooltip.titleColor = textColor;
    progressChartInstance.options.plugins.tooltip.bodyColor = textColor;
    progressChartInstance.update();
  }
}
// Restore saved theme
(function(){
  if (localStorage.getItem('vmTheme') === 'light') {
    isDark = false;
    document.body.classList.add('light');
    document.getElementById('themeIcon').className  = 'ph-fill ph-moon';
    document.getElementById('themeIcon').style.color = '#1c1c2e';
    document.getElementById('themeLabel').textContent = 'Dark';
  }
})();

/* ════════════════════════════
   DAILY STREAK ENGINE
   ════════════════════════════ */
let streakData = { count: 0, lastDate: null };
try { 
  streakData = JSON.parse(localStorage.getItem('vmStreakData')) || { count: 0, lastDate: null }; 
} catch(e) {}

function updateStreak() {
  const today = new Date().toLocaleDateString('en-CA');
  let { count, lastDate } = streakData;

  if (lastDate !== today) {
    if (!lastDate) {
      count = 1;
    } else {
      const last = new Date(lastDate);
      const curr = new Date(today);
      const diffTime = Math.abs(curr - last);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) count++;
      else if (diffDays > 1) count = 1;
    }
    streakData = { count, lastDate: today };
    localStorage.setItem('vmStreakData', JSON.stringify(streakData));
  }
  
  if (document.getElementById('streakCount')) {
    document.getElementById('streakCount').textContent = streakData.count;
  }
}

/* ════════════════════════════
   VOCABULARY RENDERER
   ════════════════════════════ */
function playAudio(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US';
  msg.rate = 0.9;
  window.speechSynthesis.speak(msg);
}

function toggleBookmark(wordStr, clsNum) {
  const idx = bookmarks.findIndex(b => b.word === wordStr && Number(b.clsNum) === Number(clsNum));
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
  } else {
    // Find it from CLASSES
    if (CLASSES[clsNum] && CLASSES[clsNum].words) {
      const w = CLASSES[clsNum].words.find(x => x.word === wordStr);
      if(w) bookmarks.push({ ...w, clsNum });
    }
  }
  localStorage.setItem('vmBookmarks', JSON.stringify(bookmarks));
  
  // Update UI icons across the page efficiently without re-rendering everything
  const cleanCls = wordStr.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
  const btns = document.querySelectorAll('.bm-btn-' + cleanCls);
  btns.forEach(btn => {
    if (idx >= 0) {
      btn.classList.remove('bookmarked');
      btn.innerHTML = '<i class="ph ph-heart"></i>';
    } else {
      btn.classList.add('bookmarked');
      btn.innerHTML = '<i class="ph-fill ph-heart"></i>';
    }
  });

  // Re-render only if inside bookmarks section to immediately hide/show elements
  if (document.getElementById('bookmarks').classList.contains('active')) {
    renderBookmarks();
  }
}

function generateWordCardHTML(w, clsNum) {
  const isBm = bookmarks.some(b => b.word === w.word && Number(b.clsNum) === Number(clsNum));
  const bmIcon = isBm ? '<i class="ph-fill ph-heart"></i>' : '<i class="ph ph-heart"></i>';
  const cleanWord = w.word.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
  const bmClass = isBm ? 'action-icon bookmarked bm-btn-'+cleanWord : 'action-icon bm-btn-'+cleanWord;
  const wordEscaped = w.word.replace(/'/g, "\\'");
  
  return `
    <div class="word-card" style="opacity:0;transform:translateY(30px)">
      <div class="word-card-header">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <span class="word-main">${w.word}</span>
            <span class="word-pos">${w.pos}</span>
            <div class="word-actions">
              <button class="action-icon" onclick="playAudio('${wordEscaped}')" title="Listen Pronunciation"><i class="ph-fill ph-speaker-high"></i></button>
              <button class="${bmClass}" onclick="toggleBookmark('${wordEscaped}', ${clsNum})" title="Bookmark Word">${bmIcon}</button>
            </div>
          </div>
          <span class="hindi-badge" title="Hindi meaning: ${w.hindi}">${w.hindi}</span>
        </div>
        <div class="word-eng" style="margin-top: 12px;">${w.english}</div>
      </div>
      <div class="word-card-body">
        <div class="pill-label"><i class="ph-duotone ph-chat-centered-text" style="vertical-align:text-bottom;font-size:1.1rem;margin-right:4px"></i>Example Usage</div>
        ${w.usage.map(u=>`<div class="usage-box">"${u}"</div>`).join('')}

        <div class="mt2 pill-label"><i class="ph-fill ph-check-circle" style="vertical-align:text-bottom;font-size:1.1rem;color:var(--correct);margin-right:4px"></i>Synonyms</div>
        <div class="pill-group">
          ${w.synonyms.map(s=>`<span class="pill syn" title="${s.def} · Hindi: ${s.h}">${s.w}</span>`).join('')}
        </div>

        <div class="mt1 pill-label"><i class="ph-fill ph-x-circle" style="vertical-align:text-bottom;font-size:1.1rem;color:var(--wrong);margin-right:4px"></i>Antonyms</div>
        <div class="pill-group">
          ${w.antonyms.map(a=>`<span class="pill ant" title="${a.def} · Hindi: ${a.h}">${a.w}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderVocab(num) {
  const cl = CLASSES[num];
  const container = document.getElementById('wordsContainer');
  container.innerHTML = cl.words.map((w) => generateWordCardHTML(w, num)).join('');
  gsap.to('.word-card', { opacity:1, y:0, stagger:.07, duration:.5, ease:'power2.out' });
}

function handleSearch(query) {
  const q = query.trim().toLowerCase();
  const container = document.getElementById('wordsContainer');
  
  if (!q) {
    if (curClass) renderVocab(curClass);
    else container.innerHTML = `<div class="empty-state">
                    <div class="empty-icon"><i class="ph-duotone ph-books" style="color: var(--accent)"></i></div>
                    <p>Select a class from the sidebar<br>to begin exploring words.</p>
                </div>`;
    return;
  }
  
  // Deselect sidebar visually
  document.querySelectorAll('#vocabClassList .sidebar-item').forEach(c=>c.classList.remove('active'));
  curClass = null; // Unset tracking, we are in global search now
  
  let results = [];
  for (const [num, cls] of Object.entries(CLASSES)) {
    cls.words.forEach(w => {
      if (w.word.toLowerCase().includes(q) || 
          w.english.toLowerCase().includes(q) || 
          w.hindi.toLowerCase().includes(q)) {
        results.push({ w, num });
      }
    });
  }
  
  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="ph-duotone ph-magnifying-glass" style="color: var(--muted)"></i></div>
      <p>No words found matching "${query}".</p>
    </div>`;
  } else {
    container.innerHTML = `<div style="margin-bottom: 1.25rem; font-family:var(--fmono); font-size:0.9rem; color: var(--accent)">Found ${results.length} result(s) for "${query}"</div>` + 
                          results.map(r => generateWordCardHTML(r.w, r.num)).join('');
    gsap.to('.word-card', { opacity:1, y:0, stagger:.05, duration:.4, ease:'power2.out' });
  }
}

function renderBookmarks() {
  const container = document.getElementById('bookmarksContainer');
  if (bookmarks.length === 0) {
    container.innerHTML = `<div class="empty-state" id="bookmarksEmpty">
      <div class="empty-icon"><i class="ph-duotone ph-heart-break" style="color: var(--accent)"></i></div>
      <p>You haven't bookmarked any words yet.<br>Click the heart icon on any word to save it here.</p>
    </div>`;
    return;
  }
  
  container.innerHTML = bookmarks.map(b => generateWordCardHTML(b, b.clsNum)).join('');
  gsap.to('#bookmarksContainer .word-card', { opacity:1, y:0, stagger:.07, duration:.5, ease:'power2.out' });
}

/* ════════════════════════════
   QUIZ ENGINE
   ════════════════════════════ */
let curClass = null, curType = 'mock';
let questions=[], qIdx=0, score=0, answers=[];
let history = [];
try { history = JSON.parse(localStorage.getItem('vmHistory')) || []; } catch(e) {}
let bookmarks = [];
try { bookmarks = JSON.parse(localStorage.getItem('vmBookmarks')) || []; } catch(e) {}


function buildQ(num, type) {
  const W = CLASSES[num].words;
  let qs = [];

  if (type==='synonyms'||type==='mock') {
    W.forEach(w => w.synonyms.slice(0,3).forEach((s,i) => {
      const pool = w.synonyms.filter((_,j)=>j!==i).map(x=>x.w).concat(w.antonyms.slice(0,2).map(x=>x.w));
      qs.push({ qtype:'<i class="ph-fill ph-check-circle" style="color:var(--correct);vertical-align:text-bottom;margin-right:4px"></i>Synonyms',
        q:`Which is a synonym of "${w.word}"?`,
        options:shuf([s.w,...shuf(pool).slice(0,3)]), answer:s.w,
        expl:`"${s.w}": ${s.def}` });
    }));
  }
  if (type==='antonyms'||type==='mock') {
    W.forEach(w => w.antonyms.slice(0,3).forEach((a,i) => {
      const pool = w.antonyms.filter((_,j)=>j!==i).map(x=>x.w).concat(w.synonyms.slice(0,2).map(x=>x.w));
      qs.push({ qtype:'<i class="ph-fill ph-x-circle" style="color:var(--wrong);vertical-align:text-bottom;margin-right:4px"></i>Antonyms',
        q:`Choose the antonym (opposite) of "${w.word}":`,
        options:shuf([a.w,...shuf(pool).slice(0,3)]), answer:a.w,
        expl:`"${a.w}" is the opposite of "${w.word}". ${a.def}` });
    }));
  }
  if (type==='fillblank'||type==='mock') {
    W.forEach(w => w.usage.forEach(u => {
      const blank = u.replace(new RegExp('\\b' + w.word + '\\b','gi'),'________');
      const dis   = shuf(W.filter(x=>x.word!==w.word).map(x=>x.word)).slice(0,3);
      qs.push({ qtype:'<i class="ph ph-pencil-simple-line" style="vertical-align:text-bottom;margin-right:4px"></i>Fill in the Blank',
        q:`Fill in the blank:\n\n"${blank}"`,
        options:shuf([w.word,...dis]), answer:w.word,
        expl:`The correct word is "${w.word}" — ${w.english}` });
    }));
  }
  if (type==='reading'||type==='mock') {
    const sw = shuf(W);
    if (sw.length > 0) {
      const w = sw[0];
      const useEx = (w.usage && w.usage.length > 0) ? w.usage[0] : "Focus on the definition for this word.";
      qs.push({ qtype:'<i class="ph-duotone ph-book-open" style="vertical-align:text-bottom;margin-right:4px"></i>Reading',
        passage:`${w.word} (${w.pos})\n\nDefinition: ${w.english}\n\nExample: "${useEx}"`,
        q:`What part of speech is "${w.word}"?`,
        options:shuf([w.pos,'Noun','Adverb','Conjunction','Verb'].filter((v,i,a)=>a.indexOf(v)===i).slice(0,4)),
        answer:w.pos, expl:`"${w.word}" is a ${w.pos}.` });
    }
    if (sw.length > 1) {
      const w2 = sw[1];
      if (w2.synonyms && w2.synonyms.length > 0) {
        let wrongs = sw.filter(x => x.word !== w2.word).map(x => (x.synonyms && x.synonyms.length > 0) ? x.synonyms[0].w : x.word);
        while (wrongs.length < 3) wrongs.push('random', 'word', 'test');
        qs.push({ qtype:'<i class="ph-duotone ph-book-open" style="vertical-align:text-bottom;margin-right:4px"></i>Reading',
          passage:`${w2.word} (${w2.pos})\n\nDefinition: ${w2.english}\n\nExample: "${(w2.usage && w2.usage.length > 0) ? w2.usage[0] : 'Read the definition carefully.'}"`,
          q:`Based on the passage, which word is closest in meaning to "${w2.word}"?`,
          options:shuf([w2.synonyms[0].w, ...wrongs]).slice(0, 4),
          answer:w2.synonyms[0].w, expl:`"${w2.synonyms[0].w}" is a synonym of "${w2.word}".` });
      }
    }
  }
  if (type==='unseen'||type==='mock') {
    const sw = shuf(W);
    const selected = sw.slice(0, Math.min(4, W.length));
    if (selected.length > 0) {
      // Generate a dynamic passage by joining usages
      const p = selected.map(w => (w.usage && w.usage.length > 0) ? w.usage[0] : `Understanding the word ${w.word} is crucial.`).join(" ");
      
      const w1 = selected[0];
      if (w1.synonyms && w1.synonyms.length > 0) {
        let wrongs = sw.filter(x => x.word !== w1.word).map(x => x.word);
        while(wrongs.length < 3) wrongs.push('random', 'option', 'here');
        qs.push({ qtype:'<i class="ph ph-magnifying-glass" style="vertical-align:text-bottom;margin-right:4px"></i>Unseen Passage', passage:p,
          q:`Which of these is a synonym of "${w1.word}"?`,
          options:shuf([w1.synonyms[0].w, ...wrongs]).slice(0, 4), answer:w1.synonyms[0].w,
          expl:`In the context, "${w1.synonyms[0].w}" is a synonym of "${w1.word}".` });
      }

      if (selected.length > 1) {
        const wTemp = selected[1];
        const pBlank = p.replace(new RegExp('\\b' + wTemp.word + '\\b', 'gi'), '________');
        let wrongs = sw.filter(x => x.word !== wTemp.word).map(x => x.word);
        while(wrongs.length < 3) wrongs.push('filler', 'text', 'other');
        qs.push({ qtype:'<i class="ph ph-magnifying-glass" style="vertical-align:text-bottom;margin-right:4px"></i>Unseen Passage', passage:pBlank,
          q:`Fill in the blank in the passage above:`,
          options:shuf([wTemp.word, ...wrongs]).slice(0, 4), answer:wTemp.word,
          expl:`Based on the context, "${wTemp.word}" fits perfectly.` });
      }
    }
  }
  if (type==='mock') {
    W.forEach(w => qs.push({
      qtype:'<i class="ph-duotone ph-target" style="color:var(--accent);vertical-align:text-bottom;margin-right:4px"></i>Word Match',
      q:`Which word matches this definition?\n\n"${w.english}"`,
      options:shuf([w.word,...shuf(W.filter(x=>x.word!==w.word).map(x=>x.word)).slice(0,3)]),
      answer:w.word, expl:`"${w.word}" — Hindi: ${w.hindi}` }));
  }
  const mockCount = Math.min(qs.length, 60 + Math.floor(Math.random() * 11)); // 60-70
  return shuf(qs).slice(0, type==='mock' ? mockCount : Math.min(qs.length, 20));
}

function shuf(a){ return [...a].sort(()=>Math.random()-.5); }

function renderQ() {
  const q = questions[qIdx];
  document.getElementById('progressFill').style.width = Math.round(qIdx/questions.length*100)+'%';
  document.getElementById('qProgressLabel').textContent = `Question ${qIdx+1} / ${questions.length}`;
  document.getElementById('qScoreLabel').textContent    = `Score: ${score}`;
  document.getElementById('prevBtn').style.visibility   = qIdx>0?'visible':'hidden';
  document.getElementById('nextBtn').innerHTML        = qIdx===questions.length-1?'<i class="ph ph-check-square-offset" style="vertical-align:bottom;margin-right:4px;font-size:1.1rem"></i>Finish':'Next<i class="ph ph-arrow-right" style="vertical-align:bottom;margin-left:4px;font-size:1.1rem"></i>';

  let h = `<div class="quiz-card">
    <div class="q-type-badge">${q.qtype}</div>
    <div class="q-num">Question ${qIdx+1} of ${questions.length}</div>`;
  if (q.passage) h += `<div class="q-passage">${q.passage.replace(/\n/g,'<br>')}</div>`;
  h += `<div class="q-text">${q.q.replace(/\n/g,'<br>')}</div><div class="options-grid" id="optGrid">`;
  ['A','B','C','D'].forEach((L,i) => {
    const optText = q.options[i] || '';
    const safeOpt = optText.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    h += `<button class="option-btn" id="opt${i}" data-answer="${safeOpt}" onclick="pick(${i},'${safeOpt}')">
      <span class="option-label">${L}</span>${optText}
    </button>`;
  });
  h += `</div><div class="feedback-box" id="feedback"></div></div>`;
  document.getElementById('questionHolder').innerHTML = h;
  gsap.from('.quiz-card',{opacity:0,y:26,duration:.35,ease:'power2.out'});
}

function pick(idx, val) {
  const q = questions[qIdx];
  const ok = val===q.answer;
  if(ok) score++;
  answers[qIdx]={selected:val,correct:q.answer,ok};
  document.querySelectorAll('.option-btn').forEach(btn=>{
    btn.disabled=true;
    if(btn.dataset.answer === q.answer) btn.classList.add('correct');
  });
  document.getElementById(`opt${idx}`).classList.add(ok?'correct':'wrong');
  const fb=document.getElementById('feedback');
  fb.className=`feedback-box show ${ok?'correct':'wrong'}`;
  fb.innerHTML=ok?`<i class="ph-fill ph-check-circle" style="vertical-align:middle;margin-right:4px;font-size:1.1rem"></i>Correct! ${q.expl}`:`<i class="ph-fill ph-x-circle" style="vertical-align:middle;margin-right:4px;font-size:1.1rem"></i>Wrong. Correct answer: <strong>${q.answer}</strong>. ${q.expl}`;
  document.getElementById('qScoreLabel').textContent=`Score: ${score}`;
}

function nextQ(){ qIdx===questions.length-1?showResults():(qIdx++,renderQ()); }
function prevQ(){ if(qIdx>0){qIdx--;renderQ();} }

function startQuiz(){
  if(!curClass){ alert('Please select a class first.'); return; }
  questions=buildQ(curClass,curType); qIdx=0; score=0; answers=[];
  document.getElementById('quizTypePanel').classList.add('hidden');
  document.getElementById('quizArea').classList.remove('hidden');
  document.getElementById('quizEmpty').style.display='none';
  document.getElementById('results-panel').classList.remove('show');
  renderQ();
}

function showResults(){
  const tot=questions.length, pct=Math.round(score/tot*100);
  let grade,msg;
  if(pct>=90){grade='A+';msg='<i class="ph-fill ph-star" style="vertical-align:text-bottom;margin-right:6px"></i>Outstanding! You are a master!';}
  else if(pct>=75){grade='A';msg='<i class="ph-fill ph-confetti" style="vertical-align:text-bottom;margin-right:6px"></i>Excellent! Keep practising.';}
  else if(pct>=60){grade='B';msg='<i class="ph-fill ph-thumbs-up" style="vertical-align:text-bottom;margin-right:6px"></i>Good work. Revise the weaker words.';}
  else if(pct>=40){grade='C';msg='<i class="ph-duotone ph-book-open-text" style="vertical-align:text-bottom;margin-right:6px"></i>Keep going — you are improving!';}
  else{grade='D';msg="<i class='ph-fill ph-barbell' style='vertical-align:text-bottom;margin-right:6px'></i>Don't give up! Start from the vocabulary cards.";}
  document.getElementById('scorePct').textContent=pct+'%';
  document.getElementById('scoreRing').style.setProperty('--pct',pct+'%');
  document.getElementById('resultGrade').textContent=grade;
  document.getElementById('resultMsg').textContent=msg;
  document.getElementById('correctCount').textContent=score;
  document.getElementById('wrongCount').textContent=tot-score;
  document.getElementById('totalCount').textContent=tot;
  document.getElementById('quizArea').classList.add('hidden');
  const rp=document.getElementById('results-panel');
  rp.classList.add('show');
  gsap.from('#results-panel',{opacity:0,y:40,duration:.6,ease:'power3.out'});
  history.unshift({cls:curClass,type:curType,score,tot,pct,grade,date:new Date().toLocaleDateString('en-IN')});
  localStorage.setItem('vmHistory', JSON.stringify(history));
  renderHistory();
}

function retryQuiz(){
  document.getElementById('results-panel').classList.remove('show');
  startQuiz();
}

function renderHistory(){
  const c=document.getElementById('historyContainer');
  const w=document.getElementById('chartWrapper');
  if(!history.length){
    c.innerHTML='<div style="text-align:center;color:var(--muted);padding:3rem">No results yet — go take a quiz!</div>';
    if(w) w.style.display='none';
    return;
  }
  c.innerHTML=history.map(h=>`
    <div class="stat-card" style="margin-bottom:1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap;padding:1.2rem 1.5rem;text-align:left">
      <span style="font-family:var(--fhead);font-size:2.2rem;color:var(--accent);min-width:50px">${h.grade}</span>
      <div>
        <div style="font-weight:600;font-size:1rem">Class ${h.cls} — ${h.type}</div>
        <div style="color:var(--muted);font-size:.83rem;margin-top:3px">${h.score}/${h.tot} correct (${h.pct}%) · ${h.date}</div>
      </div>
    </div>`).join('');
    
  if(w) w.style.display='block';
  renderChart();
}

function clearHistory() {
  const modal = document.getElementById('clearHistoryModal');
  if (modal) modal.classList.add('active');
}

function closeClearHistoryModal() {
  const modal = document.getElementById('clearHistoryModal');
  if (modal) modal.classList.remove('active');
}

function confirmClearHistory() {
  history = [];
  localStorage.removeItem('vmHistory');
  renderHistory();
  closeClearHistoryModal();
}

function renderChart() {
  const canvas = document.getElementById('progressChart');
  if (!canvas || typeof Chart === 'undefined') return;
  
  // Take last 10 quizzes and reverse for chronological order (oldest first)
  const recentHistory = history.slice(0, 10).reverse();
  const labels = recentHistory.map((_, i) => 'Q ' + (i + 1));
  const data = recentHistory.map(h => h.pct);
  
  const ctx = canvas.getContext('2d');
  
  if (progressChartInstance) {
    progressChartInstance.data.labels = labels;
    progressChartInstance.data.datasets[0].data = data;
    progressChartInstance.update();
  } else {
    const isDark = !document.body.classList.contains('light');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e8e8f0' : '#1c1c2e';
    const accentColor = '#f5a623';

    progressChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Score %',
          data: data,
          borderColor: accentColor,
          backgroundColor: 'rgba(245, 166, 35, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: accentColor,
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1a1a2e' : '#fff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function(context) { return 'Score: ' + context.parsed.y + '%'; }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true, max: 100,
            grid: { color: gridColor }, ticks: { color: textColor }
          },
          x: {
            grid: { color: gridColor }, ticks: { color: textColor }
          }
        }
      }
    });
  }
}

/* ════════════════════════════
   NAVIGATION
   ════════════════════════════ */
function goHome(){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('hero').style.display='flex';
  document.getElementById('results-panel').classList.remove('show');
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('hero').style.display='none';
  document.getElementById('results-panel').classList.remove('show');
  document.getElementById(id).classList.add('active');
  const navMap={vocab:'navVocab',quiz:'navQuiz',bookmarks:'navBookmarks',about:'navAbout'};
  if(navMap[id]) document.getElementById(navMap[id]).classList.add('active');
  document.getElementById('navLinks').classList.remove('open');
  if(id==='about') renderHistory();
  if(id==='bookmarks') renderBookmarks();
  window.scrollTo({top:0,behavior:'smooth'});
}
function toggleMenu(){ document.getElementById('navLinks').classList.toggle('open'); }

/* ─── Sidebar builders ─── */
function buildGrids(){
  const nums = Object.keys(CLASSES);

  // Vocab sidebar
  document.getElementById('vocabClassList').innerHTML = nums.map(n=>`
    <div class="sidebar-item" id="vocabSide-${n}" onclick="selClass('vocab',${n})">
      <span class="sidebar-item-label">${CLASSES[n].label}</span>
    </div>`).join('');

  // Quiz sidebar
  document.getElementById('quizClassList').innerHTML = nums.map(n=>`
    <div class="sidebar-item" id="quizSide-${n}" onclick="selClass('quiz',${n})">
      <span class="sidebar-item-label">${CLASSES[n].label}</span>
    </div>`).join('');
}

function selClass(ctx, num){
  // Update active state in sidebar
  document.querySelectorAll(`#${ctx}ClassList .sidebar-item`).forEach(c=>c.classList.remove('active'));
  const item = document.getElementById(`${ctx}Side-${num}`);
  if(item){ item.classList.add('active'); item.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  
  // Close the dropdown on mobile
  const sidebar = document.querySelector(`#${ctx} .class-sidebar`);
  if(sidebar) sidebar.classList.remove('open');

  curClass = num;

  if(ctx==='vocab'){
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.value = '';
    renderVocab(num);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  if(ctx==='quiz'){
    document.getElementById('quizEmpty').style.display='none';
    document.getElementById('quizTypePanel').classList.remove('hidden');
    document.getElementById('quizArea').classList.add('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }
}

/* ─── Quiz type tabs ─── */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active'); curType=this.dataset.type;
  });
});

/* ════════════════════════════
   INIT
   ════════════════════════════ */
updateStreak();
buildGrids();
gsap.registerPlugin(ScrollTrigger);

function initHeroAnimations() {
  gsap.from('.hero-badge',{opacity:0,y:-28,duration:.6,delay:.2});
  gsap.from('.hero-title', {opacity:0,y:40, duration:.8,delay:.4,ease:'power3.out'});
  gsap.from('.hero-sub',   {opacity:0,y:28, duration:.6,delay:.7});
  gsap.from('.hero-cta',   {opacity:0,y:20, duration:.6,delay:.9});
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lottie !== 'undefined') {
    const logoLottie = document.getElementById('logo-lottie');
    if (logoLottie) {
      lottie.loadAnimation({
        container: logoLottie,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'Cat playing animation.json'
      });
    }
  }

  const preloader = document.getElementById('preloader');
  if (!preloader || typeof lottie === 'undefined') {
    initHeroAnimations();
    return;
  }
  
  // Hide scrollbar during preload
  document.body.style.overflow = 'hidden';
  
  const anim = lottie.loadAnimation({
    container: document.getElementById('lottie-container'),
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: 'Welcome.json'
  });

  anim.addEventListener('complete', () => {
    gsap.to(preloader, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        preloader.style.display = 'none';
        document.body.style.overflow = '';
        initHeroAnimations();
      }
    });
  });

  // Fallback in case animation fails to load or Welcome.json is not found
  anim.addEventListener('data_failed', () => {
      preloader.style.display = 'none';
      document.body.style.overflow = '';
      initHeroAnimations();
  });
});