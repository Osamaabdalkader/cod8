// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  serverTimestamp, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo,
  get,
  child
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzYZMxqNmnLMGYnCyiJYPg2MbxZMt0co0",
  authDomain: "osama-91b95.firebaseapp.com",
  databaseURL: "https://osama-91b95-default-rtdb.firebaseio.com",
  projectId: "osama-91b95",
  storageBucket: "osama-91b95.appspot.com",
  messagingSenderId: "118875905722",
  appId: "1:118875905722:web:200bff1bd99db2c1caac83",
  measurementId: "G-LEM5PVPJZC"
};

// Initialize Firebase
let app;
let analytics;
let auth;
let database;
let storage;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  database = getDatabase(app);
  storage = getStorage(app);
  
  // جعل حالة تسجيل الدخول تستمر خلال الجلسة
  setPersistence(auth, browserSessionPersistence)
    .catch((error) => {
      console.error("Error setting persistence:", error);
    });
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// دالة للتحقق من الترقيات
const checkPromotions = async (userId) => {
  try {
    const userRef = ref(database, 'users/' + userId);
    const userSnapshot = await get(userRef);
    const userData = userSnapshot.val();
    
    if (!userData) return;
    
    const currentRank = userData.rank || 0;
    const userPoints = userData.points || 0;
    
    // التحقق من متطلبات كل مرتبة
    let newRank = currentRank;
    
    // المرتبة 1: 100 نقطة
    if (currentRank === 0 && userPoints >= 100) {
      newRank = 1;
    }
    
    // إذا تمت ترقية المستخدم، تحديث البيانات
    if (newRank !== currentRank) {
      await update(userRef, {
        rank: newRank,
        lastPromotion: new Date().toISOString()
      });
      
      // بعد الترقية، تحقق من ترقية المُحيل إذا لزم الأمر
      if (userData.referredBy) {
        await checkTeamPromotions(userData.referredBy, newRank);
      }
    }
  } catch (error) {
    console.error("Error checking promotions:", error);
  }
};

// التحقق من ترقية المُحيل بناءً على ترقية أحد أفراد الفريق
const checkTeamPromotions = async (referrerId, teamMemberRank) => {
  try {
    const referrerRef = ref(database, 'users/' + referrerId);
    const referrerSnapshot = await get(referrerRef);
    const referrerData = referrerSnapshot.val();
    
    if (!referrerData) return;
    
    const currentRank = referrerData.rank || 0;
    
    // إذا كانت مرتبة المُحيل أقل من المرتبة المطلوبة للترقية، لا داعي للتحقق
    if (currentRank <= teamMemberRank) {
      // الحصول على جميع أفراد الفريق
      const teamRef = ref(database, 'userReferrals/' + referrerId);
      const teamSnapshot = await get(teamRef);
      
      if (!teamSnapshot.exists()) return;
      
      const teamMembers = teamSnapshot.val();
      let qualifiedMembers = 0;
      
      // التحقق من عدد أفراد الفريق الذين حققوا المرتبة المطلوبة
      for (const memberId in teamMembers) {
        const memberRef = ref(database, 'users/' + memberId);
        const memberSnapshot = await get(memberRef);
        const memberData = memberSnapshot.val();
        
        if (memberData && memberData.rank >= teamMemberRank) {
          qualifiedMembers++;
        }
      }
      
      // إذا كان هناك 3 أفراد مؤهلين، ترقية المُحيل
      if (qualifiedMembers >= 3 && currentRank === teamMemberRank) {
        const newRank = currentRank + 1;
        await update(referrerRef, {
          rank: newRank,
          lastPromotion: new Date().toISOString()
        });
        
        // تحقق من ترقية المُحيل الأعلى إذا لزم الأمر
        if (referrerData.referredBy && newRank > 0) {
          await checkTeamPromotions(referrerData.referredBy, newRank);
        }
      }
    }
  } catch (error) {
    console.error("Error checking team promotions:", error);
  }
};

// تصدير الكائنات لاستخدامها في ملفات أخرى
export { 
  app, analytics, auth, database, storage,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  ref, set, push, onValue, serverTimestamp, update, remove, query, orderByChild, equalTo, get, child,
  storageRef, uploadBytesResumable, getDownloadURL,
  checkPromotions, checkTeamPromotions
};
