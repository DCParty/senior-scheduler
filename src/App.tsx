import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Volume2, 
  Trash2, 
  User,
  CheckCircle,
  X,
  CalendarDays,
  List,
  Bell,
  Download,
  Upload,
  Copy,
  Check,
  LogIn,
  LogOut
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

// 模擬使用者介面
interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export default function App() {
  // --- 狀態管理 ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastAddedAppt, setLastAddedAppt] = useState<Appointment | null>(null);
  
  // 使用者登入狀態
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

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
    const saved = localStorage.getItem('senior_appointments_v11');
    const savedUser = localStorage.getItem('senior_user_profile');
    
    if (saved) {
      setAppointments(JSON.parse(saved));
    } else {
      setAppointments([]);
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('senior_appointments_v11', JSON.stringify(appointments));
  }, [appointments]);

  // --- Google 登入模擬功能 ---
  const handleLogin = () => {
    setIsLoginLoading(true);
    setTimeout(() => {
      const mockUser = {
        name: '張爺爺',
        email: 'senior.chang@gmail.com'
      };
      setUser(mockUser);
      localStorage.setItem('senior_user_profile', JSON.stringify(mockUser));
      setIsLoginLoading(false);
      speak(`歡迎回來，${mockUser.name}，您的Google日曆已連結`);
    }, 1500);
  };

  const handleLogout = () => {
    if(confirm("確定要登出嗎？")) {
      setUser(null);
      localStorage.removeItem('senior_user_profile');
      speak("已登出");
    }
  };

  // --- 語音 ---
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.85; // 再慢一點
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Google 日曆連結 ---
  const openGoogleCalendar = (appt: Appointment) => {
    const startStr = appt.date.replace(/-/g, '') + 'T' + appt.time.replace(/:/g, '') + '00';
    let endHour = parseInt(appt.time.split(':')[0]) + 1;
    const endStr = appt.date.replace(/-/g, '') + 'T' + String(endHour).padStart(2, '0') + appt.time.split(':')[1] + '00';
    
    const details = user 
      ? `由樂齡貼身秘書建立 (使用者: ${user.name})`
      : '由樂齡貼身秘書建立';

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appt.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
  };

  // --- 開啟新增視窗並自動填入現在時間 ---
  const handleOpenAdd = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setNewDate(dateStr);
    setNewTime(timeStr);
    setShowAddModal(true);
  };

  // --- 備份與還原功能 ---
  const handleExport = () => {
    const data = JSON.stringify(appointments);
    
    try {
        const textArea = document.createElement("textarea");
        textArea.value = data;
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

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data).then(() => {
            setCopySuccess(true);
            speak("資料已複製，請貼上給新手機");
            setTimeout(() => setCopySuccess(false), 3000);
        }).catch(() => {
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
      case 'medical': return { border: 'border-[#B7282E]', text: 'text-[#B7282E]', iconBg: 'bg-[#FDE8E9]' };
      case 'pills':   return { border: 'border-[#5654A2]', text: 'text-[#5654A2]', iconBg: 'bg-[#EFEEF8]' };
      case 'family':  return { border: 'border-[#007B43]', text: 'text-[#007B43]', iconBg: 'bg-[#E0F2E9]' };
      case 'food':    return { border: 'border-[#EFBB24]', text: 'text-[#B08600]', iconBg: 'bg-[#FEF8E0]' };
      case 'activity':return { border: 'border-[#2792C3]', text: 'text-[#2792C3]', iconBg: 'bg-[#E3F4FB]' };
      case 'shopping':return { border: 'border-[#BB5520]', text: 'text-[#BB5520]', iconBg: 'bg-[#FBECE6]' };
      case 'social':  return { border: 'border-[#478384]', text: 'text-[#478384]', iconBg: 'bg-[#E6F3F3]' };
      default:        return { border: 'border-[#6F514C]', text: 'text-[#6F514C]', iconBg: 'bg-[#F2EEED]' };
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
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-[#434343] pb-32 relative">
      
      {/* --- 成功引導彈窗 (放大版) --- */}
      {showSuccessModal && lastAddedAppt && (
        <div className="fixed inset-0 z-[60] bg-[#434343]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl flex flex-col items-center text-center space-y-8">
            <div className="w-24 h-24 bg-[#E0F2E9] rounded-full flex items-center justify-center text-[#007B43] animate-bounce">
              <CheckCircle size={64} />
            </div>
            
            <div>
              <h2 className="text-4xl font-bold text-[#434343] mb-4">新增成功！</h2>
              <p className="text-[#6E6E70] text-2xl">
                建議加入手機日曆<br/>時間到才會響鈴喔
              </p>
            </div>

            <button 
              onClick={() => {
                openGoogleCalendar(lastAddedAppt);
                setShowSuccessModal(false);
              }}
              className="w-full py-6 bg-[#C25D48] hover:bg-[#A04D3C] text-white rounded-2xl text-2xl font-bold shadow-lg flex items-center justify-center gap-3 active:scale-95 transition"
            >
              <Bell size={32} />
              加入手機日曆提醒
            </button>

            <button 
              onClick={() => setShowSuccessModal(false)}
              className="text-[#949495] text-xl font-bold py-4 hover:text-[#6E6E70] w-full"
            >
              不用了，我知道了
            </button>
          </div>
        </div>
      )}

      {/* --- 頂部導航 (加大) --- */}
      <header className="bg-[#C25D48] text-white p-6 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar size={36} />
          <h1 className="text-3xl font-bold tracking-wide">樂齡貼身秘書</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {!user ? (
            <button 
              onClick={handleLogin}
              disabled={isLoginLoading}
              className="bg-white text-[#C25D48] px-5 py-3 rounded-full font-bold shadow-sm active:bg-gray-100 flex items-center gap-2 transition text-lg"
            >
              {isLoginLoading ? (
                 <span>登入中...</span>
              ) : (
                 <>
                   <LogIn size={24} />
                   <span>登入</span>
                 </>
              )}
            </button>
          ) : (
             <div className="flex items-center gap-2 bg-[#A04D3C] pl-4 pr-2 py-2 rounded-full">
               <span className="text-lg font-bold truncate max-w-[100px]">{user.name}</span>
               <button 
                  onClick={handleLogout}
                  className="bg-white text-[#C25D48] p-2 rounded-full hover:bg-gray-100"
                  title="登出"
               >
                 <LogOut size={20} />
               </button>
             </div>
          )}

          <button 
            onClick={() => setView(view === 'list' ? 'settings' : 'list')}
            className="bg-[#A04D3C] p-3 rounded-full active:bg-[#8B4334] transition"
          >
            {view === 'list' ? <User size={28} /> : <X size={28} />}
          </button>
        </div>
      </header>

      {/* --- 主要內容區 --- */}
      <main className="p-4 max-w-3xl mx-auto space-y-8 mt-4">
        
        {view === 'settings' ? (
          <div className="bg-white rounded-[2rem] shadow-sm p-8 space-y-8 animate-fade-in border border-[#EBEBEB]">
            <h2 className="text-4xl font-bold text-[#434343] border-b border-[#EBEBEB] pb-6">設定與隱私</h2>
            
            <div className="bg-[#E3F4FB] p-8 rounded-3xl border-2 border-[#2792C3]">
               <h3 className="text-3xl font-bold text-[#2792C3] mb-4 flex items-center gap-3">
                 <User size={32}/> 帳號狀態
               </h3>
               {user ? (
                 <div>
                   <p className="text-[#2792C3] text-2xl font-bold mb-2">已登入：{user.name}</p>
                   <p className="text-[#2792C3]/80 mb-6 text-xl">{user.email}</p>
                   <div className="flex items-center gap-2 text-[#007B43] font-bold text-xl">
                     <CheckCircle size={28} />
                     Google 日曆連結中
                   </div>
                 </div>
               ) : (
                 <div>
                   <p className="text-[#6E6E70] mb-6 text-2xl leading-relaxed">尚未登入，請點擊上方按鈕登入以連結 Google 日曆。</p>
                   <button 
                     onClick={handleLogin}
                     className="bg-[#2792C3] text-white px-8 py-4 rounded-2xl font-bold shadow-md active:scale-95 text-xl w-full"
                   >
                     立即登入
                   </button>
                 </div>
               )}
            </div>
            
            <div className="bg-[#FEF8E0] p-8 rounded-3xl border-2 border-[#EFBB24]">
               <h3 className="text-3xl font-bold text-[#B08600] mb-4 flex items-center gap-3">
                 <Download size={32}/> 資料移轉
               </h3>
               <p className="text-[#6E6E70] leading-relaxed text-2xl mb-6">
                 換新手機時，請用此功能把資料帶過去。
               </p>
               
               <div className="space-y-6">
                 <button 
                   onClick={handleExport}
                   className="w-full py-5 bg-white border-2 border-[#EFBB24] text-[#B08600] rounded-2xl font-bold text-2xl flex items-center justify-center gap-3 active:bg-[#FEF8E0]"
                 >
                   {copySuccess ? <Check size={28}/> : <Copy size={28}/>}
                   {copySuccess ? '已複製！' : '1. 舊手機：複製資料'}
                 </button>
                 
                 {!showBackupInput ? (
                    <button 
                      onClick={() => setShowBackupInput(true)}
                      className="w-full py-5 bg-[#B08600] text-white rounded-2xl font-bold text-2xl flex items-center justify-center gap-3 active:bg-[#8F6D00]"
                    >
                      <Upload size={28}/> 2. 新手機：匯入資料
                    </button>
                 ) : (
                   <div className="animate-fade-in bg-white p-6 rounded-2xl border-2 border-[#B08600]">
                     <p className="text-[#B08600] font-bold mb-4 text-xl">請貼上剛剛複製的資料：</p>
                     <textarea 
                       value={backupString}
                       onChange={(e) => setBackupString(e.target.value)}
                       className="w-full h-48 p-4 border border-gray-300 rounded-xl mb-4 text-lg"
                       placeholder='請長按這裡貼上...'
                     />
                     <div className="flex gap-4">
                       <button 
                         onClick={() => setShowBackupInput(false)}
                         className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-xl"
                       >
                         取消
                       </button>
                       <button 
                         onClick={handleImport}
                         className="flex-1 py-4 bg-[#B08600] text-white rounded-xl font-bold text-xl"
                       >
                         確認還原
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        ) : (
          <>
            {/* --- 概況卡片區 (字體放大) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border-l-[12px] border-[#C25D48] relative overflow-hidden">
                <h2 className="text-2xl text-[#949495] font-bold mb-2">今天行程</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-bold text-[#C25D48]">{todayCount}</span>
                  <span className="text-2xl text-[#6E6E70]">個事項</span>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[#EBEBEB] pt-4">
                   <span className="text-2xl text-[#6E6E70] font-bold">{new Date().toLocaleDateString('zh-TW', {month:'numeric', day:'numeric', weekday:'long'})}</span>
                   <button 
                      onClick={() => speak(`今天有 ${todayCount} 個行程`)} 
                      className="p-3 bg-[#F9E1E2] rounded-full text-[#C25D48]"
                    >
                      <Volume2 size={32} />
                   </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-8 shadow-sm border-l-[12px] border-[#2792C3] relative overflow-hidden">
                <h2 className="text-2xl text-[#949495] font-bold mb-2">明天預告</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-bold text-[#2792C3]">{tomorrowCount}</span>
                  <span className="text-2xl text-[#6E6E70]">個事項</span>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[#EBEBEB] pt-4">
                   <span className="text-2xl text-[#6E6E70] font-bold">明天也要注意</span>
                   <button 
                      onClick={() => speak(`明天有 ${tomorrowCount} 個行程`)} 
                      className="p-3 bg-[#E3F4FB] rounded-full text-[#2792C3]"
                    >
                      <Volume2 size={32} />
                   </button>
                </div>
              </div>
            </div>

            {/* --- 切換檢視模式 (加大) --- */}
            <div className="flex bg-[#EBEBEB] p-2 rounded-2xl">
              <button 
                onClick={() => setFilterMode('week')}
                className={`flex-1 py-4 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition-all
                  ${filterMode === 'week' ? 'bg-white text-[#C25D48] shadow-sm' : 'text-[#949495]'}`}
              >
                <CalendarDays size={28} />
                未來一週
              </button>
              <button 
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-4 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition-all
                  ${filterMode === 'all' ? 'bg-white text-[#C25D48] shadow-sm' : 'text-[#949495]'}`}
              >
                <List size={28} />
                全部行程
              </button>
            </div>

            {/* --- 行程列表 (卡片加大、字體加大) --- */}
            <div className="space-y-6">
              {filteredList.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-[#D1D1D1]">
                  <p className="text-3xl text-[#949495] font-bold">
                    {filterMode === 'week' ? '最近都沒有行程喔' : '目前沒有任何行程'}
                  </p>
                  <p className="text-[#949495] mt-4 text-2xl">好好休息一下吧 🍵</p>
                </div>
              ) : (
                filteredList.map((appt) => {
                  const theme = getCategoryTheme(appt.type);
                  return (
                    <div 
                      key={appt.id} 
                      className={`relative flex flex-col p-6 rounded-r-2xl rounded-l-lg shadow-sm bg-white border-l-[16px] ${theme.border} transition hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-5">
                          <div className={`text-5xl w-20 h-20 flex items-center justify-center rounded-2xl shrink-0 ${theme.iconBg} ${theme.text}`}>
                            {getTypeIcon(appt.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 text-[#6E6E70] font-bold text-xl mb-2">
                              <span className="bg-[#F9F7F2] px-3 py-1 rounded-lg text-[#C25D48]">{formatDateFriendly(appt.date)}</span>
                              <span className="font-mono text-2xl text-[#434343]">{appt.time}</span>
                            </div>
                            <h3 className={`text-3xl font-bold leading-tight ${theme.text}`}>
                              {appt.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-4 mt-2 pt-4 border-t border-[#F9F7F2]">
                          <button
                            onClick={() => openGoogleCalendar(appt)}
                            className={`flex items-center gap-2 px-6 py-4 bg-[#F9F7F2] rounded-full font-bold active:bg-[#EBEBEB] transition ${theme.text}`}
                          >
                            <Bell size={24} /> <span className="text-xl">加提醒</span>
                          </button>

                          <button 
                            onClick={() => speak(`${appt.title}，時間是${formatDateFriendly(appt.date)}，${appt.time}`)}
                            className="flex items-center gap-2 px-6 py-4 bg-[#F9F7F2] rounded-full text-[#6E6E70] active:bg-[#EBEBEB]"
                          >
                            <Volume2 size={24} />
                          </button>
                          <button 
                            onClick={() => handleDelete(appt.id, appt.title)}
                            className="flex items-center gap-2 px-6 py-4 bg-[#F9F7F2] rounded-full text-[#B7282E] active:bg-[#EBEBEB]"
                          >
                            <Trash2 size={24} />
                          </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="h-40"></div> 
          </>
        )}
      </main>

      {/* --- 底部懸浮按鈕 (超級加大版) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F9F7F2] to-transparent pointer-events-none z-50">
        {!showAddModal && view === 'list' && (
          <button 
            onClick={handleOpenAdd}
            className="pointer-events-auto w-full bg-[#007B43] hover:bg-[#005826] text-white py-6 rounded-3xl shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3"
          >
            <Plus size={48} />
            <span className="font-bold text-4xl tracking-widest">新增行程</span>
          </button>
        )}
      </div>

      {/* --- 新增行程 Modal (放大版) --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#434343]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#C25D48] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-3xl font-bold tracking-wide">新增行程</h2>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-[#A04D3C] rounded-full">
                <X size={36} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 bg-[#F9F7F2]">
              {/* 類別選擇 */}
              <div>
                <label className="block text-2xl font-bold text-[#6E6E70] mb-4">1. 這是什麼事？</label>
                <div className="grid grid-cols-2 gap-4">
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
                        className={`p-5 rounded-2xl border-l-[8px] flex items-center gap-4 transition text-left bg-white shadow-sm
                          ${isSelected 
                            ? `${theme.border} ring-4 ring-gray-200 bg-white` 
                            : 'border-transparent hover:bg-gray-50'}`}
                      >
                        <span className={`text-5xl w-16 h-16 flex items-center justify-center rounded-xl ${theme.iconBg} ${theme.text}`}>
                            {getTypeIcon(t as ApptType)}
                        </span>
                        <span className={`font-bold text-2xl ${isSelected ? theme.text : 'text-[#6E6E70]'}`}>
                          {getTypeText(t as ApptType)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 標題輸入 */}
              <div>
                <label className="block text-2xl font-bold text-[#6E6E70] mb-3">2. 內容備註</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：台大回診"
                  className="w-full text-2xl p-6 border-2 border-[#D1D1D1] rounded-2xl focus:border-[#C25D48] focus:ring-2 focus:ring-[#C25D48] focus:outline-none bg-white"
                />
              </div>

              {/* 時間選擇 */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-2xl font-bold text-[#6E6E70] mb-3">3. 日期</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-2xl p-5 border-2 border-[#D1D1D1] rounded-2xl bg-white min-h-[80px] focus:border-[#C25D48] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-2xl font-bold text-[#6E6E70] mb-3">4. 時間</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-2xl p-5 border-2 border-[#D1D1D1] rounded-2xl bg-white min-h-[80px] focus:border-[#C25D48] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#EBEBEB] bg-white flex gap-6 shrink-0">
               <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-6 rounded-2xl text-2xl font-bold text-[#6E6E70] bg-[#F9F7F2] border-2 border-[#EBEBEB] hover:bg-[#EBEBEB]"
              >
                取消
              </button>
              <button 
                onClick={handleAdd}
                className="flex-[2] py-6 rounded-2xl text-2xl font-bold text-white bg-[#007B43] shadow-lg hover:bg-[#005826] active:scale-95 transition"
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