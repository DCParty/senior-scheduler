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
  LogIn,
  LogOut,
  Cloud,
  Loader2
} from 'lucide-react';

// --- Firebase SDK 引入 (已合併) ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  getFirestore,
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';

// --- Firebase 設定區 ---
// 重要：請將下方的字串替換為您在 Firebase Console 取得的真實金鑰
const firebaseConfig = {
  apiKey: "請貼上您的_apiKey",
  authDomain: "請貼上您的_authDomain",
  projectId: "請貼上您的_projectId",
  storageBucket: "請貼上您的_storageBucket",
  messagingSenderId: "請貼上您的_messagingSenderId",
  appId: "請貼上您的_appId"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

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
  uid: string;  // 綁定使用者的 ID
}

export default function App() {
  // --- 狀態管理 ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastAddedAppt, setLastAddedAppt] = useState<Appointment | null>(null);
  
  // 使用者登入狀態
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // 檢查登入狀態中
  const [isDataLoading, setIsDataLoading] = useState(false); // 資料下載中

  const [view, setView] = useState<'list' | 'settings'>('list');
  const [filterMode, setFilterMode] = useState<'week' | 'all'>('week');
  
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState<ApptType>('other');

  // --- 初始化：監聽登入狀態 ---
  useEffect(() => {
    // 這是 Firebase 提供的監聽器，當使用者登入或登出時會自動觸發
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        // 如果已登入，開始監聽資料庫
        subscribeToAppointments(currentUser.uid);
      } else {
        // 沒登入就清空資料
        setAppointments([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 監聽 Firestore 資料庫 (核心功能：即時同步) ---
  const subscribeToAppointments = (uid: string) => {
    setIsDataLoading(true);
    // 查詢條件：只抓取該使用者的資料 (uid == user.uid)
    const q = query(
      collection(db, "appointments"), 
      where("uid", "==", uid)
    );
    
    // onSnapshot 會建立一個即時連線，資料庫有變動時這裡會自動更新
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      // 依照日期與時間排序
      list.sort((a, b) => {
        return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
      });
      
      setAppointments(list);
      setIsDataLoading(false);
    }, (error) => {
      console.error("同步失敗:", error);
      setIsDataLoading(false);
    });

    return unsubscribe;
  };

  // --- Firebase Google 登入 ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      speak("登入成功，正在為您同步資料");
    } catch (error) {
      console.error(error);
      alert("登入失敗，請檢查網路連線或 Firebase 設定");
    }
  };

  const handleLogout = async () => {
    if(confirm("確定要登出嗎？")) {
      await signOut(auth);
      speak("已登出");
    }
  };

  // --- 語音功能 ---
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.85; 
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Google 日曆連結 (Web Intent) ---
  const openGoogleCalendar = (appt: Appointment) => {
    const startStr = appt.date.replace(/-/g, '') + 'T' + appt.time.replace(/:/g, '') + '00';
    let endHour = parseInt(appt.time.split(':')[0]) + 1;
    const endStr = appt.date.replace(/-/g, '') + 'T' + String(endHour).padStart(2, '0') + appt.time.split(':')[1] + '00';
    
    const details = user 
      ? `由樂齡貼身秘書建立 (使用者: ${user.displayName})`
      : '由樂齡貼身秘書建立';

    // 這會開啟手機瀏覽器並嘗試喚起已登入的 Google 日曆
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appt.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
  };

  // --- 開啟新增視窗 (自動填入現在時間) ---
  const handleOpenAdd = () => {
    if (!user) {
      speak("請先登入才能新增行程喔");
      // 切換到設定頁面引導登入
      setView('settings'); 
      return;
    }

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

  // --- 刪除行程 (從 Firestore 刪除) ---
  const handleDelete = async (id: string, title: string) => {
    if (confirm(`確定要刪除「${title}」這個行程嗎？`)) {
      try {
        await deleteDoc(doc(db, "appointments", id));
        speak("行程已刪除");
      } catch (e) {
        console.error("刪除失敗: ", e);
        alert("刪除失敗，請檢查網路");
      }
    }
  };

  // --- 新增行程 (寫入 Firestore) ---
  const handleAdd = async () => {
    if (!newTitle || !newDate || !newTime || !user) {
      speak("資料不完整喔");
      return;
    }

    try {
      const newAppt = {
        title: newTitle,
        date: newDate,
        time: newTime,
        type: newType,
        uid: user.uid, // 綁定使用者的 UID，確保隱私
        createdAt: Timestamp.now()
      };

      // 寫入雲端資料庫
      const docRef = await addDoc(collection(db, "appointments"), newAppt);
      
      const apptWithId = { ...newAppt, id: docRef.id } as Appointment;
      setLastAddedAppt(apptWithId);
      
      setShowAddModal(false);
      setShowSuccessModal(true);
      setNewTitle('');
      speak(`新增成功。請問要加入手機日曆提醒嗎？`);
    } catch (e) {
      console.error("新增失敗: ", e);
      alert("儲存失敗，請檢查網路");
    }
  };

  // --- UI 輔助功能 ---
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
  
  const getFilteredAppointments = () => {
    if (filterMode === 'week') {
      return appointments.filter(a => {
        const d = new Date(a.date);
        const t = new Date(todayStr); 
        const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
        return d >= t && d <= nextWeek;
      });
    }
    return appointments;
  };

  const filteredList = getFilteredAppointments();
  const todayCount = appointments.filter(a => a.date === todayStr).length;
  const tomorrowCount = appointments.filter(a => a.date === tomorrowStr).length;

  const formatDateFriendly = (dateStr: string) => {
    if (dateStr === todayStr) return '今天';
    if (dateStr === tomorrowStr) return '明天';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} (${['日','一','二','三','四','五','六'][d.getDay()]})`;
  };

  // --- 載入中畫面 ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={64} className="animate-spin text-[#C25D48]"/>
        <p className="text-3xl font-bold text-[#6E6E70]">正在啟動貼身秘書...</p>
      </div>
    );
  }

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
              <h2 className="text-4xl font-bold text-[#434343] mb-4">雲端儲存成功！</h2>
              <p className="text-[#6E6E70] text-2xl">
                已同步至雲端<br/>點下方按鈕設定手機響鈴
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
              className="bg-white text-[#C25D48] px-5 py-3 rounded-full font-bold shadow-sm active:bg-gray-100 flex items-center gap-2 transition text-lg"
            >
              <LogIn size={24} />
              <span>Google 登入</span>
            </button>
          ) : (
             <div className="flex items-center gap-2 bg-[#A04D3C] pl-4 pr-2 py-2 rounded-full border border-white/20 shadow-inner">
               {user.photoURL && (
                 <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-white"/>
               )}
               <span className="text-lg font-bold truncate max-w-[100px]">{user.displayName}</span>
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
                   <div className="flex items-center gap-4 mb-4">
                     {user.photoURL && <img src={user.photoURL} className="w-20 h-20 rounded-full border-4 border-white shadow-md"/>}
                     <div>
                        <p className="text-[#2792C3] text-2xl font-bold mb-1">{user.displayName}</p>
                        <p className="text-[#2792C3]/80 text-xl">{user.email}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-2 text-[#007B43] font-bold text-xl bg-white/50 p-4 rounded-xl">
                     <Cloud size={28} />
                     雲端同步：已啟用
                   </div>
                 </div>
               ) : (
                 <div>
                   <p className="text-[#6E6E70] mb-6 text-2xl leading-relaxed">
                     尚未登入。<br/>
                     登入後可以將行程備份在雲端，換手機也不怕資料遺失。
                   </p>
                   <button 
                     onClick={handleLogin}
                     className="bg-[#2792C3] text-white px-8 py-4 rounded-2xl font-bold shadow-md active:scale-95 text-xl w-full flex justify-center gap-2"
                   >
                     <LogIn size={28} /> 
                     使用 Google 帳號登入
                   </button>
                 </div>
               )}
            </div>
            
            <div className="bg-[#F9F7F2] p-6 rounded-xl border border-[#EBEBEB]">
               <h3 className="text-xl font-bold text-[#C25D48] mb-3">使用說明</h3>
               <p className="text-[#6E6E70] leading-relaxed text-lg">
                 1. 登入 Google 帳號後，您的行程會自動備份到雲端。<br/>
                 2. 在任何手機登入相同帳號，行程都會自動出現。<br/>
                 3. 新增行程後，點擊「加入手機日曆提醒」以確保會響鈴。
               </p>
            </div>
          </div>
        ) : (
          <>
            {/* --- 概況卡片區 --- */}
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

            {/* --- 切換檢視模式 --- */}
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

            {/* --- 行程列表 --- */}
            <div className="space-y-6">
              {!user && (
                <div className="bg-[#FEF8E0] p-6 rounded-2xl border-2 border-[#EFBB24] text-[#B08600] text-xl font-bold flex items-center gap-3 shadow-sm">
                  <Cloud size={32} />
                  <span>為了保存您的資料，請點擊右上角登入 Google 帳號喔！</span>
                </div>
              )}

              {isDataLoading ? (
                <div className="text-center py-20 text-2xl text-gray-400 flex flex-col items-center gap-4">
                  <Loader2 size={64} className="animate-spin text-[#C25D48]"/>
                  正在雲端下載資料...
                </div>
              ) : filteredList.length === 0 ? (
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
            className={`pointer-events-auto w-full text-white py-6 rounded-3xl shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3
              ${user ? 'bg-[#007B43] hover:bg-[#005826]' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            <Plus size={48} />
            <span className="font-bold text-4xl tracking-widest">{user ? '新增行程' : '請先登入'}</span>
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