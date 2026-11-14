const STORAGE_KEY = 'cleardesk.tasks.v1';
const THEME_KEY = 'cleardesk.theme';
const seedTasks = [
  { id: crypto.randomUUID(), title: '把本週最重要的三件事寫下來', priority: 'high', due: '', tags: ['規劃'], notes: '先從腦中最佔空間的事情開始。', completed: false, createdAt: Date.now() - 3600000 },
  { id: crypto.randomUUID(), title: '回覆設計夥伴的提案信', priority: 'medium', due: dateOffset(0), tags: ['工作'], notes: '', completed: false, createdAt: Date.now() - 7200000 },
  { id: crypto.randomUUID(), title: '晚上散步 20 分鐘', priority: 'low', due: dateOffset(0), tags: ['生活'], notes: '', completed: false, createdAt: Date.now() - 1800000 },
  { id: crypto.randomUUID(), title: '整理下個月的預算草稿', priority: 'medium', due: dateOffset(3), tags: ['財務'], notes: '先列固定支出，再看可調整項目。', completed: false, createdAt: Date.now() - 86400000 },
  { id: crypto.randomUUID(), title: '讀完產品研究報告第 2 章', priority: 'low', due: dateOffset(10), tags: ['學習'], notes: '', completed: false, createdAt: Date.now() - 172800000 },
  { id: crypto.randomUUID(), title: '預約下週的牙齒檢查', priority: 'high', due: dateOffset(-2), tags: ['生活'], notes: '', completed: false, createdAt: Date.now() - 259200000 }
];

const state = {
  tasks: loadTasks(),
  view: 'today',
  tag: null,
  search: '',
  priority: 'all',
  due: 'all',
  editingId: null,
  toastTimer: null
};

const els = {
  taskGroups: document.querySelector('#taskGroups'),
  emptyState: document.querySelector('#emptyState'),
  emptyTitle: document.querySelector('#emptyTitle'),
  emptyText: document.querySelector('#emptyText'),
  sectionTitle: document.querySelector('#sectionTitle'),
  sectionCount: document.querySelector('#sectionCount'),
  viewTitle: document.querySelector('#viewTitle'),
  quickTitle: document.querySelector('#quickTitle'),
  searchInput: document.querySelector('#searchInput'),
  priorityFilter: document.querySelector('#priorityFilter'),
  dueFilter: document.querySelector('#dueFilter'),
  taskDialog: document.querySelector('#taskDialog'),
  taskForm: document.querySelector('#taskForm'),
  tagDialog: document.querySelector('#tagDialog'),
  tagForm: document.querySelector('#tagForm'),
  taskTitle: document.querySelector('#taskTitle'),
  taskPriority: document.querySelector('#taskPriority'),
  taskDue: document.querySelector('#taskDue'),
  taskTags: document.querySelector('#taskTags'),
  taskNotes: document.querySelector('#taskNotes'),
  dialogTitle: document.querySelector('#dialogTitle'),
  toast: document.querySelector('#toast'),
  tagList: document.querySelector('#tagList'),
  tagManagerList: document.querySelector('#tagManagerList'),
  progressRing: document.querySelector('#progressRing'),
  progressValue: document.querySelector('#progressValue'),
  progressCaption: document.querySelector('#progressCaption'),
  progressLabel: document.querySelector('#progressLabel'),
  dateLabel: document.querySelector('#dateLabel'),
  greeting: document.querySelector('#greeting'),
  heroSubtitle: document.querySelector('#heroSubtitle'),
  statOpen: document.querySelector('#statOpen'),
  statPriority: document.querySelector('#statPriority'),
  statDue: document.querySelector('#statDue'),
  importInput: document.querySelector('#importInput')
};

function dateOffset(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}
function toISODate(date) { return date.toISOString().slice(0, 10); }
function parseDate(value) { return value ? new Date(`${value}T12:00:00`) : null; }
function todayISO() { return toISODate(new Date()); }
function startOfWeek(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}
function endOfWeek(date = new Date()) { const result = startOfWeek(date); result.setDate(result.getDate() + 6); return result; }
function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : seedTasks;
  } catch { return seedTasks; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }
