// استبدل دالة _deleteUser في dashboard-admin.html بهذا الكود المحسّن:

async function _deleteUser(id, userName) {
  // أولاً اجلب إحصائيات المستخدم
  try {
    var stats = await _api('/api/admin/users/' + id + '/stats');
    var statsMsg = '';
    if (stats && stats.stats) {
      var s = stats.stats;
      var total = parseInt(s.bids_count || 0) + parseInt(s.requests_count || 0) + parseInt(s.reviews_count || 0);
      if (total > 0) {
        statsMsg = '\n\nسيتم حذف أيضاً:\n';
        if (s.bids_count > 0) statsMsg += '• ' + s.bids_count + ' عرض\n';
        if (s.requests_count > 0) statsMsg += '• ' + s.requests_count + ' مشروع\n';
        if (s.reviews_count > 0) statsMsg += '• ' + s.reviews_count + ' تقييم\n';
        if (s.messages_count > 0) statsMsg += '• ' + s.messages_count + ' رسالة\n';
        statsMsg += '\n⚠️ هذا الإجراء لا يمكن التراجع عنه!';
      }
    }
  } catch (error) {
    console.log('Could not fetch user stats:', error);
  }
  
  var confirmMsg = 'حذف المستخدم "' + (userName || 'المستخدم') + '" نهائياً؟' + (statsMsg || '');
  if (!confirm(confirmMsg)) return;
  
  // إظهار حالة التحميل
  var deleteBtn = event.target;
  var originalText = deleteBtn.textContent;
  var originalStyle = {
    disabled: deleteBtn.disabled,
    opacity: deleteBtn.style.opacity,
    background: deleteBtn.style.background
  };
  
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'جاري الحذف...';
  deleteBtn.style.opacity = '0.6';
  deleteBtn.style.background = 'var(--muted)';
  
  try {
    console.log('Attempting to delete user:', id);
    var response = await _api('/api/admin/users/' + id, { method: 'DELETE' });
    
    console.log('Delete response:', response);
    
    if (response && response.ok) {
      // نجح الحذف
      var message = 'تم حذف المستخدم بنجاح';
      if (response.cleanup_stats) {
        var cs = response.cleanup_stats;
        var cleanupTotal = (cs.bids_deleted || 0) + (cs.requests_deleted || 0) + (cs.reviews_deleted || 0);
        if (cleanupTotal > 0) {
          message += ' (حُذف أيضاً ' + cleanupTotal + ' عنصر مرتبط)';
        }
      }
      
      toast(message, 'success');
      
      // إزالة صف المستخدم من الجدول فوراً
      var userRow = deleteBtn.closest('[style*="border"]');
      if (userRow) {
        userRow.style.transition = 'all 0.3s ease';
        userRow.style.opacity = '0';
        userRow.style.transform = 'scale(0.9)';
        setTimeout(function() { 
          if (userRow.parentNode) userRow.parentNode.removeChild(userRow);
        }, 300);
      }
      
      // تحديث القوائم
      setTimeout(function() {
        loadProviders();
        loadClients();
      }, 500);
      
    } else if (response && response.message) {
      // خطأ من الخادم
      toast(response.message, 'error');
    } else {
      // خطأ غير معروف
      toast('حدث خطأ غير متوقع في الحذف', 'error');
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
    var errorMsg = 'فشل في الاتصال بالخادم';
    if (error.message) {
      errorMsg += ': ' + error.message;
    }
    toast(errorMsg, 'error');
  } finally {
    // إعادة تعيين حالة الزر
    deleteBtn.disabled = originalStyle.disabled;
    deleteBtn.textContent = originalText;
    deleteBtn.style.opacity = originalStyle.opacity;
    deleteBtn.style.background = originalStyle.background;
  }
}

// دالة حذف متعدد محسّنة
async function _bulkDeleteUsers(role) {
  var users = role === 'client' ? _clients : _provs;
  var roleArabic = role === 'client' ? 'العملاء' : 'المزودين';
  
  if (!users || !users.length) {
    toast('لا يوجد ' + roleArabic + ' للحذف', 'info');
    return;
  }
  
  var confirmationText = 'حذف جميع ' + roleArabic;
  var userConfirmation = prompt(
    'اكتب "' + confirmationText + '" بالضبط لتأكيد حذف جميع ' + roleArabic + 
    ' (' + users.length + ' مستخدم)\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!\n\n' +
    'سيتم حذف جميع المشاريع والعروض والتقييمات المرتبطة:'
  );
  
  if (userConfirmation !== confirmationText) {
    toast('تم إلغاء العملية', 'info');
    return;
  }
  
  // إظهار شريط التقدم
  var progressMsg = 'جاري حذف ' + users.length + ' مستخدم...';
  toast(progressMsg, 'info');
  
  try {
    var userIds = users.map(function(u) { return u.id; });
    var response = await _api('/api/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, role: role })
    });
    
    if (response && response.ok) {
      var deletedCount = response.deleted_count || 0;
      var successMsg = 'تم حذف ' + deletedCount + ' مستخدم من ' + roleArabic;
      if (deletedCount < users.length) {
        successMsg += ' (فشل في حذف ' + (users.length - deletedCount) + ' مستخدم)';
      }
      toast(successMsg, 'success');
      
      // تحديث القوائم
      loadProviders();
      loadClients();
    } else {
      toast(response.message || 'حدث خطأ في الحذف المتعدد', 'error');
    }
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    toast('فشل في الحذف المتعدد: ' + error.message, 'error');
  }
}

