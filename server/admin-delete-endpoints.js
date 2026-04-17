// أضف هذا الكود لملف index.js في السيرفر

// ══ DELETE USER ENDPOINT ══
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id, role, name, email FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    const userToDelete = userCheck.rows[0];
    
    // Prevent deleting other admins (optional security measure)
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ message: 'لا يمكن حذف المديرين' });
    }
    
    // Start transaction to delete user and all related data
    await pool.query('BEGIN');
    
    try {
      // Delete related data first (foreign key constraints)
      
      // 1. Delete user's bids
      await pool.query('DELETE FROM bids WHERE user_id = $1', [userId]);
      
      // 2. Delete user's requests and their bids
      const userRequests = await pool.query('SELECT id FROM requests WHERE user_id = $1', [userId]);
      for (const req of userRequests.rows) {
        await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
      }
      await pool.query('DELETE FROM requests WHERE user_id = $1', [userId]);
      
      // 3. Delete user's reviews (both given and received)
      await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [userId]);
      
      // 4. Delete user's notifications
      await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      
      // 5. Delete user's messages
      await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      
      // 6. Delete user's reports
      await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [userId]);
      
      // 7. Finally delete the user
      const deleteResult = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Log the deletion (optional)
      console.log(`Admin ${req.user.id} deleted user ${userId} (${userToDelete.name} - ${userToDelete.email})`);
      
      res.json({ 
        ok: true,
        message: 'تم حذف المستخدم وجميع بياناته بنجاح',
        deleted_user: {
          id: userId,
          name: userToDelete.name,
          email: userToDelete.email,
          role: userToDelete.role
        }
      });
      
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'خطأ في حذف المستخدم: ' + error.message 
    });
  }
});

// ══ BULK DELETE USERS ENDPOINT ══
app.delete('/api/admin/users/bulk', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_ids, role } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json({ message: 'قائمة المستخدمين مطلوبة' });
    }
    
    // Prevent admin from deleting themselves
    if (user_ids.includes(req.user.id)) {
      return res.status(400).json({ message: 'لا يمكن حذف حسابك ضمن القائمة' });
    }
    
    let query = 'DELETE FROM users WHERE id = ANY($1)';
    let params = [user_ids];
    
    // Add role filter if specified
    if (role && ['client', 'provider'].includes(role)) {
      query += ' AND role = $2';
      params.push(role);
    }
    
    // Prevent deleting admins
    query += ' AND role != \'admin\'';
    
    const result = await pool.query(query, params);
    
    res.json({ 
      ok: true,
      message: `تم حذف ${result.rowCount} مستخدم`,
      deleted_count: result.rowCount
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ 
      message: 'خطأ في الحذف المتعدد: ' + error.message 
    });
  }
});

// ══ CLEAR ALL USERS BY ROLE ══
app.delete('/api/admin/clear-users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, confirm } = req.body;
    
    if (confirm !== 'DELETE_CONFIRMED') {
      return res.status(400).json({ 
        message: 'أرسل confirm: "DELETE_CONFIRMED" للتأكيد' 
      });
    }
    
    let query, params = [];
    
    if (role === 'all_non_admin') {
      query = "DELETE FROM users WHERE role != 'admin' AND id != $1";
      params = [req.user.id];
    } else if (['client', 'provider'].includes(role)) {
      query = "DELETE FROM users WHERE role = $1";
      params = [role];
    } else {
      return res.status(400).json({ message: 'نوع مستخدم غير صحيح' });
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      ok: true,
      message: `تم حذف ${result.rowCount} مستخدم من نوع ${role}`,
      deleted_count: result.rowCount
    });
    
  } catch (error) {
    console.error('Clear users error:', error);
    res.status(500).json({ 
      message: 'خطأ في المسح: ' + error.message 
    });
  }
});
