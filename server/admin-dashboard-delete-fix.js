// أضف هذا التحسين لدالة حذف المستخدم في dashboard-admin.html

// ── User Actions (محسّن مع error handling) ──
async function _deleteUser(id){
  if(!confirm('حذف هذا المستخدم نهائياً؟ لا يمكن التراجع.')) return;
  
  try {
    // Show loading state
    var deleteBtn = event.target;
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'جاري الحذف...';
    deleteBtn.style.opacity = '0.6';
    
    var response = await _api('/api/admin/users/'+id, {method:'DELETE'});
    
    // Check if response indicates success
    if (response && (response.ok || response.deleted_user)) {
      toast('تم حذف المستخدم بنجاح', 'success');
      // Refresh both provider and client lists
      loadProviders(); 
      loadClients();
    } else if (response && response.message) {
      // Show server error message
      toast(response.message, 'error');
    } else {
      // Generic error
      toast('حدث خطأ في الحذف', 'error');
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
    toast('فشل في الاتصال بالخادم', 'error');
  } finally {
    // Reset button state
    var deleteBtn = event.target;
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'حذف';
      deleteBtn.style.opacity = '1';
    }
  }
}

// ── Bulk Delete Function (جديد) ──
async function _bulkDeleteUsers(role) {
  var users = role === 'client' ? _clients : _provs;
  if (!users.length) {
    toast('لا يوجد ' + (role === 'client' ? 'عملاء' : 'مزودون') + ' للحذف', 'error');
    return;
  }
  
  var confirmation = prompt(
    'اكتب "حذف الكل" لتأكيد حذف جميع ' + (role === 'client' ? 'العملاء' : 'المزودين') + 
    ' (' + users.length + ' مستخدم)\n\nهذا الإجراء لا يمكن التراجع عنه:'
  );
  
  if (confirmation !== 'حذف الكل') {
    toast('تم إلغاء العملية', 'info');
    return;
  }
  
  try {
    var userIds = users.map(function(u) { return u.id; });
    var response = await _api('/api/admin/users/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ user_ids: userIds, role: role })
    });
    
    if (response && (response.ok || response.deleted_count >= 0)) {
      toast('تم حذف ' + (response.deleted_count || users.length) + ' مستخدم', 'success');
      loadProviders();
      loadClients();
    } else {
      toast(response.message || 'حدث خطأ في الحذف المتعدد', 'error');
    }
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    toast('فشل في الحذف المتعدد', 'error');
  }
}

// ── Enhanced API function with better error handling ──
function _api(path, opts) {
  return fetch(API + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + _token,
      'Content-Type': 'application/json'
    }
  }, opts || {}))
  .then(function(response) {
    // Log response for debugging
    console.log('API Response:', response.status, path);
    
    if (!response.ok) {
      // Handle HTTP error statuses
      if (response.status === 404) {
        throw new Error('المستخدم غير موجود');
      } else if (response.status === 403) {
        throw new Error('غير مسموح بهذا الإجراء');
      } else if (response.status === 401) {
        throw new Error('يجب تسجيل الدخول مرة أخرى');
      } else if (response.status >= 500) {
        throw new Error('خطأ في الخادم');
      }
    }
    
    return response.json();
  })
  .catch(function(error) {
    console.error('API Error:', error);
    // Return error object instead of empty object
    return { 
      error: true, 
      message: error.message || 'حدث خطأ في الاتصال'
    };
  });
}

// ── Add bulk delete buttons to UI ──
function _renderProviders(list) {
  var pg = _el('page-providers'); 
  if (!pg) return;
  
  pg.innerHTML =
    '<div class="pghd">' +
      '<div>' +
        '<div class="pg-t">المزودون</div>' +
        '<div class="pg-s">' + list.length + ' مزود خدمة</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="_bulkDeleteUsers(\'provider\')" style="padding:8px 16px;background:var(--red-l);color:var(--red);border:1px solid #fecaca;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">حذف الكل</button>' +
        '<button onclick="loadProviders()" style="padding:8px 16px;background:var(--p-light);color:var(--p);border:1px solid var(--p-mid);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">تحديث</button>' +
      '</div>' +
    '</div>' +
    '<div class="card card-accent"><div class="cb">' +
      '<input type="text" id="prov-search" placeholder="ابحث بالاسم أو البريد..." oninput="_filterProviders()" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;margin-bottom:14px">' +
      '<div id="prov-list">' + _provList(list) + '</div>' +
    '</div></div>';
}

function _renderClients(list) {
  var pg = _el('page-clients');
  if (!pg) return;
  
  pg.innerHTML =
    '<div class="pghd">' +
      '<div>' +
        '<div class="pg-t">العملاء</div>' +
        '<div class="pg-s">' + list.length + ' عميل</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="_bulkDeleteUsers(\'client\')" style="padding:8px 16px;background:var(--red-l);color:var(--red);border:1px solid #fecaca;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">حذف الكل</button>' +
        '<button onclick="loadClients()" style="padding:8px 16px;background:var(--p-light);color:var(--p);border:1px solid var(--p-mid);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">تحديث</button>' +
      '</div>' +
    '</div>' +
    '<div class="card card-accent"><div class="cb">' +
      '<input type="text" id="cli-search" placeholder="ابحث بالاسم أو البريد..." oninput="_filterClients()" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;margin-bottom:14px">' +
      '<div id="cli-list">' + _cliList(list) + '</div>' +
    '</div></div>';
}

// ── Debug function (مؤقت لاختبار الـ API) ──
function _testDeleteAPI() {
  console.log('Testing delete API...');
  _api('/api/admin/users/999', {method:'DELETE'})
    .then(function(response) {
      console.log('Delete API test response:', response);
      if (response.error) {
        toast('خطأ في الـ API: ' + response.message, 'error');
      } else {
        toast('الـ API يعمل، لكن المستخدم 999 غير موجود', 'info');
      }
    });
}

// استدعي هذه الدالة من console لاختبار الاتصال:
// _testDeleteAPI()
