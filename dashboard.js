// dashboard.js
import { auth, database, ref, get, onValue } from './firebase.js';
import { authManager } from './auth.js';

class DashboardManager {
  constructor() {
    this.userData = null;
    this.init();
  }

  async init() {
    const user = await authManager.init();
    if (user) {
      await this.loadUserData(user.uid);
      this.setupEventListeners();
      this.setupSocialShare();
    } else {
      window.location.href = 'index.html';
    }
  }

  async loadUserData(userId) {
    try {
      const snapshot = await get(ref(database, 'users/' + userId));
      this.userData = snapshot.val();
      
      if (this.userData) {
        this.updateUserUI();
        this.loadRecentReferrals(userId);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  updateUserUI() {
    const usernameEl = document.getElementById('username');
    const userAvatar = document.getElementById('user-avatar');
    const pointsCount = document.getElementById('points-count');
    const joinDate = document.getElementById('join-date');
    const referralLink = document.getElementById('referral-link');
    
    if (usernameEl) usernameEl.textContent = this.userData.name;
    if (userAvatar) userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userData.name)}&background=random`;
    if (pointsCount) pointsCount.textContent = this.userData.points || '0';
    if (joinDate) joinDate.textContent = new Date(this.userData.joinDate).toLocaleDateString('ar-SA');
    if (referralLink) referralLink.value = `${window.location.origin}${window.location.pathname}?ref=${this.userData.referralCode}`;
    
    // تحميل عدد الإحالات
    this.loadReferralsCount(auth.currentUser.uid);
  }

  async loadReferralsCount(userId) {
    try {
      const snapshot = await get(ref(database, 'userReferrals/' + userId));
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById('referrals-count').textContent = count;
    } catch (error) {
      console.error("Error loading referrals count:", error);
    }
  }

  async loadRecentReferrals(userId) {
    try {
      const referralsRef = ref(database, 'userReferrals/' + userId);
      onValue(referralsRef, (snapshot) => {
        const referralsTable = document.getElementById('recent-referrals');
        
        if (!snapshot.exists()) {
          referralsTable.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد إحالات حتى الآن</td></tr>';
          return;
        }
        
        const referrals = snapshot.val();
        referralsTable.innerHTML = '';
        
        // عرض أحدث 5 إحالات فقط
        const recentReferrals = Object.entries(referrals)
          .sort((a, b) => new Date(b[1].joinDate) - new Date(a[1].joinDate))
          .slice(0, 5);
        
        recentReferrals.forEach(([userId, referralData]) => {
          const row = referralsTable.insertRow();
          row.innerHTML = `
            <td>${referralData.name}</td>
            <td>${referralData.email}</td>
            <td>${new Date(referralData.joinDate).toLocaleDateString('ar-SA')}</td>
            <td><span class="user-badge level-0">نشط</span></td>
          `;
        });
      });
    } catch (error) {
      console.error("Error loading recent referrals:", error);
    }
  }

  setupEventListeners() {
    // نسخ رابط الإحالة
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const referralLink = document.getElementById('referral-link');
        referralLink.select();
        document.execCommand('copy');
        alert('تم نسخ رابط الإحالة!');
      });
    }

    // تسجيل الخروج
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        authManager.handleLogout();
      });
    }
  }

  setupSocialShare() {
    // مشاركة على فيسبوك
    document.getElementById('share-fb').addEventListener('click', () => {
      const url = encodeURIComponent(document.getElementById('referral-link').value);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    });
    
    // مشاركة على تويتر
    document.getElementById('share-twitter').addEventListener('click', () => {
      const text = encodeURIComponent('انضم إلى هذا الموقع الرائع عبر رابط الإحالة الخاص بي!');
      const url = encodeURIComponent(document.getElementById('referral-link').value);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });
    
    // مشاركة على واتساب
    document.getElementById('share-whatsapp').addEventListener('click', () => {
      const text = encodeURIComponent('انضم إلى هذا الموقع الرائع عبر رابط الإحالة الخاص بي: ');
      const url = encodeURIComponent(document.getElementById('referral-link').value);
      window.open(`https://wa.me/?text=${text}${url}`, '_blank');
    });
  }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
});