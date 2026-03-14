import { Contract, Address, U128, Vec, String, Bool, Bytes } from '@stellar/stellar-sdk';

/**
 * @title SecureChain - Stellar-based File Verification System
 * @dev Soroban smart contract for file verification using Stellar's built-in features
 * @author SecureChain Team
 */
export class SecureChain extends Contract {
    // Storage keys
    private static readonly FILE_COUNTER: string = 'FILE_COUNTER';
    private static readonly VERIFICATION_COUNTER: string = 'VERIFICATION_COUNTER';
    private static readonly VERIFICATION_REWARD: u128 = '10000000'; // 0.01 XLM in stroops
    
    /**
     * @dev Upload a new file to the decentralized system
     * @param ipfsHash IPFS hash of the file
     * @param fileHash SHA-256 hash of the file content
     * @param fileName Name of the file
     * @param fileSize Size of the file in bytes
     * @return fileId The unique identifier for the uploaded file
     */
    public uploadFile(
        ipfsHash: String,
        fileHash: Bytes,
        fileName: String,
        fileSize: u128
    ): u128 {
        // Validate inputs
        this.validateFileUpload(ipfsHash, fileHash, fileName, fileSize);
        
        // Generate unique file ID
        let fileId = this.incrementCounter(SecureChain.FILE_COUNTER);
        
        // Store file metadata in contract storage
        this.storeFileMetadata(fileId, ipfsHash, fileHash, fileName, fileSize);
        
        // Create unique asset for file ownership
        this.createFileAsset(fileId, fileName);
        
        // Emit event
        this.emitFileUploaded(fileId, ipfsHash, fileHash, fileName, fileSize);
        
        return fileId;
    }
    
    /**
     * @dev Verify a file's authenticity
     * @param fileId ID of the file to verify
     * @param isValid Whether the file is verified as authentic
     * @param comment Optional comment about the verification
     * @return verificationId The unique identifier for the verification
     */
    public verifyFile(
        fileId: u128,
        isValid: Bool,
        comment: String
    ): u128 {
        // Validate file exists and verifier is not owner
        this.validateFileVerification(fileId);
        
        // Generate verification ID
        let verificationId = this.incrementCounter(SecureChain.VERIFICATION_COUNTER);
        
        // Store verification record
        this.storeVerification(verificationId, fileId, isValid, comment);
        
        // Update file verification metrics
        this.updateVerificationScore(fileId);
        
        // Send XLM reward to verifier
        this.sendVerificationReward();
        
        // Emit events
        this.emitFileVerified(verificationId, fileId, isValid, comment);
        
        return verificationId;
    }
    
    /**
     * @dev Get file details by ID
     * @param fileId ID of the file
     * @return File metadata including verification status
     */
    public getFile(fileId: u128): Vec<String> {
        return this.getFileMetadata(fileId);
    }
    
    /**
     * @dev Get verification history for a file
     * @param fileId ID of the file
     * @return Array of verification records
     */
    public getFileVerifications(fileId: u128): Vec<String> {
        return this.getVerificationHistory(fileId);
    }
    
    /**
     * @dev Search file by hash
     * @param fileHash SHA-256 hash of the file
     * @return File ID if found
     */
    public searchByHash(fileHash: Bytes): u128 {
        return this.findFileByHash(fileHash);
    }
    
    /**
     * @dev Search file by IPFS hash
     * @param ipfsHash IPFS hash of the file
     * @return File ID if found
     */
    public searchByIpfsHash(ipfsHash: String): u128 {
        return this.findFileByIpfsHash(ipfsHash);
    }
    
    // Private helper functions
    
    private validateFileUpload(
        ipfsHash: String,
        fileHash: Bytes,
        fileName: String,
        fileSize: u128
    ): void {
        // Input validation logic
        if (ipfsHash.length() === 0) {
            throw new Error('IPFS hash cannot be empty');
        }
        if (fileHash.length() === 0) {
            throw new Error('File hash cannot be empty');
        }
        if (fileName.length() === 0) {
            throw new Error('File name cannot be empty');
        }
        if (fileSize === 0) {
            throw new Error('File size must be greater than zero');
        }
    }
    
