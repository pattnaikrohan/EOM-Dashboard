/**
 * Upload Page — Drag-and-drop file upload.
 */
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

export default function UploadPage() {
  const { handleUpload, handleSyncSnowflake, loading, error, loaded, dataSource, branch, period } = useData();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await handleUpload(acceptedFiles);
      navigate('/');
    }
  }, [handleUpload, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__overline">Data Source Management</div>
        <h1 className="page-header__title">Switch Data Source: Excel or Snowflake</h1>
        <p className="page-header__subtitle">
          Connect exclusively to <strong>Live Snowflake Data</strong> or upload <strong>CargoWise Excel Exports</strong>. Modes are strictly isolated—switching sources automatically replaces all data from the other source.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'upload-zone--active' : ''}`}
        style={{ maxWidth: 640, margin: '0 auto' }}
      >
        <input {...getInputProps()} />
        <div className="upload-zone__icon">
          {loading ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <UploadIcon size={28} />
          )}
        </div>
        {loading ? (
          <>
            <div className="upload-zone__title">Processing files...</div>
            <p className="upload-zone__text">Parsing data and computing flags for all files</p>
          </>
        ) : (
          <>
            <div className="upload-zone__title">
              {isDragActive ? 'Drop your files here' : 'Drag & drop your Excel files'}
            </div>
            <p className="upload-zone__text">or click to browse multiple files</p>
            <p className="upload-zone__formats">
              Supports .xlsx — CargoWise exports and WIP Review files
            </p>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <div style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>OR</div>
        
        <button 
          className="btn btn-primary" 
          onClick={async () => {
            try {
              await handleSyncSnowflake();
              navigate('/');
            } catch (e) {}
          }}
          disabled={loading}
          style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'center' }}
        >
          {loading ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'spin 1s linear infinite'
                }} />
                Syncing from Snowflake...
             </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database size={20} />
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
        <div className="card fade-in" style={{ maxWidth: 640, margin: '1.5rem auto 0', borderColor: dataSource === 'snowflake' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: dataSource === 'snowflake' ? '#0284c7' : '#059669' }}>
            {dataSource === 'snowflake' ? <Database size={20} /> : <CheckCircle size={20} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  {dataSource === 'snowflake' ? 'Live Snowflake Mode Active' : 'CargoWise Excel Mode Active'}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: dataSource === 'snowflake' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: dataSource === 'snowflake' ? '#0284c7' : '#059669',
                  border: `1px solid ${dataSource === 'snowflake' ? 'rgba(14, 165, 233, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                }}>
                  {dataSource === 'snowflake' ? 'Snowflake Only' : 'Excel Only'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Branch: {branch} · Period: {period}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supported formats info */}
      <div className="card" style={{ maxWidth: 640, margin: '2rem auto 0' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={16} color="#3b82f6" />
          Supported File Formats
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { name: 'CargoWise Export', desc: 'Raw Shipment Profile sheet from CargoWise Job Management' },
            { name: 'WIP Review File', desc: 'Pre-processed WIP Review with per-operator sheets and flags' },
          ].map(fmt => (
            <div key={fmt.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-subtle)',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
                marginTop: '0.35rem', flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{fmt.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{fmt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
