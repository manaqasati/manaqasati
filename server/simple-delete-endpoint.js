// إضافة مبسطة للاختبار - أضف هذا في نهاية index.js:

// حذف مبسط للاختبار
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    console.log('Delete request for user:', userId, 'by admin:', req.user.id);
    
    // منع الأدمن من حذف نفسه
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    
    // التحقق من وجود المستخدم
    const userCheck = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    // منع حذف المديرين
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admins' });
    }
    
    // حذف بسيط (بدون foreign keys للاختبار)
    await pool.query('DELETE FROM users WHERE id = $1 AND role != \'admin\'', [userId]);
    
    console.log('✅ User deleted successfully:', userId);
    
    res.json({
      ok: true,
      message: 'User deleted successfully',
      deleted_user: { id: userId, name: user.name }
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

console.log('🗑️ Simple delete endpoint added');
