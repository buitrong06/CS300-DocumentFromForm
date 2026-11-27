import { Link, useNavigate } from 'react-router-dom';

/** Workspace selector — matches Figma 102:20 (Chọn workspace) */
export function WorkspaceScreen() {
  return (
    <>
      <div className="fapp-card" style={{ maxWidth: 620, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="fapp-section-title">CS300 · Team space</div>
          <p className="fapp-section-help">4 thành viên · Hoạt động hôm nay</p>
        </div>
        <span className="fapp-chip fapp-chip-green">Đang dùng</span>
      </div>

      <div className="fapp-actions">
        <Link to="/app/overview" className="fapp-btn fapp-btn-primary">Tiếp tục</Link>
        <button type="button" className="fapp-btn fapp-btn-secondary">Tạo workspace mới</button>
      </div>
    </>
  );
}

/** Profile screen — matches Figma 102:51 (Hồ sơ cá nhân) */
export function ProfileScreen() {
  return (
    <div className="fapp-card" style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="fapp-avatar" style={{ width: 68, height: 68, fontSize: 20, borderRadius: 16 }}>LP</div>
        <div>
          <div className="fapp-section-title" style={{ fontSize: 20 }}>Le Gia Phuc</div>
          <p className="fapp-section-help">Người tạo biểu mẫu · CS300 Team space</p>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 4 }}>Email</div>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>phuc@workspace.local</div>
      </div>

      <div className="fapp-actions">
        <Link to="/app/workspace" className="fapp-btn fapp-btn-secondary">Đổi workspace</Link>
        <Link to="/app/login" className="fapp-btn fapp-btn-secondary">Đăng xuất</Link>
      </div>
    </div>
  );
}

/** Login screen — matches Figma 102:2 (Đăng nhập) */
export function LoginScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', minHeight: '100dvh', background: '#f6f7fb' }}>
      <div style={{ background: '#edf0f9', borderRight: '1px solid #d6deed', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>EXTRACT FIELD</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>Workspace xử lý biểu mẫu và giao việc</div>
        </div>
        <div className="fapp-avatar" style={{ width: 72, height: 72, fontSize: 22, borderRadius: 16 }}>EF</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div className="fapp-card" style={{ width: '100%', maxWidth: 420 }}>
          <h1 className="fapp-heading" style={{ fontSize: 26 }}>Đăng nhập</h1>
          <p className="fapp-subheading" style={{ marginBottom: 24 }}>Đăng nhập để làm việc trong workspace của bạn.</p>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="fapp-input" defaultValue="phuc@workspace.local" />
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="login-pw">Mật khẩu</label>
            <input id="login-pw" className="fapp-input" type="password" defaultValue="••••••••••" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            <button type="button" className="fapp-btn fapp-btn-primary" onClick={() => navigate('/app/overview')}>
              Đăng nhập
            </button>
            <button type="button" className="fapp-btn fapp-btn-secondary" onClick={() => navigate('/app/overview')}>
              Đăng nhập bằng Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
