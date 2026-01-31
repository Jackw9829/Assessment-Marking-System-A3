import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { getSubmissionPreviewUrl, isPreviewableFileType, isDocumentType } from '@/lib/supabase-helpers';

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
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Submission Preview
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getFileExtension(fileName)}</Badge>
                    <span className="text-sm text-gray-500">{formatFileSize(fileSize)}</span>
                    <span className="text-sm text-gray-400 truncate max-w-[200px]" title={fileName}>
                        {fileName}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Action Buttons */}
                <div className="flex gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={!previewUrl}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleOpenInNewTab} disabled={!previewUrl}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in New Tab
                    </Button>
                </div>

                {/* Preview Area */}
                {showPreview && (
                    <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100 min-h-[400px]">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="ml-2 text-gray-600">Loading preview...</span>
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                                <AlertCircle className="h-12 w-12 text-red-400 mb-2" />
                                <p className="text-red-600 font-medium">Failed to load preview</p>
                                <p className="text-sm text-gray-500 mt-1">{error}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={loadPreview}>
                                    Retry
                                </Button>
                            </div>
                        ) : previewUrl ? (
                            <>
                                {/* PDF Preview */}
                                {isPDF && (
                                    <iframe
                                        src={`${previewUrl}#toolbar=1&navpanes=0`}
                                        className="w-full h-full min-h-[500px]"
                                        title="PDF Preview"
                                    />
                                )}

                                {/* Image Preview */}
                                {isImage && (
                                    <div className="h-full flex items-center justify-center p-4 overflow-auto">
                                        <img
                                            src={previewUrl}
                                            alt={fileName}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                )}

                                {/* Text Preview */}
                                {isText && (
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full min-h-[500px] bg-white"
                                        title="Text Preview"
                                    />
                                )}

                                {/* Office Document Preview (Word, Excel, PowerPoint) */}
                                {isDocument && (
                                    <iframe
                                        src={getGoogleViewerUrl(previewUrl)}
                                        className="w-full h-full min-h-[500px]"
                                        title="Document Preview"
                                        sandbox="allow-scripts allow-same-origin allow-popups"
                                    />
                                )}

                                {/* Fallback for unsupported types */}
                                {!isPDF && !isImage && !isText && !isDocument && (
                                    <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                                        <FileText className="h-16 w-16 text-gray-400 mb-4" />
                                        <p className="text-gray-600 font-medium">Preview not available</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            This file type ({fileType || 'unknown'}) cannot be previewed in the browser.
                                        </p>
                                        <div className="flex gap-2 mt-4">
                                            <Button variant="default" size="sm" onClick={handleDownload}>
                                                <Download className="h-4 w-4 mr-1" />
                                                Download to View
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-gray-500">No preview available</p>
                            </div>
                        )}
                    </div>
                )}

                {!showPreview && (
                    <div className="flex-1 border rounded-lg bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                            <EyeOff className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">Preview hidden</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setShowPreview(true)}
                            >
                                Show Preview
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
