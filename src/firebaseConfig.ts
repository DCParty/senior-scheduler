// 引入 Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- 請將下方的字串替換為您在 Firebase Console 取得的真實金鑰 ---
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

// 匯出功能供 App 使用
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);