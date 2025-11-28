import React, { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { SolutionView } from './components/SolutionView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { FileIcon, RefreshIcon, InstallDesktopIcon } from './components/Icons';
import { AppState, Language, SolutionResult, UploadedFile } from './types';
import { solveProblem } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.CPP);
  const [result, setResult] = useState<SolutionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Handle PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, so clear it
    setDeferredPrompt(null);
  };

  const handleFileSelect = (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setAppState(AppState.IDLE); 
    setResult(null);
    setErrorMsg("");
  };

  const handleSolve = async () => {
    if (!file) return;

    setAppState(AppState.ANALYZING);
    setErrorMsg("");

    try {
      const solution = await solveProblem(file.data, file.type, selectedLanguage);
      setResult(solution);
      setAppState(AppState.SOLVED);
    } catch (error: any) {
      setAppState(AppState.ERROR);
      setErrorMsg(error.message || "Đã có lỗi xảy ra.");
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setFile(null);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200 selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold font-mono">
              AI
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">CodeSolver</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {deferredPrompt && (
               <button
                 onClick={handleInstallClick}
                 className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-sm font-medium transition-all shadow-lg shadow-brand-500/20 animate-pulse hover:animate-none"
               >
                 <InstallDesktopIcon />
                 Cài đặt App
               </button>
             )}
            <div className="text-xs text-gray-400 font-mono hidden sm:block">Powered by Gemini 2.5 Flash</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* Left Column: Input */}
          <div className="flex flex-col space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-900 text-brand-500 text-xs">1</span>
                Đề bài (Ảnh/PDF)
              </h2>
              
              {!file ? (
                <UploadZone onFileSelected={handleFileSelect} />
              ) : (
                <div className="relative group border border-gray-600 rounded-lg overflow-hidden bg-gray-900">
                  <div className="p-4 flex items-center gap-4">
                     <div className="p-3 bg-gray-800 rounded-lg">
                        <FileIcon />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-white truncate">{file.name}</p>
                       <p className="text-xs text-gray-500">{file.type}</p>
                     </div>
                     <button 
                      onClick={handleReset}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Remove file"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                     </button>
                  </div>
                  {/* Preview for images */}
                  {file.previewUrl && (
                    <div className="border-t border-gray-700 bg-black/50 p-2 flex justify-center">
                      <img src={file.previewUrl} alt="Preview" className="max-h-64 object-contain rounded" />
                    </div>
                  )}
                   {file.type === 'application/pdf' && (
                    <div className="border-t border-gray-700 bg-black/50 p-8 flex justify-center items-center text-gray-500 text-sm italic">
                       PDF Preview not available. File ready for analysis.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-sm">
               <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-900 text-brand-500 text-xs">2</span>
                Chọn ngôn ngữ & Giải
              </h2>
              
              <div className="flex gap-4 mb-6">
                {(Object.values(Language) as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedLanguage === lang
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 ring-1 ring-brand-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSolve}
                disabled={!file || appState === AppState.ANALYZING}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2
                  ${!file 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : appState === AppState.ANALYZING
                      ? 'bg-brand-900 text-brand-400 cursor-wait'
                      : 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white shadow-brand-500/25 hover:shadow-brand-500/40 transform hover:-translate-y-0.5'
                  }
                `}
              >
                {appState === AppState.ANALYZING ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    Giải bài tập ngay
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </>
                )}
              </button>
              
              {errorMsg && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
                  {errorMsg}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full min-h-[500px]">
            {appState === AppState.IDLE && (
               <div className="flex-1 bg-gray-800/30 border border-gray-700 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                 </div>
                 <p className="text-lg font-medium text-gray-400">Kết quả sẽ hiển thị ở đây</p>
                 <p className="text-sm mt-2">Upload bài tập và nhấn nút Giải để bắt đầu</p>
               </div>
            )}

            {appState === AppState.ANALYZING && (
               <div className="flex-1 bg-gray-800/30 border border-gray-700 rounded-xl flex items-center justify-center">
                  <LoadingSpinner />
               </div>
            )}

            {appState === AppState.SOLVED && result && (
              <div className="flex-1 flex flex-col h-full">
                 <div className="flex justify-end mb-2">
                    <button onClick={handleSolve} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                       <RefreshIcon /> Thử lại
                    </button>
                 </div>
                 <SolutionView result={result} language={selectedLanguage} />
              </div>
            )}

             {appState === AppState.ERROR && (
               <div className="flex-1 bg-gray-800/30 border border-red-900/50 rounded-xl flex flex-col items-center justify-center text-red-400 p-8">
                 <p className="text-lg font-bold mb-2">Oops!</p>
                 <p>{errorMsg}</p>
                 <button onClick={handleSolve} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">Thử lại</button>
               </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;