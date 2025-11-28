import React, { useState } from 'react';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { SolutionResult, Language } from '../types';
import { CopyIcon, CheckIcon, DownloadIcon, BeakerIcon, WordIcon } from './Icons';

interface SolutionViewProps {
  result: SolutionResult;
  language: Language;
}

export const SolutionView: React.FC<SolutionViewProps> = ({ result, language }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'solution' | 'tests'>('solution');
  const [isZipping, setIsZipping] = useState(false);
  const [isDocGenerating, setIsDocGenerating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const extension = language === Language.CPP ? 'cpp' : 'py';
    const filename = `solution.${extension}`;
    const blob = new Blob([result.rawCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTests = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderName = "test_cases";
      const folder = zip.folder(folderName);

      if (folder) {
        result.testCases.forEach((tc, index) => {
          const idxStr = (index + 1).toString().padStart(2, '0');
          folder.file(`test${idxStr}.inp`, tc.input);
          folder.file(`test${idxStr}.out`, tc.output);
        });

        const content = await zip.generateAsync({ type: "blob" });
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "test_cases.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Failed to zip", e);
      alert("Không thể tạo file zip.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsDocGenerating(true);
    try {
      // Parse markdown content to create simple docx paragraphs
      const markdownLines = result.markdown.split('\n');
      const docChildren: Paragraph[] = [];

      // Add Title
      docChildren.push(
        new Paragraph({
          text: "Báo cáo lời giải bài toán",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );

      // Process markdown lines
      markdownLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          docChildren.push(new Paragraph({
            text: trimmed.replace('### ', ''),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          }));
        } else if (trimmed.startsWith('## ')) {
          docChildren.push(new Paragraph({
            text: trimmed.replace('## ', ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
          }));
        } else if (trimmed.startsWith('# ')) {
          docChildren.push(new Paragraph({
            text: trimmed.replace('# ', ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }));
        } else if (trimmed !== '') {
          // Simple bold handling (very basic)
          const parts = trimmed.split('**');
          if (parts.length > 1) {
            const textRuns = parts.map((part, index) => 
              new TextRun({
                text: part,
                bold: index % 2 !== 0 // Odd indices are inside **...**
              })
            );
            docChildren.push(new Paragraph({ children: textRuns, spacing: { after: 100 } }));
          } else {
            docChildren.push(new Paragraph({
              text: trimmed,
              spacing: { after: 100 }
            }));
          }
        }
      });

      // Add Code Section
      docChildren.push(
        new Paragraph({
          text: `Mã nguồn (${language})`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          pageBreakBefore: true
        })
      );

      const codeLines = result.rawCode.split('\n');
      codeLines.forEach(line => {
        docChildren.push(new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "Consolas",
              size: 20 // 10pt
            })
          ]
        }));
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Giai_bai_tap_report.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error generating docx", error);
      alert("Lỗi khi tạo file word.");
    } finally {
      setIsDocGenerating(false);
    }
  };

  // Simplified markdown renderer for display
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('###')) return <h3 key={index} className="text-lg font-bold text-brand-100 mt-4 mb-2">{line.replace('###', '')}</h3>;
      if (line.startsWith('##')) return <h2 key={index} className="text-xl font-bold text-white mt-6 mb-3">{line.replace('##', '')}</h2>;
      if (line.startsWith('#')) return <h1 key={index} className="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-700 pb-2">{line.replace('#', '')}</h1>;
      // Basic bold renderer
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
           <p key={index} className="mb-2 text-gray-300 leading-relaxed">
             {parts.map((part, i) => i % 2 === 0 ? part : <strong key={i} className="text-white">{part}</strong>)}
           </p>
        );
      }
      return <p key={index} className="mb-2 text-gray-300 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col h-full max-h-[800px]">
      
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-700 bg-gray-900 flex justify-between items-center sticky top-0 z-10">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('solution')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'solution' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Lời giải & Code
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tests' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Bộ Test ({result.testCases.length})
          </button>
        </div>

        <div className="flex gap-2">
          {activeTab === 'solution' ? (
             <>
                <button 
                  onClick={handleDownloadDocx}
                  disabled={isDocGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-400 bg-gray-800 border border-blue-900 rounded hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
                  title="Tải báo cáo lời giải (Word)"
                >
                   {isDocGenerating ? (
                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                  ) : (
                    <WordIcon />
                  )}
                  Report (.docx)
                </button>
                <button 
                  onClick={handleDownloadCode}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-400 bg-gray-800 border border-brand-900 rounded hover:bg-brand-900/30 hover:text-brand-300 transition-colors"
                  title="Tải file source code về máy"
                >
                  <DownloadIcon />
                  Code
                </button>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'Đã copy' : 'Copy'}
                </button>
             </>
          ) : (
            <button 
              onClick={handleDownloadTests}
              disabled={isZipping}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-400 bg-gray-800 border border-green-900 rounded hover:bg-green-900/30 hover:text-green-300 transition-colors disabled:opacity-50"
              title="Tải tất cả test case dạng zip"
            >
              {isZipping ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
              ) : (
                 <BeakerIcon />
              )}
              Download Tests (.zip)
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1e1e1e]">
        {activeTab === 'solution' ? (
          <div className="p-6 space-y-6">
            {/* Explanation */}
            <div className="prose prose-invert max-w-none text-sm">
              <div className="whitespace-pre-wrap text-gray-300 font-sans leading-relaxed">
                {renderMarkdown(result.markdown)}
              </div>
            </div>

            {/* Code Block */}
            <div className="mt-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Source Code ({language})</span>
              </div>
              <div className="relative group">
                <pre className="bg-[#0d1117] p-4 rounded-lg overflow-x-auto border border-gray-700 text-sm font-mono text-gray-300 leading-6">
                  <code>{result.rawCode}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
             <div className="grid grid-cols-1 gap-4">
               {result.testCases.length > 0 ? (
                 result.testCases.map((tc, idx) => (
                   <div key={idx} className="bg-[#2d2d2d] rounded-md border border-gray-700 overflow-hidden">
                      <div className="bg-[#3d3d3d] px-3 py-1.5 text-xs font-bold text-gray-300 border-b border-gray-600 flex justify-between">
                        <span>Test Case #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-700">
                        <div className="p-3">
                          <span className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Input</span>
                          <pre className="text-xs font-mono text-white whitespace-pre-wrap break-all">{tc.input}</pre>
                        </div>
                        <div className="p-3">
                           <span className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Output</span>
                           <pre className="text-xs font-mono text-brand-300 whitespace-pre-wrap break-all">{tc.output}</pre>
                        </div>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center text-gray-500 py-10">
                   Không tìm thấy bộ test case nào.
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};