const { 
  StellarSdk,
  Soroban,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Keypair
} = require('@stellar/stellar-sdk');

/**
 * Deploy SecureChain contract to Stellar Mainnet
 */
async function deploySecureChain() {
  try {
    console.log('🚀 Deploying SecureChain to Stellar Mainnet...');
    
    // Initialize Stellar SDK
    const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
    const networkPassphrase = Networks.PUBLIC;
    
    // Get deployer keypair from environment
    const deployerSecret = process.env.STELLAR_DEPLOYER_SECRET;
    if (!deployerSecret) {
      throw new Error('STELLAR_DEPLOYER_SECRET environment variable not set');
    }
    
    const deployerKeypair = Keypair.fromSecret(deployerSecret);
    const deployerPublicKey = deployerKeypair.publicKey();
    
    console.log(`📋 Deployer account: ${deployerPublicKey}`);
    
    // Check deployer account balance
    const account = await server.loadAccount(deployerPublicKey);
    const balance = account.balances.find(b => b.asset_type === 'native');
    console.log(`💰 Account balance: ${balance.balance} XLM`);
    
    // Check if account has sufficient balance (minimum 2 XLM for deployment)
    if (parseFloat(balance.balance) < 2) {
      throw new Error('Insufficient balance for deployment. Minimum 2 XLM required.');
    }
    
    // Compile the contract (assuming you have soroban CLI installed)
    console.log('🔨 Compiling contract...');
    const { execSync } = require('child_process');
    execSync('soroban contract build contracts/SecureChain.ts', { stdio: 'inherit' });
    
    // Deploy the contract
    console.log('📦 Deploying contract...');
    const contract = await Soroban.Client.deploy(
      server,
      deployerKeypair,
      'target/wasm32-unknown-unknown/release/secure_chain.wasm'
    );
    
    console.log(`✅ Contract deployed at: ${contract.contractId()}`);
    
    // Initialize the contract
    console.log('🔧 Initializing contract...');
    const initTx = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: networkPassphrase
    })
      .addOperation(Operation.invokeContractFunction({
        contract: contract.contractId(),
        function: 'initialize',
        args: []
      }))
      .setTimeout(30)
      .build();
    
    initTx.sign(deployerKeypair);
    const initResult = await server.submitTransaction(initTx);
    console.log('✅ Contract initialized successfully');
    
    // Fund the contract for verification rewards
    console.log('💰 Funding contract for verification rewards...');
    const fundTx = new TransactionBuilder(await server.loadAccount(deployerPublicKey), {
      fee: '100',
      networkPassphrase: networkPassphrase
    })
      .addOperation(Operation.payment({
        destination: contract.contractId(),
        asset: Asset.native(),
        amount: '10' // 10 XLM for verification rewards
      }))
      .setTimeout(30)
      .build();
    
    fundTx.sign(deployerKeypair);
    const fundResult = await server.submitTransaction(fundTx);
    console.log('✅ Contract funded successfully');
    
    // Save contract configuration
    const fs = require('fs');
    const contractConfig = {
      contractId: contract.contractId(),
      deployerPublicKey: deployerPublicKey,
      network: 'mainnet',
      deployedAt: new Date().toISOString(),
      verificationReward: '0.01', // XLM
      minimumBalance: '2'
    };
    
    fs.writeFileSync(
      'contracts/deployment.json',
      JSON.stringify(contractConfig, null, 2)
    );
    
    console.log('📝 Deployment configuration saved to contracts/deployment.json');
    
    // Create issuer account for file assets
    console.log('🏗️ Setting up issuer account for file assets...');
    const issuerKeypair = Keypair.random();
    const issuerPublicKey = issuerKeypair.publicKey();
    
    const issuerTx = new TransactionBuilder(await server.loadAccount(deployerPublicKey), {
      fee: '100',
      networkPassphrase: networkPassphrase
    })
      .addOperation(Operation.createAccount({
        destination: issuerPublicKey,
        startingBalance: '1.5' // Minimum balance for issuer account
      }))
      .setTimeout(30)
      .build();
    
    issuerTx.sign(deployerKeypair);
    const issuerResult = await server.submitTransaction(issuerTx);
    
    console.log(`✅ Issuer account created: ${issuerPublicKey}`);
    
    // Update deployment config with issuer info
    contractConfig.issuerPublicKey = issuerPublicKey;
    contractConfig.issuerSecret = issuerKeypair.secret(); // Save securely!
    
    fs.writeFileSync(
      'contracts/deployment.json',
      JSON.stringify(contractConfig, null, 2)
    );
    
    console.log('🎉 SecureChain deployment completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`Contract ID: ${contract.contractId()}`);
    console.log(`Deployer: ${deployerPublicKey}`);
    console.log(`Issuer Account: ${issuerPublicKey}`);
    console.log(`Network: Stellar Mainnet`);
    console.log(`Verification Reward: 0.01 XLM`);
    
    // Set environment variables for frontend
    console.log('\n🔧 Environment variables for frontend:');
    console.log(`NEXT_PUBLIC_STELLAR_CONTRACT_ID=${contract.contractId()}`);
    console.log(`NEXT_PUBLIC_STELLAR_ISSUER_PUBLIC_KEY=${issuerPublicKey}`);
    console.log(`NEXT_PUBLIC_STELLAR_NETWORK=mainnet`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

/**
 * Verify deployment
 */
async function verifyDeployment() {
  try {
    console.log('🔍 Verifying deployment...');
    
    const fs = require('fs');
    const deploymentConfig = JSON.parse(fs.readFileSync('contracts/deployment.json', 'utf8'));
    
    const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
    
    // Check contract exists
    const contract = await server.loadAccount(deploymentConfig.contractId);
    console.log('✅ Contract account exists');
    
    // Check issuer account exists
    const issuer = await server.loadAccount(deploymentConfig.issuerPublicKey);
    console.log('✅ Issuer account exists');
    
    // Check contract balance
    const contractBalance = contract.balances.find(b => b.asset_type === 'native');
    console.log(`💰 Contract balance: ${contractBalance.balance} XLM`);
    
    console.log('✅ Deployment verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

/**
 * Setup test data (optional)
 */
async function setupTestData() {
  try {
    console.log('🧪 Setting up test data...');
    
    const fs = require('fs');
    const deploymentConfig = JSON.parse(fs.readFileSync('contracts/deployment.json', 'utf8'));
    
    const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
    const deployerKeypair = Keypair.fromSecret(deploymentConfig.deployerSecret);
    
    // Create a test file upload
    const testFileData = {
      ipfsHash: 'QmTest123456789',
      fileHash: '0x1234567890abcdef',
      fileName: 'test-file.txt',
      fileSize: '1024',
      uploader: deployerKeypair.publicKey()
    };
    
    console.log('📄 Test file data created');
    console.log('🧪 Test data setup completed!');
    
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deploySecureChain();
      break;
    case 'verify':
      verifyDeployment();
      break;
    case 'test':
      setupTestData();
      break;
    default:
      console.log('Usage:');
      console.log('  node deploy-stellar.js deploy    - Deploy contract to Stellar Mainnet');
      console.log('  node deploy-stellar.js verify    - Verify deployment');
      console.log('  node deploy-stellar.js test      - Setup test data');
      process.exit(1);
  }
}

module.exports = {
  deploySecureChain,
  verifyDeployment,
  setupTestData
};
