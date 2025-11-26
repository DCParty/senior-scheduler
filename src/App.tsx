import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Volume2, 
  Trash2, 
  ShieldCheck, 
  Phone,
  User,
  CheckCircle,
  X,
  CalendarDays,
  List,
  ExternalLink,
  Bell,
  Download,
  Upload,
  Copy,
  Check
} from 'lucide-react';

// --- 定義行程類別 ---
type ApptType = 
  | 'medical'   // 看醫生
  | 'pills'     // 吃藥/拿藥
  | 'family'    // 家人
  | 'food'      // 吃飯
  | 'activity'  // 運動
  | 'shopping'  // 買菜
  | 'social'    // 找朋友
  | 'other';    // 其他

interface Appointment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: ApptType;
}

export default function App() {
  // --- 狀態管理 ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastAddedAppt, setLastAddedAppt] = useState<Appointment | null>(null);
  
  // 備份還原相關狀態
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupString, setBackupString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [view, setView] = useState<'list' | 'settings'>('list');
  const [filterMode, setFilterMode] = useState<'week' | 'all'>('week');
  
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState<ApptType>('other');

  // --- 初始化 ---
  useEffect(() => {
    const saved = localStorage.getItem('senior_appointments_v9');
    if (saved) {
      setAppointments(JSON.parse(saved));
    } else {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      setAppointments([
        { id: '1', title: '心臟科回診', date: todayStr, time: '09:00', type: 'medical' },
        { id: '2', title: '跟孫子視訊', date: fmt(tomorrow), time: '20:00', type: 'family' },
        { id: '3', title: '社區散步', date: todayStr, time: '16:30', type: 'activity' },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('senior_appointments_v9', JSON.stringify(appointments));
  }, [appointments]);

  // --- 語音 ---
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Google 日曆 ---
  const openGoogleCalendar = (appt: Appointment) => {
    const startStr = appt.date.replace(/-/g, '') + 'T' + appt.time.replace(/:/g, '') + '00';
    let endHour = parseInt(appt.time.split(':')[0]) + 1;
    const endStr = appt.date.replace(/-/g, '') + 'T' + String(endHour).padStart(2, '0') + appt.time.split(':')[1] + '00';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appt.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent('由樂齡貼身秘書建立')}`;
    window.open(url, '_blank');
  };

  // --- 備份與還原功能 ---
  const handleExport = () => {
    const data = JSON.stringify(appointments);
    
    // 使用 document.execCommand('copy') 作為 fallback，解決 iframe 權限問題
    try {
        const textArea = document.createElement("textarea");
        textArea.value = data;
        
        // 確保 textarea 不會影響版面
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            setCopySuccess(true);
            speak("資料已複製，請貼上給新手機");
            setTimeout(() => setCopySuccess(false), 3000);
            return;
        }
    } catch (err) {
        console.error("Fallback copy failed", err);
    }

    // 如果 fallback 失敗，嘗試使用標準 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data).then(() => {
            setCopySuccess(true);
            speak("資料已複製，請貼上給新手機");
            setTimeout(() => setCopySuccess(false), 3000);
        }).catch(err => {
            alert("複製失敗，請嘗試長按選取文字後複製");
        });
    } else {
         alert("複製失敗，您的瀏覽器不支援自動複製");
    }
  };

  const handleImport = () => {
    try {
      if (!backupString) return;
      const data = JSON.parse(backupString);
      if (Array.isArray(data)) {
        if(confirm("確定要匯入這些資料嗎？目前的資料將會被覆蓋喔。")) {
            setAppointments(data);
            speak("資料還原成功");
            setBackupString('');
            setShowBackupInput(false);
            setView('list');
        }
      } else {
        alert("資料格式錯誤");
      }
    } catch (e) {
      alert("資料格式錯誤，請確認複製的內容是否完整");
    }
  };

  // --- 日本傳統色配色系統 (高對比版) ---
  const getCategoryTheme = (type: ApptType) => {
    switch (type) {
      case 'medical': 
        // 茜色 (Akane)
        return { border: 'border-[#B7282E]', text: 'text-[#B7282E]', iconBg: 'bg-[#FDE8E9]' };
      case 'pills':   
        // 桔梗色 (Kikyo)
        return { border: 'border-[#5654A2]', text: 'text-[#5654A2]', iconBg: 'bg-[#EFEEF8]' };
      case 'family':  
        // 常磐色 (Tokiwa)
        return { border: 'border-[#007B43]', text: 'text-[#007B43]', iconBg: 'bg-[#E0F2E9]' };
      case 'food':    
        // 山吹色 (Yamabuki)
        return { border: 'border-[#EFBB24]', text: 'text-[#B08600]', iconBg: 'bg-[#FEF8E0]' };
      case 'activity':
        // 縹色 (Hanada)
        return { border: 'border-[#2792C3]', text: 'text-[#2792C3]', iconBg: 'bg-[#E3F4FB]' };
      case 'shopping':
        // 代赭 (Taisha)
        return { border: 'border-[#BB5520]', text: 'text-[#BB5520]', iconBg: 'bg-[#FBECE6]' };
      case 'social':  
        // 青碧 (Seiheki)
        return { border: 'border-[#478384]', text: 'text-[#478384]', iconBg: 'bg-[#E6F3F3]' };
      default:        
        // 煤竹 (Susutake)
        return { border: 'border-[#6F514C]', text: 'text-[#6F514C]', iconBg: 'bg-[#F2EEED]' };
    }
  };

  const getTypeIcon = (type: ApptType) => {
    switch (type) {
      case 'medical': return '🏥';
      case 'pills':   return '💊';
      case 'family':  return '👨‍👩‍👧';
      case 'food':    return '🍱';
      case 'activity':return '👟';
      case 'shopping':return '👜';
      case 'social':  return '🍵';
      default:        return '📝';
    }
  };

  const getTypeText = (type: ApptType) => {
    switch (type) {
      case 'medical': return '看醫生';
      case 'pills':   return '吃藥';
      case 'family':  return '家人';
      case 'food':    return '用餐';
      case 'activity':return '活動';
      case 'shopping':return '採買';
      case 'social':  return '聚會';
      default:        return '記事';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  
  const getFilteredAppointments = () => {
    let sorted = [...appointments].sort((a, b) => {
      return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

    if (filterMode === 'week') {
      return sorted.filter(a => {
        const d = new Date(a.date);
        const t = new Date(todayStr); 
        return d >= t && d <= nextWeek;
      });
    }
    return sorted;
  };

  const filteredList = getFilteredAppointments();
  const todayCount = appointments.filter(a => a.date === todayStr).length;
  const tomorrowCount = appointments.filter(a => a.date === tomorrowStr).length;

  const handleAdd = () => {
    if (!newTitle || !newDate || !newTime) {
      speak("請把資料填寫完整喔");
      return;
    }
    const newAppt: Appointment = {
      id: Date.now().toString(),
      title: newTitle,
      date: newDate,
      time: newTime,
      type: newType
    };
    setAppointments([...appointments, newAppt]);
    setLastAddedAppt(newAppt);
    setShowAddModal(false);
    setShowSuccessModal(true);
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewType('other');
    speak(`新增成功。請問要加入手機日曆提醒嗎？`);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`確定要刪除「${title}」這個行程嗎？`)) {
      setAppointments(appointments.filter(a => a.id !== id));
      speak("行程已刪除");
    }
  };

  const formatDateFriendly = (dateStr: string) => {
    if (dateStr === todayStr) return '今天';
    if (dateStr === tomorrowStr) return '明天';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} (${['日','一','二','三','四','五','六'][d.getDay()]})`;
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-[#434343] pb-28 relative">
      
      {/* --- 成功引導彈窗 --- */}
      {showSuccessModal && lastAddedAppt && (
        <div className="fixed inset-0 z-[60] bg-[#434343]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-[#E0F2E9] rounded-full flex items-center justify-center text-[#007B43] animate-bounce">
              <CheckCircle size={48} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-[#434343] mb-2">行程新增成功！</h2>
              <p className="text-[#6E6E70] text-lg">
                建議加入手機日曆，時間到才會響鈴喔。
              </p>
            </div>

            <button 
              onClick={() => {
                openGoogleCalendar(lastAddedAppt);
                setShowSuccessModal(false);
              }}
              className="w-full py-4 bg-[#C25D48] hover:bg-[#A04D3C] text-white rounded-xl text-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Bell size={24} />
              加入手機日曆提醒
            </button>

            <button 
              onClick={() => setShowSuccessModal(false)}
              className="text-[#949495] text-lg font-bold py-2 hover:text-[#6E6E70]"
            >
              不用了，我知道了
            </button>
          </div>
        </div>
      )}

      {/* --- 頂部導航 --- */}
      <header className="bg-[#C25D48] text-white p-5 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar size={28} />
          <h1 className="text-2xl font-bold tracking-wide">樂齡貼身秘書</h1>
        </div>
        <button 
          onClick={() => setView(view === 'list' ? 'settings' : 'list')}
          className="bg-[#A04D3C] p-2 rounded-full active:bg-[#8B4334] transition"
        >
          {view === 'list' ? <User size={24} /> : <X size={24} />}
        </button>
      </header>

      {/* --- 主要內容區 --- */}
      <main className="p-4 max-w-2xl mx-auto space-y-6 mt-2">
        
        {view === 'settings' ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8 animate-fade-in border border-[#EBEBEB]">
            <h2 className="text-2xl font-bold text-[#434343] border-b border-[#EBEBEB] pb-4">設定與隱私</h2>
            
            {/* 備份與移轉區塊 */}
            <div className="bg-[#FEF8E0] p-6 rounded-xl border border-[#EFBB24]">
               <h3 className="text-xl font-bold text-[#B08600] mb-3 flex items-center gap-2">
                 <Download size={24}/> 換手機資料移轉
               </h3>
               <p className="text-[#6E6E70] leading-relaxed text-lg mb-4">
                 如果您換了新手機，可以透過此功能將資料帶過去。
               </p>
               
               <div className="space-y-4">
                 {/* 匯出 */}
                 <button 
                   onClick={handleExport}
                   className="w-full py-3 bg-white border-2 border-[#EFBB24] text-[#B08600] rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-[#FEF8E0]"
                 >
                   {copySuccess ? <Check size={20}/> : <Copy size={20}/>}
                   {copySuccess ? '已複製！' : '1. 複製所有資料 (舊手機按這個)'}
                 </button>
                 
                 {/* 匯入 */}
                 {!showBackupInput ? (
                    <button 
                      onClick={() => setShowBackupInput(true)}
                      className="w-full py-3 bg-[#B08600] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-[#8F6D00]"
                    >
                      <Upload size={20}/> 2. 匯入資料 (新手機按這個)
                    </button>
                 ) : (
                   <div className="animate-fade-in bg-white p-4 rounded-xl border-2 border-[#B08600]">
                     <p className="text-[#B08600] font-bold mb-2">請貼上剛剛複製的資料：</p>
                     <textarea 
                       value={backupString}
                       onChange={(e) => setBackupString(e.target.value)}
                       className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-3 text-sm"
                       placeholder='請長按貼上...'
                     />
                     <div className="flex gap-2">
                       <button 
                         onClick={() => setShowBackupInput(false)}
                         className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold"
                       >
                         取消
                       </button>
                       <button 
                         onClick={handleImport}
                         className="flex-1 py-2 bg-[#B08600] text-white rounded-lg font-bold"
                       >
                         確認還原
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-[#F9F7F2] p-6 rounded-xl border border-[#EBEBEB]">
               <h3 className="text-xl font-bold text-[#C25D48] mb-3">關於提醒功能</h3>
               <p className="text-[#6E6E70] leading-relaxed text-lg">
                 這是一款省電設計的軟體。
                 <br/><br/>
                 當您新增行程後，請點擊<span className="text-[#2792C3] font-bold">「加入手機日曆提醒」</span>，讓手機內建日曆為您準時報時。
               </p>
            </div>
          </div>
        ) : (
          <>
            {/* --- 概況卡片區 --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border-l-[10px] border-[#C25D48] relative overflow-hidden">
                <h2 className="text-lg text-[#949495] font-bold mb-1">今天行程</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-[#C25D48]">{todayCount}</span>
                  <span className="text-xl text-[#6E6E70]">個事項</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#EBEBEB] pt-3">
                   <span className="text-lg text-[#6E6E70]">{new Date().toLocaleDateString('zh-TW', {month:'numeric', day:'numeric', weekday:'long'})}</span>
                   <button 
                      onClick={() => speak(`今天有 ${todayCount} 個行程`)} 
                      className="p-2 bg-[#F9E1E2] rounded-full text-[#C25D48]"
                    >
                      <Volume2 size={24} />
                   </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border-l-[10px] border-[#2792C3] relative overflow-hidden">
                <h2 className="text-lg text-[#949495] font-bold mb-1">明天預告</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-[#2792C3]">{tomorrowCount}</span>
                  <span className="text-xl text-[#6E6E70]">個事項</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#EBEBEB] pt-3">
                   <span className="text-lg text-[#6E6E70]">明天也要注意喔</span>
                   <button 
                      onClick={() => speak(`明天有 ${tomorrowCount} 個行程`)} 
                      className="p-2 bg-[#E3F4FB] rounded-full text-[#2792C3]"
                    >
                      <Volume2 size={24} />
                   </button>
                </div>
              </div>
            </div>

            {/* --- 切換檢視模式 --- */}
            <div className="flex bg-[#EBEBEB] p-1.5 rounded-xl">
              <button 
                onClick={() => setFilterMode('week')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition-all
                  ${filterMode === 'week' ? 'bg-white text-[#C25D48] shadow-sm' : 'text-[#949495]'}`}
              >
                <CalendarDays size={20} />
                未來一週
              </button>
              <button 
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition-all
                  ${filterMode === 'all' ? 'bg-white text-[#C25D48] shadow-sm' : 'text-[#949495]'}`}
              >
                <List size={20} />
                全部行程
              </button>
            </div>

            {/* --- 行程列表 --- */}
            <div className="space-y-4">
              {filteredList.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-[#D1D1D1]">
                  <p className="text-xl text-[#949495]">
                    {filterMode === 'week' ? '最近一週都很清閒喔' : '目前沒有任何行程'}
                  </p>
                  <p className="text-[#949495] mt-2 text-lg">好好休息一下吧 🍵</p>
                </div>
              ) : (
                filteredList.map((appt) => {
                  const theme = getCategoryTheme(appt.type);
                  return (
                    <div 
                      key={appt.id} 
                      className={`relative flex flex-col p-5 rounded-r-xl rounded-l-md shadow-sm bg-white border-l-[10px] ${theme.border} transition hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-4">
                          <div className={`text-4xl w-16 h-16 flex items-center justify-center rounded-2xl ${theme.iconBg} ${theme.text}`}>
                            {getTypeIcon(appt.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-[#6E6E70] font-bold text-lg mb-1">
                              <span className="bg-[#F9F7F2] px-2 py-1 rounded-md">{formatDateFriendly(appt.date)}</span>
                              <span className="font-mono text-xl">{appt.time}</span>
                            </div>
                            <h3 className={`text-2xl font-bold leading-tight ${theme.text}`}>
                              {appt.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-1 pt-3 border-t border-[#F9F7F2]">
                          <button
                            onClick={() => openGoogleCalendar(appt)}
                            className={`flex items-center gap-1 px-5 py-2.5 bg-[#F9F7F2] rounded-full font-bold active:bg-[#EBEBEB] transition ${theme.text}`}
                          >
                            <Bell size={20} /> <span className="text-base">加提醒</span>
                          </button>

                          <button 
                            onClick={() => speak(`${appt.title}，時間是${formatDateFriendly(appt.date)}，${appt.time}`)}
                            className="flex items-center gap-1 px-4 py-2.5 bg-[#F9F7F2] rounded-full text-[#6E6E70] active:bg-[#EBEBEB]"
                          >
                            <Volume2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleDelete(appt.id, appt.title)}
                            className="flex items-center gap-1 px-4 py-2.5 bg-[#F9F7F2] rounded-full text-[#B7282E] active:bg-[#EBEBEB]"
                          >
                            <Trash2 size={20} />
                          </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="h-28"></div> 
          </>
        )}
      </main>

      {/* --- 底部懸浮按鈕 --- */}
      <div className="fixed bottom-8 right-6 flex flex-col gap-4 items-end pointer-events-none z-50">
        <button 
          onClick={() => confirm("撥打緊急聯絡人電話？") && speak("正在為您撥打緊急電話")}
          className="pointer-events-auto bg-[#B7282E] hover:bg-[#8F1F24] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition active:scale-90"
          title="緊急求救"
        >
          <Phone size={24} />
        </button>

        {!showAddModal && view === 'list' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="pointer-events-auto bg-[#007B43] hover:bg-[#005826] text-white px-7 py-4 rounded-full shadow-xl transition transform active:scale-95 flex items-center gap-2"
          >
            <Plus size={32} />
            <span className="font-bold text-2xl pr-1 tracking-widest">新增</span>
          </button>
        )}
      </div>

      {/* --- 新增行程 Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#434343]/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-[#C25D48] p-5 flex justify-between items-center text-white shrink-0">
              <h2 className="text-2xl font-bold tracking-wide">新增行程</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#A04D3C] rounded-full">
                <X size={28} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-[#F9F7F2]">
              {/* 類別選擇 */}
              <div>
                <label className="block text-xl font-bold text-[#6E6E70] mb-3">1. 這是什麼事？</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'medical', 'pills', 
                    'family', 'food',
                    'activity', 'shopping', 
                    'social', 'other'
                  ].map((t) => {
                    const theme = getCategoryTheme(t as ApptType);
                    const isSelected = newType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setNewType(t as ApptType)}
                        className={`p-3 rounded-xl border-l-[6px] flex items-center gap-3 transition text-left bg-white shadow-sm
                          ${isSelected 
                            ? `${theme.border} ring-2 ring-gray-300 bg-white` 
                            : 'border-transparent hover:bg-gray-50'}`}
                      >
                        <span className={`text-3xl w-12 h-12 flex items-center justify-center rounded-lg ${theme.iconBg} ${theme.text}`}>
                            {getTypeIcon(t as ApptType)}
                        </span>
                        <span className={`font-bold text-lg ${isSelected ? theme.text : 'text-[#6E6E70]'}`}>
                          {getTypeText(t as ApptType)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 標題輸入 */}
              <div>
                <label className="block text-xl font-bold text-[#6E6E70] mb-2">2. 內容備註</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：台大回診"
                  className="w-full text-xl p-4 border border-[#D1D1D1] rounded-xl focus:border-[#C25D48] focus:ring-1 focus:ring-[#C25D48] focus:outline-none bg-white"
                />
              </div>

              {/* 時間選擇 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xl font-bold text-[#6E6E70] mb-2">3. 日期</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xl p-3 border border-[#D1D1D1] rounded-xl bg-white min-h-[56px] focus:border-[#C25D48] focus:ring-1 focus:ring-[#C25D48] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xl font-bold text-[#6E6E70] mb-2">4. 時間</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-xl p-3 border border-[#D1D1D1] rounded-xl bg-white min-h-[56px] focus:border-[#C25D48] focus:ring-1 focus:ring-[#C25D48] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#EBEBEB] bg-white flex gap-4 shrink-0">
               <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 rounded-xl text-xl font-bold text-[#6E6E70] bg-[#F9F7F2] border border-[#EBEBEB] hover:bg-[#EBEBEB]"
              >
                取消
              </button>
              <button 
                onClick={handleAdd}
                className="flex-[2] py-4 rounded-xl text-xl font-bold text-white bg-[#007B43] shadow-md hover:bg-[#005826] active:scale-95 transition"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}