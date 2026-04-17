// استبدل الـ endpoint الموجود في index.js بهذا الكود المحسّن:

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // منع الأدمن من حذف نفسه
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });
    }
    
    // التحقق من وجود المستخدم
    const userCheck = await pool.query('SELECT id, role, name, email FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    const userToDelete = userCheck.rows[0];
    
    // منع حذف المديرين الآخرين (إضافي للأمان)
    if (userToDelete.role === 'admin' && userId !== req.user.id) {
      return res.status(403).json({ message: 'لا يمكن حذف المديرين الآخرين' });
    }
    
    // بدء المعاملة لحذف المستخدم وجميع البيانات المرتبطة
    await pool.query('BEGIN');
    
    try {
      console.log(`Admin ${req.user.id} attempting to delete user ${userId} (${userToDelete.name})`);
      
      // 1. حذف العطاءات (bids) التي قدمها المستخدم
      const deleteBidsResult = await pool.query('DELETE FROM bids WHERE user_id = $1', [userId]);
      console.log(`Deleted ${deleteBidsResult.rowCount} bids for user ${userId}`);
      
      // 2. حذف المشاريع التي ينتمي إليها المستخدم وعطاءاتها
      const userRequests = await pool.query('SELECT id FROM requests WHERE user_id = $1', [userId]);
      for (const req of userRequests.rows) {
        const reqBidsResult = await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
        console.log(`Deleted ${reqBidsResult.rowCount} bids for request ${req.id}`);
      }
      const deleteRequestsResult = await pool.query('DELETE FROM requests WHERE user_id = $1', [userId]);
      console.log(`Deleted ${deleteRequestsResult.rowCount} requests for user ${userId}`);
      
      // 3. حذف التقييمات (reviews) المعطاة والمستلمة
      const deleteReviewsResult = await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [userId]);
      console.log(`Deleted ${deleteReviewsResult.rowCount} reviews for user ${userId}`);
      
      // 4. حذف الإشعارات
      const deleteNotifsResult = await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      console.log(`Deleted ${deleteNotifsResult.rowCount} notifications for user ${userId}`);
      
      // 5. حذف الرسائل
      const deleteMsgsResult = await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      console.log(`Deleted ${deleteMsgsResult.rowCount} messages for user ${userId}`);
      
      // 6. حذف البلاغات
      const deleteReportsResult = await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [userId]);
      console.log(`Deleted ${deleteReportsResult.rowCount} reports for user ${userId}`);
      
      // 7. أخيراً، حذف المستخدم نفسه
      const deleteUserResult = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log(`Deleted user ${userId} (${userToDelete.name})`);
      
      // تأكيد المعاملة
      await pool.query('COMMIT');
      
      // سجل العملية للمراجعة
      console.log(`✅ User deletion completed: Admin ${req.user.id} deleted user ${userId} (${userToDelete.name} - ${userToDelete.email})`);
      
      res.json({ 
        ok: true,
        message: 'تم حذف المستخدم وجميع بياناته بنجاح',
        deleted_user: {
          id: userId,
          name: userToDelete.name,
          email: userToDelete.email,
          role: userToDelete.role
        },
        cleanup_stats: {
          bids_deleted: deleteBidsResult.rowCount,
          requests_deleted: deleteRequestsResult.rowCount,
          reviews_deleted: deleteReviewsResult.rowCount,
          notifications_deleted: deleteNotifsResult.rowCount,
          messages_deleted: deleteMsgsResult.rowCount,
          reports_deleted: deleteReportsResult.rowCount
        }
      });
      
    } catch (error) {
      // إلغاء المعاملة عند الخطأ
      await pool.query('ROLLBACK');
      console.error(`❌ User deletion failed for ${userId}:`, error);
      throw error;
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
    
    // رسائل خطأ مفصلة
    let errorMessage = 'خطأ في حذف المستخدم';
    if (error.message.includes('foreign key constraint')) {
      errorMessage = 'لا يمكن حذف المستخدم بسبب بيانات مرتبطة. يرجى المحاولة مرة أخرى.';
    } else if (error.message.includes('does not exist')) {
      errorMessage = 'المستخدم غير موجود';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// إضافة endpoint لحذف متعدد (مفيد للتنظيف السريع)
app.post('/api/admin/users/bulk-delete', auth, adminOnly, async (req, res) => {
  try {
    const { user_ids, role } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'قائمة المستخدمين مطلوبة' });
    }
    
    // منع الأدمن من حذف نفسه
    if (user_ids.includes(req.user.id)) {
      return res.status(400).json({ message: 'لا يمكن إدراج حسابك ضمن قائمة الحذف' });
    }
    
    // تحديد النوع إذا كان محدد
    let whereClause = 'id = ANY($1)';
    let params = [user_ids];
    
    if (role && ['client', 'provider'].includes(role)) {
      whereClause += ' AND role = $2';
      params.push(role);
    }
    
    // منع حذف المديرين
    whereClause += ' AND role != \'admin\'';
    
    // جلب قائمة المستخدمين المراد حذفهم
    const usersToDelete = await pool.query(`SELECT id, name, email, role FROM users WHERE ${whereClause}`, params);
    
    if (!usersToDelete.rows.length) {
      return res.json({ 
        ok: true, 
        message: 'لم يتم العثور على مستخدمين للحذف',
        deleted_count: 0 
      });
    }
    
    let deletedCount = 0;
    const deletedUsers = [];
    
    // حذف كل مستخدم بشكل منفصل لضمان تنظيف البيانات المرتبطة
    for (const user of usersToDelete.rows) {
      try {
        await pool.query('BEGIN');
        
        // نفس عملية التنظيف
        await pool.query('DELETE FROM bids WHERE user_id = $1', [user.id]);
        const userRequests = await pool.query('SELECT id FROM requests WHERE user_id = $1', [user.id]);
        for (const req of userRequests.rows) {
          await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
        }
        await pool.query('DELETE FROM requests WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [user.id]);
        await pool.query('DELETE FROM notifications WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
        await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [user.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
        
        await pool.query('COMMIT');
        deletedCount++;
        deletedUsers.push(user);
        
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }
    
    console.log(`✅ Bulk deletion completed: Admin ${req.user.id} deleted ${deletedCount} users`);
    
    res.json({ 
      ok: true,
      message: `تم حذف ${deletedCount} مستخدم من أصل ${usersToDelete.rows.length}`,
      deleted_count: deletedCount,
      deleted_users: deletedUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ 
      message: 'خطأ في الحذف المتعدد: ' + error.message 
    });
  }
});

// إضافة endpoint للتحقق من إحصائيات المستخدم قبل الحذف
app.get('/api/admin/users/:id/stats', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM bids WHERE user_id = $1) as bids_count,
        (SELECT COUNT(*) FROM requests WHERE user_id = $1) as requests_count,
        (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1) as reviews_count,
        (SELECT COUNT(*) FROM notifications WHERE user_id = $1) as notifications_count,
        (SELECT COUNT(*) FROM messages WHERE sender_id = $1 OR receiver_id = $1) as messages_count,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 OR reported_id = $1) as reports_count
    `, [userId]);
    
    res.json({
      user_id: userId,
      stats: stats.rows[0],
      warning: 'سيتم حذف جميع هذه البيانات نهائياً'
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