function escapeHTML(value = '') { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function formatDate(dateValue, compact = false) {
  const date = parseDate(dateValue);
  if (!date) return '';
  const diff = Math.round((date - parseDate(todayISO())) / 86400000);
  if (diff === 0) return '今天';
  if (diff === -1) return '昨天';
  if (diff === 1) return '明天';
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', ...(compact ? {} : { weekday: 'short' }) }).format(date);
}
function isOverdue(task) { return Boolean(task.due && !task.completed && task.due < todayISO()); }
function isSoon(task) { const diff = task.due ? Math.round((parseDate(task.due) - parseDate(todayISO())) / 86400000) : 99; return Boolean(task.due && diff >= 0 && diff <= 7); }
function priorityLabel(priority) { return ({ high: '高優先', medium: '中優先', low: '低優先' })[priority] || '中優先'; }
function viewLabel(view) { return ({ today: '今天', week: '本週', later: '稍後', inbox: '收件匣', completed: '已完成' })[view] || '今天'; }
function viewTasks(tasks) {
  const now = new Date(); const today = todayISO(); const weekStart = toISODate(startOfWeek(now)); const weekEnd = toISODate(endOfWeek(now));
  return tasks.filter((task) => {
    if (state.view === 'completed') return task.completed;
    if (task.completed) return false;
    if (state.view === 'today') return task.due === today || !task.due;
    if (state.view === 'week') return task.due >= weekStart && task.due <= weekEnd;
    if (state.view === 'later') return task.due > weekEnd;
    return !task.due;
  });
}
function filteredTasks() {
  return viewTasks(state.tasks).filter((task) => {
    const text = `${task.title} ${task.notes || ''} ${(task.tags || []).join(' ')}`.toLowerCase();
    if (state.search && !text.includes(state.search.toLowerCase())) return false;
    if (state.tag && !(task.tags || []).includes(state.tag)) return false;
    if (state.priority !== 'all' && task.priority !== state.priority) return false;
    if (state.due === 'overdue' && !isOverdue(task)) return false;
    if (state.due === 'soon' && !isSoon(task)) return false;
    if (state.due === 'none' && task.due) return false;
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    const dueA = a.due || '9999-12-31'; const dueB = b.due || '9999-12-31';
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    return ({ high: 0, medium: 1, low: 2 }[a.priority] || 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] || 1);
  });
}
function groupTasks(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = task.due || 'no-date';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  });
  return [...groups.entries()];
}
function taskMarkup(task) {
  const dueClass = isOverdue(task) ? 'overdue' : isSoon(task) ? 'soon' : '';
  const tags = (task.tags || []).map((tag) => `<span class="task-tag">${escapeHTML(tag)}</span>`).join('');
  return `<article class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
    <button class="task-check" data-action="toggle" aria-label="${task.completed ? '標記為未完成' : '標記為完成'}">✓</button>
    <div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div>${task.notes ? `<p class="task-notes">${escapeHTML(task.notes)}</p>` : ''}<div class="task-meta"><span class="priority-pill ${task.priority}"><span>●</span>${priorityLabel(task.priority)}</span>${task.due ? `<span class="due-pill ${dueClass}"><span>◷</span>${formatDate(task.due, true)}${isOverdue(task) ? ' · 已逾期' : ''}</span>` : ''}${tags}</div></div>
    <div class="task-actions"><button class="task-action" data-action="edit" aria-label="編輯">✎</button><button class="task-action" data-action="delete" aria-label="刪除">×</button></div>
  </article>`;
}
function renderTasks() {
  const tasks = filteredTasks(); const groups = groupTasks(tasks);
  els.taskGroups.innerHTML = groups.map(([key, group]) => `<div class="task-group"><div class="task-group-heading"><span>${key === 'no-date' ? '未安排日期' : isOverdue(group[0]) ? '已逾期' : formatDate(key)}</span><span class="group-date">${key !== 'no-date' ? key : ''}</span></div>${group.map(taskMarkup).join('')}</div>`).join('');
  els.emptyState.hidden = tasks.length > 0;
  els.taskGroups.hidden = tasks.length === 0;
  els.sectionCount.textContent = `${tasks.length} 件${state.view === 'completed' ? '已完成' : '待辦'}`;
  els.emptyTitle.textContent = state.search || state.tag || state.priority !== 'all' || state.due !== 'all' ? '沒有符合的事項。' : state.view === 'completed' ? '還沒有完成的事項。' : '這裡很安靜。';
  els.emptyText.textContent = state.search || state.tag || state.priority !== 'all' || state.due !== 'all' ? '試試清除篩選，或換一個關鍵字。' : state.view === 'completed' ? '完成一件事後，它會在這裡留下紀錄。' : '先新增一件想完成的事，讓今天有一個清楚的起點。';
}
function renderNavigation() {
  const open = state.tasks.filter((task) => !task.completed);
  const countFor = (view) => viewTasksFor(view, state.tasks).length;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === state.view));
  document.querySelector('#todayCount').textContent = countFor('today'); document.querySelector('#weekCount').textContent = countFor('week'); document.querySelector('#laterCount').textContent = countFor('later'); document.querySelector('#inboxCount').textContent = countFor('inbox'); document.querySelector('#completedCount').textContent = state.tasks.filter((task) => task.completed).length;
  els.viewTitle.textContent = viewLabel(state.view); els.sectionTitle.textContent = viewLabel(state.view);
  const allTags = [...new Set(state.tasks.flatMap((task) => task.tags || []))];
  els.tagList.innerHTML = allTags.slice(0, 8).map((tag, index) => `<button class="tag-row ${state.tag === tag ? 'active' : ''}" data-tag="${escapeHTML(tag)}"><span class="tag-dot"></span><span>${escapeHTML(tag)}</span><span class="tag-count">${state.tasks.filter((task) => task.tags?.includes(tag) && !task.completed).length}</span></button>`).join('');
  if (!allTags.length) els.tagList.innerHTML = '<div class="tag-row"><span class="tag-dot"></span><span>尚無標籤</span></div>';
  document.querySelectorAll('[data-tag]').forEach((button) => button.addEventListener('click', () => { state.tag = state.tag === button.dataset.tag ? null : button.dataset.tag; render(); }));
  els.statOpen.textContent = open.length; els.statPriority.textContent = open.filter((task) => task.priority === 'high').length; els.statDue.textContent = open.filter(isSoon).length;
  const todayTasks = state.tasks.filter((task) => !task.completed && task.due === todayISO()); const doneToday = state.tasks.filter((task) => task.completed && task.due === todayISO()).length; const percent = todayTasks.length + doneToday ? Math.round((doneToday / (todayTasks.length + doneToday)) * 100) : 0;
  els.progressValue.textContent = `${percent}%`; els.progressRing.style.background = `conic-gradient(var(--accent) ${percent * 3.6}deg, var(--surface-muted) 0deg)`; els.progressCaption.textContent = percent === 100 ? '今天完成得很好' : percent > 0 ? `${doneToday} 件已完成` : '從一件小事開始';
}
function viewTasksFor(view, tasks) {
  const previous = state.view; state.view = view; const result = viewTasks(tasks); state.view = previous; return result;
}
function renderGreeting() {
  const hour = new Date().getHours(); const greeting = hour < 12 ? '早安，今天先做最重要的事。' : hour < 18 ? '午安，留一點空間給重要的事。' : '晚安，把今天輕輕收好。';
  els.greeting.textContent = greeting; els.dateLabel.textContent = new Intl.DateTimeFormat('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  els.heroSubtitle.textContent = state.view === 'completed' ? '回頭看看，你已經走了多遠。' : '把腦中的雜訊放下來，只留下一個下一步。';
}
function render() { renderGreeting(); renderNavigation(); renderTasks(); }
function openTaskDialog(task = null) {
  state.editingId = task?.id || null; els.dialogTitle.textContent = task ? '編輯事項' : '新增事項'; document.querySelector('#saveTaskButton').textContent = task ? '儲存變更' : '儲存事項';
  els.taskTitle.value = task?.title || ''; els.taskPriority.value = task?.priority || 'medium'; els.taskDue.value = task?.due || ''; els.taskTags.value = task?.tags?.join(', ') || ''; els.taskNotes.value = task?.notes || ''; els.taskDialog.showModal(); setTimeout(() => els.taskTitle.focus(), 50);
}
function closeTaskDialog() { els.taskDialog.close(); state.editingId = null; }
function saveFromDialog(event) {
  event.preventDefault(); const form = new FormData(els.taskForm); const data = { title: String(form.get('title')).trim(), priority: form.get('priority'), due: form.get('due'), tags: String(form.get('tags')).split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 6), notes: String(form.get('notes')).trim() };
  if (!data.title) return;
  if (state.editingId) { const task = state.tasks.find((item) => item.id === state.editingId); Object.assign(task, data); showToast('事項已更新'); } else { state.tasks.unshift({ id: crypto.randomUUID(), ...data, completed: false, createdAt: Date.now() }); showToast('事項已加入'); }
  saveTasks(); closeTaskDialog(); render();
}
function quickAdd() { const title = els.quickTitle.value.trim(); if (!title) { openTaskDialog(); return; } state.tasks.unshift({ id: crypto.randomUUID(), title, priority: 'medium', due: todayISO(), tags: [], notes: '', completed: false, createdAt: Date.now() }); els.quickTitle.value = ''; saveTasks(); render(); showToast('已加入今天'); }
function toggleTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; task.completed = !task.completed; task.completedAt = task.completed ? Date.now() : null; saveTasks(); render(); showToast(task.completed ? '做得好，事項完成了' : '事項已移回待處理'); }
function deleteTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; state.tasks = state.tasks.filter((item) => item.id !== id); saveTasks(); render(); showToast('事項已刪除'); }
function showToast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400); }
function renderTagManager() { const tags = [...new Set(state.tasks.flatMap((task) => task.tags || []))]; els.tagManagerList.innerHTML = tags.length ? tags.map((tag) => `<div class="tag-manager-row"><span><span class="tag-dot"></span> ${escapeHTML(tag)}</span><button type="button" data-remove-tag="${escapeHTML(tag)}">移除</button></div>`).join('') : '<p class="dialog-description">目前還沒有標籤。</p>'; els.tagManagerList.querySelectorAll('[data-remove-tag]').forEach((button) => button.addEventListener('click', () => { const tag = button.dataset.removeTag; state.tasks.forEach((task) => { task.tags = (task.tags || []).filter((item) => item !== tag); }); if (state.tag === tag) state.tag = null; saveTasks(); renderTagManager(); render(); showToast(`已移除「${tag}」`); })); }
function exportTasks() { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `cleardesk-backup-${todayISO()}.json`; link.click(); URL.revokeObjectURL(url); showToast('備份已下載'); }
function importTasks(file) { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!Array.isArray(data.tasks)) throw new Error('invalid'); state.tasks = data.tasks.filter((task) => task && task.id && task.title).map((task) => ({ ...task, tags: Array.isArray(task.tags) ? task.tags : [] })); saveTasks(); render(); showToast(`已匯入 ${state.tasks.length} 件事項`); } catch { showToast('檔案格式不正確'); } }; reader.readAsText(file); }

