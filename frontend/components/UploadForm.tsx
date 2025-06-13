import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from '../lib/api';
import { FaUpload, FaSpinner, FaFileAlt, FaLink, FaFont } from 'react-icons/fa';

const UploadForm: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'file' | 'text' | 'url'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      
      if (title) {
        formData.append('title', title);
      }

      if (uploadType === 'file' && file) {
        formData.append('file', file);
      } else if (uploadType === 'text' && text) {
        formData.append('text', text);
      } else if (uploadType === 'url' && url) {
        formData.append('url', url);
      } else {
        throw new Error('Please provide content to upload');
      }

      const response = await uploadDocument(formData);
      router.push(`/document/${response.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Upload Document</h2>
      
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setUploadType('file')}
            className={`flex-1 py-3 flex items-center justify-center rounded-md ${
              uploadType === 'file' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaFileAlt className="mr-2" /> File
          </button>
          <button
            type="button"
            onClick={() => setUploadType('text')}
            className={`flex-1 py-3 flex items-center justify-center rounded-md ${
              uploadType === 'text' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaFont className="mr-2" /> Text
          </button>
          <button
            type="button"
            onClick={() => setUploadType('url')}
            className={`flex-1 py-3 flex items-center justify-center rounded-md ${
              uploadType === 'url' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaLink className="mr-2" /> URL
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Document title"
          />
        </div>
        
        {uploadType === 'file' && (
          <div className="mb-4">
            <div 
              {...getRootProps()} 
              className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500"
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="text-center">
                  <FaFileAlt className="mx-auto text-4xl text-primary-500 mb-2" />
                  <p className="text-gray-700">{file.name}</p>
                  <p className="text-gray-500 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-2" />
                  <p className="text-gray-700">Drag & drop a file here, or click to select</p>
                  <p className="text-gray-500 text-sm">Supports PDF, TXT, HTML</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {uploadType === 'text' && (
          <div className="mb-4">
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
              Text Content
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input-field min-h-[200px]"
              placeholder="Paste your text content here"
            />
          </div>
        )}
        
        {uploadType === 'url' && (
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-field"
              placeholder="https://example.com/article"
            />
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" /> Uploading...
            </>
          ) : (
            <>
              <FaUpload className="mr-2" /> Upload Document
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
