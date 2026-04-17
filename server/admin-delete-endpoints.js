// استبدل دالة _deleteUser في dashboard-admin.html بهذا الكود المبسط للتشخيص:

async function _deleteUser(id) {
  console.log('🔍 Delete user called with ID:', id);
  
  if (!confirm('حذف هذا المستخدم؟')) {
    console.log('❌ User cancelled');
    return;
  }
  
  console.log('📡 Starting API call...');
  console.log('API URL:', API);
  console.log('Token exists:', !!_token);
  
  try {
    var url = API + '/api/admin/users/' + id;
    console.log('Full URL:', url);
    
    var response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + _token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🌐 Response status:', response.status);
    console.log('🌐 Response headers:', response.headers);
    
    if (!response.ok) {
      console.log('❌ Response not OK');
      var errorText = await response.text();
      console.log('❌ Error response:', errorText);
      alert('خطأ HTTP ' + response.status + ': ' + errorText);
      return;
    }
    
    var data = await response.json();
    console.log('✅ Success response:', data);
    
    if (data.ok || data.message) {
      alert('✅ تم الحذف: ' + (data.message || 'نجح'));
      loadProviders();
      loadClients();
    } else {
      alert('⚠️ استجابة غريبة: ' + JSON.stringify(data));
    }
    
  } catch (error) {
    console.log('💥 JavaScript error:', error);
    alert('💥 خطأ في JavaScript: ' + error.message);
  }
}

// دالة تشخيص شاملة
function _diagnoseSystem() {
  console.log('🔍 System Diagnosis:');
  console.log('API:', API);
  console.log('Token:', _token ? 'EXISTS (' + _token.length + ' chars)' : 'MISSING');
  console.log('User:', _me);
  
  // اختبر الاتصال العام
  fetch(API + '/api/admin/users?role=client', {
    headers: {'Authorization': 'Bearer ' + _token}
  })
  .then(r => {
    console.log('✅ General API works, status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('✅ API data received:', data.length || 'unknown', 'items');
  })
  .catch(err => {
    console.log('❌ General API failed:', err);
  });
  
  // اختبر endpoint الحذف
  fetch(API + '/api/admin/users/999', {
    method: 'DELETE',
    headers: {'Authorization': 'Bearer ' + _token}
  })
  .then(r => {
    console.log('🗑️ Delete endpoint status:', r.status);
    return r.text();
  })
  .then(text => {
    console.log('🗑️ Delete response:', text);
  })
  .catch(err => {
    console.log('❌ Delete endpoint failed:', err);
  });
}

// شغّل التشخيص تلقائياً
setTimeout(_diagnoseSystem, 1000);