    private validateFileVerification(fileId: u128): void {
        // Check if file exists
        if (!this.fileExists(fileId)) {
            throw new Error('File does not exist');
        }
        
        // Check if verifier is not file owner
        let fileOwner = this.getFileOwner(fileId);
        if (fileOwner === this.getCaller()) {
            throw new Error('Cannot verify your own file');
        }
    }
    
    private incrementCounter(counterKey: string): u128 {
        let current = this.storage().get<u128>(counterKey) || 0;
        let newCount = current + 1;
        this.storage().set<u128>(counterKey, newCount);
        return newCount;
    }
    
    private storeFileMetadata(
        fileId: u128,
        ipfsHash: String,
        fileHash: Bytes,
        fileName: String,
        fileSize: u128
    ): void {
        let metadata = `${fileId}:${ipfsHash}:${fileHash}:${fileName}:${fileSize}:${this.getCaller()}:${this.getTimestamp()}`;
        this.storage().set<string>(`file_${fileId}`, metadata);
        this.storage().set<Bytes>(`hash_to_file_${fileHash}`, fileId);
        this.storage().set<string>(`ipfs_to_file_${ipfsHash}`, fileId);
    }
    
    private createFileAsset(fileId: u128, fileName: String): void {
        // Create unique asset representing file ownership
        let assetCode = `FILE_${fileId.toString().padStart(6, '0')}`;
        // Asset creation logic using Stellar's built-in asset creation
        this.createAsset(assetCode, fileName);
    }
    
    private storeVerification(
        verificationId: u128,
        fileId: u128,
        isValid: Bool,
        comment: String
    ): void {
        let verification = `${verificationId}:${fileId}:${this.getCaller()}:${isValid}:${comment}:${this.getTimestamp()}`;
        this.storage().set<string>(`verification_${verificationId}`, verification);
        
        // Add to file's verification list
        let existing = this.storage().get<Vec<string>>(`file_verifications_${fileId}`) || [];
        existing.push(verification);
        this.storage().set<Vec<string>>(`file_verifications_${fileId}`, existing);
    }
    
    private updateVerificationScore(fileId: u128): void {
        let verifications = this.getVerificationHistory(fileId);
        let positiveCount = 0;
        let totalCount = verifications.length();
        
        for (let verification of verifications) {
            if (verification.includes('true')) {
                positiveCount++;
            }
        }
        
        let score = totalCount > 0 ? (positiveCount * 100) / totalCount : 0;
        this.storage().set<u128>(`file_score_${fileId}`, score);
        
        // Mark as verified if score >= 70%
        if (score >= 70) {
            this.storage().set<Bool>(`file_verified_${fileId}`, true);
        }
    }
    
    private sendVerificationReward(): void {
        // Send 0.01 XLM to verifier
        this.transferXLM(this.getCaller(), SecureChain.VERIFICATION_REWARD);
    }
    
    // Event emitters
    private emitFileUploaded(
        fileId: u128,
        ipfsHash: String,
        fileHash: Bytes,
        fileName: String,
        fileSize: u128
    ): void {
        this.event('FileUploaded', {
            fileId: fileId,
            ipfsHash: ipfsHash,
            fileHash: fileHash,
            fileName: fileName,
            fileSize: fileSize,
            uploader: this.getCaller(),
            timestamp: this.getTimestamp()
        });
    }
    
    private emitFileVerified(
        verificationId: u128,
        fileId: u128,
        isValid: Bool,
        comment: String
    ): void {
        this.event('FileVerified', {
            verificationId: verificationId,
            fileId: fileId,
            verifier: this.getCaller(),
            isValid: isValid,
            comment: comment,
            timestamp: this.getTimestamp()
        });
    }
    
    // Utility functions
    private fileExists(fileId: u128): Bool {
        return this.storage().has(`file_${fileId}`);
    }
    
    private getFileOwner(fileId: u128): Address {
        let metadata = this.storage().get<string>(`file_${fileId}`) || '';
        let parts = metadata.split(':');
        return Address.fromString(parts[5]);
    }
    
    private getCaller(): Address {
        return this.env().current_contract_address();
    }
    
    private getTimestamp(): u128 {
        return this.env().ledger().timestamp();
    }
}