// تحسين دالة _api للحصول على معلومات أكثر تفصيلاً
function _api(path, opts) {
  var fullUrl = API + path;
  console.log('API call:', opts?.method || 'GET', fullUrl);
  
  return fetch(fullUrl, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + _token,
      'Content-Type': 'application/json'
    }
  }, opts || {}))
  .then(function(response) {
    console.log('API response:', response.status, response.statusText, fullUrl);
    
    if (!response.ok) {
      // معالجة رموز الخطأ المختلفة
      var errorMsg;
      switch (response.status) {
        case 400: errorMsg = 'طلب غير صحيح'; break;
        case 401: errorMsg = 'يجب تسجيل الدخول مرة أخرى'; break;
        case 403: errorMsg = 'غير مسموح بهذا الإجراء'; break;
        case 404: errorMsg = 'المستخدم غير موجود'; break;
        case 500: errorMsg = 'خطأ في الخادم'; break;
        default: errorMsg = 'خطأ غير معروف (' + response.status + ')';
      }
      throw new Error(errorMsg);
    }
    
    return response.json();
  })
  .catch(function(error) {
    console.error('API Error:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('لا يمكن الاتصال بالخادم. تحقق من الاتصال.');
    }
    throw error;
  });
}

// تحديث دالة عرض المستخدمين لتمرير الاسم مع الحذف
function _provList(list) {
  if (!list.length) return _empty('لا يوجد مزودون', '');
  return list.map(function(p) {
    var active = p.is_active !== false;
    var badgeColors = {'موثق':'#2563eb,#dbeafe','محترف':'#7c3aed,#f3e8ff','مميز':'#d97706,#fde68a','خبير':'#dc2626,#fee2e2','ذهبي':'#d97706,#fef3c7','none':''};
    var bc = badgeColors[p.badge] || '';
    var badgeHtml = p.badge && p.badge !== 'none' ? '<span style="background:' + bc.split(',')[1] + ';color:' + bc.split(',')[0] + ';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800">' + p.badge + '</span>' : '';
    
    return '<div style="background:' + (active ? 'var(--white)' : 'var(--bg)') + ';border:1.5px solid ' + (active ? 'var(--border)' : '#e5e5e5') + ';border-radius:12px;padding:12px;margin-bottom:8px;opacity:' + (active ? '1' : '.7') + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<div style="font-size:13px;font-weight:800;color:var(--text)">' + _esc(p.name || '—') + '</div>' +
            badgeHtml +
          '</div>' +
          '<div style="font-size:11px;color:var(--muted);margin-bottom:3px">' + _esc(p.email || '—') + '</div>' +
          '<div style="font-size:10px;color:var(--hint)">' + _esc(p.city || '—') + ' • ' + ((p.specialties || []).join('، ') || 'لم يحدد') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button onclick="_toggleUser(' + p.id + ',\'provider\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:' + (active ? 'var(--red-l)' : 'var(--green-l)') + ';color:' + (active ? 'var(--red)' : 'var(--green)') + ';border:1px solid ' + (active ? '#fecaca' : '#bbf7d0') + '">' +
            (active ? 'إيقاف' : 'تفعيل') + '</button>' +
          '<button onclick="_badgeModal(' + p.id + ',\'' + _esc(p.name || '') + '\',\'' + _esc(p.badge || 'none') + '\',\'provider\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--gold-l);color:#92400e;border:1px solid #fde68a">منح لقب</button>' +
          '<button onclick="_deleteUser(' + p.id + ',\'' + _esc(p.name || 'المستخدم') + '\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--red-l);color:var(--red);border:1px solid #fecaca">حذف</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function _cliList(list) {
  if (!list.length) return _empty('لا يوجد عملاء', '');
  return list.map(function(u) {
    var active = u.is_active !== false;
    var badgeColors = {'موثوق':'#2563eb,#dbeafe','عميل مميز':'#d97706,#fef3c7','شريك موثوق':'#7c3aed,#f3e8ff','none':''};
    var bc = badgeColors[u.badge] || '';
    var badgeHtml = u.badge && u.badge !== 'none' ? '<span style="background:' + bc.split(',')[1] + ';color:' + bc.split(',')[0] + ';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800">' + u.badge + '</span>' : '';
    
    return '<div style="background:' + (active ? 'var(--white)' : 'var(--bg)') + ';border:1.5px solid ' + (active ? 'var(--border)' : '#e5e5e5') + ';border-radius:12px;padding:12px;margin-bottom:8px;opacity:' + (active ? '1' : '.7') + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<div style="font-size:13px;font-weight:800;color:var(--text)">' + _esc(u.name || '—') + '</div>' +
            badgeHtml +
          '</div>' +
          '<div style="font-size:11px;color:var(--muted);margin-bottom:3px">' + _esc(u.email || '—') + '</div>' +
          '<div style="font-size:10px;color:var(--hint)">' + _esc(u.city || '—') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button onclick="_toggleUser(' + u.id + ',\'client\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:' + (active ? 'var(--red-l)' : 'var(--green-l)') + ';color:' + (active ? 'var(--red)' : 'var(--green)') + ';border:1px solid ' + (active ? '#fecaca' : '#bbf7d0') + '">' +
            (active ? 'إيقاف' : 'تفعيل') + '</button>' +
          '<button onclick="_badgeModal(' + u.id + ',\'' + _esc(u.name || '') + '\',\'' + _esc(u.badge || 'none') + '\',\'client\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--gold-l);color:#92400e;border:1px solid #fde68a">منح لقب</button>' +
          '<button onclick="_deleteUser(' + u.id + ',\'' + _esc(u.name || 'المستخدم') + '\')" style="padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--red-l);color:var(--red);border:1px solid #fecaca">حذف</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// دالة اختبار سريعة لـ API الحذف
function _testDeleteAPI(testUserId) {
  if (!testUserId) testUserId = prompt('أدخل ID مستخدم للاختبار:');
  if (!testUserId) return;
  
  console.log('🧪 Testing delete API for user', testUserId);
  _api('/api/admin/users/' + testUserId + '/stats')
    .then(function(stats) {
      console.log('📊 User stats:', stats);
      if (confirm('المستخدم موجود. هل تريد حذفه فعلاً؟')) {
        return _api('/api/admin/users/' + testUserId, { method: 'DELETE' });
      }
    })
    .then(function(result) {
      if (result) {
        console.log('✅ Delete result:', result);
        toast('اختبار الحذف نجح!', 'success');
      }
    })
    .catch(function(error) {
      console.log('❌ Test failed:', error);
      toast('اختبار فشل: ' + error.message, 'error');
    });
}

// يمكن استدعاء _testDeleteAPI() من console لاختبار الوظيفة
