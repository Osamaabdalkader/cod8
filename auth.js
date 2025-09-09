// auth.js - الملف المشترك للمصادقة
import { auth, onAuthStateChanged, signOut } from './firebase.js';
import { checkAdminStatus } from './firebase.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.isAdmin = false;
  }

  async init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        if (user) {
          // التحقق من صلاحية المشرف
          this.isAdmin = await checkAdminStatus(user.uid);
          resolve(user);
        } else {
          this.isAdmin = false;
          resolve(null);
        }
      });
    });
  }

  async handleLogout() {
    try {
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  updateAuthUI(isLoggedIn) {
    const authElements = document.querySelectorAll('.auth-only');
    const unauthElements = document.querySelectorAll('.unauth-only');
    const adminElements = document.querySelectorAll('.admin-only');
    
    if (isLoggedIn) {
      authElements.forEach(el => el.style.display = 'block');
      unauthElements.forEach(el => el.style.display = 'none');
      
      // إظهار عناصر المشرفين فقط إذا كان المستخدم مشرفاً
      if (this.isAdmin) {
        adminElements.forEach(el => el.style.display = 'block');
      } else {
        adminElements.forEach(el => el.style.display = 'none');
      }
    } else {
      authElements.forEach(el => el.style.display = 'none');
      adminElements.forEach(el => el.style.display = 'none');
      unauthElements.forEach(el => el.style.display = 'block');
    }
  }

  showAlert(element, type, message) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }

  // التحقق من صلاحية المشرف
  async checkAdminAccess() {
    if (!this.currentUser) {
      window.location.href = 'index.html';
      return false;
    }
    
    this.isAdmin = await checkAdminStatus(this.currentUser.uid);
    
    if (!this.isAdmin) {
      alert('ليست لديك صلاحية الوصول إلى هذه الصفحة');
      window.location.href = 'index.html';
      return false;
    }
    
    return true;
  }
}

export const authManager = new AuthManager();
