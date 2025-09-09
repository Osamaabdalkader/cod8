// admin.js
import { auth, database, ref, get, update, onValue } from './firebase.js';
import { authManager } from './auth.js';
import { searchUsers, addPointsToUser, getAllUsers } from './firebase.js';

class AdminManager {
    constructor() {
        this.selectedUser = null;
        this.init();
    }

    async init() {
        // التحقق من صلاحية المشرف
        const hasAccess = await authManager.checkAdminAccess();
        if (!hasAccess) return;

        this.loadAllUsers();
        this.setupEventListeners();
    }

    async loadAllUsers() {
        try {
            const users = await getAllUsers();
            this.displayUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async searchUsers() {
        const searchTerm = document.getElementById('search-input').value;
        const rankFilter = document.getElementById('rank-filter').value;
        
        try {
            const results = await searchUsers(searchTerm, rankFilter);
            this.displayUsers(results);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    displayUsers(users) {
        const usersTable = document.getElementById('users-table');
        usersTable.innerHTML = '';

        if (!users || Object.keys(users).length === 0) {
            usersTable.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد نتائج</td></tr>';
            return;
        }

        const rankTitles = [
            "مبتدئ", "عضو", "عضو متميز", "عضو نشيط", "عضو فعال",
            "عضو برونزي", "عضو فضي", "عضو ذهبي", "عضو بلاتيني", "عضو ماسي", "قائد"
        ];

        Object.entries(users).forEach(([userId, user]) => {
            const row = usersTable.insertRow();
            row.innerHTML = `
                <td>${user.name || 'غير معروف'}</td>
                <td>${user.email || 'غير معروف'}</td>
                <td><span class="user-badge level-${user.rank || 0}">${rankTitles[user.rank || 0]} (${user.rank || 0})</span></td>
                <td>${user.points || 0}</td>
                <td>${user.isAdmin ? 'نعم' : 'لا'}</td>
                <td>${new Date(user.joinDate).toLocaleDateString('ar-SA')}</td>
                <td>
                    <button class="action-btn select-user" data-userid="${userId}">
                        <i class="fas fa-user-edit"></i> تحديد
                    </button>
                </td>
            `;
        });

        // إضافة event listeners للأزرار
        document.querySelectorAll('.select-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.select-user').dataset.userid;
                this.selectUser(userId, users[userId]);
            });
        });
    }

    selectUser(userId, userData) {
        this.selectedUser = { id: userId, ...userData };
        this.displayUserDetails();
    }

    displayUserDetails() {
        const userDetails = document.getElementById('user-details');
        const rankTitles = [
            "مبتدئ", "عضو", "عضو متميز", "عضو نشيط", "عضو فعال",
            "عضو برونزي", "عضو فضي", "عضو ذهبي", "عضو بلاتيني", "عضو ماسي", "قائد"
        ];

        userDetails.innerHTML = `
            <h3>تفاصيل المستخدم</h3>
            <div class="user-info-card">
                <p><strong>الاسم:</strong> ${this.selectedUser.name}</p>
                <p><strong>البريد الإلكتروني:</strong> ${this.selectedUser.email}</p>
                <p><strong>المرتبة:</strong> ${rankTitles[this.selectedUser.rank || 0]} (${this.selectedUser.rank || 0})</p>
                <p><strong>النقاط:</strong> ${this.selectedUser.points || 0}</p>
                <p><strong>مشرف:</strong> ${this.selectedUser.isAdmin ? 'نعم' : 'لا'}</p>
                <p><strong>تاريخ الانضمام:</strong> ${new Date(this.selectedUser.joinDate).toLocaleDateString('ar-SA')}</p>
                
                <div class="admin-actions">
                    <h4>الإجراءات الإدارية</h4>
                    <div class="add-points-form">
                        <input type="number" id="points-to-add" placeholder="عدد النقاط" min="1">
                        <button class="action-btn" onclick="adminManager.addPoints()">
                            <i class="fas fa-plus"></i> إضافة نقاط
                        </button>
                    </div>
                    
                    <div class="admin-toggle">
                        <label>
                            <input type="checkbox" id="admin-toggle" ${this.selectedUser.isAdmin ? 'checked' : ''}>
                            صلاحية المشرف
                        </label>
                        <button class="action-btn" onclick="adminManager.toggleAdmin()">
                            <i class="fas fa-user-shield"></i> تحديث
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async addPoints() {
        if (!this.selectedUser) {
            alert('يرجى تحديد مستخدم أولاً');
            return;
        }

        const pointsInput = document.getElementById('points-to-add');
        const pointsToAdd = parseInt(pointsInput.value);

        if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
            alert('يرجى إدخال عدد صحيح موجب من النقاط');
            return;
        }

        try {
            await addPointsToUser(this.selectedUser.id, pointsToAdd, auth.currentUser.uid);
            alert(`تمت إضافة ${pointsToAdd} نقطة للمستخدم ${this.selectedUser.name}`);
            
            // تحديث البيانات
            pointsInput.value = '';
            this.loadAllUsers();
            this.selectUser(this.selectedUser.id, { ...this.selectedUser, points: (this.selectedUser.points || 0) + pointsToAdd });
        } catch (error) {
            alert(`خطأ: ${error.message}`);
        }
    }

    async toggleAdmin() {
        if (!this.selectedUser) {
            alert('يرجى تحديد مستخدم أولاً');
            return;
        }

        const adminToggle = document.getElementById('admin-toggle');
        const isAdmin = adminToggle.checked;

        try {
            await update(ref(database, `users/${this.selectedUser.id}`), {
                isAdmin: isAdmin
            });

            alert(`تم ${isAdmin ? 'منح' : 'سحب'} صلاحية المشرف من ${this.selectedUser.name}`);
            this.loadAllUsers();
            this.selectUser(this.selectedUser.id, { ...this.selectedUser, isAdmin });
        } catch (error) {
            alert(`خطأ: ${error.message}`);
        }
    }

    setupEventListeners() {
        document.getElementById('search-btn').addEventListener('click', () => this.searchUsers());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });
        document.getElementById('rank-filter').addEventListener('change', () => this.searchUsers());
    }
}

// تهيئة النظام عند تحميل الصفحة
const adminManager = new AdminManager();
