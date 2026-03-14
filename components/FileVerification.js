import { useState, useEffect } from 'react';
import { useWeb3 } from '../utils/Web3Context';

export default function FileVerification() {
  const { contract, account } = useWeb3();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [verificationComment, setVerificationComment] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFiles();
  }, [contract]);

  const loadFiles = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      const totalFiles = await contract.getTotalFiles();
      const filePromises = [];
      
      for (let i = 1; i <= totalFiles.toNumber(); i++) {
        filePromises.push(contract.getFile(i));
      }
      
      const fileData = await Promise.all(filePromises);
      const validFiles = fileData.filter(file => file.exists);
      setFiles(validFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedFile) {
      setError('Please select a file to verify');
      return;
    }

    if (!contract) {
      setError('Please connect your wallet');
      return;
    }

    if (selectedFile.uploader.toLowerCase() === account.toLowerCase()) {
      setError('You cannot verify your own file');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      const tx = await contract.verifyFile(
        selectedFile.fileId,
        isValid,
        verificationComment
      );
      
      const receipt = await tx.wait();
      
      setSuccess(`File verified successfully! Transaction hash: ${receipt.transactionHash}`);
      setVerificationComment('');
      
      // Reload files to update verification status
      await loadFiles();
      
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message || 'Failed to verify file');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerificationScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Files</h2>
        <p className="text-gray-600">
          Help maintain the integrity of the SecureChain network by verifying uploaded files.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Available Files</h3>
          
          {files.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No files available for verification</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.fileId.toString()}
                  onClick={() => setSelectedFile(file)}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedFile && selectedFile.fileId.toString() === file.fileId.toString()
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${file.uploader.toLowerCase() === account.toLowerCase() ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                      <div className="mt-1 text-sm text-gray-500 space-y-1">
                        <p>Size: {formatFileSize(file.fileSize)}</p>
                        <p>Uploader: {formatAddress(file.uploader)}</p>
                        <p>Uploaded: {formatDate(file.timestamp)}</p>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      {file.isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      <div className="mt-1">
                        <span className={`text-sm font-medium ${getVerificationScoreColor(file.verificationScore)}`}>
                          {file.verificationScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {file.uploader.toLowerCase() === account.toLowerCase() && (
                    <div className="mt-2 text-xs text-red-600">
                      You cannot verify your own file
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Verification Form</h3>
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Selected File</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedFile.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{formatFileSize(selectedFile.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploader:</span>
                    <span className="font-medium">{formatAddress(selectedFile.uploader)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verifications:</span>
                    <span className="font-medium">{selectedFile.verificationCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Score:</span>
                    <span className={`font-medium ${getVerificationScoreColor(selectedFile.verificationScore)}`}>
                      {selectedFile.verificationScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Result
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={isValid}
                      onChange={() => setIsValid(true)}
                      className="mr-2"
                    />
                    <span className="text-sm">File is authentic and valid</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isValid}
                      onChange={() => setIsValid(false)}
                      className="mr-2"
                    />
                    <span className="text-sm">File is suspicious or invalid</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={verificationComment}
                  onChange={(e) => setVerificationComment(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide additional details about your verification..."
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying || selectedFile.uploader.toLowerCase() === account.toLowerCase()}
                className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Submit Verification'}
              </button>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Verification Rewards</h4>
                <p className="text-sm text-blue-800">
                  You will receive 0.01 ETH as a reward for helping verify files on the network.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Select a file from the list to verify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
