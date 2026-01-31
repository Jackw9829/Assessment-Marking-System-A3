import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { getSubmissionPreviewUrl, isPreviewableFileType, isDocumentType } from '../../lib/supabase-helpers';

interface DocumentPreviewProps {
    filePath: string;
    fileName: string;
    fileType: string | null;
    fileSize: number;
    onDownload?: () => void;
}

export function DocumentPreview({ filePath, fileName, fileType, fileSize, onDownload }: DocumentPreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        loadPreview();
    }, [filePath]);

    const loadPreview = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = await getSubmissionPreviewUrl(filePath);
            setPreviewUrl(url);
        } catch (err: any) {
            console.error('Preview error:', err);
            setError(err.message || 'Failed to load preview');
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileExtension = (name: string) => {
        return name.split('.').pop()?.toUpperCase() || 'FILE';
    };

    const handleDownload = async () => {
        if (previewUrl) {
            const link = document.createElement('a');
            link.href = previewUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Download started');
        }
        onDownload?.();
    };

    const handleOpenInNewTab = () => {
        if (previewUrl) {
            window.open(previewUrl, '_blank');
        }
    };

    const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isImage = fileType?.startsWith('image/');
    const isText = fileType?.startsWith('text/');
    const isDocument = isDocumentType(fileType);
    const canPreviewDirectly = isPreviewableFileType(fileType) || isPDF || isImage;

    // For Office documents, use Microsoft Office Online viewer
    const getOfficeViewerUrl = (url: string) => {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    };

    // For Google Docs viewer (alternative for various document types)
    const getGoogleViewerUrl = (url: string) => {
        return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-slate-50 border-b px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-200 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-slate-800">Submission Preview</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">{getFileExtension(fileName)}</Badge>
                                <span className="text-xs text-slate-500">{formatFileSize(fileSize)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!previewUrl} title="Download">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} disabled={!previewUrl} title="Open in New Tab">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                            title={showPreview ? 'Hide Preview' : 'Show Preview'}
                        >
                            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 truncate" title={fileName}>
                    {fileName}
                </p>
            </div>

            {/* Preview Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {showPreview ? (
                    <div className="h-full bg-slate-100">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                                <span className="mt-3 text-sm text-slate-600">Loading preview...</span>
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                <div className="bg-red-100 p-4 rounded-full mb-4">
                                    <AlertCircle className="h-10 w-10 text-red-500" />
                                </div>
                                <p className="text-red-600 font-medium">Failed to load preview</p>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs">{error}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={loadPreview}>
                                    Retry
                                </Button>
                            </div>
                        ) : previewUrl ? (
                            <div className="h-full">
                                {/* PDF Preview */}
                                {isPDF && (
                                    <iframe
                                        src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                                        className="w-full h-full border-0"
                                        title="PDF Preview"
                                    />
                                )}

                                {/* Image Preview */}
                                {isImage && (
                                    <div className="h-full flex items-center justify-center p-4 overflow-auto bg-slate-900">
                                        <img
                                            src={previewUrl}
                                            alt={fileName}
                                            className="max-w-full max-h-full object-contain rounded shadow-lg"
                                        />
                                    </div>
                                )}

                                {/* Text Preview */}
                                {isText && (
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full bg-white border-0"
                                        title="Text Preview"
                                    />
                                )}

                                {/* Office Document Preview (Word, Excel, PowerPoint) */}
                                {isDocument && (
                                    <iframe
                                        src={getGoogleViewerUrl(previewUrl)}
                                        className="w-full h-full border-0"
                                        title="Document Preview"
                                        sandbox="allow-scripts allow-same-origin allow-popups"
                                    />
                                )}

                                {/* Fallback for unsupported types */}
                                {!isPDF && !isImage && !isText && !isDocument && (
                                    <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-white">
                                        <div className="bg-slate-100 p-6 rounded-full mb-4">
                                            <FileText className="h-12 w-12 text-slate-400" />
                                        </div>
                                        <p className="text-slate-700 font-medium">Preview not available</p>
                                        <p className="text-sm text-slate-500 mt-1 max-w-xs">
                                            This file type ({fileType || 'unknown'}) cannot be previewed in the browser.
                                        </p>
                                        <Button variant="default" size="sm" className="mt-4" onClick={handleDownload}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download to View
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-white">
                                <p className="text-slate-500">No preview available</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full bg-slate-50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="bg-slate-200 p-4 rounded-full mx-auto mb-3">
                                <EyeOff className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-sm">Preview hidden</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => setShowPreview(true)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Show Preview
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
