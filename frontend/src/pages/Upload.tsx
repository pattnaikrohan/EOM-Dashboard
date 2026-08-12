/**
 * Sync Page — Live sync from Snowflake.
 */
import { CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

export default function UploadPage() {
  const { handleSyncSnowflake, loading, error, loaded } = useData();
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__overline">Data Management</div>
        <h1 className="page-header__title">Snowflake Data Sync</h1>
        <p className="page-header__subtitle">
          Synchronize the latest CargoWise financial data directly from the Snowflake data warehouse.
        </p>
      </div>

      <div style={{ textAlign: 'center', margin: '4rem 0' }}>
        <button 
          className="btn btn-primary" 
          onClick={async () => {
            try {
              await handleSyncSnowflake();
              navigate('/');
            } catch (e) {}
          }}
          disabled={loading}
          style={{ width: '100%', maxWidth: 400, margin: '0 auto', padding: '1.25rem', display: 'flex', justifyContent: 'center', fontSize: '1.1rem' }}
        >
          {loading ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'spin 1s linear infinite'
                }} />
                Syncing from Snowflake...
             </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database size={22} />
              Live Sync from Snowflake
            </div>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card fade-in" style={{ maxWidth: 640, margin: '1.5rem auto 0', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#dc2626' }}>
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Error</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success status */}
      {loaded && (
        <div className="card fade-in" style={{ maxWidth: 640, margin: '1.5rem auto 0', borderColor: 'rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#059669' }}>
            <CheckCircle size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Data Synced Successfully</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                System dataset initialized and ready
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
