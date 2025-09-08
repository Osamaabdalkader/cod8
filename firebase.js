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
    
    if (!userData) return false;
    
    const currentRank = userData.rank || 0;
    const userPoints = userData.points || 0;
    
    console.log(`التحقق من ترقيات المستخدم: ${userId}, النقاط: ${userPoints}, المرتبة الحالية: ${currentRank}`);
    
    // التحقق من متطلبات كل مرتبة
    let newRank = currentRank;
    
    // المرتبة 1: 100 نقطة
    if (currentRank === 0 && userPoints >= 100) {
      newRank = 1;
      console.log(`المستخدم مؤهل للترقية إلى المرتبة 1`);
    }
    
    // إذا تمت ترقية المستخدم، تحديث البيانات
    if (newRank !== currentRank) {
      console.log(`ترقية المستخدم من المرتبة ${currentRank} إلى ${newRank}`);
      await update(userRef, {
        rank: newRank,
        lastPromotion: new Date().toISOString()
      });
      
      // بعد الترقية، تحقق من ترقية المُحيل إذا لزم الأمر
      if (userData.referredBy) {
        console.log(`المستخدم تمت إحالته بواسطة ${userData.referredBy}. التحقق من ترقيات الفريق...`);
        await checkTeamPromotions(userData.referredBy, newRank);
      }
      
      return true; // تمت ترقية
    }
    
    return false; // لم يتم ترقية
  } catch (error) {
    console.error("Error checking promotions:", error);
    return false;
  }
};

// التحقق من ترقية المُحيل بناءً على ترقية أحد أفراد الفريق
const checkTeamPromotions = async (referrerId, teamMemberRank) => {
  try {
    console.log(`التحقق من ترقيات فريق المستخدم: ${referrerId}, مرتبة العضو: ${teamMemberRank}`);
    
    const referrerRef = ref(database, 'users/' + referrerId);
    const referrerSnapshot = await get(referrerRef);
    const referrerData = referrerSnapshot.val();
    
    if (!referrerData) return;
    
    const currentRank = referrerData.rank || 0;
    
    console.log(`مرتبة المحيل الحالية: ${currentRank}`);
    
    // التحقق من جميع المراتب الممكنة للترقية
    for (let targetRank = currentRank + 1; targetRank <= 10; targetRank++) {
      // المرتبة المطلوبة للفريق هي targetRank - 1
      const requiredTeamRank = targetRank - 1;
      
      // الحصول على جميع أفراد الفريق
      const teamRef = ref(database, 'userReferrals/' + referrerId);
      const teamSnapshot = await get(teamRef);
      
      if (!teamSnapshot.exists()) {
        console.log("لا يوجد أعضاء في الفريق");
        continue;
      }
      
      const teamMembers = teamSnapshot.val();
      let qualifiedMembers = 0;
      
      console.log(`التحقق من ترقية إلى المرتبة ${targetRank}, يتطلب فريقًا بمرتبة ${requiredTeamRank} على الأقل`);
      console.log(`عدد أفراد الفريق: ${Object.keys(teamMembers).length}`);
      
      // التحقق من عدد أفراد الفريق الذين حققوا المرتبة المطلوبة
      for (const memberId in teamMembers) {
        const memberRef = ref(database, 'users/' + memberId);
        const memberSnapshot = await get(memberRef);
        
        if (memberSnapshot.exists()) {
          const memberData = memberSnapshot.val();
          const memberRank = memberData.rank || 0;
          
          if (memberRank >= requiredTeamRank) {
            qualifiedMembers++;
            console.log(`عضو مؤهل: ${memberId} (المرتبة ${memberRank})`);
          }
        }
      }
      
      // إذا كان هناك 3 أفراد مؤهلين، ترقية المُحيل
      if (qualifiedMembers >= 3) {
        console.log(`تم العثور على ${qualifiedMembers} أعضاء مؤهلين للترقية إلى المرتبة ${targetRank}`);
        
        await update(referrerRef, {
          rank: targetRank,
          lastPromotion: new Date().toISOString()
        });
        
        console.log(`تم ترقية المحيل ${referrerId} إلى المرتبة ${targetRank}`);
        
        // تحقق من ترقية المُحيل الأعلى إذا لزم الأمر
        if (referrerData.referredBy) {
          console.log(`التحقق من ترقية المحيل الأعلى: ${referrerData.referredBy}`);
          await checkTeamPromotions(referrerData.referredBy, targetRank);
        }
        
        break; // توقف بعد أول ترقية ناجحة
      } else {
        console.log(`أعضاء مؤهلون: ${qualifiedMembers}/3 - لا توجد ترقية إلى المرتبة ${targetRank}`);
      }
    }
  } catch (error) {
    console.error("Error checking team promotions:", error);
  }
};

// دالة لزيادة النقاط والتحقق من الترقية
const addPointsAndCheckPromotion = async (userId, pointsToAdd) => {
  try {
    const userRef = ref(database, 'users/' + userId);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) return;
    
    const userData = userSnapshot.val();
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + pointsToAdd;
    
    // تحديث النقاط
    await update(userRef, {
      points: newPoints
    });
    
    console.log(`تمت إضافة ${pointsToAdd} نقطة للمستخدم ${userId}. النقاط الجديدة: ${newPoints}`);
    
    // التحقق من الترقية بعد إضافة النقاط
    await checkPromotions(userId);
    
  } catch (error) {
    console.error("Error adding points:", error);
  }
};

// تصدير الكائنات لاستخدامها في ملفات أخرى
export { 
  app, analytics, auth, database, storage,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  ref, set, push, onValue, serverTimestamp, update, remove, query, orderByChild, equalTo, get, child,
  storageRef, uploadBytesResumable, getDownloadURL,
  checkPromotions, checkTeamPromotions, addPointsAndCheckPromotion
};