// Events

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; state.tag = null; render(); document.querySelector('.sidebar')?.classList.remove('open'); }));
document.querySelector('#openAddTask').addEventListener('click', () => openTaskDialog()); document.querySelector('#sectionAddButton').addEventListener('click', () => openTaskDialog()); document.querySelector('#emptyAddButton').addEventListener('click', () => openTaskDialog()); document.querySelector('#quickAddSubmit').addEventListener('click', quickAdd); els.quickTitle.addEventListener('keydown', (event) => { if (event.key === 'Enter') quickAdd(); });
els.taskForm.addEventListener('submit', saveFromDialog); els.taskDialog.addEventListener('close', () => { state.editingId = null; });
els.taskGroups.addEventListener('click', (event) => { const card = event.target.closest('[data-task-id]'); const action = event.target.closest('[data-action]')?.dataset.action; if (!card || !action) return; const task = state.tasks.find((item) => item.id === card.dataset.taskId); if (action === 'toggle') toggleTask(card.dataset.taskId); if (action === 'delete') deleteTask(card.dataset.taskId); if (action === 'edit') openTaskDialog(task); });
els.searchInput.addEventListener('input', (event) => { state.search = event.target.value.trim(); renderTasks(); }); els.priorityFilter.addEventListener('change', (event) => { state.priority = event.target.value; renderTasks(); }); els.dueFilter.addEventListener('change', (event) => { state.due = event.target.value; renderTasks(); }); document.querySelector('#clearFilters').addEventListener('click', () => { state.search = ''; state.priority = 'all'; state.due = 'all'; state.tag = null; els.searchInput.value = ''; els.priorityFilter.value = 'all'; els.dueFilter.value = 'all'; render(); });
document.querySelector('#addTagButton').addEventListener('click', () => { renderTagManager(); els.tagDialog.showModal(); }); document.querySelector('#exportButton').addEventListener('click', exportTasks); document.querySelector('#importButton').addEventListener('click', () => els.importInput.click()); els.importInput.addEventListener('change', (event) => { if (event.target.files[0]) importTasks(event.target.files[0]); event.target.value = ''; });
document.querySelector('#themeToggle').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem(THEME_KEY, next); }); document.querySelector('#openSidebar').addEventListener('click', () => document.querySelector('.sidebar').classList.add('open')); document.querySelector('#closeSidebar').addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open'));
document.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { event.preventDefault(); els.searchInput.focus(); } if (event.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') openTaskDialog(); if (event.key === 'Escape') document.querySelector('.sidebar')?.classList.remove('open'); });

const savedTheme = localStorage.getItem(THEME_KEY); if (savedTheme) document.documentElement.dataset.theme = savedTheme; render();
