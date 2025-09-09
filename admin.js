// admin.js
import { auth, database, ref, get, update, query, orderByChild, equalTo } from './firebase.js';
import { checkAdminAccess } from './firebase.js';
import { authManager } from './auth.js';

class AdminManager {
    constructor() {
        this.selectedUser = null;
        this.init();
    }

    async init() {
        const user = await authManager.init();
        if (user) {
            // التحقق من صلاحية المشرف
            const isAdmin = await checkAdminAccess(user.uid);
            if (!isAdmin) {
                alert('ليس لديك صلاحية للوصول إلى هذه الصفحة');
                window.location.href = 'index.html';
                return;
            }

            await this.loadUserData(user.uid);
            this.loadAllUsers();
            this.setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    }

    async loadUserData(userId) {
        try {
            const snapshot = await get(ref(database, 'users/' + userId));
            const userData = snapshot.val();
            
            if (userData) {
                const usernameEl = document.getElementById('username');
                const userAvatar = document.getElementById('user-avatar');
                
                if (usernameEl) usernameEl.textContent = userData.name;
                if (userAvatar) userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }

    async loadAllUsers() {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            
            if (!snapshot.exists()) {
                document.getElementById('admin-users-list').innerHTML = '<div class="empty-state">لا يوجد مستخدمين</div>';
                return;
            }
            
            this.allUsers = snapshot.val();
            this.displayUsers(this.allUsers);
        } catch (error) {
            console.error("Error loading users:", error);
        }
    }

    displayUsers(users) {
        const usersList = document.getElementById('admin-users-list');
        usersList.innerHTML = '';
        
        const rankTitles = [
            "مبتدئ", "عضو", "عضو متميز", "عضو نشيط", "عضو فعال",
            "عضو برونزي", "عضو فضي", "عضو ذهبي", "عضو بلاتيني", "عضو ماسي", "قائد"
        ];
        
        Object.entries(users).forEach(([userId, userData]) => {
            const userRank = userData.rank || 0;
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-info">
                    <h4>${userData.name}</h4>
                    <p>${userData.email}</p>
                    <span class="user-badge level-${userRank}">${rankTitles[userRank]} (${userRank})</span>
                    <span class="points">${userData.points || 0} نقطة</span>
                </div>
                <button class="select-user-btn" data-userid="${userId}">اختيار</button>
            `;
            usersList.appendChild(userElement);
        });
        
        // إضافة event listeners لأزرار الاختيار
        document.querySelectorAll('.select-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-userid');
                this.selectUser(userId);
            });
        });
    }

    async selectUser(userId) {
        try {
            const snapshot = await get(ref(database, 'users/' + userId));
            if (!snapshot.exists()) return;
            
            this.selectedUser = { id: userId, ...snapshot.val() };
            this.displayUserDetails();
        } catch (error) {
            console.error("Error selecting user:", error);
        }
    }

    displayUserDetails() {
        const userDetails = document.getElementById('admin-user-details');
        const userInfo = document.getElementById('selected-user-info');
        
        const rankTitles = [
            "مبتدئ", "عضو", "عضو متميز", "عضو نشيط", "عضو فعال",
            "عضو برونزي", "عضو فضي", "عضو ذهبي", "عضو بلاتيني", "عضو ماسي", "قائد"
        ];
        
        userInfo.innerHTML = `
            <div class="user-detail-card">
                <h4>${this.selectedUser.name}</h4>
                <p><strong>البريد الإلكتروني:</strong> ${this.selectedUser.email}</p>
                <p><strong>المرتبة:</strong> <span class="user-badge level-${this.selectedUser.rank || 0}">${rankTitles[this.selectedUser.rank || 0]} (${this.selectedUser.rank || 0})</span></p>
                <p><strong>النقاط:</strong> ${this.selectedUser.points || 0}</p>
                <p><strong>تاريخ الانضمام:</strong> ${new Date(this.selectedUser.joinDate).toLocaleDateString('ar-SA')}</p>
                <p><strong>رمز الإحالة:</strong> ${this.selectedUser.referralCode || 'لا يوجد'}</p>
                ${this.selectedUser.referredBy ? `<p><strong>تمت إحالته بواسطة:</strong> ${this.selectedUser.referredBy}</p>` : ''}
            </div>
        `;
        
        userDetails.style.display = 'block';
        
        // تعيين القيم الافتراضية
        document.getElementById('set-rank').value = this.selectedUser.rank || 0;
    }

    setupEventListeners() {
        // البحث
        document.getElementById('admin-search-btn').addEventListener('click', () => {
            this.filterUsers();
        });

        // إضافة نقاط
        document.getElementById('add-points-btn').addEventListener('click', () => {
            this.addPoints();
        });

        // تعيين المرتبة
        document.getElementById('set-rank-btn').addEventListener('click', () => {
            this.setRank();
        });

        // تسجيل الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authManager.handleLogout();
            });
        }
    }

    filterUsers() {
        const searchTerm = document.getElementById('admin-search').value.toLowerCase();
        const rankFilter = document.getElementById('admin-rank-filter').value;
        
        let filteredUsers = { ...this.allUsers };
        
        // التصفية حسب البحث
        if (searchTerm) {
            Object.keys(filteredUsers).forEach(userId => {
                const user = filteredUsers[userId];
                if (!user.name.toLowerCase().includes(searchTerm) && 
                    !user.email.toLowerCase().includes(searchTerm)) {
                    delete filteredUsers[userId];
                }
            });
        }
        
        // التصفية حسب المرتبة
        if (rankFilter !== '') {
            Object.keys(filteredUsers).forEach(userId => {
                const user = filteredUsers[userId];
                if (user.rank != rankFilter) {
                    delete filteredUsers[userId];
                }
            });
        }
        
        this.displayUsers(filteredUsers);
    }

    async addPoints() {
        if (!this.selectedUser) return;
        
        const pointsToAdd = parseInt(document.getElementById('add-points').value);
        if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
            alert('يرجى إدخال عدد صحيح موجب من النقاط');
            return;
        }
        
        try {
            const userRef = ref(database, 'users/' + this.selectedUser.id);
            const currentPoints = this.selectedUser.points || 0;
            const newPoints = currentPoints + pointsToAdd;
            
            await update(userRef, {
                points: newPoints
            });
            
            alert(`تمت إضافة ${pointsToAdd} نقطة للمستخدم ${this.selectedUser.name}`);
            
            // تحديث بيانات المستخدم المحدد
            this.selectedUser.points = newPoints;
            this.displayUserDetails();
            
        } catch (error) {
            console.error("Error adding points:", error);
            alert('حدث خطأ أثناء إضافة النقاط');
        }
    }

    async setRank() {
        if (!this.selectedUser) return;
        
        const newRank = parseInt(document.getElementById('set-rank').value);
        if (isNaN(newRank) || newRank < 0 || newRank > 10) {
            alert('يرجى اختيار مرتبة صحيحة بين 0 و 10');
            return;
        }
        
        try {
            const userRef = ref(database, 'users/' + this.selectedUser.id);
            
            await update(userRef, {
                rank: newRank,
                lastPromotion: new Date().toISOString()
            });
            
            alert(`تم تعيين مرتبة ${newRank} للمستخدم ${this.selectedUser.name}`);
            
            // تحديث بيانات المستخدم المحدد
            this.selectedUser.rank = newRank;
            this.displayUserDetails();
            
        } catch (error) {
            console.error("Error setting rank:", error);
            alert('حدث خطأ أثناء تعيين المرتبة');
        }
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new AdminManager();
});
